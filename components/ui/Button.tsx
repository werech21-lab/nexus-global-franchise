import Link from 'next/link'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

const variants = {
  primary: 'btn',
  secondary:
    'inline-block rounded-[10px] border border-slate-600 bg-slate-800 px-[18px] py-[11px] font-bold text-slate-100',
  danger:
    'inline-block rounded-[10px] bg-red-600 px-4 py-2 font-bold text-white disabled:opacity-50',
  ghost:
    'inline-block rounded-[10px] border border-slate-600 px-4 py-2 font-semibold text-slate-100',
} as const

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  href?: string
  variant?: keyof typeof variants
  children: ReactNode
}

export default function Button({
  href,
  variant = 'primary',
  className = '',
  children,
  ...props
}: Props) {
  const classes = `${variants[variant]} ${className}`.trim()

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    )
  }

  return (
    <button type="button" className={classes} {...props}>
      {children}
    </button>
  )
}
