import Link from 'next/link'
import { LogoutButton } from './logout-button'

export default function AdminLayout({ children }: LayoutProps<'/admin'>) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-6">
          <Link href="/admin" className="text-sm font-semibold tracking-tight">
            Kundalik
          </Link>
          <nav className="flex items-center gap-5 text-sm text-muted">
            <Link href="/admin" className="transition-colors hover:text-fg">
              Maqolalar
            </Link>
            <Link href="/admin/quotes" className="transition-colors hover:text-fg">
              Iqtiboslar
            </Link>
            <Link href="/admin/settings" className="transition-colors hover:text-fg">
              Sozlamalar
            </Link>
            <Link href="/" className="transition-colors hover:text-fg">
              Sayt ↗
            </Link>
          </nav>
          <div className="ml-auto">
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  )
}
