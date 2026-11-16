import Link from 'next/link'
import type { ReactNode } from 'react'

export default function PageShell({
  kicker,
  title,
  intro,
  backHref,
  backLabel,
  actions,
  children,
  wide = false,
}: {
  kicker?: string
  title?: string
  intro?: string
  backHref?: string
  backLabel?: string
  actions?: ReactNode
  children: ReactNode
  wide?: boolean
}) {
  return (
    <section className={`space-y-8 py-8 ${wide ? '' : ''}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          {backHref && backLabel ? (
            <Link href={backHref} className="inline-block text-amber-300">
              <span className="inline-block rtl:rotate-180">←</span>{' '}
              {backLabel}
            </Link>
          ) : null}
          {kicker ? (
            <p className="text-sm uppercase tracking-widest text-amber-300">
              {kicker}
            </p>
          ) : null}
          {title ? <h1 className="text-3xl font-bold md:text-4xl">{title}</h1> : null}
          {intro ? <p className="max-w-2xl text-slate-300">{intro}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
      </div>
      {children}
    </section>
  )
}
