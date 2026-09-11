import { cn } from '@/lib/utils'

export function Select({ className, children, ...props }: React.ComponentProps<'select'>) {
  return (
    <select className={cn('control', className)} {...props}>
      {children}
    </select>
  )
}
