
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
import { Edit, Save, XCircle } from 'lucide-react';

export default function LeaveTrackerPage() {
  const { employees, holidays, weeklyOffDays, updateEmployeeLeaves, isLoading } = useProject();
  const { toast } = useToast();
  
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [leaveDates, setLeaveDates] = useState<Date[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isEditing, setIsEditing] = useState(false);

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
    setIsEditing(false); // Reset editing mode when employee changes
  }, [selectedEmployee]);

  const handleDayClick = (day: Date, modifiers: { disabled?: boolean }) => {
    if (!isEditing || modifiers.disabled) return;

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
      setIsEditing(false);
    } else {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not update leave dates.' });
    }
  };

  const handleCancel = () => {
    if (selectedEmployee?.leaveDates) {
      setLeaveDates(selectedEmployee.leaveDates.map(d => new Date(d)));
    } else {
      setLeaveDates([]);
    }
    setIsEditing(false);
  }
  
  const disabledDays = [
      ...holidayDates,
      { dayOfWeek: weeklyOffDays },
      { before: startOfCurrentMonth }
  ];

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
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Leave Calendar for {selectedEmployee.firstName}</CardTitle>
              <CardDescription>
                {isEditing ? "Click on dates to mark them as leave. Click again to unmark." : "Viewing scheduled leave days."}
              </CardDescription>
            </div>
             {!isEditing && (
              <Button onClick={() => setIsEditing(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Leaves
              </Button>
            )}
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
              disabled={disabledDays}
              className="rounded-md border"
              footer={
                <p className="text-sm text-center pt-2 text-muted-foreground">
                  {leaveDates.length} leave days selected.
                </p>
              }
            />
            {isEditing && (
                <div className="flex gap-4 mt-4">
                    <Button onClick={handleSubmit}>
                        <Save className="mr-2 h-4 w-4" />
                        Submit Leaves
                    </Button>
                     <Button variant="outline" onClick={handleCancel}>
                        <XCircle className="mr-2 h-4 w-4" />
                        Cancel
                    </Button>
                </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
