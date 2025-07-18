
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useProject } from '@/context/ProjectContext';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/datepicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { format, startOfWeek, endOfWeek, isWithinInterval, parseISO } from 'date-fns';
import type { Employee, Story, WorklogItem } from '@/types';
import { PlusCircle, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronsUpDown, Check } from "lucide-react";
import { cn } from '@/lib/utils';

export default function WorklogPage() {
  const { employees, stories, worklogs, saveWorklog, isLoading } = useProject();
  const { toast } = useToast();
  
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [logItems, setLogItems] = useState<WorklogItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 }); // Sunday

  const workItemOptions = useMemo(() => {
    const storyItems = stories.map(s => ({
        value: s.id,
        label: `[${s.storyId}] ${s.title}`,
        group: s.itemType,
    }));
    const specialItems = [
        { value: 'meeting', label: 'Meeting', group: 'General' },
        { value: 'other', label: 'Other', group: 'General' },
    ];
    return [...specialItems, ...storyItems];
  }, [stories]);

  useEffect(() => {
    if (employees.length > 0 && !selectedEmployee) {
      setSelectedEmployee(employees[0]);
    }
  }, [employees, selectedEmployee]);

  useEffect(() => {
    if (selectedEmployee && selectedDate) {
      const dateString = format(selectedDate, 'yyyy-MM-dd');
      const existingLog = worklogs.find(
        log => log.employeeId === selectedEmployee.id && format(parseISO(log.date), 'yyyy-MM-dd') === dateString
      );
      if (existingLog) {
        setLogItems(existingLog.items.map(item => ({...item, id: uuidv4()})));
      } else {
        setLogItems([]);
      }
    }
  }, [selectedEmployee, selectedDate, worklogs]);

  const handleAddItem = () => {
    setLogItems([...logItems, { id: uuidv4(), itemId: '', itemType: 'WorkItem', hours: 0 }]);
  };

  const handleRemoveItem = (id: string) => {
    setLogItems(logItems.filter(item => item.id !== id));
  };

  const handleItemChange = (id: string, field: keyof WorklogItem, value: any) => {
    setLogItems(logItems.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleItemSelect = (id: string, value: string) => {
      const selectedOption = workItemOptions.find(opt => opt.value === value);
      let itemType: 'WorkItem' | 'Meeting' | 'Other' = 'WorkItem';
      if (value === 'meeting') itemType = 'Meeting';
      if (value === 'other') itemType = 'Other';

      setLogItems(logItems.map(item => item.id === id ? { ...item, itemId: value, itemType } : item));
  };
  
  const handleSubmit = async () => {
    if (!selectedEmployee || !selectedDate) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select an employee and date.' });
      return;
    }
    
    if (logItems.some(item => !item.itemId || item.hours <= 0)) {
        toast({ variant: 'destructive', title: 'Error', description: 'Please fill out all worklog items and hours properly.' });
        return;
    }
    
    setIsSubmitting(true);

    const totalHours = logItems.reduce((sum, item) => sum + Number(item.hours), 0);

    const worklogData = {
        employeeId: selectedEmployee.id,
        date: format(selectedDate, 'yyyy-MM-dd'),
        items: logItems.map(({id, ...rest}) => rest), // Remove client-side uuid before saving
        totalHours: totalHours,
    };

    const success = await saveWorklog(worklogData);

    if (success) {
      toast({ title: 'Success', description: 'Worklog saved successfully.' });
    } else {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save worklog.' });
    }
    setIsSubmitting(false);
  };

  const totalHours = useMemo(() => {
    return logItems.reduce((sum, item) => sum + Number(item.hours || 0), 0);
  }, [logItems]);
  
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader title="Worklog" description="Log daily work for project resources." />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
            <CardHeader>
              <CardTitle>Select Employee & Date</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               <div>
                 <label className="text-sm font-medium">Employee</label>
                 <Select onValueChange={(id) => setSelectedEmployee(employees.find(e => e.id === id) || null)} value={selectedEmployee?.id}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select an employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
               </div>
               <div>
                  <label className="text-sm font-medium">Date</label>
                  <DatePicker
                    date={selectedDate}
                    setDate={(date) => {
                      if (date && isWithinInterval(date, { start: weekStart, end: weekEnd })) {
                        setSelectedDate(date);
                      } else {
                        toast({ variant: 'destructive', title: 'Invalid Date', description: 'You can only log work for the current week.'})
                      }
                    }}
                  />
               </div>
            </CardContent>
        </Card>
      </div>
      
      {selectedEmployee && selectedDate && (
        <Card>
          <CardHeader>
            <CardTitle>Log for {selectedEmployee.firstName} on {format(selectedDate, 'PPP')}</CardTitle>
            <CardDescription>Add items and hours worked. The total for the day is {totalHours} hours.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {logItems.map((item, index) => (
              <div key={item.id} className="grid grid-cols-[1fr_120px_1fr_auto] gap-4 items-end">
                  <div className="space-y-1">
                      {index === 0 && <label className="text-sm font-medium">Work Item</label>}
                      <WorkItemCombobox 
                        options={workItemOptions} 
                        value={item.itemId}
                        onChange={(value) => handleItemSelect(item.id, value)}
                      />
                  </div>
                   <div className="space-y-1">
                      {index === 0 && <label className="text-sm font-medium">Hours</label>}
                      <Input
                        type="number"
                        placeholder="Hours"
                        value={item.hours}
                        onChange={(e) => handleItemChange(item.id, 'hours', parseFloat(e.target.value) || 0)}
                        min="0.5"
                        step="0.5"
                      />
                  </div>
                  <div className="space-y-1">
                    {item.itemType === 'Other' && (
                        <>
                           {index === 0 && <label className="text-sm font-medium">Description</label>}
                           <Textarea
                                placeholder="Describe other work..."
                                value={item.description}
                                onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                            />
                        </>
                    )}
                  </div>
                 
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
              </div>
            ))}
             <div className="flex justify-between items-center pt-4">
                <Button variant="outline" onClick={handleAddItem}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Item
                </Button>
                <Button onClick={handleSubmit} disabled={isSubmitting || logItems.length === 0}>
                  {isSubmitting ? 'Saving...' : 'Save Worklog'}
                </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


function WorkItemCombobox({ options, value, onChange }: { options: {value: string, label: string, group: string}[], value: string, onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false)

  const groupedOptions = useMemo(() => {
    return options.reduce((acc, option) => {
        (acc[option.group] = acc[option.group] || []).push(option);
        return acc;
    }, {} as Record<string, typeof options>);
  }, [options]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {value
            ? options.find((option) => option.value === value)?.label
            : "Select work item..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
        <Command>
          <CommandInput placeholder="Search work item..." />
          <CommandList>
            <CommandEmpty>No work item found.</CommandEmpty>
            {Object.entries(groupedOptions).map(([group, groupOptions]) => (
                <CommandGroup key={group} heading={group}>
                    {groupOptions.map((option) => (
                    <CommandItem
                        key={option.value}
                        value={option.value}
                        onSelect={(currentValue) => {
                        onChange(currentValue === value ? "" : currentValue)
                        setOpen(false)
                        }}
                    >
                        <Check
                        className={cn(
                            "mr-2 h-4 w-4",
                            value === option.value ? "opacity-100" : "opacity-0"
                        )}
                        />
                        {option.label}
                    </CommandItem>
                    ))}
                </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
