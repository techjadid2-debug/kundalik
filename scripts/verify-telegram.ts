/**
 * Telegram ulanishini tekshiradi: token to'g'rimi, bot kanalga admin sifatida
 * qo'shilganmi, va yozish huquqi bormi.
 *   npm run verify:telegram
 */
import { getMe, channelId, TelegramError } from '../lib/telegram/client'
import { explainTelegramError } from '../lib/telegram/errors'

async function main() {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.error("✗ TELEGRAM_BOT_TOKEN to'ldirilmagan (.env.local)")
    process.exit(1)
  }
  if (!process.env.TELEGRAM_CHANNEL_ID) {
    console.error("✗ TELEGRAM_CHANNEL_ID to'ldirilmagan (.env.local)")
    process.exit(1)
  }

  let me
  try {
    me = await getMe()
    console.log(`✓ Bot: @${me.username} (${me.first_name})`)
  } catch (error) {
    console.error(`✗ Token ishlamadi: ${explainTelegramError(error)}`)
    process.exit(1)
  }

  const chat = channelId()

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getChatMember`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chat_id: chat, user_id: me.id }),
      },
    )
    const data = (await res.json()) as {
      ok: boolean
      description?: string
      result?: { status: string; can_post_messages?: boolean }
    }

    if (!data.ok) {
      throw new TelegramError('getChatMember', data.description ?? 'noma\'lum xato')
    }

    const status = data.result?.status
    if (status !== 'administrator' && status !== 'creator') {
      console.error(`✗ Bot kanalda "${status}" — administrator emas.`)
      console.error('  Kanal → Administrators → Add Admin → botni qo\'shing.')
      process.exit(1)
    }

    if (data.result?.can_post_messages === false) {
      console.error("✗ Botda \"Post Messages\" huquqi yo'q. Kanal sozlamalaridan yoqing.")
      process.exit(1)
    }

    console.log(`✓ Kanal: ${chat} — bot administrator, yozish huquqi bor`)
    console.log('\nHammasi tayyor. Endi maqolani chop etsangiz bo\'ladi.\n')
  } catch (error) {
    console.error(`✗ Kanalga ulanib bo'lmadi: ${explainTelegramError(error)}`)
    process.exit(1)
  }
}

void main()
