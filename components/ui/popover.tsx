'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface PopoverProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

export function Popover({ open, onOpenChange, children }: PopoverProps) {
  const [isOpen, setIsOpen] = React.useState(open || false)

  React.useEffect(() => {
    if (open !== undefined) {
      setIsOpen(open)
    }
  }, [open])

  const handleOpenChange = (newOpen: boolean) => {
    setIsOpen(newOpen)
    onOpenChange?.(newOpen)
  }

  return (
    <div className="relative inline-block">
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          if (child.type === PopoverTrigger) {
            return React.cloneElement(child as React.ReactElement<any>, {
              onClick: () => handleOpenChange(!isOpen),
            })
          }
          if (child.type === PopoverContent) {
            return isOpen && child
          }
        }
        return child
      })}
    </div>
  )
}

interface PopoverTriggerProps {
  asChild?: boolean
  children: React.ReactNode
  onClick?: () => void
}

export function PopoverTrigger({ asChild, children, onClick }: PopoverTriggerProps) {
  const childElement = asChild ? React.Children.only(children) : (
    <button type="button">{children}</button>
  )

  if (React.isValidElement(childElement)) {
    return React.cloneElement(childElement as React.ReactElement<any>, {
      onClick: (e: React.MouseEvent) => {
        childElement.props.onClick?.(e)
        onClick?.()
      },
    })
  }

  return childElement
}

interface PopoverContentProps {
  className?: string
  align?: 'start' | 'center' | 'end'
  children: React.ReactNode
}

export function PopoverContent({ className, align = 'center', children }: PopoverContentProps) {
  const alignClasses = {
    start: 'left-0',
    center: 'left-1/2 -translate-x-1/2',
    end: 'right-0',
  }

  return (
    <div
      className={cn(
        "absolute z-50 mt-2 rounded-md border bg-white p-4 shadow-md animate-in fade-in-80",
        alignClasses[align],
        className
      )}
    >
      {children}
    </div>
  )
} 