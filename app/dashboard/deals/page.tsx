
"use client";

import { useCallback, useEffect, useState } from "react";
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
  investor_approved: boolean;
  owner_approved: boolean;
  investor_approved_at: string | null;
  owner_approved_at: string | null;
  created_at: string;
};

type Conversation = {
  id: string;
  investor_id: string;
  owner_id: string;
};

type DealWithRole = Deal & {
  isInvestor: boolean;
  isOwner: boolean;
};

const cardStyle: React.CSSProperties = {
  background: "#10213c",
  border: "1px solid #294261",
  borderRadius: 12,
  padding: 20,
};

function formatMoney(amount: number, currency: string) {
  return `${Number(amount || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}

export default function DealsPage() {
  const [deals, setDeals] = useState<DealWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadDeals = useCallback(async () => {
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

      const userId = authData.user.id;

      const { data: dealData, error: dealsError } = await supabase
        .from("deals")
        .select(
          "id, conversation_id, amount, currency, status, commission_rate, commission_amount, investor_approved, owner_approved, investor_approved_at, owner_approved_at, created_at"
        )
        .order("created_at", { ascending: false });

      if (dealsError) throw dealsError;

      const records = (dealData || []) as Deal[];

      if (records.length === 0) {
        setDeals([]);
        return;
      }

      const conversationIds = [
        ...new Set(records.map((deal) => deal.conversation_id)),
      ];

      const { data: conversationData, error: conversationError } =
        await supabase
          .from("conversations")
          .select("id, investor_id, owner_id")
          .in("id", conversationIds);

      if (conversationError) throw conversationError;

      const conversations = new Map(
        ((conversationData || []) as Conversation[]).map((item) => [
          item.id,
          item,
        ])
      );

      const visibleDeals: DealWithRole[] = records
        .map((deal) => {
          const conversation = conversations.get(deal.conversation_id);

          return {
            ...deal,
            isInvestor: conversation?.investor_id === userId,
            isOwner: conversation?.owner_id === userId,
          };
        })
        .filter((deal) => deal.isInvestor || deal.isOwner);

      setDeals(visibleDeals);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load deals."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDeals();
  }, [loadDeals]);

  async function approveDeal(
    deal: DealWithRole,
    role: "investor" | "owner"
  ) {
    if (savingId) return;

    if (role === "investor" && !deal.isInvestor) return;
    if (role === "owner" && !deal.isOwner) return;

    const alreadyApproved =
      role === "investor"
        ? deal.investor_approved
        : deal.owner_approved;

    if (alreadyApproved) return;

    const confirmed = window.confirm(
      `Confirm your approval of this ${formatMoney(
        deal.amount,
        deal.currency
      )} deal?`
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

      const { data: conversation, error: conversationError } =
        await supabase
          .from("conversations")
          .select("investor_id, owner_id")
          .eq("id", deal.conversation_id)
          .single();

      if (conversationError) throw conversationError;

      const expectedUserId =
        role === "investor"
          ? conversation.investor_id
          : conversation.owner_id;

      if (authData.user.id !== expectedUserId) {
        throw new Error("You are not authorized to approve this deal.");
      }

      const approvalColumn =
        role === "investor"
          ? "investor_approved"
          : "owner_approved";

      const { data, error: updateError } = await supabase
        .from("deals")
        .update({ [approvalColumn]: true })
        .eq("id", deal.id)
        .eq("conversation_id", deal.conversation_id)
        .eq(approvalColumn, false)
        .select("id")
        .maybeSingle();

      if (updateError) throw updateError;

      if (!data) {
        throw new Error(
          "Approval was not saved. The deal may already be approved."
        );
      }

      await loadDeals();

      setSuccess(
        role === "investor"
          ? "Investor approval recorded successfully."
          : "Owner approval recorded successfully."
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to approve deal."
      );
    } finally {
      setSavingId(null);
    }
  }

  const totalValue = deals.reduce(
    (sum, deal) => sum + Number(deal.amount || 0),
    0
  );

  const totalCommission = deals.reduce(
    (sum, deal) => sum + Number(deal.commission_amount || 0),
    0
  );

  const currencies = [...new Set(deals.map((deal) => deal.currency))];
  const singleCurrency =
    currencies.length === 1 ? currencies[0] : null;

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
        Track transaction values, deal stages, approvals and proposed
        commissions.
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
              : deals.length === 0
                ? "0"
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
              : deals.length === 0
                ? "0"
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
          {deals.map((deal) => {
            const bothApproved =
              deal.investor_approved && deal.owner_approved;

            return (
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
                  Your Role:{" "}
                  <strong>
                    {deal.isInvestor && deal.isOwner
                      ? "Investor & Owner"
                      : deal.isInvestor
                        ? "Investor"
                        : "Owner"}
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

                <div
                  style={{
                    marginTop: 22,
                    borderTop: "1px solid #294261",
                    paddingTop: 18,
                  }}
                >
                  <h3>Deal Approvals</h3>

                  <p>
                    Investor:{" "}
                    <strong
                      style={{
                        color: deal.investor_approved
                          ? "#6ee7b7"
                          : "#fbbf24",
                      }}
                    >
                      {deal.investor_approved
                        ? "Approved"
                        : "Pending"}
                    </strong>
                  </p>

                  <p>
                    Owner:{" "}
                    <strong
                      style={{
                        color: deal.owner_approved
                          ? "#6ee7b7"
                          : "#fbbf24",
                      }}
                    >
                      {deal.owner_approved
                        ? "Approved"
                        : "Pending"}
                    </strong>
                  </p>

                  {deal.isInvestor && !deal.investor_approved && (
                    <button
                      type="button"
                      disabled={savingId !== null}
                      onClick={() => approveDeal(deal, "investor")}
                      style={{
                        background: "#d7ad59",
                        color: "#081528",
                        border: "none",
                        borderRadius: 7,
                        padding: "11px 16px",
                        fontWeight: 700,
                        cursor: "pointer",
                        marginRight: 10,
                        marginBottom: 10,
                      }}
                    >
                      {savingId === deal.id
                        ? "Saving..."
                        : "Approve as Investor"}
                    </button>
                  )}

                  {deal.isOwner && !deal.owner_approved && (
                    <button
                      type="button"
                      disabled={savingId !== null}
                      onClick={() => approveDeal(deal, "owner")}
                      style={{
                        background: "#d7ad59",
                        color: "#081528",
                        border: "none",
                        borderRadius: 7,
                        padding: "11px 16px",
                        fontWeight: 700,
                        cursor: "pointer",
                        marginBottom: 10,
                      }}
                    >
                      {savingId === deal.id
                        ? "Saving..."
                        : "Approve as Owner"}
                    </button>
                  )}

                  {bothApproved ? (
                    <p style={{ color: "#6ee7b7" }}>
                      Both parties have approved this deal.
                    </p>
                  ) : (
                    <p style={{ color: "#9bb1cf" }}>
                      Both parties must approve before a new deal
                      can be marked completed.
                    </p>
                  )}

                  {deal.status === "completed" &&
                    !bothApproved && (
                      <p style={{ color: "#fbbf24" }}>
                        Legacy completed deal: approvals were not
                        recorded before the new approval system.
                      </p>
                    )}
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
            );
          })}
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
        Deal approval does not establish payment obligations
        or activate the draft brokerage agreement.
      </p>
    </main>
  );
}
