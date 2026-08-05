import Link from 'next/link'
import { ThemeToggle } from '@/components/theme-toggle'
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
            <Link href="/admin" className="-mx-2 rounded-md px-2 py-1 hover:bg-hover hover:text-fg">
              Maqolalar
            </Link>
            <Link href="/admin/quotes" className="-mx-2 rounded-md px-2 py-1 hover:bg-hover hover:text-fg">
              Iqtiboslar
            </Link>
            <Link href="/admin/settings" className="-mx-2 rounded-md px-2 py-1 hover:bg-hover hover:text-fg">
              Sozlamalar
            </Link>
            <Link href="/" className="-mx-2 rounded-md px-2 py-1 hover:bg-hover hover:text-fg">
              Sayt ↗
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-4">
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  )
}
