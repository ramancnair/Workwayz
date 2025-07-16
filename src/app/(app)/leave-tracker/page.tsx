
'use client';

import { useState, useEffect } from 'react';
import { useProject } from '@/context/ProjectContext';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { format, startOfMonth, endOfMonth, isSameDay } from 'date-fns';
import type { Employee } from '@/types';

export default function LeaveTrackerPage() {
  const { employees, holidays, weeklyOffDays, updateEmployeeLeaves, isLoading } = useProject();
  const { toast } = useToast();
  
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [leaveDates, setLeaveDates] = useState<Date[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const today = new Date();
  const startOfCurrentYear = new Date(today.getFullYear(), 0, 1);
  const endOfCurrentYear = new Date(today.getFullYear(), 11, 31);
  
  const startOfCurrentMonth = startOfMonth(today);

  const holidayDates = holidays.map(h => new Date(h.date));

  useEffect(() => {
    if (employees.length > 0 && !selectedEmployee) {
      setSelectedEmployee(employees[0]);
    }
  }, [employees, selectedEmployee]);

  useEffect(() => {
    if (selectedEmployee?.leaveDates) {
      setLeaveDates(selectedEmployee.leaveDates.map(d => new Date(d)));
    } else {
      setLeaveDates([]);
    }
  }, [selectedEmployee]);

  const handleDayClick = (day: Date) => {
    const isPastMonth = startOfMonth(day) < startOfCurrentMonth;
    const isHoliday = holidayDates.some(h => isSameDay(h, day));
    const isWeeklyOff = weeklyOffDays.includes(day.getDay());

    if (isPastMonth || isHoliday || isWeeklyOff) {
        return;
    }

    const alreadySelected = leaveDates.some(d => isSameDay(d, day));
    if (alreadySelected) {
      setLeaveDates(leaveDates.filter(d => !isSameDay(d, day)));
    } else {
      setLeaveDates([...leaveDates, day]);
    }
  };
  
  const handleEmployeeChange = (employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    setSelectedEmployee(employee || null);
  };

  const handleSubmit = async () => {
    if (!selectedEmployee) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select an employee.' });
      return;
    }
    const leaveDateStrings = leaveDates.map(d => d.toISOString());
    const success = await updateEmployeeLeaves(selectedEmployee.id, leaveDateStrings);
    if (success) {
      toast({ title: 'Success', description: 'Leave dates updated successfully.' });
    } else {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not update leave dates.' });
    }
  };
  
  const isDateDisabled = (date: Date) => {
    return startOfMonth(date) < startOfCurrentMonth || 
           weeklyOffDays.includes(date.getDay()) || 
           holidayDates.some(h => isSameDay(h, date));
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader title="Leave Tracker" description="Manage employee leave days." />

      <Card>
        <CardHeader>
          <CardTitle>Select Employee</CardTitle>
          <CardDescription>Choose an employee to view or update their leave calendar.</CardDescription>
        </CardHeader>
        <CardContent>
          <Select onValueChange={handleEmployeeChange} value={selectedEmployee?.id}>
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Select an employee" />
            </SelectTrigger>
            <SelectContent>
              {employees.map(emp => (
                <SelectItem key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
      
      {selectedEmployee && (
        <Card>
          <CardHeader>
            <CardTitle>Mark Leave Dates for {selectedEmployee.firstName}</CardTitle>
            <CardDescription>Click on dates to mark them as leave. Click again to unmark.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <Calendar
              mode="multiple"
              selected={leaveDates}
              onDayClick={handleDayClick}
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              fromDate={startOfCurrentYear}
              toDate={endOfCurrentYear}
              disabled={isDateDisabled}
              className="rounded-md border"
              footer={
                <p className="text-sm text-center pt-2 text-muted-foreground">
                  You have selected {leaveDates.length} leave days.
                </p>
              }
            />
            <Button onClick={handleSubmit} className="mt-4">
              Submit Leaves for {selectedEmployee.firstName}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
