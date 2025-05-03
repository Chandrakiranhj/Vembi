'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'

export type CalendarProps = {
  mode?: 'single' | 'range' | 'multiple'
  selected?: Date | { from: Date | undefined; to: Date | undefined } | Date[]
  onSelect?: (selected: Date | { from: Date | undefined; to: Date | undefined } | Date[] | undefined) => void
  numberOfMonths?: number
  initialFocus?: boolean
  className?: string
}

export function Calendar({
  mode = 'single',
  selected,
  onSelect,
  className,
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(new Date())
  
  const handlePrevMonth = () => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev)
      newDate.setMonth(prev.getMonth() - 1)
      return newDate
    })
  }
  
  const handleNextMonth = () => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev)
      newDate.setMonth(prev.getMonth() + 1)
      return newDate
    })
  }
  
  const handleDateSelect = (date: Date) => {
    if (onSelect) {
      if (mode === 'single') {
        onSelect(date)
      } else if (mode === 'range') {
        const range = selected as { from: Date | undefined; to: Date | undefined }
        if (!range?.from) {
          onSelect({ from: date, to: undefined })
        } else if (range.from && !range.to) {
          onSelect({ from: range.from, to: date })
        } else {
          onSelect({ from: date, to: undefined })
        }
      }
    }
  }
  
  // Generate days for the current month
  const days = React.useMemo(() => {
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
    const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
    const daysArray = []
    
    // Add previous month's days to start
    const startDay = firstDay.getDay() // 0 = Sunday, 1 = Monday, etc.
    for (let i = startDay - 1; i >= 0; i--) {
      const prevDate = new Date(firstDay)
      prevDate.setDate(prevDate.getDate() - i - 1)
      daysArray.push({ date: prevDate, isCurrentMonth: false })
    }
    
    // Add current month's days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i)
      daysArray.push({ date, isCurrentMonth: true })
    }
    
    // Add next month's days to fill grid
    const endDay = lastDay.getDay() // 0 = Sunday, 1 = Monday, etc.
    for (let i = 1; i < 7 - endDay; i++) {
      const nextDate = new Date(lastDay)
      nextDate.setDate(nextDate.getDate() + i)
      daysArray.push({ date: nextDate, isCurrentMonth: false })
    }
    
    return daysArray
  }, [currentMonth])
  
  // Check if a date is selected
  const isDateSelected = (date: Date) => {
    if (!selected) return false
    
    if (mode === 'single') {
      const selectedDate = selected as Date
      return selectedDate && date.toDateString() === selectedDate.toDateString()
    } else if (mode === 'range') {
      const range = selected as { from: Date | undefined; to: Date | undefined }
      if (!range?.from) return false
      
      const isFrom = range.from && date.toDateString() === range.from.toDateString()
      const isTo = range.to && date.toDateString() === range.to.toDateString()
      
      // Check if date is between from and to
      if (range.from && range.to) {
        const isInRange = date >= range.from && date <= range.to
        return isFrom || isTo || isInRange
      }
      
      return isFrom || isTo
    }
    
    return false
  }
  
  return (
    <div className={cn("p-3", className)}>
      <div className="flex justify-between items-center mb-2">
        <Button onClick={handlePrevMonth} variant="ghost" size="icon">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="font-medium">
          {format(currentMonth, 'MMMM yyyy')}
        </div>
        <Button onClick={handleNextMonth} variant="ghost" size="icon">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
          <div key={day} className="text-center text-xs text-gray-500">
            {day}
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-1">
        {days.map(({ date, isCurrentMonth }) => (
          <Button
            key={date.toISOString()}
            onClick={() => handleDateSelect(date)}
            variant={isDateSelected(date) ? "default" : "ghost"}
            className={cn(
              "h-9 w-9 p-0 font-normal",
              !isCurrentMonth && "text-gray-400",
              isDateSelected(date) && "bg-primary text-primary-foreground"
            )}
          >
            {date.getDate()}
          </Button>
        ))}
      </div>
    </div>
  )
} 