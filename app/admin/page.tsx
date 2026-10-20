
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Deal = {
  id: string;
  amount: number | null;
  currency: string | null;
  status: string;
  commission_amount: number | null;
};

type Commission = {
  id: string;
  status: string;
  deal_id: string;
};

type Listing = {
  id: string;
  status: string;
};

const cardStyle: React.CSSProperties = {
  background: "#10213b",
  border: "1px solid #294261",
  borderRadius: 12,
  padding: 20,
};

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState("");

  const [deals, setDeals] = useState<Deal[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    setAuthorized(false);

    try {
      if (!supabase) {
        throw new Error("Supabase connection unavailable.");
      }

      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user) {
        throw new Error("Please sign in first.");
      }

      const { data: isAdmin, error: adminError } =
        await supabase.rpc("is_nexus_admin");

      if (adminError) {
        throw new Error(adminError.message);
      }

      if (isAdmin !== true) {
        throw new Error("Administrator access required.");
      }

      setAuthorized(true);

      const [dealsResult, paymentsResult, listingsResult] =
        await Promise.all([
          supabase
            .from("deals")
            .select(
              "id, amount, currency, status, commission_amount"
            ),
          supabase
            .from("commission_payments")
            .select("id, status, deal_id"),
          supabase
            .from("listings")
            .select("id, status"),
        ]);

      if (dealsResult.error) throw dealsResult.error;
      if (paymentsResult.error) throw paymentsResult.error;
      if (listingsResult.error) throw listingsResult.error;

      setDeals((dealsResult.data || []) as Deal[]);
      setCommissions(
        (paymentsResult.data || []) as Commission[]
      );
      setListings((listingsResult.data || []) as Listing[]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load dashboard."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const completedDeals = deals.filter(
    (deal) => deal.status === "completed"
  );

  const pendingCommissions = commissions.filter(
    (payment) => payment.status === "pending"
  );

  const paidCommissions = commissions.filter(
    (payment) => payment.status === "paid"
  );

  const publishedListings = listings.filter(
    (listing) => listing.status === "published"
  );

  const totalDealValueKWD = deals
    .filter((deal) => deal.currency === "KWD")
    .reduce((sum, deal) => sum + Number(deal.amount || 0), 0);

  const totalCommissionKWD = deals
    .filter((deal) => deal.currency === "KWD")
    .reduce(
      (sum, deal) =>
        sum + Number(deal.commission_amount || 0),
      0
    );

  const formatMoney = (amount: number) =>
    amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const stats = [
    {
      label: "Total Deals",
      value: deals.length,
      color: "#ffffff",
    },
    {
      label: "Completed Deals",
      value: completedDeals.length,
      color: "#34d399",
    },
    {
      label: "Pending Commissions",
      value: pendingCommissions.length,
      color: "#fbbf24",
    },
    {
      label: "Paid Commissions",
      value: paidCommissions.length,
      color: "#34d399",
    },
    {
      label: "Total Opportunities",
      value: listings.length,
      color: "#ffffff",
    },
    {
      label: "Published Opportunities",
      value: publishedListings.length,
      color: "#34d399",
    },
  ];

  return (
    <main
      style={{
        maxWidth: 1150,
        margin: "45px auto",
        padding: "0 20px 70px",
        color: "#f1f5f9",
      }}
    >
      <Link
        href="/dashboard"
        style={{ color: "#d4a039", textDecoration: "none" }}
      >
        ← Back to Dashboard
      </Link>

      <div style={{ marginTop: 25, marginBottom: 25 }}>
        <h1 style={{ fontSize: 30, marginBottom: 8 }}>
          🚀 Nexus Admin Dashboard
        </h1>
        <p style={{ color: "#94a3b8" }}>
          Nexus Global Franchise — Management Center
        </p>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            ...cardStyle,
            borderColor: "#ef4444",
            color: "#f87171",
            marginBottom: 20,
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <p>Loading admin dashboard...</p>
      ) : !authorized ? (
        <div style={cardStyle}>
          Administrator access required.
        </div>
      ) : (
        <>
          <p style={{ color: "#34d399" }}>
            ✓ Administrator verified
          </p>

          <button
            onClick={() => void loadDashboard()}
            style={{
              background: "#d4a039",
              color: "#081528",
              border: 0,
              borderRadius: 7,
              padding: "11px 18px",
              fontWeight: 700,
              cursor: "pointer",
              marginBottom: 28,
            }}
          >
            Refresh Dashboard
          </button>

          <h2 style={{ marginBottom: 15 }}>
            Platform Overview
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(210px, 1fr))",
              gap: 15,
              marginBottom: 25,
            }}
          >
            {stats.map((stat) => (
              <div key={stat.label} style={cardStyle}>
                <p
                  style={{
                    color: "#94a3b8",
                    fontSize: 13,
                    marginBottom: 10,
                  }}
                >
                  {stat.label}
                </p>
                <strong
                  style={{
                    fontSize: 29,
                    color: stat.color,
                  }}
                >
                  {stat.value}
                </strong>
              </div>
            ))}
          </div>

          <h2 style={{ marginBottom: 15 }}>
            Financial Overview
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(250px, 1fr))",
              gap: 15,
              marginBottom: 35,
            }}
          >
            <div style={cardStyle}>
              <p style={{ color: "#94a3b8" }}>
                Total Deal Value (KWD)
              </p>
              <h2 style={{ color: "#ffffff" }}>
                {formatMoney(totalDealValueKWD)} KWD
              </h2>
            </div>

            <div style={cardStyle}>
              <p style={{ color: "#94a3b8" }}>
                Calculated Commissions (KWD)
              </p>
              <h2 style={{ color: "#d4a039" }}>
                {formatMoney(totalCommissionKWD)} KWD
              </h2>
            </div>
          </div>

          <h2 style={{ marginBottom: 15 }}>
            Management Center
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 15,
            }}
          >
            <Link
              href="/admin/commissions"
              style={{
                ...cardStyle,
                textDecoration: "none",
                color: "#f1f5f9",
              }}
            >
              <h3>💰 Commission Management</h3>
              <p style={{ color: "#94a3b8" }}>
                View payments and confirm received commissions.
              </p>
              <strong style={{ color: "#d4a039" }}>
                Open →
              </strong>
            </Link>

            <Link
              href="/dashboard/deals"
              style={{
                ...cardStyle,
                textDecoration: "none",
                color: "#f1f5f9",
              }}
            >
              <h3>🤝 Deal Management</h3>
              <p style={{ color: "#94a3b8" }}>
                Review deals, approvals and commissions.
              </p>
              <strong style={{ color: "#d4a039" }}>
                Open →
              </strong>
            </Link>

            <Link
              href="/dashboard"
              style={{
                ...cardStyle,
                textDecoration: "none",
                color: "#f1f5f9",
              }}
            >
              <h3>🏢 Opportunities</h3>
              <p style={{ color: "#94a3b8" }}>
                Manage your franchise opportunities.
              </p>
              <strong style={{ color: "#d4a039" }}>
                Open →
              </strong>
            </Link>
          </div>

          <p
            style={{
              marginTop: 30,
              color: "#64748b",
              fontSize: 12,
            }}
          >
            Financial totals include KWD-denominated deals only.
            Calculated commissions are not necessarily received payments.
            Data visibility is controlled by Supabase RLS.
          </p>
        </>
      )}
    </main>
  );
}
