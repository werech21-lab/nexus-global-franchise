      const records = (dealData || []) as Deal[];
      if (!records.length) { setDeals([]); return; }
      const ids = [...new Set(records.map((deal) => deal.conversation_id))];
      const { data: conversationData, error: conversationError } = await supabase
        .from("conversations").select("id, investor_id, owner_id").in("id", ids);
      if (conversationError) throw conversationError;
      const conversations = new Map(((conversationData || []) as Conversation[]).map((c) => [c.id, c]));
      setDeals(records.map((deal) => ({
        ...deal,
        isInvestor: conversations.get(deal.conversation_id)?.investor_id === userId,
        isOwner: conversations.get(deal.conversation_id)?.owner_id === userId,
      })).filter((deal) => deal.isInvestor || deal.isOwner));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load deals.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadDeals(); }, [loadDeals]);

  async function approveDeal(deal: DealWithRole, role: "investor" | "owner") {
    if (savingId || deal.status === "completed") return;
    if (role === "investor" ? !deal.isInvestor || deal.investor_approved : !deal.isOwner || deal.owner_approved) return;
    if (!window.confirm(`Confirm your approval of this ${money(deal.amount, deal.currency)} deal?`)) return;
    setSavingId(deal.id); setError(""); setSuccess("");
    try {
      if (!supabase) throw new Error("Supabase connection unavailable.");
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) throw new Error("Please log in first.");
      const { data: conversation, error: conversationError } = await supabase
        .from("conversations").select("investor_id, owner_id").eq("id", deal.conversation_id).single();
      if (conversationError) throw conversationError;
      if (authData.user.id !== (role === "investor" ? conversation.investor_id : conversation.owner_id)) {
        throw new Error("You are not authorized to approve this deal.");
      }
      const column = role === "investor" ? "investor_approved" : "owner_approved";
      const { data, error: updateError } = await supabase.from("deals")
        .update({ [column]: true }).eq("id", deal.id).eq("conversation_id", deal.conversation_id)
        .eq(column, false).select("id").maybeSingle();
      if (updateError) throw updateError;
      if (!data) throw new Error("Approval was not saved. The deal may already be approved.");
      await loadDeals();
      setSuccess("Approval recorded successfully. Deal status has been refreshed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve deal.");
    } finally { setSavingId(null); }
  }

  const currencies = [...new Set(deals.map((d) => d.currency))];
  const currency = currencies.length === 1 ? currencies[0] : null;
  const totalValue = deals.reduce((sum, d) => sum + Number(d.amount || 0), 0);
  const totalCommission = deals.reduce((sum, d) => sum + Number(d.commission_amount || 0), 0);
  const completed = deals.filter((d) => d.status === "completed").length;

  return (
    <main style={{ maxWidth: 1050, margin: "50px auto", padding: "0 20px 60px", color: "#f1f5f9" }}>
      <Link href="/dashboard" style={{ color: gold, textDecoration: "none" }}>← Back to Dashboard</Link>
      <h1 style={{ fontSize: 30, marginTop: 15 }}>Nexus Deals & Commissions</h1>
      <p style={{ color: muted }}>Deal progress, approval history and calculated commissions.</p>
      {error && <div role="alert" style={{ background: "#481b29", padding: 14, borderRadius: 8, marginBottom: 16 }}>{error}</div>}
      {success && <div role="status" style={{ background: "#174d3c", padding: 14, borderRadius: 8, marginBottom: 16 }}>{success}</div>}
      <button type="button" onClick={() => void loadDeals()} disabled={loading || !!savingId}
        style={{ background: "transparent", color: gold, border: "1px solid #51617a", borderRadius: 8, padding: "9px 14px", cursor: "pointer" }}>
        {loading ? "Refreshing..." : "Refresh Deals"}
      </button>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14, marginTop: 22 }}>
        <div style={card}><div style={{ color: muted }}>Total Deals</div><h2>{deals.length}</h2></div>
        <div style={card}><div style={{ color: muted }}>Completed Deals</div><h2 style={{ color: green }}>{completed}</h2></div>
        <div style={card}><div style={{ color: muted }}>Total Deal Value</div><h2>{currency ? money(totalValue, currency) : deals.length ? "Multiple currencies" : "0"}</h2></div>
        <div style={card}><div style={{ color: muted }}>Calculated Commission</div><h2 style={{ color: gold }}>{currency ? money(totalCommission, currency) : deals.length ? "Multiple currencies" : "0"}</h2></div>
      </div>
      <h2 style={{ marginTop: 35 }}>Deal Records</h2>
      {loading ? <p>Loading deals...</p> : !deals.length ? <div style={card}>No deals recorded yet.</div> : (
        <div style={{ display: "grid", gap: 16 }}>
          {deals.map((deal) => {
            const bothApproved = deal.investor_approved && deal.owner_approved;
            return (
              <section key={deal.id} style={card}>
                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <h3 style={{ margin: 0 }}>{money(deal.amount, deal.currency)}</h3>
                  <strong style={{ color: deal.status === "completed" ? green : gold }}>{statusLabel(deal.status)}</strong>
                </div>
                <p style={{ color: muted }}>Your Role: {deal.isInvestor && deal.isOwner ? "Investor & Owner" : deal.isInvestor ? "Investor" : "Owner"}</p>
                <p>Commission Rate: {(Number(deal.commission_rate) * 100).toLocaleString("en-US", { maximumFractionDigits: 4 })}%</p>
                <p style={{ color: gold }}>Calculated Commission: {money(deal.commission_amount, deal.currency)}</p>
                <p style={{ color: muted, fontSize: 13 }}>Created: {dateTime(deal.created_at)}</p>
                <div style={{ borderTop: "1px solid #294261", paddingTop: 16, marginTop: 20 }}>
                  <h3>Approval History</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                    <div style={{ ...card, padding: 15 }}>
                      <strong>Investor: <span style={{ color: deal.investor_approved ? green : gold }}>{deal.investor_approved ? "Approved" : "Pending"}</span></strong>
                      <p style={{ color: muted, marginBottom: 0 }}>Approved at: {dateTime(deal.investor_approved_at)}</p>
                    </div>
                    <div style={{ ...card, padding: 15 }}>
                      <strong>Owner: <span style={{ color: deal.owner_approved ? green : gold }}>{deal.owner_approved ? "Approved" : "Pending"}</span></strong>
                      <p style={{ color: muted, marginBottom: 0 }}>Approved at: {dateTime(deal.owner_approved_at)}</p>
                    </div>
                  </div>
                  {deal.status !== "completed" && deal.isInvestor && !deal.investor_approved && (
                    <button type="button" disabled={!!savingId} onClick={() => void approveDeal(deal, "investor")}
                      style={{ marginTop: 14, marginRight: 10, background: gold, color: "#081528", border: 0, borderRadius: 7, padding: "11px 16px", fontWeight: 700, cursor: "pointer" }}>
                      {savingId === deal.id ? "Saving..." : "Approve as Investor"}
                    </button>
                  )}
                  {deal.status !== "completed" && deal.isOwner && !deal.owner_approved && (
                    <button type="button" disabled={!!savingId} onClick={() => void approveDeal(deal, "owner")}
                      style={{ marginTop: 14, background: gold, color: "#081528", border: 0, borderRadius: 7, padding: "11px 16px", fontWeight: 700, cursor: "pointer" }}>
                      {savingId === deal.id ? "Saving..." : "Approve as Owner"}
                    </button>
                  )}
                  <p style={{ color: bothApproved ? green : muted }}>
                    {bothApproved ? "Both parties have approved this deal." : "Waiting for both parties to approve."}
                  </p>
                  {deal.status === "completed" && !bothApproved && (
                    <p style={{ color: gold }}>Legacy completed deal: approval records are incomplete.</p>
                  )}
                </div>
                <div style={{ borderTop: "1px solid #294261", paddingTop: 16, marginTop: 20 }}>
                  <h3>Commission Payment</h3>
                  <p style={{ color: gold, marginBottom: 6 }}>Calculated: {money(deal.commission_amount, deal.currency)}</p>
                  <p style={{ color: muted, marginTop: 0 }}>Payment status: Not tracked in the current database.</p>
                  <p style={{ color: muted, fontSize: 13 }}>A completed deal or approval does not confirm that commission has been paid.</p>
                </div>
                <Link href={`/dashboard/messages/${deal.conversation_id}`} style={{ color: gold }}>Open Conversation →</Link>
              </section>
            );
          })}
        </div>
      )}
