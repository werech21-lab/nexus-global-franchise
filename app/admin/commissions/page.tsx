
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Payment = {
  id: string;
  deal_id: string;
  status: string;
  paid_at: string | null;
  due_at: string | null;
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

const cardStyle: React.CSSProperties = {
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
  return value ? new Date(value).toLocaleString() : "Not set";
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

      if (
        authData.user.email?.toLowerCase() !== ADMIN_EMAIL
      ) {
        throw new Error("Access denied. Admin only.");
      }

      const { data: isAdmin, error: adminError } =
        await supabase.rpc("is_nexus_admin");

      if (adminError) {
        throw new Error(adminError.message);
      }

      if (isAdmin !== true) {
        throw new Error("Access denied. Admin only.");
      }

      setAuthorized(true);

      const { data: paymentData, error: paymentError } =
        await supabase
          .from("commission_payments")
          .select("id, deal_id, status, paid_at, due_at")
          .order("created_at", { ascending: false });

      if (paymentError) throw paymentError;

      const paymentRows = (paymentData || []) as Payment[];

      if (paymentRows.length === 0) {
        setPayments([]);
        return;
      }

      const dealIds = [...new Set(paymentRows.map((p) => p.deal_id))];

      const { data: dealData, error: dealError } =
        await supabase
          .from("deals")
          .select(
            "id, amount, currency, commission_rate, commission_amount, status, conversation_id"
          )
          .in("id", dealIds);

      if (dealError) throw dealError;

      const dealMap = new Map<string, Deal>(
        ((dealData || []) as Deal[]).map((deal) => [
          deal.id,
          deal,
        ])
      );

      setPayments(
        paymentRows.map((payment) => ({
          ...payment,
          deal: dealMap.get(payment.deal_id) || null,
        }))
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load commission payments."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPayments();
  }, [loadPayments]);

  async function markPaid(payment: PaymentWithDeal) {
    if (!authorized || savingId || payment.status !== "pending") {
      return;
    }

    if (
      !window.confirm(
        "Confirm that this commission has actually been received? This action records a payment confirmation."
      )
    ) {
      return;
    }

    setSavingId(payment.id);
    setError("");
    setSuccess("");

    try {
      if (!supabase) {
        throw new Error("Supabase connection unavailable.");
      }

      const { error: rpcError } = await supabase.rpc(
        "admin_mark_commission_paid",
        { p_payment_id: payment.id }
      );

      if (rpcError) throw rpcError;

      await loadPayments();
      setSuccess("Commission marked as paid successfully.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update payment."
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

  const pendingTotal = payments.reduce((sum, payment) => {
    if (payment.status !== "pending") return sum;
    return sum + Number(payment.deal?.commission_amount || 0);
  }, 0);

  return (
    <main
      style={{
        maxWidth: 1050,
        margin: "50px auto",
        padding: "0 20px 60px",
        color: "#f1f5f9",
      }}
    >
      <Link href="/dashboard" style={{ color: "#d4a039" }}>
        ← Back to Dashboard
      </Link>

      <h1 style={{ marginTop: 20 }}>
        Nexus Admin — Commissions
      </h1>

      <p style={{ color: "#94a3b8" }}>
        Manage commission payments and view deal details.
      </p>

      {error && (
        <p role="alert" style={{ color: "#f87171" }}>
          {error}
        </p>
      )}

      {success && (
        <p role="status" style={{ color: "#34d399" }}>
          {success}
        </p>
      )}

      {loading ? (
        <p>Loading...</p>
      ) : !authorized ? (
        <div style={cardStyle}>
          Administrator access required.
        </div>
      ) : (
        <>
          <p style={{ color: "#34d399" }}>
            Administrator verified.
          </p>

          <button
            type="button"
            onClick={() => void loadPayments()}
            style={{
              padding: "10px 16px",
              background: "#d4a039",
              color: "#081528",
              border: 0,
              borderRadius: 7,
              cursor: "pointer",
              fontWeight: 700,
              marginBottom: 20,
            }}
          >
            Refresh Payments
          </button>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(160px, 1fr))",
              gap: 12,
              marginBottom: 25,
            }}
          >
            {[
              ["Total Payments", payments.length],
              ["Pending Payments", pendingCount],
              ["Paid Payments", paidCount],
              ["Pending Commission (KWD)", money(pendingTotal)],
            ].map(([label, value]) => (
              <div key={String(label)} style={cardStyle}>
                <div
                  style={{
                    color: "#94a3b8",
                    fontSize: 13,
                  }}
                >
                  {label}
                </div>
                <strong style={{ fontSize: 20 }}>
                  {value}
                </strong>
              </div>
            ))}
          </div>

          <h2>Commission Payments ({payments.length})</h2>

          {payments.length === 0 ? (
            <div style={cardStyle}>
              No commission payments found.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 16 }}>
              {payments.map((payment) => {
                const deal = payment.deal;
                const currency = deal?.currency || "KWD";

                return (
                  <section key={payment.id} style={cardStyle}>
                    <h3 style={{ marginTop: 0 }}>
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

                    {deal ? (
                      <>
                        <p>
                          <strong>Deal Value:</strong>{" "}
                          {money(deal.amount, currency)}
                        </p>

                        <p>
                          <strong>Commission Rate:</strong>{" "}
                          {deal.commission_rate ?? 0}%
                        </p>

                        <p
                          style={{
                            color: "#fbbf24",
                            fontSize: 18,
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
                          {deal.status.toUpperCase()}
                        </p>

                        {deal.conversation_id && (
                          <Link
                            href={`/dashboard/messages/${deal.conversation_id}`}
                            style={{ color: "#d4a039" }}
                          >
                            View Conversation →
                          </Link>
                        )}
                      </>
                    ) : (
                      <p style={{ color: "#f87171" }}>
                        Deal details unavailable.
                      </p>
                    )}

                    <hr
                      style={{
                        border: 0,
                        borderTop: "1px solid #294261",
                        margin: "20px 0",
                      }}
                    />

                    <p>
                      <strong>Payment Status:</strong>{" "}
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
                        disabled={!!savingId}
                        onClick={() => void markPaid(payment)}
                        style={{
                          background: "#d4a039",
                          color: "#081528",
                          padding: "11px 16px",
                          border: 0,
                          borderRadius: 7,
                          borderRadius: 7,
                          fontWeight: 700,
                          cursor: savingId
                            ? "not-allowed"
                            : "pointer",
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
