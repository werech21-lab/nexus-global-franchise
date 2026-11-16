import type { ReactNode } from 'react'

export default function StatCard({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: ReactNode
  tone?: 'default' | 'success' | 'warning'
}) {
  const valueClass =
    tone === 'success'
      ? 'text-green-400'
      : tone === 'warning'
        ? 'text-amber-400'
        : 'text-white'

  return (
    <div className="card">
      <p className="text-slate-400">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${valueClass}`}>{value}</p>
    </div>
  )
}
