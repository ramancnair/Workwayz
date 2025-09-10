
'use client';

import { useState, useMemo } from 'react';
import { useProject } from '@/context/ProjectContext';
import { PageHeader } from '@/components/PageHeader';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { type User } from '@/types';
import { differenceInDays, eachDayOfInterval, format, isSameDay, parseISO } from 'date-fns';

export default function ResourceBillingPage() {
  const { employees, updateProjectUser, holidays, weeklyOffDays } = useProject();
  const { toast } = useToast();
  const [editingRates, setEditingRates] = useState<Record<string, { billedRate?: number; costRate?: number }>>({});

  const handleRateChange = (userId: string, field: 'billedRate' | 'costRate', value: string) => {
    const numericValue = value === '' ? undefined : parseFloat(value);
    setEditingRates(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [field]: numericValue,
      }
    }));
  };
  
  const handleSaveChanges = async (userId: string) => {
    const user = employees.find(e => e.id === userId);
    const rates = editingRates[userId];

    if (!user || !rates) return;

    const payload: Partial<User> = {};
    if (rates.billedRate !== user.billedRate) {
        payload.billedRate = rates.billedRate;
    }
     if (rates.costRate !== user.costRate) {
        payload.costRate = rates.costRate;
    }

    if (Object.keys(payload).length === 0) {
        // No changes to save
        return;
    }

    const success = await updateProjectUser(userId, payload);
    if (success) {
      toast({ title: 'Success', description: 'Rates updated successfully.' });
    } else {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not update rates.' });
    }
  };

  const calculateBusinessDays = (startDateStr?: string, endDateStr?: string): number => {
    if (!startDateStr || !endDateStr) return 0;
    try {
        const start = parseISO(startDateStr);
        const end = parseISO(endDateStr);
        
        if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
            return 0;
        }

        const holidayDates = holidays.map(h => new Date(h.date));

        const interval = eachDayOfInterval({ start, end });
        
        const businessDays = interval.filter(day => {
            const dayOfWeek = day.getDay();
            const isWeekend = weeklyOffDays.includes(dayOfWeek);
            const isHoliday = holidayDates.some(holiday => isSameDay(day, holiday));
            return !isWeekend && !isHoliday;
        });

        return businessDays.length;
    } catch(e) {
        console.error("Error calculating business days", e);
        return 0;
    }
  };

  const revenueData = useMemo(() => {
    let totalRevenue = 0;
    let totalCost = 0;

    employees.forEach(user => {
      const workingDays = calculateBusinessDays(user.onboardingDate, user.offloadingDate);
      if (workingDays > 0) {
        totalRevenue += workingDays * (user.billedRate || 0);
        totalCost += workingDays * (user.costRate || 0);
      }
    });
    
    const profit = totalRevenue - totalCost;

    return { totalRevenue, totalCost, profit };
  }, [employees, holidays, weeklyOffDays]);

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader title="Resource Billing" description="Manage billed and cost rates for project resources." />
      <Card>
        <CardContent className="p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Resource</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Utilization (%)</TableHead>
                <TableHead>Billed Rate (USD/Day)</TableHead>
                <TableHead>Cost Rate (USD/Day)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map(user => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.firstName} {user.lastName}</TableCell>
                  <TableCell>{user.role || 'N/A'}</TableCell>
                  <TableCell>{user.availability || 100}%</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      placeholder="Enter rate"
                      value={editingRates[user.id]?.billedRate ?? user.billedRate ?? ''}
                      onChange={(e) => handleRateChange(user.id, 'billedRate', e.target.value)}
                      onBlur={() => handleSaveChanges(user.id)}
                      className="w-32"
                    />
                  </TableCell>
                  <TableCell>
                     <Input
                      type="number"
                      placeholder="Enter rate"
                      value={editingRates[user.id]?.costRate ?? user.costRate ?? ''}
                      onChange={(e) => handleRateChange(user.id, 'costRate', e.target.value)}
                      onBlur={() => handleSaveChanges(user.id)}
                      className="w-32"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead>Revenue (USD)</TableHead>
                <TableHead>Cost (USD)</TableHead>
                <TableHead>Profit (USD)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-semibold">Planned Overall</TableCell>
                <TableCell>${revenueData.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                <TableCell>${revenueData.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                <TableCell>${revenueData.profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
