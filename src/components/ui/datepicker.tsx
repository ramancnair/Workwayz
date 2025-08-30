
"use client"

import * as React from "react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

interface DatePickerProps {
  date?: Date | null;
  setDate: (date?: Date) => void;
  className?: string;
}

export function DatePicker({ date, setDate, className }: DatePickerProps) {
  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (value) {
      // HTML date input value is 'yyyy-MM-dd'.
      // We parse it and treat it as UTC to avoid timezone off-by-one issues.
      const date = new Date(`${value}T00:00:00Z`);
      setDate(date);
    } else {
      setDate(undefined);
    }
  };

  const formattedDate = date ? format(date, 'yyyy-MM-dd') : '';

  return (
    <Input
      type="date"
      value={formattedDate}
      onChange={handleDateChange}
      className={cn("w-full", className)}
    />
  )
}
