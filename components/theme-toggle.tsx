'use client'

import { useSyncExternalStore } from 'react'
import { cx } from './ui'

type Theme = 'light' | 'dark' | 'system'

export const THEME_STORAGE_KEY = 'kundalik-theme'

/**
 * Sahifa chizilishidan OLDIN ishlaydigan skript — mavzu sakrab o'zgarmasligi uchun.
 * `layout.tsx` da <head> ichiga qo'yiladi.
 */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t==='dark'||t==='light')document.documentElement.setAttribute('data-theme',t)}catch(e){}`

// ── Kichik tashqi store ───────────────────────────────────────────────
// Server'da tanlovni bilib bo'lmaydi, shuning uchun useSyncExternalStore:
// SSR'da `null` chiziladi, hidratsiyadan keyin haqiqiy qiymatga o'tadi.

let listeners: Array<() => void> = []

function subscribe(onChange: () => void) {
  listeners.push(onChange)
  // Boshqa yorliqda o'zgarsa ham yangilanadi
  window.addEventListener('storage', onChange)
  return () => {
    listeners = listeners.filter((l) => l !== onChange)
    window.removeEventListener('storage', onChange)
  }
}

function readTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    return stored === 'dark' || stored === 'light' ? stored : 'system'
  } catch {
    return 'system'
  }
}

/** Server'da hech narsa tanlanmagan — hech bir tugma "faol" ko'rinmaydi. */
function readServerTheme(): Theme | null {
  return null
}

function setTheme(next: Theme) {
  const root = document.documentElement
  if (next === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', next)

  try {
    if (next === 'system') localStorage.removeItem(THEME_STORAGE_KEY)
    else localStorage.setItem(THEME_STORAGE_KEY, next)
  } catch {
    // localStorage yopiq bo'lsa ham joriy sahifada ishlaydi
  }

  for (const listener of listeners) listener()
}

// ── Komponent ─────────────────────────────────────────────────────────

const OPTIONS: Array<{ value: Theme; label: string; icon: React.ReactNode }> = [
  {
    value: 'light',
    label: "Yorug'",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
        <circle cx="12" cy="12" r="4.5" />
        <path
          strokeLinecap="round"
          d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4"
        />
      </svg>
    ),
  },
  {
    value: 'system',
    label: 'Tizim',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
        <rect x="2.5" y="4" width="19" height="13" rx="2" />
        <path strokeLinecap="round" d="M8.5 20.5h7" />
      </svg>
    ),
  },
  {
    value: 'dark',
    label: "Qorong'i",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
        <path strokeLinejoin="round" d="M20 14.2A8.2 8.2 0 0 1 9.8 4a8.4 8.4 0 1 0 10.2 10.2Z" />
      </svg>
    ),
  },
]

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useSyncExternalStore(subscribe, readTheme, readServerTheme)

  return (
    <div
      role="radiogroup"
      aria-label="Mavzu"
      className={cx(
        'inline-flex items-center gap-0.5 rounded-full border border-line p-0.5',
        className,
      )}
    >
      {OPTIONS.map((option) => {
        const active = theme === option.value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={option.label}
            title={option.label}
            onClick={() => setTheme(option.value)}
            className={cx(
              'flex size-7 items-center justify-center rounded-full',
              active ? 'bg-fg text-bg' : 'text-muted hover:bg-hover hover:text-fg',
            )}
          >
            <span className="size-4">{option.icon}</span>
          </button>
        )
      })}
    </div>
  )
}
