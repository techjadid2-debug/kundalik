import { TelegramError } from './client'

/** Telegram'ning quruq xato matnini tushunarli maslahatga aylantiradi. */
export function explainTelegramError(error: unknown): string {
  if (!(error instanceof TelegramError)) {
    return error instanceof Error ? error.message : String(error)
  }

  const d = error.description.toLowerCase()

  if (d.includes('chat not found')) {
    return "Kanal topilmadi. TELEGRAM_CHANNEL_ID ni tekshiring (@kanal_nomi yoki -100... ko'rinishida)."
  }
  if (d.includes('not enough rights') || d.includes('chat_admin_required')) {
    return "Botning kanalda yozish huquqi yo'q. Botni kanalga administrator qilib qo'shing."
  }
  if (d.includes('bot was kicked') || d.includes('bot is not a member')) {
    return "Bot kanaldan chiqarilgan. Uni qaytadan administrator qilib qo'shing."
  }
  if (d.includes('unauthorized')) {
    return 'TELEGRAM_BOT_TOKEN xato yoki bekor qilingan. @BotFather dan yangi token oling.'
  }
  if (d.includes('failed to get http url content') || d.includes('wrong file identifier')) {
    return "Telegram muqova rasmini yuklab ololmadi. Rasm manzili ochiq bo'lishi kerak."
  }
  if (d.includes('photo_invalid_dimensions') || d.includes('image_process_failed')) {
    return "Rasm o'lchami Telegram uchun mos emas. Boshqa rasm yuklang."
  }
  if (d.includes('message caption is too long')) {
    return "Izoh 1024 belgidan uzun. Lid yoki sarlavhani qisqartiring."
  }
  if (d.includes('message is not modified')) {
    return "O'zgarish yo'q — post allaqachon shu holatda."
  }
  if (d.includes("can't parse entities")) {
    return `Shablondagi HTML noto'g'ri: ${error.description}`
  }

  return error.description
}
