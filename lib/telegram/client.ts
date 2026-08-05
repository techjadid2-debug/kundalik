const API_ROOT = 'https://api.telegram.org'

export class TelegramError extends Error {
  constructor(
    readonly method: string,
    readonly description: string,
    readonly errorCode?: number,
  ) {
    super(`Telegram ${method}: ${description}`)
    this.name = 'TelegramError'
  }
}

function botToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) throw new TelegramError('config', 'TELEGRAM_BOT_TOKEN sozlanmagan')
  return token
}

export function channelId(): string {
  const id = process.env.TELEGRAM_CHANNEL_ID
  if (!id) throw new TelegramError('config', 'TELEGRAM_CHANNEL_ID sozlanmagan')
  return id
}

type TelegramResponse<T> =
  | { ok: true; result: T }
  | { ok: false; description?: string; error_code?: number; parameters?: { retry_after?: number } }

async function call<T>(method: string, payload: Record<string, unknown>, attempt = 0): Promise<T> {
  const res = await fetch(`${API_ROOT}/bot${botToken()}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
    cache: 'no-store',
  })

  const data = (await res.json().catch(() => null)) as TelegramResponse<T> | null

  if (!data) throw new TelegramError(method, `Javob o'qib bo'lmadi (HTTP ${res.status})`)

  if (!data.ok) {
    // Flood control — bir marta kutib qayta urinamiz
    const retryAfter = data.parameters?.retry_after
    if (res.status === 429 && retryAfter && attempt === 0) {
      await new Promise((r) => setTimeout(r, Math.min(retryAfter, 30) * 1000))
      return call<T>(method, payload, attempt + 1)
    }
    throw new TelegramError(method, data.description ?? `HTTP ${res.status}`, data.error_code)
  }

  return data.result
}

export type SentMessage = { message_id: number }

export function sendPhoto(opts: { photoUrl: string; caption: string }): Promise<SentMessage> {
  return call<SentMessage>('sendPhoto', {
    chat_id: channelId(),
    photo: opts.photoUrl,
    caption: opts.caption,
    parse_mode: 'HTML',
  })
}

export function sendMessage(opts: {
  text: string
  showLinkPreview?: boolean
}): Promise<SentMessage> {
  return call<SentMessage>('sendMessage', {
    chat_id: channelId(),
    text: opts.text,
    parse_mode: 'HTML',
    link_preview_options: opts.showLinkPreview
      ? { is_disabled: false, prefer_large_media: true }
      : { is_disabled: true },
  })
}

/**
 * Chop etilgan postni yangilaydi. `editMessageMedia` tanlandi (caption emas), chunki
 * u muqova rasmi almashtirilgan holatni ham qamrab oladi.
 */
export function editPhotoPost(opts: {
  messageId: number
  photoUrl: string
  caption: string
}): Promise<SentMessage | true> {
  return call<SentMessage | true>('editMessageMedia', {
    chat_id: channelId(),
    message_id: opts.messageId,
    media: {
      type: 'photo',
      media: opts.photoUrl,
      caption: opts.caption,
      parse_mode: 'HTML',
    },
  })
}

export function deleteMessage(messageId: number): Promise<boolean> {
  return call<boolean>('deleteMessage', {
    chat_id: channelId(),
    message_id: messageId,
  })
}

export function getMe(): Promise<{ id: number; username: string; first_name: string }> {
  return call('getMe', {})
}

/** Bot kanalga admin sifatida qo'shilganini tekshiradi. */
export async function checkChannelAccess(): Promise<{ ok: true } | { ok: false; reason: string }> {
  try {
    const me = await getMe()
    await call('getChatMember', { chat_id: channelId(), user_id: me.id })
    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof TelegramError ? error.description : String(error),
    }
  }
}
