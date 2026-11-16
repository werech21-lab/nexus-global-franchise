import type { Messages } from '@/lib/i18n'

export default function ContactDetails({ t }: { t: Messages }) {
  const rows = [
    {
      label: t.legal.emailLabel,
      value: (
        <a href={`mailto:${t.legal.email}`} dir="ltr" className="text-amber-300 hover:underline">
          {t.legal.email}
        </a>
      ),
    },
    {
      label: t.legal.phoneLabel,
      value: (
        <a href={`tel:${t.legal.phoneHref}`} dir="ltr" className="text-amber-300 hover:underline">
          {t.legal.phone}
        </a>
      ),
    },
    { label: t.legal.addressLabel, value: <span>{t.legal.address}</span> },
    { label: t.legal.founderLabel, value: <span>{t.legal.founder}</span> },
  ]

  return (
    <dl className="card grid gap-4 sm:grid-cols-[10rem_1fr]">
      {rows.map(row => (
        <div key={row.label} className="contents">
          <dt className="text-sm text-slate-400">{row.label}</dt>
          <dd className="text-slate-200">{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}
