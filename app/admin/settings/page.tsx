import { getSettings } from '@/lib/settings'
import { SettingsForm } from './settings-form'

export const metadata = { title: 'Sozlamalar' }
export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const settings = await getSettings()

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Sozlamalar</h1>
      <p className="mt-1 text-sm text-muted">
        Bot tokeni va kanal id&apos;si muhit o&apos;zgaruvchilarida saqlanadi
        (<code className="text-fg">.env.local</code>), bu yerda emas.
      </p>

      <SettingsForm
        initial={{
          timezone: settings.timezone,
          quoteTimeLocal: settings.quoteTimeLocal,
          channelUsername: settings.channelUsername,
          articleTemplate: settings.articleTemplate,
          quoteTemplate: settings.quoteTemplate,
        }}
      />
    </div>
  )
}
