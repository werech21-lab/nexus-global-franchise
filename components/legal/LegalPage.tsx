import type { ReactNode } from 'react'

type LegalSection = { heading: string; body: string[] }

export default function LegalPage({
  title,
  intro,
  updated,
  note,
  sections = [],
  children,
}: {
  title: string
  intro: string
  updated?: string
  note?: string
  sections?: LegalSection[]
  children?: ReactNode
}) {
  return (
    <article className="mx-auto max-w-3xl space-y-8 py-10">
      <header className="space-y-3">
        <h1 className="text-3xl font-bold">{title}</h1>
        {updated ? <p className="text-sm text-slate-400">{updated}</p> : null}
        <p className="leading-8 text-slate-300">{intro}</p>
      </header>

      {sections.map(section => (
        <section key={section.heading} className="space-y-3">
          <h2 className="text-xl font-semibold">{section.heading}</h2>
          {section.body.map(paragraph => (
            <p key={paragraph} className="leading-8 text-slate-300">
              {paragraph}
            </p>
          ))}
        </section>
      ))}

      {children}

      {note ? (
        <p className="rounded-xl border border-slate-700 p-4 text-sm text-slate-400">{note}</p>
      ) : null}
    </article>
  )
}
