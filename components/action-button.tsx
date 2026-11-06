'use client'

import type { ComponentProps, ReactNode } from 'react'
import { Button, cx } from './ui'

type ActionButtonProps = Omit<ComponentProps<typeof Button>, 'children'> & {
  children: ReactNode
  pending?: boolean
  succeeded?: boolean
  pendingLabel?: string
  successLabel?: string
}

export function ActionButton({
  children,
  pending = false,
  succeeded = false,
  pendingLabel = 'Bajarilmoqda…',
  successLabel = 'Tayyor',
  className,
  disabled,
  ...props
}: ActionButtonProps) {
  const showSuccess = succeeded && !pending

  return (
    <Button
      {...props}
      aria-busy={pending || undefined}
      disabled={disabled || pending}
      className={cx(className, pending && 'cursor-wait')}
    >
      {pending ? <><span className="button-spinner" aria-hidden />{pendingLabel}</> : null}
      {!pending && showSuccess ? <><span aria-hidden>✓</span>{successLabel}</> : null}
      {!pending && !showSuccess ? children : null}
    </Button>
  )
}
