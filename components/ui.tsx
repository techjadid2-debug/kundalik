import type { ComponentProps, ReactNode } from 'react'

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

const BUTTON_BASE =
  'inline-flex items-center justify-center gap-2 rounded-none border px-4 h-9 text-sm ' +
  'transition-opacity duration-150 disabled:opacity-40 disabled:cursor-not-allowed'

type ButtonProps = ComponentProps<'button'> & {
  variant?: 'solid' | 'outline' | 'ghost'
}

export function Button({ variant = 'outline', className, ...props }: ButtonProps) {
  const styles = {
    solid: 'border-fg bg-fg text-bg hover:opacity-80',
    outline: 'border-line bg-bg text-fg hover:border-fg',
    ghost: 'border-transparent bg-transparent text-muted hover:text-fg',
  }[variant]

  return <button className={cx(BUTTON_BASE, styles, className)} {...props} />
}

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return (
    <input
      className={cx(
        'h-9 w-full rounded-none border border-line bg-bg px-3 text-sm text-fg',
        'placeholder:text-muted focus:border-fg focus:outline-none',
        className,
      )}
      {...props}
    />
  )
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cx(
        'w-full rounded-none border border-line bg-bg px-3 py-2 text-sm text-fg',
        'placeholder:text-muted focus:border-fg focus:outline-none',
        className,
      )}
      {...props}
    />
  )
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs uppercase tracking-wider text-muted">{label}</span>
      {children}
      {hint ? <span className="mt-1.5 block text-xs text-muted">{hint}</span> : null}
    </label>
  )
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'error'; children: ReactNode }) {
  return (
    <p
      role={tone === 'error' ? 'alert' : undefined}
      className={cx(
        'border-l-2 py-1 pl-3 text-sm',
        tone === 'error' ? 'border-fg text-fg' : 'border-line text-muted',
      )}
    >
      {children}
    </p>
  )
}

export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="border border-line px-1.5 py-0.5 text-[11px] uppercase tracking-wider text-muted">
      {children}
    </span>
  )
}
