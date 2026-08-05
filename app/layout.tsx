import type { Metadata } from 'next'
import { Inter, Source_Serif_4 } from 'next/font/google'
import './globals.css'

const ui = Inter({
  variable: '--font-ui',
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
})

const reading = Source_Serif_4({
  variable: '--font-reading',
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Kundalik',
    template: '%s — Kundalik',
  },
  description: 'Maqolalar va kundalik yozuvlar.',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="uz" className={`${ui.variable} ${reading.variable} h-full`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  )
}
