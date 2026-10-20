    })
    return () => { active = false; subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    if (!account) return
    const userId = account.id
    const refresh = () => { void loadNotifications(userId) }
    refresh()
    const interval = window.setInterval(refresh, 15000)
    window.addEventListener('focus', refresh)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', refresh)
    }
  }, [account?.id, loadNotifications])

  useEffect(() => {
    const outside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
        setBellOpen(false)
      }
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setMenuOpen(false); setBellOpen(false) }
    }
    document.addEventListener('mousedown', outside)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('mousedown', outside)
      document.removeEventListener('keydown', escape)
    }
  }, [])

  async function handleSignOut() {
    const client = supabase
    if (!client || signingOut) return
    setSigningOut(true)
    const { error } = await client.auth.signOut()
    setSigningOut(false)
    if (error) { alert(`Could not sign out: ${error.message}`); return }
    currentUserRef.current = null
    setAccount(null)
    setNotifications([])
    setMenuOpen(false)
    setBellOpen(false)
    router.push('/login')
    router.refresh()
  }

  if (loading) return <div className="h-10 w-28 animate-pulse rounded-full bg-slate-800" />
  if (!account) return (
    <Link href="/login" className="inline-flex h-10 items-center rounded-full border border-amber-400/40 bg-amber-400/10 px-5 text-sm font-semibold text-amber-200 hover:bg-amber-400/20">
      Sign In
    </Link>
  )

  const initials = account.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || 'U'
  const unreadCount = notifications.reduce((sum, item) => sum + item.count, 0)

  return (
    <div ref={menuRef} className="relative flex items-center gap-2 sm:gap-3">
      <button type="button" aria-label={`Notifications: ${unreadCount} unread`} aria-expanded={bellOpen}
        onClick={() => { setBellOpen((open) => !open); setMenuOpen(false); void loadNotifications(account.id) }}
        className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition ${bellOpen ? 'border-amber-400 bg-amber-400/15' : 'border-slate-600/60 bg-slate-800/70 hover:border-amber-400/60 hover:bg-slate-700'}`}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E5C078" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" />
        </svg>
        {unreadCount > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-slate-950 bg-rose-500 px-1 text-[10px] font-bold text-white">{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </button>

      <button type="button" aria-label="Open account menu" aria-expanded={menuOpen}
        onClick={() => { setMenuOpen((open) => !open); setBellOpen(false) }}
        className={`flex h-10 items-center gap-2 rounded-full border py-1 pl-1 pr-3 transition ${menuOpen ? 'border-amber-400 bg-slate-700' : 'border-slate-600/60 bg-slate-800/70 hover:border-amber-400/60 hover:bg-slate-700'}`}>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-600 text-xs font-extrabold text-slate-950">{initials}</span>
        <span className="hidden max-w-32 min-w-0 text-left sm:block">
          <span className="block truncate text-xs font-semibold text-white">{account.name}</span>
          <span className="block text-[10px] text-slate-400">My Account</span>
        </span>
        <span className="text-xs text-amber-300">{menuOpen ? '▴' : '▾'}</span>
      </button>

      {bellOpen && (
        <div className="absolute right-0 top-full z-50 mt-3 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-700 bg-[#111E32] text-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-700/70 px-4 py-4">
            <div><h3 className="text-sm font-bold">Notifications</h3><p className="mt-1 text-xs text-slate-400">Your latest conversations</p></div>
            <span className="rounded-full bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-300">{unreadCount} unread</span>
          </div>
          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center"><div className="mb-2 text-2xl">✨</div><p className="text-sm font-medium">You are all caught up!</p><p className="mt-1 text-xs text-slate-400">No unread messages</p></div>
          ) : (
            <div className="max-h-80 overflow-y-auto p-2">
              {notifications.map((notification) => (
                <Link key={notification.conversationId} href={`/dashboard/messages/${notification.conversationId}`}
                  onClick={() => setBellOpen(false)} className="mb-1 flex items-start gap-3 rounded-xl p-3 transition hover:bg-slate-800">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-400/10 text-lg">💬</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">New message{notification.count > 1 ? 's' : ''}</span>
                    <span className="mt-1 block text-xs text-amber-300">{notification.count} unread message{notification.count > 1 ? 's' : ''}</span>
                    <span className="mt-1 block text-[11px] text-slate-400">{new Date(notification.latestAt).toLocaleString()}</span>
                  </span><span className="text-amber-300">→</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {menuOpen && (
        <div className="absolute right-0 top-full z-50 mt-3 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-700 bg-[#111E32] text-white shadow-2xl">
          <div className="bg-gradient-to-r from-slate-800 to-[#17263D] p-4">
            <div className="flex items-center gap-3"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-600 font-bold text-slate-950">{initials}</span><div className="min-w-0"><p className="truncate text-sm font-bold">{account.name}</p><p className="mt-1 text-xs text-slate-400">Nexus Member</p></div></div>
          </div>
          <div className="space-y-3 border-b border-slate-700/70 p-4">
            <div><p className="mb-1 text-[11px] text-slate-400">Full Name</p><p className="break-words text-sm font-medium">{account.name}</p></div>
            <div><p className="mb-1 text-[11px] text-slate-400">Email Address</p><p className="break-all text-sm text-amber-200">{account.email}</p></div>
          </div>
          <div className="space-y-1 p-2">
            <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm hover:bg-slate-800"><span>📊</span> My Dashboard</Link>
            <button type="button" onClick={handleSignOut} disabled={signingOut} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"><span>↪</span>{signingOut ? 'Signing out...' : 'Sign Out'}</button>
          </div>
        </div>
      )}
    </div>
  )
}
