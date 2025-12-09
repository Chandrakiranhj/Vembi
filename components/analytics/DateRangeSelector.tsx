"use client"

import * as React from "react"
import { addDays, format, subDays, subMonths, startOfMonth, endOfMonth } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface DateRangeSelectorProps {
    className?: string
    date: DateRange | undefined
    setDate: (date: DateRange | undefined) => void
}

export function DateRangeSelector({
    className,
    date,
    setDate,
}: DateRangeSelectorProps) {
    const [preset, setPreset] = React.useState<string>("last_30_days");

    const handlePresetChange = (value: string) => {
        setPreset(value);
        const today = new Date();

        switch (value) {
            case "today":
                setDate({ from: today, to: today });
                break;
            case "last_7_days":
                setDate({ from: subDays(today, 7), to: today });
                break;
            case "last_30_days":
                setDate({ from: subDays(today, 30), to: today });
                break;
            case "this_month":
                setDate({ from: startOfMonth(today), to: endOfMonth(today) });
                break;
            case "last_3_months":
                setDate({ from: subMonths(today, 3), to: today });
                break;
            case "last_6_months":
                setDate({ from: subMonths(today, 6), to: today });
                break;
            case "custom":
                // Do nothing, let user pick
                break;
        }
    };

    return (
        <div className={cn("flex items-center gap-2", className)}>
            <Select value={preset} onValueChange={handlePresetChange}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="last_7_days">Last 7 Days</SelectItem>
                    <SelectItem value="last_30_days">Last 30 Days</SelectItem>
                    <SelectItem value="this_month">This Month</SelectItem>
                    <SelectItem value="last_3_months">Last 3 Months</SelectItem>
                    <SelectItem value="last_6_months">Last 6 Months</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
            </Select>

            {preset === "custom" && (
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            id="date"
                            variant={"outline"}
                            className={cn(
                                "w-[260px] justify-start text-left font-normal",
                                !date && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date?.from ? (
                                date.to ? (
                                    <>
                                        {format(date.from, "LLL dd, y")} -{" "}
                                        {format(date.to, "LLL dd, y")}
                                    </>
                                ) : (
                                    format(date.from, "LLL dd, y")
                                )
                            ) : (
                                <span>Pick a date</span>
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={date?.from}
                            selected={date}
                            onSelect={setDate}
                            numberOfMonths={2}
                        />
                    </PopoverContent>
                </Popover>
            )}
        </div>
    )
}
