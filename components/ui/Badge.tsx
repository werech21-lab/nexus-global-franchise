import type { ReactNode } from 'react'

export default function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'gold' | 'neutral' | 'success' | 'danger'
}) {
  const classes = {
    gold: 'rounded-full bg-amber-500/15 px-4 py-2 text-sm text-amber-300',
    neutral: 'rounded-full bg-slate-700 px-4 py-2 text-sm',
    success: 'rounded-full bg-green-900/40 px-4 py-2 text-sm text-green-300',
    danger: 'rounded-full bg-red-900/40 px-4 py-2 text-sm text-red-300',
  } as const

  return <span className={classes[tone]}>{children}</span>
}
