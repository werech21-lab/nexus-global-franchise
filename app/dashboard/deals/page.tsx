
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type DealStatus = "negotiating" | "agreed" | "completed";

type Deal = {
  id: string;
  conversation_id: string;
  amount: number;
  currency: string;
  status: DealStatus;
  commission_rate: number;
  commission_amount: number;
  created_at: string;
};

const statuses: DealStatus[] = [
  "negotiating",
  "agreed",
  "completed",
];

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadDeals() {
    setLoading(true);
    setError("");

    try {
      if (!supabase) {
        throw new Error("Supabase connection unavailable.");
      }

      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user) {
        throw new Error("Please log in to view your deals.");
      }

      const { data, error: dealsError } = await supabase
        .from("deals")
        .select(
          "id, conversation_id, amount, currency, status, commission_rate, commission_amount, created_at"
        )
        .order("created_at", { ascending: false });

      if (dealsError) throw dealsError;

      setDeals((data || []) as Deal[]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load deals."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDeals();
  }, []);

  async function updateStatus(
    deal: Deal,
    newStatus: DealStatus
  ) {
    if (deal.status === newStatus) return;

    const confirmed = window.confirm(
      `Change deal status from "${deal.status}" to "${newStatus}"?`
    );

    if (!confirmed) return;

    setSavingId(deal.id);
    setError("");
    setSuccess("");

    try {
      if (!supabase) {
        throw new Error("Supabase connection unavailable.");
      }

      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user) {
        throw new Error("Please log in first.");
      }

      const { data, error: updateError } = await supabase
        .from("deals")
        .update({ status: newStatus })
        .eq("id", deal.id)
        .eq("status", deal.status)
        .select("id, status")
        .single();

      if (updateError) throw updateError;

      if (!data) {
        throw new Error("Deal could not be updated.");
      }

      setDeals((previous) =>
        previous.map((item) =>
          item.id === deal.id
            ? { ...item, status: data.status as DealStatus }
            : item
        )
      );

      setSuccess("Deal status updated successfully.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update deal status."
      );
    } finally {
      setSavingId(null);
    }
  }

  function formatMoney(amount: number, currency: string) {
    return `${Number(amount || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${currency}`;
  }

  const totalValue = deals.reduce(
    (sum, deal) => sum + Number(deal.amount || 0),
    0
  );

  const totalCommission = deals.reduce(
    (sum, deal) =>
      sum + Number(deal.commission_amount || 0),
    0
  );

  const currencies = [...new Set(deals.map((d) => d.currency))];
  const singleCurrency = currencies.length === 1
    ? currencies[0]
    : null;

  const cardStyle: React.CSSProperties = {
    background: "#10213c",
    border: "1px solid #294261",
    borderRadius: 12,
    padding: 20,
  };

  return (
    <main
      style={{
        maxWidth: 1050,
        margin: "50px auto",
        padding: "0 20px 60px",
        color: "#f1f5f9",
      }}
    >
      <Link
        href="/dashboard"
        style={{ color: "#d7ad59", textDecoration: "none" }}
      >
        ← Back to Dashboard
      </Link>

      <h1 style={{ fontSize: 30, marginTop: 15 }}>
        Nexus Deals & Commissions
      </h1>

      <p style={{ color: "#9bb1cf" }}>
        Track transaction values, deal stages and proposed commissions.
      </p>

      {error && (
        <div
          role="alert"
          style={{
            background: "#481b29",
            padding: 14,
            borderRadius: 8,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          style={{
            background: "#174d3c",
            padding: 14,
            borderRadius: 8,
            marginBottom: 16,
          }}
        >
          {success}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(210px, 1fr))",
          gap: 14,
          marginTop: 25,
        }}
      >
        <div style={cardStyle}>
          <div style={{ color: "#9bb1cf" }}>Total Deals</div>
          <h2>{deals.length}</h2>
        </div>

        <div style={cardStyle}>
          <div style={{ color: "#9bb1cf" }}>Total Deal Value</div>
          <h2>
            {singleCurrency
              ? formatMoney(totalValue, singleCurrency)
              : "Multiple currencies"}
          </h2>
        </div>

        <div style={cardStyle}>
          <div style={{ color: "#9bb1cf" }}>
            Calculated Commission
          </div>
          <h2 style={{ color: "#e7b85e" }}>
            {singleCurrency
              ? formatMoney(totalCommission, singleCurrency)
              : "Multiple currencies"}
          </h2>
        </div>
      </div>

      <h2 style={{ marginTop: 35 }}>Deal Records</h2>

      {loading ? (
        <p>Loading deals...</p>
      ) : deals.length === 0 ? (
        <div style={cardStyle}>No deals recorded yet.</div>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {deals.map((deal) => (
            <div key={deal.id} style={cardStyle}>
              <h3 style={{ color: "#ffffff", marginTop: 0 }}>
                {formatMoney(deal.amount, deal.currency)}
              </h3>

              <p>
                Status:{" "}
                <strong style={{ color: "#e7b85e" }}>
                  {deal.status.toUpperCase()}
                </strong>
              </p>

              <p>
                Commission Rate:{" "}
                {Number(deal.commission_rate) * 100}%
              </p>

              <p style={{ color: "#e7b85e" }}>
                Calculated Commission:{" "}
                {formatMoney(
                  deal.commission_amount,
                  deal.currency
                )}
              </p>

              <p style={{ color: "#9bb1cf" }}>
                Created:{" "}
                {new Date(deal.created_at).toLocaleDateString()}
              </p>

              <div style={{ marginTop: 20 }}>
                <p style={{ fontWeight: 600 }}>
                  Update Deal Status
                </p>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 10,
                  }}
                >
                  {statuses.map((status) => (
                    <button
                      key={status}
                      type="button"
                      disabled={
                        savingId === deal.id ||
                        status === deal.status
                      }
                      onClick={() => updateStatus(deal, status)}
                      style={{
                        background:
                          status === deal.status
                            ? "#42536b"
                            : "#d7ad59",
                        color:
                          status === deal.status
                            ? "#ffffff"
                            : "#081528",
                        border: "none",
                        borderRadius: 7,
                        padding: "10px 14px",
                        cursor:
                          savingId === deal.id ||
                          status === deal.status
                            ? "not-allowed"
                            : "pointer",
                        fontWeight: 600,
                      }}
                    >
                      {savingId === deal.id
                        ? "Saving..."
                        : status.charAt(0).toUpperCase() +
                          status.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 22 }}>
                <Link
                  href={`/dashboard/messages/${deal.conversation_id}`}
                  style={{ color: "#d7ad59" }}
                >
                  Open Conversation →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <p
        style={{
          marginTop: 30,
          color: "#8ca2c0",
          fontSize: 12,
        }}
      >
        Commission calculations are informational only.
        Changing deal status does not establish payment
        obligations or activate the draft brokerage agreement.
      </p>
    </main>
  );
}
