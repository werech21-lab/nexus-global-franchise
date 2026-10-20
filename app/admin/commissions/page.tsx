
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

const ADMIN_EMAIL = "werech21@gmail.com";

const cardStyle = {
  background: "#10213b",
  border: "1px solid #294261",
  borderRadius: 10,
  padding: 20,
};

function formatDate(value: string | null) {
  if (!value) return "Not set";

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Invalid date"
    : date.toLocaleString();
}

export default function AdminCommissionsPage() {
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<Payment[]>([]);
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

      if (authError) {
        throw new Error(
          "Authentication error: " + authError.message
        );
      }

      const user = authData.user;

      if (!user) {
        throw new Error("Please sign in first.");
      }

      if (
        user.email?.trim().toLowerCase() !== ADMIN_EMAIL
      ) {
        throw new Error("Access denied. Admin only.");
      }

      const { data: isAdmin, error: adminError } =
        await supabase.rpc("is_nexus_admin");

      if (adminError) {
        throw new Error(
          "Admin verification failed: " +
            adminError.message
        );
      }

      if (isAdmin !== true) {
        throw new Error(
          "Access denied. Your account is not registered as an administrator."
        );
      }

      setAuthorized(true);

      const { data, error: paymentError } = await supabase
        .from("commission_payments")
        .select("id, deal_id, status, paid_at, due_at")
        .order("due_at", {
          ascending: false,
          nullsFirst: false,
        });

      if (paymentError) {
        throw new Error(
          "Payment query failed: " +
            paymentError.message +
            (paymentError.code
              ? " (Code: " + paymentError.code + ")"
              : "") +
            (paymentError.hint
              ? " Hint: " + paymentError.hint
              : "")
        );
      }

      setPayments((data ?? []) as Payment[]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load payments."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPayments();
  }, [loadPayments]);

  async function markPaid(payment: Payment) {
    if (
      !authorized ||
      savingId ||
      payment.status !== "pending"
    ) {
      return;
    }

    const confirmed = window.confirm(
      "Confirm that this commission has ACTUALLY been paid? This will record the payment as paid."
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
        authData.user?.email?.trim().toLowerCase() !==
          ADMIN_EMAIL
      ) {
        throw new Error("Admin authentication required.");
      }

      const { data: isAdmin, error: adminError } =
        await supabase.rpc("is_nexus_admin");

      if (adminError || isAdmin !== true) {
        throw new Error("Admin authorization failed.");
      }

      const { error: rpcError } = await supabase.rpc(
        "admin_mark_commission_paid",
        {
          p_payment_id: payment.id,
        }
      );

      if (rpcError) {
        throw new Error(
          "Payment update failed: " + rpcError.message
        );
      }

      await loadPayments();

      setSuccess(
        "Payment confirmation submitted. Verify the updated status below."
      );
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

  return (
    <main
      style={{
        maxWidth: 1000,
        margin: "50px auto",
        padding: "0 20px 60px",
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

      <h1 style={{ marginTop: 20 }}>
        Nexus Admin — Commissions
      </h1>

      <p style={{ color: "#94a3b8" }}>
        Secure commission payment management.
      </p>

      {error && (
        <div
          role="alert"
          style={{
            background: "#481b29",
            color: "#fca5a5",
            padding: 14,
            borderRadius: 8,
            marginBottom: 18,
            overflowWrap: "anywhere",
          }}
        >
          <strong>Error:</strong> {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          style={{
            background: "#174d3c",
            color: "#86efac",
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
          <p style={{ color: "#34d399" }}>
            Administrator verified.
          </p>

          <button
            type="button"
            disabled={!!savingId}
            onClick={() => void loadPayments()}
            style={{
              padding: "10px 16px",
              background: "#d4a039",
              color: "#081528",
              border: 0,
              borderRadius: 7,
              cursor: "pointer",
              marginBottom: 20,
              fontWeight: 700,
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
              marginBottom: 25,
            }}
          >
            <div style={cardStyle}>
              <div>Total Payments</div>
              <h2>{payments.length}</h2>
            </div>

            <div style={cardStyle}>
              <div>Pending Payments</div>
              <h2 style={{ color: "#fbbf24" }}>
                {pendingCount}
              </h2>
            </div>

            <div style={cardStyle}>
              <div>Paid Payments</div>
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
              {error
                ? "Payments could not be loaded."
                : "No commission payments found."}
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: 15,
              }}
            >
              {payments.map((payment) => (
                <section
                  key={payment.id}
                  style={cardStyle}
                >
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

                  <p>
                    <strong>Due:</strong>{" "}
                    {formatDate(payment.due_at)}
                  </p>

                  <p>
                    <strong>Paid at:</strong>{" "}
                    {payment.paid_at
                      ? formatDate(payment.paid_at)
                      : "Not paid"}
                  </p>

                  {payment.status === "pending" && (
                    <button
                      type="button"
                      disabled={!!savingId}
                      onClick={() =>
                        void markPaid(payment)
                      }
                      style={{
                        background: "#d4a039",
                        color: "#081528",
                        padding: "11px 16px",
                        border: 0,
                        borderRadius: 7,
                        fontWeight: 700,
                        cursor: "pointer",
                        opacity: savingId ? 0.6 : 1,
                      }}
                    >
                      {savingId === payment.id
                        ? "Saving..."
                        : "Mark as Paid"}
                    </button>
                  )}
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}
