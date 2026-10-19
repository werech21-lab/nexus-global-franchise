import './globals.css'
import Link from 'next/link'
export const metadata = { title:'Nexus Global Franchise', description:'Global franchise, business sale and partnership opportunities' }
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="en"><body><header className="border-b border-slate-700 p-5"><nav className="mx-auto max-w-6xl flex flex-wrap items-center justify-between gap-4"><Link href="/" className="font-bold text-xl">🌐 Nexus Global Franchise</Link><div className="flex gap-5"><Link href="/listings">Explore</Link><Link href="/dashboard">Dashboard</Link><Link href="/login">Login</Link></div></nav></header><main className="mx-auto max-w-6xl p-6">{children}</main></body></html>}
