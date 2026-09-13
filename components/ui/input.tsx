'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { DateField } from '@/components/ui/date-field'

export function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  if (type === 'date') {
    return <DateField className={className} {...props} />
  }
  return <input type={type} className={cn('control', type === 'search' && 'control-search', className)} {...props} />
}
