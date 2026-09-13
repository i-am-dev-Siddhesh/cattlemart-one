import { cn } from '@/lib/utils'

export function Table({ className, ...props }: React.ComponentProps<'table'>) {
  return (
    <div className="overflow-x-auto">
      <table className={cn('w-full min-w-[520px] text-left text-sm', className)} {...props} />
    </div>
  )
}

export function Th({ className, ...props }: React.ComponentProps<'th'>) {
  return <th className={cn('pb-2 text-xs font-medium text-muted-foreground', className)} {...props} />
}

export function Td({ className, ...props }: React.ComponentProps<'td'>) {
  return <td className={cn('border-t border-border py-2.5', className)} {...props} />
}
