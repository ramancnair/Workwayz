
"use client"

import * as React from "react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

interface DateTimePickerProps {
  date: Date | null;
  setDate: (date: Date | null) => void;
  className?: string;
}

export function DateTimePicker({ date, setDate, className }: DateTimePickerProps) {
  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const dateValue = event.target.value;
    if (!dateValue) {
      setDate(null);
      return;
    }

    const newDate = date ? new Date(date) : new Date();
    const [year, month, day] = dateValue.split('-').map(Number);
    newDate.setFullYear(year, month - 1, day);
    setDate(newDate);
  };

  const handleTimeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const timeValue = event.target.value;
    if (!timeValue) {
      setDate(null);
      return;
    }

    const newDate = date ? new Date(date) : new Date();
    const [hours, minutes] = timeValue.split(':').map(Number);
    newDate.setHours(hours, minutes, 0, 0);
    setDate(newDate);
  };
  
  const formattedDate = date ? format(date, 'yyyy-MM-dd') : '';
  const formattedTime = date ? format(date, 'HH:mm') : '';

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Input
        type="date"
        value={formattedDate}
        onChange={handleDateChange}
      />
      <Input
        type="time"
        value={formattedTime}
        onChange={handleTimeChange}
      />
    </div>
  )
}
