'use client'

import Link from 'next/link'
import { useLocale, useT } from '@/lib/i18n/provider'
import { interpolate } from '@/lib/i18n'
import { formatDateTime } from '@/lib/format'
import type { MessageNotification } from '@/types/conversation'

export default function NotificationBell({
  open,
  unreadCount,
  notifications,
  onToggle,
  onClose,
}: {
  open: boolean
  unreadCount: number
  notifications: MessageNotification[]
  onToggle: () => void
  onClose: () => void
}) {
  const t = useT()
  const locale = useLocale()

  return (
    <>
      <button
        type="button"
        aria-label={interpolate(t.accountMenu.notifications, { count: unreadCount })}
        aria-expanded={open}
        onClick={onToggle}
        className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition ${
          open
            ? 'border-amber-400 bg-amber-400/15'
            : 'border-slate-600/60 bg-slate-800/70 hover:border-amber-400/60 hover:bg-slate-700'
        }`}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#E5C078"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute -end-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-slate-950 bg-rose-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute end-0 top-full z-50 mt-3 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-700 bg-[#111E32] text-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-700/70 px-4 py-4">
            <div>
              <h3 className="text-sm font-bold">{t.accountMenu.notificationsTitle}</h3>
              <p className="mt-1 text-xs text-slate-400">
                {t.accountMenu.notificationsIntro}
              </p>
            </div>
            <span className="rounded-full bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-300">
              {interpolate(t.accountMenu.unread, { count: unreadCount })}
            </span>
          </div>

          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <div className="mb-2 text-2xl">✨</div>
              <p className="text-sm font-medium">{t.accountMenu.caughtUp}</p>
              <p className="mt-1 text-xs text-slate-400">{t.accountMenu.noUnread}</p>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto p-2">
              {notifications.map(notification => (
                <Link
                  key={notification.conversationId}
                  href={`/dashboard/messages/${notification.conversationId}`}
                  onClick={onClose}
                  className="mb-1 flex items-start gap-3 rounded-xl p-3 transition hover:bg-slate-800"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-400/10 text-lg">
                    💬
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">
                      {notification.senderRoleKey === 'owner'
                        ? t.accountMenu.owner
                        : t.accountMenu.investor}
                    </span>
                    <span className="mt-1 block truncate text-xs text-slate-200">
                      {notification.preview || t.accountMenu.newMessage}
                    </span>
                    <span className="mt-1 block text-xs text-amber-300">
                      {notification.count === 1
                        ? interpolate(t.accountMenu.unreadOne, {
                            count: notification.count,
                          })
                        : interpolate(t.accountMenu.unreadMany, {
                            count: notification.count,
                          })}
                    </span>
                    <span className="mt-1 block text-[11px] text-slate-400">
                      {formatDateTime(notification.latestAt, locale)}
                    </span>
                  </span>
                  <span className="text-amber-300 rtl:rotate-180">→</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}
