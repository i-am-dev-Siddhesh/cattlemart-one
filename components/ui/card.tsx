import { cn } from '@/lib/utils'

export function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('surface rounded-xl p-5', className)} {...props} />
}

export function CardTitle({ className, ...props }: React.ComponentProps<'h3'>) {
  return <h3 className={cn('text-base font-semibold tracking-tight', className)} {...props} />
}

export function CardHint({ className, ...props }: React.ComponentProps<'p'>) {
  return <p className={cn('text-xs font-medium text-muted-foreground', className)} {...props} />
}
