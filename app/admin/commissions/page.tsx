
"use client";

import { useEffect, useState } from "react";
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

export default function AdminCommissionsPage() {
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  async function loadPayments() {
    setLoading(true);
    setError("");

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
        setAuthorized(false);
        throw new Error("Access denied. Admin only.");
      }

      const { data: isAdmin, error: adminError } =
        await supabase.rpc("is_nexus_admin");

      if (adminError) {
        throw new Error(
          "Admin verification unavailable: " + adminError.message
        );
      }

      if (isAdmin !== true) {
        setAuthorized(false);
        throw new Error("Access denied. Admin only.");
      }

      setAuthorized(true);

      const { data, error: paymentError } = await supabase
        .from("commission_payments")
        .select("id, deal_id, status, paid_at, due_at")
        .order("due_at", { ascending: false, nullsFirst: false });

      if (paymentError) throw paymentError;

      setPayments((data || []) as Payment[]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load payments."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPayments();
  }, []);

  async function markPaid(payment: Payment) {
    if (savingId || payment.status !== "pending") return;

    if (
      !window.confirm(
        "Confirm that this commission has actually been paid? This action records a payment confirmation."
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

      setSuccess("Commission marked as paid successfully.");
      await loadPayments();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update payment."
      );
    } finally {
      setSavingId(null);
    }
  }

  const cardStyle: React.CSSProperties = {
    background: "#10213b",
    border: "1px solid #294261",
    borderRadius: 10,
    padding: 20,
  };

  return (
    <main
      style={{
        maxWidth: 1000,
        margin: "50px auto",
        padding: "0 20px 60px",
        color: "#f1f5f9",
      }}
    >
      <Link href="/dashboard" style={{ color: "#d4a039" }}>
        ← Back to Dashboard
      </Link>

      <h1 style={{ marginTop: 20 }}>Nexus Admin — Commissions</h1>
      <p style={{ color: "#94a3b8" }}>
        Commission payment management.
      </p>

      {error && (
        <p style={{ color: "#f87171" }} role="alert">
          {error}
        </p>
      )}

      {success && (
        <p style={{ color: "#34d399" }} role="status">
          {success}
        </p>
      )}

      {loading ? (
        <p>Loading...</p>
      ) : !authorized ? (
        <div style={cardStyle}>Administrator access required.</div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => void loadPayments()}
            style={{
              padding: "10px 16px",
              background: "#d4a039",
              border: 0,
              borderRadius: 7,
              cursor: "pointer",
              marginBottom: 20,
            }}
          >
            Refresh Payments
          </button>

          <h2>Commission Payments ({payments.length})</h2>

          {payments.length === 0 ? (
            <div style={cardStyle}>No commission payments found.</div>
          ) : (
            <div style={{ display: "grid", gap: 15 }}>
              {payments.map((payment) => (
                <section key={payment.id} style={cardStyle}>
                  <p>
                    <strong>Deal ID:</strong> {payment.deal_id}
                  </p>

                  <p>
                    <strong>Status:</strong>{" "}
                    <span
                      style={{
                        color:
                          payment.status === "paid"
                            ? "#34d399"
                            : "#fbbf24",
                      }}
                    >
                      {payment.status.toUpperCase()}
                    </span>
                  </p>

                  <p>
                    <strong>Due:</strong>{" "}
                    {payment.due_at
                      ? new Date(payment.due_at).toLocaleString()
                      : "Not set"}
                  </p>

                  <p>
                    <strong>Paid at:</strong>{" "}
                    {payment.paid_at
                      ? new Date(payment.paid_at).toLocaleString()
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
                        fontWeight: 700,
                        cursor: "pointer",
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
