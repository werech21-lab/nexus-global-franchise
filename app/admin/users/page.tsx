
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type NexusUser = {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<NexusUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    setAuthorized(false);
    setUsers([]);

    try {
      if (!supabase) {
        throw new Error("Supabase connection is unavailable.");
      }

      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user) {
        throw new Error(
          "Please log in with your administrator account."
        );
      }

      // The database function verifies admin access.
      // Never query auth.users directly from the browser.
      const { data, error: rpcError } = await supabase.rpc(
        "nexus_admin_list_users"
      );

      if (rpcError) {
        throw new Error(
          rpcError.message.toLowerCase().includes("access denied")
            ? "Access denied. Administrator permissions are required."
            : rpcError.message
        );
      }

      setUsers((data ?? []) as NexusUser[]);
      setAuthorized(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load users."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return users;

    return users.filter((user) => {
      return (
        user.email?.toLowerCase().includes(query) ||
        user.full_name?.toLowerCase().includes(query) ||
        user.id.toLowerCase().includes(query)
      );
    });
  }, [users, search]);

  const recentUsers = users.filter((user) => {
    if (!user.created_at) return false;

    const created = new Date(user.created_at).getTime();

    return (
      Number.isFinite(created) &&
      created >= Date.now() - 30 * 24 * 60 * 60 * 1000
    );
  }).length;

  const activeUsers = users.filter(
    (user) => user.last_sign_in_at !== null
  ).length;

  const cardStyle: React.CSSProperties = {
    background: "#10213b",
    border: "1px solid #294261",
    borderRadius: 12,
    padding: 20,
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "13px 15px",
    borderRadius: 9,
    background: "#081629",
    border: "1px solid #294261",
    color: "#ffffff",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#081426",
        color: "#f8fafc",
        padding: "42px 20px",
      }}
    >
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        <Link
          href="/admin"
          style={{
            color: "#f5b942",
            textDecoration: "none",
            fontSize: 14,
          }}
        >
          ← Back to Admin Dashboard
        </Link>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 16,
            marginTop: 24,
            marginBottom: 26,
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 30,
                fontWeight: 800,
                margin: "0 0 8px",
              }}
            >
              👥 Nexus Users Management
            </h1>

            <p style={{ color: "#94a3b8", margin: 0 }}>
              Nexus Global Franchise — Administrator Center
            </p>
          </div>

          <button
            onClick={() => void loadUsers()}
            disabled={loading}
            style={{
              background: "#f5b942",
              color: "#081426",
              padding: "12px 18px",
              border: 0,
              borderRadius: 8,
              fontWeight: 700,
              cursor: loading ? "wait" : "pointer",
              opacity: loading ? 0.65 : 1,
            }}
          >
            {loading ? "Loading..." : "↻ Refresh Users"}
          </button>
        </div>

        {loading && (
          <div style={cardStyle}>
            Loading users and verifying administrator access...
          </div>
        )}

        {!loading && error && (
          <div
            role="alert"
            style={{
              ...cardStyle,
              borderColor: "#ef4444",
              color: "#fecaca",
            }}
          >
            <strong>Unable to access users</strong>
            <p style={{ marginBottom: 0 }}>{error}</p>
          </div>
        )}

        {!loading && authorized && (
          <>
            <p
              style={{
                color: "#34d399",
                fontSize: 13,
                marginBottom: 20,
              }}
            >
              ✓ Administrator access verified
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 16,
                marginBottom: 28,
              }}
            >
              <div style={cardStyle}>
                <p style={{ color: "#94a3b8" }}>
                  Total Registered Users
                </p>
                <h2 style={{ fontSize: 32, marginBottom: 0 }}>
                  {users.length}
                </h2>
              </div>

              <div style={cardStyle}>
                <p style={{ color: "#94a3b8" }}>
                  Signed In At Least Once
                </p>
                <h2
                  style={{
                    color: "#34d399",
                    fontSize: 32,
                    marginBottom: 0,
                  }}
                >
                  {activeUsers}
                </h2>
              </div>

              <div style={cardStyle}>
                <p style={{ color: "#94a3b8" }}>
                  Registered Last 30 Days
                </p>
                <h2
                  style={{
                    color: "#f5b942",
                    fontSize: 32,
                    marginBottom: 0,
                  }}
                >
                  {recentUsers}
                </h2>
              </div>
            </div>

            <div style={cardStyle}>
              <h2 style={{ marginTop: 0, fontSize: 21 }}>
                Registered Users
              </h2>

              <p style={{ color: "#94a3b8", fontSize: 13 }}>
                Search by name, email address, or user ID.
              </p>

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search users..."
                aria-label="Search users"
                style={inputStyle}
              />

              <p
                style={{
                  color: "#94a3b8",
                  fontSize: 13,
                  marginTop: 16,
                }}
              >
                Showing {filteredUsers.length} of {users.length} users
              </p>

              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    minWidth: 750,
                    textAlign: "left",
                    fontSize: 13,
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        color: "#f5b942",
                        borderBottom: "1px solid #294261",
                      }}
                    >
                      {[
                        "User",
                        "Email",
                        "Registered",
                        "Last Sign In",
                        "User ID",
                      ].map((heading) => (
                        <th
                          key={heading}
                          style={{ padding: "15px 10px" }}
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr
                        key={user.id}
                        style={{
                          borderBottom: "1px solid #294261",
                        }}
                      >
                        <td style={{ padding: "15px 10px" }}>
                          <strong>
                            {user.full_name?.trim() ||
                              "Unnamed User"}
                          </strong>
                        </td>

                        <td style={{ padding: "15px 10px" }}>
                          {user.email || "Not available"}
                        </td>

                        <td style={{ padding: "15px 10px" }}>
                          {formatDate(user.created_at)}
                        </td>

                        <td style={{ padding: "15px 10px" }}>
                          {formatDate(user.last_sign_in_at)}
                        </td>

                        <td
                          style={{
                            padding: "15px 10px",
                            color: "#94a3b8",
                            fontFamily: "monospace",
                          }}
                        >
                          {user.id.slice(0, 8)}...
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredUsers.length === 0 && (
                  <p
                    style={{
                      textAlign: "center",
                      color: "#94a3b8",
                      padding: 24,
                    }}
                  >
                    No matching users found.
                  </p>
                )}
              </div>
            </div>

            <p
              style={{
                color: "#64748b",
                fontSize: 12,
                marginTop: 22,
              }}
            >
              User information is read-only. Access is
              controlled by Supabase administrator permissions.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
