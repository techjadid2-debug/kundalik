# Kundalik

Maqola yozish va ularni shablon bo'yicha Telegram kanalga chop etish uchun sayt.
Maqola ichida belgilangan gaplar alohida navbatga tushadi va kuniga bir marta
kanalga mustaqil iqtibos posti bo'lib chiqadi.

## Ishga tushirish

```bash
npm install
npm run db:push      # sxemani Neon'ga yuklaydi
npm run dev
```

`.env.local` fayli `vercel link` va integratsiyalar orqali to'ldirilgan.
Qo'lda to'ldiriladigan qiymatlar `.env.example` da ko'rsatilgan.

### Telegram

1. [@BotFather](https://t.me/BotFather) da `/newbot` — token oling.
2. Botni kanalingizga **administrator** qilib qo'shing (*Post Messages* huquqi bilan).
3. `.env.local` ga yozing:
   ```
   TELEGRAM_BOT_TOKEN=123456:AA...
   TELEGRAM_CHANNEL_ID=@kanal_nomi
   ```
4. Tekshiring:
   ```bash
   npm run verify:telegram
   ```

## Qanday ishlaydi

**Yozish** → `/admin/write/[id]`. Matn 1.2 soniyada avtomatik saqlanadi.

**Iqtibos belgilash** → gapni tanlang, chiqqan panelda **Iqtibos** ni bosing
(yoki `⌘⇧Q`). Belgilangan gaplar yon panelda ro'yxat bo'lib turadi.

**Chop etish** → *Kanalga chop etish*. Muqova rasmi `sendPhoto` bilan yuboriladi,
shablon `caption` ga tushadi. Telegram izohi **1024 belgi** bilan cheklangani uchun
lid avtomatik, so'z chegarasida qisqartiriladi — editorda hisoblagich real vaqtda
qancha qolganini ko'rsatib turadi. Qayta bosilsa yangi post emas, mavjud post
yangilanadi (`editMessageMedia`).

**Kunlik iqtibos** → `vercel.json` dagi cron har kuni `/api/cron/quote` ni chaqiradi
va navbatdagi bitta iqtibosni jo'natadi. Navbat bo'sh bo'lsa 204 qaytaradi.

## Tekshiruvlar

```bash
npm run verify:render     # shablon renderi, 1024 kesish, iqtibos ajratish
npm run verify:db         # baza aylanmasi, server HTML renderi, cascade
npm run verify:telegram   # bot tokeni va kanal huquqlari
```

Cron'ni lokalda sinash:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" localhost:3000/api/cron/quote
```

## Cron vaqti

`vercel.json` dagi jadval **UTC** bo'yicha. Toshkent = UTC+5:

| Toshkent | cron |
|---|---|
| 09:00 | `0 4 * * *` |
| 12:00 | `0 7 * * *` |
| 20:00 | `0 15 * * *` |

Vercel Hobby tarifida cron kuniga **1 marta** va belgilangan soat ichida ishlaydi
(aniq daqiqada emas). Kuniga bir nechta iqtibos kerak bo'lsa — Vercel Pro yoki
tashqi cron xizmati.

## Tuzilma

```
app/
  page.tsx              ochiq: maqolalar ro'yxati
  [slug]/page.tsx       ochiq: maqola
  admin/                yopiq: yozish, iqtiboslar, sozlamalar
  api/cron/quote/       kunlik iqtibos
lib/
  telegram/render.ts    shablon + 1024 belgi hisobi
  quotes.ts             Tiptap JSON'dan iqtiboslarni ajratish
  editor/iqtibos.ts     custom Tiptap mark
  editor/extensions.ts  client va server AYNAN shu ro'yxatni ishlatadi
proxy.ts                /admin himoyasi (Next 16 da middleware.ts o'rniga)
```
