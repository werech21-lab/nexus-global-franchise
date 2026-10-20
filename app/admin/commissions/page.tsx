
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Payment = {
  id: string;
  deal_id: string;
  status: string;
  due_at: string | null;
  paid_at: string | null;
};

type Deal = {
  id: string;
  amount: number | null;
  currency: string | null;
  commission_rate: number | null;
  commission_amount: number | null;
  status: string;
  conversation_id: string | null;
};

type PaymentWithDeal = Payment & {
  deal: Deal | null;
};

const ADMIN_EMAIL = "werech21@gmail.com";

const cardStyle = {
  background: "#10213b",
  border: "1px solid #294261",
  borderRadius: 10,
  padding: 20,
};

function money(
  value: number | null | undefined,
  currency = "KWD"
) {
  if (value == null) return "Not available";

  return `${Number(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}

function formatDate(value: string | null) {
  if (!value) return "Not set";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Not set"
    : date.toLocaleString();
}

export default function AdminCommissionsPage() {
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<PaymentWithDeal[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const loadPayments = useCallback(async () => {
    setLoading(true);
    setError("");
    setAuthorized(false);
    setPayments([]);

    try {
      if (!supabase) {
        throw new Error("Supabase connection unavailable.");
      }

      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user) {
        throw new Error("Please sign in first.");
      }

      const email = authData.user.email?.toLowerCase();

      if (email !== ADMIN_EMAIL) {
        throw new Error("Access denied. Administrator only.");
      }

      const { data: isAdmin, error: adminError } =
        await supabase.rpc("is_nexus_admin");

      if (adminError) {
        throw new Error(
          `Admin verification failed: ${adminError.message}`
        );
      }

      if (isAdmin !== true) {
        throw new Error("Access denied. Administrator only.");
      }

      setAuthorized(true);

      const { data: paymentData, error: paymentError } =
        await supabase
          .from("commission_payments")
          .select("id, deal_id, status, due_at, paid_at")
          .order("created_at", { ascending: false });

      if (paymentError) {
        throw new Error(
          `Failed to load payments: ${paymentError.message}`
        );
      }

      const rows = (paymentData ?? []) as Payment[];

      if (rows.length === 0) {
        setPayments([]);
        return;
      }

      const dealIds = [...new Set(rows.map((p) => p.deal_id))];

      const { data: dealData, error: dealError } =
        await supabase
          .from("deals")
          .select(
            "id, amount, currency, commission_rate, commission_amount, status, conversation_id"
          )
          .in("id", dealIds);

      if (dealError) {
        throw new Error(
          `Failed to load deals: ${dealError.message}`
        );
      }

      const deals = (dealData ?? []) as Deal[];

      const dealMap = new Map(
        deals.map((deal) => [deal.id, deal])
      );

      setPayments(
        rows.map((payment) => ({
          ...payment,
          deal: dealMap.get(payment.deal_id) ?? null,
        }))
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPayments();
  }, [loadPayments]);

  async function markPaid(payment: PaymentWithDeal) {
    if (savingId || payment.status !== "pending") return;

    const confirmed = window.confirm(
      "Confirm that this commission has ACTUALLY been received? This will record the payment as paid."
    );

    if (!confirmed) return;

    setSavingId(payment.id);
    setError("");
    setSuccess("");

    try {
      if (!supabase) {
        throw new Error("Supabase connection unavailable.");
      }

      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (
        authError ||
        authData.user?.email?.toLowerCase() !== ADMIN_EMAIL
      ) {
        throw new Error("Administrator session required.");
      }

      const { data: isAdmin, error: adminError } =
        await supabase.rpc("is_nexus_admin");

      if (adminError || isAdmin !== true) {
        throw new Error("Administrator verification failed.");
      }

      const { error: rpcError } = await supabase.rpc(
        "admin_mark_commission_paid",
        { p_payment_id: payment.id }
      );

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      await loadPayments();
      setSuccess("Commission marked as paid successfully.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to confirm payment."
      );
    } finally {
      setSavingId(null);
    }
  }

  const pendingCount = payments.filter(
    (payment) => payment.status === "pending"
  ).length;

  const paidCount = payments.filter(
    (payment) => payment.status === "paid"
  ).length;

  return (
    <main
      style={{
        maxWidth: 1050,
        margin: "50px auto",
        padding: "0 20px 70px",
        color: "#f1f5f9",
      }}
    >
      <Link
        href="/dashboard"
        style={{
          color: "#d4a039",
          textDecoration: "none",
        }}
      >
        ← Back to Dashboard
      </Link>

      <h1 style={{ marginTop: 22, marginBottom: 8 }}>
        Nexus Admin — Commissions
      </h1>

      <p style={{ color: "#94a3b8" }}>
        Secure commission payment management.
      </p>

      {error && (
        <div
          role="alert"
          style={{
            background: "#451a23",
            border: "1px solid #b91c1c",
            color: "#fecaca",
            padding: 14,
            borderRadius: 8,
            marginBottom: 18,
          }}
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          style={{
            background: "#064e3b",
            color: "#a7f3d0",
            padding: 14,
            borderRadius: 8,
            marginBottom: 18,
          }}
        >
          {success}
        </div>
      )}

      {loading ? (
        <p>Loading commission payments...</p>
      ) : !authorized ? (
        <div style={cardStyle}>
          Administrator access required.
        </div>
      ) : (
        <>
          <p
            style={{
              color: "#34d399",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Administrator verified.
          </p>

          <button
            type="button"
            onClick={() => void loadPayments()}
            disabled={savingId !== null}
            style={{
              background: "#d4a039",
              color: "#081528",
              border: 0,
              borderRadius: 7,
              padding: "11px 16px",
              cursor: "pointer",
              fontWeight: 700,
              marginBottom: 24,
            }}
          >
            Refresh Payments
          </button>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 14,
              marginBottom: 28,
            }}
          >
            <div style={cardStyle}>
              <div style={{ color: "#94a3b8" }}>
                Total Payments
              </div>
              <h2>{payments.length}</h2>
            </div>

            <div style={cardStyle}>
              <div style={{ color: "#94a3b8" }}>
                Pending Payments
              </div>
              <h2 style={{ color: "#fbbf24" }}>
                {pendingCount}
              </h2>
            </div>

            <div style={cardStyle}>
              <div style={{ color: "#94a3b8" }}>
                Paid Payments
              </div>
              <h2 style={{ color: "#34d399" }}>
                {paidCount}
              </h2>
            </div>
          </div>

          <h2>
            Commission Payments ({payments.length})
          </h2>

          {payments.length === 0 ? (
            <div style={cardStyle}>
              No commission payments found.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 18 }}>
              {payments.map((payment) => {
                const deal = payment.deal;
                const currency = deal?.currency || "KWD";

                return (
                  <section
                    key={payment.id}
                    style={cardStyle}
                  >
                    <h3
                      style={{
                        color: "#fbbf24",
                        marginTop: 0,
                      }}
                    >
                      Commission Payment
                    </h3>

                    <p>
                      <strong>Payment ID:</strong>{" "}
                      {payment.id}
                    </p>

                    <p>
                      <strong>Deal ID:</strong>{" "}
                      {payment.deal_id}
                    </p>

                    <p>
                      <strong>Status:</strong>{" "}
                      <span
                        style={{
                          color:
                            payment.status === "paid"
                              ? "#34d399"
                              : "#fbbf24",
                          fontWeight: 700,
                        }}
                      >
                        {payment.status.toUpperCase()}
                      </span>
                    </p>

                    <hr
                      style={{
                        border: 0,
                        borderTop: "1px solid #294261",
                        margin: "18px 0",
                      }}
                    />

                    {deal ? (
                      <>
                        <h3>Deal Information</h3>

                        <p>
                          <strong>Deal Amount:</strong>{" "}
                          {money(deal.amount, currency)}
                        </p>

                        <p>
                          <strong>Commission Rate:</strong>{" "}
                          {deal.commission_rate == null
                            ? "Not available"
                            : `${deal.commission_rate}%`}
                        </p>

                        <p
                          style={{
                            color: "#fbbf24",
                            fontWeight: 700,
                          }}
                        >
                          Commission Amount:{" "}
                          {money(
                            deal.commission_amount,
                            currency
                          )}
                        </p>

                        <p>
                          <strong>Deal Status:</strong>{" "}
                          {deal.status}
                        </p>

                        {deal.conversation_id && (
                          <p>
                            <strong>Conversation ID:</strong>{" "}
                            {deal.conversation_id}
                          </p>
                        )}
                      </>
                    ) : (
                      <p style={{ color: "#fbbf24" }}>
                        Deal details are unavailable.
                      </p>
                    )}

                    <hr
                      style={{
                        border: 0,
                        borderTop: "1px solid #294261",
                        margin: "18px 0",
                      }}
                    />

                    <h3>Payment Information</h3>

                    <p>
                      <strong>Due Date:</strong>{" "}
                      {formatDate(payment.due_at)}
                    </p>

                    <p>
                      <strong>Paid At:</strong>{" "}
                      {payment.paid_at
                        ? formatDate(payment.paid_at)
                        : "Not paid"}
                    </p>

                    {payment.status === "pending" && (
                      <button
                        type="button"
                        disabled={savingId !== null}
                        onClick={() =>
                          void markPaid(payment)
                        }
                        style={{
                          background: "#d4a039",
                          color: "#081528",
                          border: 0,
                          borderRadius: 7,
                          padding: "12px 18px",
                          fontWeight: 700,
                          cursor:
                            savingId !== null
                              ? "not-allowed"
                              : "pointer",
                          opacity:
                            savingId !== null ? 0.6 : 1,
                        }}
                      >
                        {savingId === payment.id
                          ? "Saving..."
                          : "Mark as Paid"}
                      </button>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </>
      )}
    </main>
  );
}
