import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

type Db = ReturnType<typeof createDb>

function createDb() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL sozlanmagan')
  return drizzle(neon(url), { schema })
}

// Lazy — top-level `neon()` chaqiruvi build vaqtida env yo'q bo'lsa `next build` ni yiqitadi.
// Proxy ishlatilmaydi (kutubxonalar obyektni tekshirganda sinadi).
let _db: Db | null = null

export function getDb(): Db {
  if (!_db) _db = createDb()
  return _db
}

export { schema }
