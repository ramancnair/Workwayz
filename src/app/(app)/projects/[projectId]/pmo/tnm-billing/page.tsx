'use client';

import { useState, useMemo, useEffect } from 'react';
import { useProject } from '@/context/ProjectContext';
import { useRouter, useParams } from 'next/navigation';
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { type User, type FixedCost } from '@/types';
import { 
  eachDayOfInterval, 
  format, 
  isSameDay, 
  parseISO, 
  startOfMonth, 
  endOfMonth, 
  eachMonthOfInterval, 
  addMonths, 
  subMonths 
} from 'date-fns';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2, Printer, Calendar, Edit, Check, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn, formatRateInput } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';

export default function ResourceBillingPage() {
  const { projectId } = useParams() as { projectId: string };
  const router = useRouter();
  const { 
    project,
    employees, 
    updateProjectUser, 
    holidays, 
    weeklyOffDays, 
    fixedCosts, 
    addFixedCost, 
    updateFixedCost, 
    deleteFixedCost,
    worklogs
  } = useProject();

  useEffect(() => {
    if (project && project.pricingModel !== 'T&M') {
      router.replace(`/projects/${projectId}/pmo/documents`);
    }
  }, [project, projectId, router]);

  const { toast } = useToast();

  if (!project || project.pricingModel !== 'T&M') {
    return null;
  }
  const [editingRates, setEditingRates] = useState<Record<string, { billedRate?: string; costRate?: string }>>({});
  const [newCostName, setNewCostName] = useState('');
  const [newCostValue, setNewCostValue] = useState('');
  const [newCostType, setNewCostType] = useState<'One time' | 'Monthly'>('One time');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingCostItem, setEditingCostItem] = useState<FixedCost | null>(null);
  const [editCostName, setEditCostName] = useState('');
  const [editCostType, setEditCostType] = useState<'One time' | 'Monthly'>('One time');
  const [editCostValue, setEditCostValue] = useState('');

  // Generate selectable months for the project duration
  const selectableMonths = useMemo(() => {
    if (!project?.startDate || !project?.endDate) {
      const today = new Date();
      const start = subMonths(today, 6);
      const end = addMonths(today, 6);
      return eachMonthOfInterval({ start, end });
    }
    try {
      const start = parseISO(project.startDate);
      const end = parseISO(project.endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
        const today = new Date();
        return eachMonthOfInterval({ start: subMonths(today, 6), end: addMonths(today, 6) });
      }
      return eachMonthOfInterval({ start, end });
    } catch (e) {
      const today = new Date();
      return eachMonthOfInterval({ start: subMonths(today, 6), end: addMonths(today, 6) });
    }
  }, [project]);

  // Initial Month setup
  const initialMonth = useMemo(() => {
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM');
    const match = selectableMonths.find(m => format(m, 'yyyy-MM') === todayStr);
    return match || selectableMonths[0] || today;
  }, [selectableMonths]);

  const [currentMonth, setCurrentMonth] = useState<string>('');

  useEffect(() => {
    if (initialMonth && !currentMonth) {
      setCurrentMonth(format(initialMonth, 'yyyy-MM'));
    }
  }, [initialMonth, currentMonth]);

  const activeMonthDate = useMemo(() => {
    return currentMonth ? parseISO(`${currentMonth}-01`) : (selectableMonths[0] || new Date());
  }, [currentMonth, selectableMonths]);

  // Determine if the selected month is the first month of the project
  const isFirstMonth = useMemo(() => {
    if (!project?.startDate || !activeMonthDate) return true;
    try {
      const pStart = parseISO(project.startDate);
      return pStart.getFullYear() === activeMonthDate.getFullYear() && 
             pStart.getMonth() === activeMonthDate.getMonth();
    } catch (e) {
      return true;
    }
  }, [project, activeMonthDate]);

  // Calculate total business working days in the selected month
  const totalWorkingDays = useMemo(() => {
    const start = startOfMonth(activeMonthDate);
    const end = endOfMonth(activeMonthDate);
    
    const holidayDates = holidays.map(h => new Date(h.date));
    const interval = eachDayOfInterval({ start, end });
    
    const businessDays = interval.filter(day => {
        const dayOfWeek = day.getDay();
        const isWeekend = weeklyOffDays.includes(dayOfWeek);
        const isHoliday = holidayDates.some(holiday => isSameDay(day, holiday));
        return !isWeekend && !isHoliday;
    });

    return businessDays.length;
  }, [activeMonthDate, holidays, weeklyOffDays]);

  const handleRateChange = (userId: string, field: 'billedRate' | 'costRate', value: string) => {
    let val = value;
    if (val.length > 1 && /^0[0-9]/.test(val)) {
      val = val.replace(/^0+/, '');
    }
    const regex = /^(0|[1-9]\d{0,7})?(\.\d{0,2})?$/;
    if (!regex.test(val)) return;
    setEditingRates(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [field]: val,
      }
    }));
  };
  
  const handleSaveField = async (userId: string, field: 'billedRate' | 'costRate') => {
    const user = employees.find(e => e.id === userId);
    const rateVal = editingRates[userId]?.[field];

    if (!user || rateVal === undefined) return;

    const parsedVal = rateVal === '' ? 0 : parseFloat(rateVal);
    if (isNaN(parsedVal)) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please enter a valid numeric rate.' });
      return;
    }

    const payload: Partial<User> = {
      [field]: parsedVal,
    };

    setEditingRates(prev => {
      const userRates = { ...prev[userId] };
      delete userRates[field];
      if (Object.keys(userRates).length === 0) {
        const next = { ...prev };
        delete next[userId];
        return next;
      }
      return { ...prev, [userId]: userRates };
    });

    const success = await updateProjectUser(userId, payload);
    if (success) {
      toast({ title: 'Success', description: `${field === 'billedRate' ? 'Billed' : 'Cost'} rate updated successfully.` });
    } else {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not update rate.' });
    }
  };

  const handleCancelField = (userId: string, field: 'billedRate' | 'costRate') => {
    setEditingRates(prev => {
      const userRates = { ...prev[userId] };
      delete userRates[field];
      if (Object.keys(userRates).length === 0) {
        const next = { ...prev };
        delete next[userId];
        return next;
      }
      return { ...prev, [userId]: userRates };
    });
  };

  const handleSaveChanges = async (userId: string, customRates?: { billedRate?: string; costRate?: string }) => {
    const user = employees.find(e => e.id === userId);
    const rates = customRates || editingRates[userId];

    if (!user || !rates) {
      setEditingRates(prev => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
      return;
    }

    const payload: Partial<User> = {};
    const newBilledRate = rates.billedRate === undefined ? user.billedRate : (rates.billedRate === '' ? 0 : parseFloat(rates.billedRate));
    const newCostRate = rates.costRate === undefined ? user.costRate : (rates.costRate === '' ? 0 : parseFloat(rates.costRate));

    if (newBilledRate !== undefined && newBilledRate !== user.billedRate) {
        payload.billedRate = newBilledRate;
    }
    if (newCostRate !== undefined && newCostRate !== user.costRate) {
        payload.costRate = newCostRate;
    }

    setEditingRates(prev => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });

    if (Object.keys(payload).length === 0) {
        return;
    }

    const success = await updateProjectUser(userId, payload);
    if (success) {
      toast({ title: 'Success', description: 'Rates updated successfully.' });
    } else {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not update rates.' });
    }
  };

  const handleFixedCostChange = (id: string, field: 'name' | 'cost' | 'type', value: any) => {
    if (field === 'cost') {
      const numericCost = Math.round((parseFloat(value) || 0) * 100) / 100;
      if (numericCost <= 0) {
        toast({ variant: 'destructive', title: 'Error', description: 'Cost must be greater than 0.' });
        return;
      }
      value = numericCost;
    }
    const updateData: Partial<FixedCost> = { [field]: value };
    updateFixedCost(id, updateData);
  };

  const handleAddNewFixedCost = async () => {
    if (!newCostName.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please enter a valid Item Name.' });
      return;
    }
    const numericCost = Math.round((parseFloat(newCostValue) || 0) * 100) / 100;
    if (isNaN(parseFloat(newCostValue)) || numericCost <= 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please provide cost greater than 0.' });
      return;
    }
    const isDuplicate = fixedCosts.some(
      fc => fc.name.trim().toLowerCase() === newCostName.trim().toLowerCase()
    );
    if (isDuplicate) {
      toast({ variant: 'destructive', title: 'Error', description: 'A fixed cost item with this name already exists.' });
      return;
    }
    const success = await addFixedCost({ name: newCostName.trim(), cost: numericCost, type: newCostType });
    if (success) {
      setNewCostName('');
      setNewCostValue('');
      setNewCostType('One time');
      setIsAddDialogOpen(false);
      toast({ title: 'Success', description: 'Fixed cost item added.' });
    } else {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not add fixed cost item.' });
    }
  };

  const handleStartEditFixedCost = (item: FixedCost) => {
    setEditingCostItem(item);
    setEditCostName(item.name);
    setEditCostType(item.type || 'One time');
    setEditCostValue(formatRateInput(item.cost));
  };

  const handleEditFixedCost = async () => {
    if (!editingCostItem) return;
    if (!editCostName.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please enter a valid Item Name.' });
      return;
    }
    const numericCost = Math.round((parseFloat(editCostValue) || 0) * 100) / 100;
    if (isNaN(parseFloat(editCostValue)) || numericCost <= 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please provide cost greater than 0.' });
      return;
    }
    const isDuplicate = fixedCosts.some(
      fc => fc.name.trim().toLowerCase() === editCostName.trim().toLowerCase() && fc.id !== editingCostItem.id
    );
    if (isDuplicate) {
      toast({ variant: 'destructive', title: 'Error', description: 'A fixed cost item with this name already exists.' });
      return;
    }
    const success = await updateFixedCost(editingCostItem.id, {
      name: editCostName.trim(),
      cost: numericCost,
      type: editCostType,
    });
    if (success) {
      setEditingCostItem(null);
      toast({ title: 'Success', description: 'Fixed cost item updated.' });
    } else {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not update fixed cost item.' });
    }
  };

  // Calculate Loss of Pay Days for a resource in the selected month
  const calculateLossOfPayDays = (user: User, monthDate: Date): number => {
    if (!user.leavePeriods || user.leavePeriods.length === 0) return 0;
    
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);
    const holidayDates = holidays.map(h => new Date(h.date));
    
    let count = 0;
    
    user.leavePeriods.forEach(period => {
      if (period.type !== 'Loss of Pay') return;
      if (!period.startDate || !period.endDate) return;
      
      const leaveStart = new Date(period.startDate);
      const leaveEnd = new Date(period.endDate);
      
      const overlapStart = leaveStart < monthStart ? monthStart : leaveStart;
      const overlapEnd = leaveEnd > monthEnd ? monthEnd : leaveEnd;
      
      if (overlapStart <= overlapEnd) {
        const interval = eachDayOfInterval({ start: overlapStart, end: overlapEnd });
        const businessDays = interval.filter(day => {
          const dayOfWeek = day.getDay();
          const isWeekend = weeklyOffDays.includes(dayOfWeek);
          const isHoliday = holidayDates.some(holiday => isSameDay(day, holiday));
          return !isWeekend && !isHoliday;
        });

        if (period.isHalfDay) {
          count += businessDays.length > 0 ? 0.5 : 0;
        } else {
          count += businessDays.length;
        }
      }
    });
    
    return count;
  };

  // Calculate Overtime Days for a resource in the selected month
  const calculateOvertimeDays = (user: User, monthDate: Date): number => {
    if (!worklogs || worklogs.length === 0) return 0;
    
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);
    const holidayDates = holidays.map(h => new Date(h.date));
    
    let count = 0;
    
    const userWorklogs = worklogs.filter(w => {
      if (w.employeeId !== user.id) return false;
      if (!w.date) return false;
      const logDate = new Date(w.date);
      return logDate >= monthStart && logDate <= monthEnd && w.totalHours > 0;
    });
    
    userWorklogs.forEach(wl => {
      const logDate = new Date(wl.date);
      const dayOfWeek = logDate.getDay();
      const isWeekend = weeklyOffDays.includes(dayOfWeek);
      const isHoliday = holidayDates.some(h => isSameDay(logDate, h));
      
      if (isWeekend || isHoliday) {
        count++;
      }
    });
    
    return count;
  };

  const revenueData = useMemo(() => {
    if (!employees || !fixedCosts) {
      return { totalRevenue: 0, totalResourceCost: 0, totalFixedCost: 0, profit: 0 };
    }
    
    let totalRevenue = 0;
    let totalResourceCost = 0;

    employees.forEach(user => {
      const lopDays = calculateLossOfPayDays(user, activeMonthDate);
      const otDays = calculateOvertimeDays(user, activeMonthDate);
      const chargeableDays = Math.max(0, totalWorkingDays - lopDays + otDays);
      
      totalRevenue += chargeableDays * (user.billedRate || 0);
      totalResourceCost += chargeableDays * (user.costRate || 0);
    });
    
    const totalFixedCost = fixedCosts.reduce((acc, fc) => {
      // One time fixed costs are only charged in the first month
      if (fc.type === 'One time' && !isFirstMonth) {
        return acc;
      }
      return acc + (fc.cost || 0);
    }, 0);
    const profit = totalRevenue - totalResourceCost - totalFixedCost;

    return { totalRevenue, totalResourceCost, totalFixedCost, profit };
  }, [employees, fixedCosts, holidays, weeklyOffDays, project, activeMonthDate, totalWorkingDays, worklogs, isFirstMonth]);

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <PageHeader title="TnM Billing" description="Manage billed and cost rates for project resources." />
      
      {/* Month Selection Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between bg-card p-4 rounded-xl border border-border/40 shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <Label className="text-sm font-semibold whitespace-nowrap">Billing Month</Label>
          <Select value={currentMonth} onValueChange={setCurrentMonth}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select Month" />
            </SelectTrigger>
            <SelectContent>
              {selectableMonths.map(month => {
                const val = format(month, 'yyyy-MM');
                return (
                  <SelectItem key={val} value={val}>
                    {format(month, 'MMMM yyyy')}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-6">
          <div className="bg-muted/40 px-4 py-2 rounded-lg border border-border/20 text-center">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Total Working Days</span>
            <p className="text-xl font-bold text-foreground">{totalWorkingDays} Days</p>
          </div>
        </div>
      </div>

      {/* Main Resource Billing Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Resource</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Utilization (%)</TableHead>
                  <TableHead>Billed Rate (USD/Day)</TableHead>
                  <TableHead>Cost Rate (USD/Day)</TableHead>
                  <TableHead className="text-center">Loss of Pay Days</TableHead>
                  <TableHead className="text-center">Overtime Days</TableHead>
                  <TableHead className="text-center">Chargeable Days</TableHead>
                  <TableHead className="text-right pr-6">Total Billing</TableHead>
                  <TableHead className="text-right pr-6">Total Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map(user => {
                  const lopDays = calculateLossOfPayDays(user, activeMonthDate);
                  const otDays = calculateOvertimeDays(user, activeMonthDate);
                  const chargeableDays = Math.max(0, totalWorkingDays - lopDays + otDays);
                  const totalBilling = chargeableDays * (user.billedRate || 0);
                  const totalCost = chargeableDays * (user.costRate || 0);

                  return (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium pl-6">{user.firstName} {user.lastName}</TableCell>
                      <TableCell>{user.role || 'N/A'}</TableCell>
                      <TableCell>{user.availability || 100}%</TableCell>
                      <TableCell className="min-w-[150px]">
                        {(() => {
                          const currentBilledRateStr = formatRateInput(user.billedRate);
                          const editingBilledVal = editingRates[user.id]?.billedRate;
                          const hasBilledChanged = editingBilledVal !== undefined && editingBilledVal !== currentBilledRateStr;

                          return (
                            <div className="flex items-center gap-1.5">
                              <Input
                                type="text"
                                inputMode="decimal"
                                placeholder="0.00"
                                value={editingBilledVal ?? currentBilledRateStr}
                                onChange={(e) => handleRateChange(user.id, 'billedRate', e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSaveField(user.id, 'billedRate');
                                  } else if (e.key === 'Escape') {
                                    e.preventDefault();
                                    handleCancelField(user.id, 'billedRate');
                                  }
                                }}
                                className={cn(
                                  "w-24 font-mono h-8 text-xs transition-colors",
                                  hasBilledChanged && "border-primary ring-1 ring-primary/30"
                                )}
                              />
                              {hasBilledChanged && (
                                <div className="flex items-center gap-1 shrink-0 animate-in fade-in duration-200">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 border border-emerald-500/30"
                                    onClick={() => handleSaveField(user.id, 'billedRate')}
                                    onMouseDown={(e) => e.preventDefault()}
                                    title="Save Billed Rate"
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => handleCancelField(user.id, 'billedRate')}
                                    onMouseDown={(e) => e.preventDefault()}
                                    title="Cancel"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="min-w-[150px]">
                        {(() => {
                          const currentCostRateStr = formatRateInput(user.costRate);
                          const editingCostVal = editingRates[user.id]?.costRate;
                          const hasCostChanged = editingCostVal !== undefined && editingCostVal !== currentCostRateStr;

                          return (
                            <div className="flex items-center gap-1.5">
                              <Input
                                type="text"
                                inputMode="decimal"
                                placeholder="0.00"
                                value={editingCostVal ?? currentCostRateStr}
                                onChange={(e) => handleRateChange(user.id, 'costRate', e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSaveField(user.id, 'costRate');
                                  } else if (e.key === 'Escape') {
                                    e.preventDefault();
                                    handleCancelField(user.id, 'costRate');
                                  }
                                }}
                                className={cn(
                                  "w-24 font-mono h-8 text-xs transition-colors",
                                  hasCostChanged && "border-primary ring-1 ring-primary/30"
                                )}
                              />
                              {hasCostChanged && (
                                <div className="flex items-center gap-1 shrink-0 animate-in fade-in duration-200">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 border border-emerald-500/30"
                                    onClick={() => handleSaveField(user.id, 'costRate')}
                                    onMouseDown={(e) => e.preventDefault()}
                                    title="Save Cost Rate"
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => handleCancelField(user.id, 'costRate')}
                                    onMouseDown={(e) => e.preventDefault()}
                                    title="Cancel"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="text-center font-medium text-red-500">
                        {lopDays > 0 ? (
                          <Badge variant="destructive" className="bg-red-500/10 text-red-500 hover:bg-red-500/10 border-0">{lopDays}</Badge>
                        ) : '0'}
                      </TableCell>
                      <TableCell className="text-center font-medium text-orange-500">
                        {otDays > 0 ? (
                          <Badge variant="outline" className="border-orange-500/30 text-orange-500 bg-orange-500/5">{otDays}</Badge>
                        ) : '0'}
                      </TableCell>
                      <TableCell className="text-center font-bold text-foreground">{chargeableDays}</TableCell>
                      <TableCell className="text-right font-semibold text-blue-500 pr-6">
                        ${totalBilling.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-orange-500 pr-6">
                        ${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <TableFooter className="bg-muted/10">
                <TableRow className="font-semibold border-t border-border/40">
                  <TableCell colSpan={8} className="text-left font-bold text-muted-foreground uppercase tracking-wider text-xs pl-6">Totals</TableCell>
                  <TableCell className="text-right text-blue-500 font-bold pr-6">
                    ${revenueData.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right text-orange-500 font-bold pr-6">
                    ${revenueData.totalResourceCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
                <TableRow className="font-semibold bg-muted/20 border-t border-border/40">
                  <TableCell colSpan={8} className="text-left font-bold text-muted-foreground uppercase tracking-wider text-xs pl-6">Resource Profit</TableCell>
                  <TableCell colSpan={2} className="text-right text-emerald-500 font-bold text-base pr-6">
                    ${(revenueData.totalRevenue - revenueData.totalResourceCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Fixed Costs Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Fixed Costs</CardTitle>
            <CardDescription>Manage other project costs like licenses, hardware, and margins.</CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Fixed Cost
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add Fixed Cost Item</DialogTitle>
                <DialogDescription>
                  Create a new fixed cost item for this project.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Item Name</Label>
                  <Input
                    id="name"
                    placeholder="E.g., Software (Licenses)"
                    value={newCostName}
                    onChange={(e) => setNewCostName(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <Select value={newCostType} onValueChange={(val: 'One time' | 'Monthly') => setNewCostType(val)}>
                      <SelectTrigger id="type">
                        <SelectValue placeholder="One time" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="One time">One time</SelectItem>
                        <SelectItem value="Monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cost">Cost (USD)</Label>
                    <Input
                      id="cost"
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={newCostValue}
                      onChange={(e) => {
                        let val = e.target.value;
                        if (val.length > 1 && /^0[0-9]/.test(val)) {
                          val = val.replace(/^0+/, '');
                        }
                        if (/^(0|[1-9]\d{0,7})?(\.\d{0,2})?$/.test(val)) {
                          setNewCostValue(val);
                        }
                      }}
                      onBlur={() => {
                        if (newCostValue !== '') {
                          setNewCostValue(formatRateInput(newCostValue));
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAddNewFixedCost}>
                  Submit
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={!!editingCostItem} onOpenChange={(open) => { if (!open) setEditingCostItem(null); }}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Edit Fixed Cost Item</DialogTitle>
                <DialogDescription>
                  Modify the details of this fixed cost item.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Item Name</Label>
                  <Input
                    id="edit-name"
                    value={editCostName}
                    onChange={(e) => setEditCostName(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-type">Type</Label>
                    <Select value={editCostType} onValueChange={(val: 'One time' | 'Monthly') => setEditCostType(val)}>
                      <SelectTrigger id="edit-type">
                        <SelectValue placeholder="One time" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="One time">One time</SelectItem>
                        <SelectItem value="Monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-cost">Cost (USD)</Label>
                    <Input
                      id="edit-cost"
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={editCostValue}
                      onChange={(e) => {
                        let val = e.target.value;
                        if (val.length > 1 && /^0[0-9]/.test(val)) {
                          val = val.replace(/^0+/, '');
                        }
                        if (/^(0|[1-9]\d{0,7})?(\.\d{0,2})?$/.test(val)) {
                          setEditCostValue(val);
                        }
                      }}
                      onBlur={() => {
                        if (editCostValue !== '') {
                          setEditCostValue(formatRateInput(editCostValue));
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleEditFixedCost}>
                  Save Changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-1/3">Item</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Cost (USD)</TableHead>
                        <TableHead className="text-right">Cost for Selected Month (USD)</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {fixedCosts && fixedCosts.map(item => {
                        // If it's a One time cost and the active month is not the first month, show $0.00
                        const isCharged = item.type !== 'One time' || isFirstMonth;
                        const totalCost = isCharged ? (item.cost || 0) : 0;

                        return (
                             <TableRow key={item.id} className={!isCharged ? 'opacity-40' : ''}>
                                <TableCell className="font-medium">
                                    {item.name}
                                </TableCell>
                                <TableCell>
                                    {item.type || 'One time'}
                                </TableCell>
                                <TableCell>
                                    ${(item.cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell className="text-right font-semibold text-purple-500">
                                    ${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    {!isCharged && <span className="block text-[10px] text-muted-foreground">(Charged only first month)</span>}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <Button variant="ghost" size="icon" onClick={() => handleStartEditFixedCost(item)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => deleteFixedCost(item.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
      
      {/* Monthly Invoice Section */}
      <Card id="invoice-print-area" className="border-l-4 border-l-emerald-500 bg-card/60 backdrop-blur-sm">
        <CardHeader className="border-b border-border/40 pb-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                Invoice - {format(activeMonthDate, 'MMMM yyyy')}
              </CardTitle>
              <CardDescription>Comprehensive invoice breakdown for client billing for {format(activeMonthDate, 'MMMM yyyy')}.</CardDescription>
            </div>
            
            <div className="text-right ml-auto">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Billing Month</span>
              <p className="text-lg font-bold text-foreground">
                {format(activeMonthDate, 'MMMM yyyy')} <span className="text-xs font-normal text-muted-foreground">({totalWorkingDays} working days)</span>
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {/* Section 1: Resource Billing */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">1. Resource Billing</h3>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Resource</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Daily Billing Rate</TableHead>
                    <TableHead className="text-right">Chargeable Billed Days</TableHead>
                    <TableHead className="text-right">Total Billed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map(user => {
                    const lopDays = calculateLossOfPayDays(user, activeMonthDate);
                    const otDays = calculateOvertimeDays(user, activeMonthDate);
                    const chargeableDays = Math.max(0, totalWorkingDays - lopDays + otDays);
                    const totalBilling = chargeableDays * (user.billedRate || 0);
                    return (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.firstName} {user.lastName}</TableCell>
                        <TableCell>{user.role || 'N/A'}</TableCell>
                        <TableCell className="text-right">${(user.billedRate || 0).toLocaleString()}/day</TableCell>
                        <TableCell className="text-right">{chargeableDays} days</TableCell>
                        <TableCell className="text-right font-semibold text-blue-400">
                          ${totalBilling.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {/* Resource Subtotal */}
                  <TableRow className="bg-muted/20 font-semibold">
                    <TableCell colSpan={4} className="text-left font-bold text-muted-foreground uppercase tracking-wider text-xs">Resource Subtotal</TableCell>
                    <TableCell className="text-right text-blue-400 text-base">
                      ${revenueData.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Section 2: Fixed Costs */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">2. Fixed Costs</h3>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fixed Cost Item</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Multiplier</TableHead>
                    <TableHead className="text-right">Total Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fixedCosts && fixedCosts.filter(item => {
                    // Exclude One time costs from the invoice if we are not in the first month
                    if (item.type === 'One time') {
                      return isFirstMonth;
                    }
                    return true;
                  }).map(item => {
                    const totalCost = item.cost || 0;
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.type || 'One time'}</TableCell>
                        <TableCell className="text-right">${(item.cost || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right">{item.type === 'Monthly' ? '1 month' : '1 (One-time)'}</TableCell>
                        <TableCell className="text-right font-semibold text-purple-400">
                          ${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {/* Fixed Costs Subtotal */}
                  <TableRow className="bg-muted/20 font-semibold">
                    <TableCell colSpan={4} className="text-left font-bold text-muted-foreground uppercase tracking-wider text-xs">Fixed Costs Subtotal</TableCell>
                    <TableCell className="text-right text-purple-400 text-base">
                      ${revenueData.totalFixedCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Grand Total */}
          <div className="border-t border-border/60 pt-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex flex-col gap-2">
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-emerald-500/10 border border-emerald-500/20 px-6 py-3 rounded-lg flex items-center gap-6">
                <span className="text-sm font-bold text-emerald-400 uppercase tracking-wider">Total Bill</span>
                <span className="text-2xl font-black text-emerald-400">
                  ${(revenueData.totalRevenue + revenueData.totalFixedCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <style>{`
        @media print {
          @page {
            size: landscape;
            margin: 10mm;
          }

          /* Hide UI elements that aren't the invoice */
          aside, nav, header, button, .no-print {
            display: none !important;
          }

          /* Target the page container's children and hide everything except the invoice */
          .flex-1 > *:not(#invoice-print-area) {
            display: none !important;
          }

          /* Fix layout wrappers that might have h-screen or overflow-hidden */
          html, body, main, [data-sidebar-provider], .sidebar-inset, #root, #__next {
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            overflow: visible !important;
            background: white !important;
          }

          /* Force all text in the print area to be black */
          body {
            color: black !important;
          }
          
          #invoice-print-area, #invoice-print-area * {
            color: black !important;
            border-color: #e5e7eb !important;
          }

          #invoice-print-area {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
          }

          /* DISABLE OVERFLOW AND FORCE EXPANSION OF TABLES */
          .overflow-x-auto {
            overflow: visible !important;
            overflow-x: visible !important;
          }

          table {
            width: 100% !important;
            table-layout: auto !important;
            border-collapse: collapse !important;
          }

          th, td {
            padding: 6px 8px !important;
            font-size: 12px !important;
            border-bottom: 1px solid #e5e7eb !important;
          }

          th {
            background-color: #f3f4f6 !important;
            font-weight: bold !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          /* Remove background colors that might mask text */
          .bg-card, .bg-muted\\/20 {
            background-color: transparent !important;
          }
          
          /* Retain background for the total section */
          .bg-emerald-500\\/10 {
            background-color: #f0fdf4 !important;
            border: 1px solid #bbf7d0 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}
