
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Deal = {
  id: string;
  conversation_id: string;
  amount: number;
  currency: string;
  status: string;
  commission_rate: number;
  commission_amount: number;
  created_at: string;
};

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDeals() {
      setLoading(true);
      setError("");

      // Check Supabase connection
      const client = supabase;

      if (!client) {
        setError("Supabase connection is not available.");
        setLoading(false);
        return;
      }

      // Check logged-in user
      const { data: authData, error: authError } =
        await client.auth.getUser();

      if (authError || !authData.user) {
        setError("Please log in to view your deals.");
        setLoading(false);
        return;
      }

      // Fetch deals permitted by Supabase RLS
      const { data, error: dealsError } = await client
        .from("deals")
        .select(
          "id, conversation_id, amount, currency, status, commission_rate, commission_amount, created_at"
        )
        .order("created_at", { ascending: false });

      if (dealsError) {
        setError(dealsError.message);
      } else {
        setDeals((data || []) as Deal[]);
      }

      setLoading(false);
    }

    loadDeals();
  }, []);

  const cardStyle: React.CSSProperties = {
    background: "#10213d",
    border: "1px solid #294365",
    borderRadius: 14,
    padding: 22,
  };

  const totalValue = deals.reduce(
    (sum, deal) => sum + Number(deal.amount || 0),
    0
  );

  const totalCommission = deals.reduce(
    (sum, deal) => sum + Number(deal.commission_amount || 0),
    0
  );

  const currencies = [
    ...new Set(deals.map((deal) => deal.currency)),
  ];

  const oneCurrency =
    currencies.length === 1 ? currencies[0] : null;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#071225",
        color: "#f5f7ff",
        padding: "50px 20px",
      }}
    >
      <div style={{ maxWidth: 1050, margin: "0 auto" }}>
        <Link
          href="/dashboard"
          style={{
            color: "#e2b365",
            textDecoration: "none",
          }}
        >
          ← Back to Dashboard
        </Link>

        <h1
          style={{
            fontSize: 32,
            marginTop: 15,
            fontWeight: "bold",
          }}
        >
          Nexus Deals & Commissions
        </h1>

        <p style={{ color: "#9db8d9" }}>
          Track transaction values and proposed Nexus commissions.
        </p>

        {loading ? (
          <p style={{ marginTop: 30 }}>
            Loading deals...
          </p>
        ) : error ? (
          <div
            style={{
              ...cardStyle,
              marginTop: 30,
              color: "#ff9292",
            }}
          >
            {error}
          </div>
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 16,
                marginTop: 30,
              }}
            >
              <div style={cardStyle}>
                <p style={{ color: "#9db8d9" }}>
                  Total Deals
                </p>
                <h2 style={{ fontSize: 30 }}>
                  {deals.length}
                </h2>
              </div>

              <div style={cardStyle}>
                <p style={{ color: "#9db8d9" }}>
                  Total Deal Value
                </p>
                <h2 style={{ fontSize: 26 }}>
                  {deals.length === 0
                    ? "0"
                    : oneCurrency
                    ? `${totalValue.toLocaleString()} ${oneCurrency}`
                    : "Multiple currencies"}
                </h2>
              </div>

              <div style={cardStyle}>
                <p style={{ color: "#9db8d9" }}>
                  Calculated Commission
                </p>
                <h2
                  style={{
                    color: "#e2b365",
                    fontSize: 26,
                  }}
                >
                  {deals.length === 0
                    ? "0"
                    : oneCurrency
                    ? `${totalCommission.toLocaleString()} ${oneCurrency}`
                    : "Multiple currencies"}
                </h2>
              </div>
            </div>

            <h2
              style={{
                marginTop: 35,
                marginBottom: 18,
                fontSize: 24,
              }}
            >
              Deal Records
            </h2>

            {deals.length === 0 ? (
              <div style={cardStyle}>
                <p style={{ color: "#9db8d9" }}>
                  No deals recorded yet.
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gap: 16,
                }}
              >
                {deals.map((deal) => (
                  <div
                    key={deal.id}
                    style={cardStyle}
                  >
                    <h3
                      style={{
                        fontSize: 24,
                        marginBottom: 12,
                      }}
                    >
                      {Number(
                        deal.amount
                      ).toLocaleString()}{" "}
                      {deal.currency}
                    </h3>

                    <p>
                      Status:{" "}
                      <strong>{deal.status}</strong>
                    </p>

                    <p style={{ marginTop: 10 }}>
                      Commission Rate:{" "}
                      {Number(
                        deal.commission_rate
                      ) * 100}
                      %
                    </p>

                    <p
                      style={{
                        color: "#e2b365",
                        marginTop: 10,
                      }}
                    >
                      Calculated Commission:{" "}
                      {Number(
                        deal.commission_amount
                      ).toLocaleString()}{" "}
                      {deal.currency}
                    </p>

                    <p
                      style={{
                        color: "#9db8d9",
                        marginTop: 10,
                      }}
                    >
                      Created:{" "}
                      {new Date(
                        deal.created_at
                      ).toLocaleDateString()}
                    </p>

                    <Link
                      href={`/dashboard/messages/${deal.conversation_id}`}
                      style={{
                        display: "inline-block",
                        color: "#e2b365",
                        marginTop: 15,
                      }}
                    >
                      Open Conversation →
                    </Link>
                  </div>
                ))}
              </div>
            )}

            <p
              style={{
                color: "#7792b4",
                marginTop: 30,
                fontSize: 13,
              }}
            >
              Commission calculations are informational
              only. Payment obligations require a
              separately approved agreement.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
