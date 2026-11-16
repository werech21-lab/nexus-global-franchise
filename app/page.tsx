import Link from 'next/link'
import FeaturedListings from '@/components/listings/FeaturedListings'
import { getLatestListings } from '@/features/listings/queries'
import { getDictionary } from '@/lib/i18n/dictionary'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const t = await getDictionary()
  const latest = await getLatestListings(3)

  return (
    <div className="space-y-8 py-12">
      <p className="uppercase tracking-widest text-amber-300">{t.home.kicker}</p>
      <h1 className="max-w-3xl text-4xl font-bold leading-tight md:text-5xl">
        {t.home.title}
      </h1>
      <p className="max-w-2xl text-xl text-slate-300">{t.home.intro}</p>
      <div className="flex flex-wrap gap-4">
        <Link className="btn" href="/listings">
          {t.home.explore}
        </Link>
        <Link className="btn" href="/listings/new">
          {t.home.list}
        </Link>
      </div>

      <div className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-4">
        {t.home.cards.map(card => (
          <div className="card" key={card.key}>
            <h2 className="text-xl font-bold">{card.title}</h2>
            <p className="mt-3 text-slate-300">{card.body}</p>
          </div>
        ))}
      </div>

      <FeaturedListings listings={latest} messages={t} />
    </div>
  )
}
