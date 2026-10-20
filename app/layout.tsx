
import './globals.css'
import Link from 'next/link'
import AccountMenu from './components/AccountMenu'

export const metadata = {
  title: 'Nexus Global Franchise',
  description:
    'Global franchise, business sale and partnership opportunities',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <header className="border-b border-slate-700 p-5">
          <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
            <Link href="/" className="text-xl font-bold">
              🌐 Nexus Global Franchise
            </Link>

            <div className="flex items-center gap-5">
              <Link href="/listings">Explore</Link>
              <Link href="/dashboard">Dashboard</Link>
              <AccountMenu />
            </div>
          </nav>
        </header>

        <main className="mx-auto max-w-6xl p-6">
          {children}
        </main>
      </body>
    </html>
  )
}
