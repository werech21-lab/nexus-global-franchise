import type { ReactNode } from 'react'

const styles = {
  error: 'rounded-lg border border-red-700 bg-red-950 p-3 text-red-300',
  success: 'rounded-lg border border-green-700 bg-green-950 p-3 text-green-300',
  warning: 'rounded-lg border border-amber-600 bg-amber-900/20 p-3 text-amber-300',
  info: 'rounded-lg border border-slate-600 bg-slate-900 p-3 text-slate-300',
} as const

export default function Alert({
  tone = 'info',
  children,
  role,
}: {
  tone?: keyof typeof styles
  children: ReactNode
  role?: 'alert' | 'status' | 'note'
}) {
  return (
    <div role={role} className={styles[tone]}>
      {children}
    </div>
  )
}
