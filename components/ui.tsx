import type { ComponentProps, ReactNode } from 'react'

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

const BUTTON_BASE =
  'inline-flex items-center justify-center gap-2 rounded-md border px-4 h-9 text-sm ' +
  'button-motion select-none disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100'

type ButtonProps = ComponentProps<'button'> & {
  variant?: 'solid' | 'outline' | 'ghost'
}

export function Button({ variant = 'outline', className, ...props }: ButtonProps) {
  const styles = {
    solid: 'border-fg bg-fg text-bg hover:opacity-85',
    outline: 'border-line bg-bg text-fg hover:border-fg hover:bg-hover',
    ghost: 'border-transparent bg-transparent text-muted hover:bg-hover hover:text-fg',
  }[variant]

  return <button className={cx(BUTTON_BASE, styles, className)} {...props} />
}

const CONTROL =
  'w-full rounded-md border border-line bg-bg text-sm text-fg placeholder:text-muted ' +
  'hover:border-muted focus:border-fg focus:outline-none'

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cx(CONTROL, 'h-9 px-3', className)} {...props} />
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cx(CONTROL, 'px-3 py-2 resize-y', className)} {...props} />
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs uppercase tracking-wider text-muted">{label}</span>
      {children}
      {hint ? <span className="mt-1.5 block text-xs text-muted">{hint}</span> : null}
    </label>
  )
}

export function Notice({
  tone = 'info',
  children,
}: {
  tone?: 'info' | 'error'
  children: ReactNode
}) {
  return (
    <p
      role={tone === 'error' ? 'alert' : undefined}
      className={cx(
        'rounded-md border px-3 py-2 text-sm leading-relaxed',
        tone === 'error'
          ? 'border-fg bg-surface text-fg'
          : 'border-line bg-surface text-muted',
      )}
    >
      {children}
    </p>
  )
}

export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-line px-2 py-0.5 text-[11px] uppercase tracking-wider text-muted">
      {children}
    </span>
  )
}
