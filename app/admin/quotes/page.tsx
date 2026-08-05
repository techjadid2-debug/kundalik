import Link from 'next/link'
import { listQuotes } from '@/lib/quote-queue'
import { getSettings } from '@/lib/settings'
import { formatDate } from '@/lib/telegram/render'
import { QuoteRow } from './quote-row'

export const metadata = { title: 'Iqtiboslar' }
export const dynamic = 'force-dynamic'

export default async function QuotesPage() {
  const [all, settings] = await Promise.all([listQuotes(), getSettings()])

  const pending = all.filter((r) => r.quote.status === 'pending')
  const sent = all.filter((r) => r.quote.status === 'sent')
  const skipped = all.filter((r) => r.quote.status === 'skipped')

  // Faqat chop etilgan maqoladagi iqtibos cron orqali ketadi
  const ready = pending.filter((r) => r.article.status === 'published')
  const waiting = pending.filter((r) => r.article.status !== 'published')

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Iqtiboslar</h1>
      <p className="mt-1 text-sm text-muted">
        Har kuni soat {settings.quoteTimeLocal} ({settings.timezone}) da navbatdagi bitta
        iqtibos kanalga chiqadi.
      </p>

      <Section title={`Navbatda — ${ready.length}`}>
        {ready.length === 0 ? (
          <Empty>
            Navbat bo&apos;sh. Maqola ichida gapni tanlab <b className="text-fg">Iqtibos</b> deb
            belgilang.
          </Empty>
        ) : (
          ready.map((row, index) => (
            <QuoteRow
              key={row.quote.id}
              id={row.quote.id}
              text={row.quote.text}
              status="pending"
              articleTitle={row.article.title}
              articleId={row.article.id}
              note={index === 0 ? 'Keyingi' : undefined}
            />
          ))
        )}
      </Section>

      {waiting.length > 0 ? (
        <Section title={`Maqola chop etilishini kutmoqda — ${waiting.length}`}>
          {waiting.map((row) => (
            <QuoteRow
              key={row.quote.id}
              id={row.quote.id}
              text={row.quote.text}
              status="pending"
              articleTitle={row.article.title}
              articleId={row.article.id}
              disabled
              note="Qoralama"
            />
          ))}
        </Section>
      ) : null}

      {skipped.length > 0 ? (
        <Section title={`O'tkazib yuborilgan — ${skipped.length}`}>
          {skipped.map((row) => (
            <QuoteRow
              key={row.quote.id}
              id={row.quote.id}
              text={row.quote.text}
              status="skipped"
              articleTitle={row.article.title}
              articleId={row.article.id}
            />
          ))}
        </Section>
      ) : null}

      {sent.length > 0 ? (
        <Section title={`Jo'natilgan — ${sent.length}`}>
          {sent.map((row) => (
            <div key={row.quote.id} className="flex gap-4 border-b border-line py-3 last:border-0">
              <span className="w-24 shrink-0 text-xs text-muted">
                {row.quote.sentAt ? formatDate(row.quote.sentAt, settings.timezone) : ''}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-relaxed">{row.quote.text}</p>
                <Link
                  href={`/admin/write/${row.article.id}`}
                  className="mt-1 inline-block text-xs text-muted underline underline-offset-4 hover:text-fg"
                >
                  {row.article.title || 'Sarlavhasiz'}
                </Link>
              </div>
            </div>
          ))}
        </Section>
      ) : null}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="mb-3 text-xs uppercase tracking-wider text-muted">{title}</h2>
      <div className="border-t border-line">{children}</div>
    </section>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="border-b border-dashed border-line px-4 py-10 text-center text-sm text-muted">
      {children}
    </p>
  )
}
