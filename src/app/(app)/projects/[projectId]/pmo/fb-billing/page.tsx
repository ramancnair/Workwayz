

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
import { differenceInDays, eachDayOfInterval, format, isSameDay, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2, Printer, Edit } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
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
    deleteFixedCost 
  } = useProject();

  useEffect(() => {
    if (project && project.pricingModel !== 'Fixed Bid') {
      router.replace(`/projects/${projectId}/pmo/documents`);
    }
  }, [project, projectId, router]);

  console.warn("DIAGNOSTIC - employees and fixedCosts in ResourceBillingPage:", employees, fixedCosts);
  const { toast } = useToast();

  if (!project || project.pricingModel !== 'Fixed Bid') {
    return null;
  }
  const [editingRates, setEditingRates] = useState<Record<string, { billedRate?: number; costRate?: number }>>({});
  const [newCostName, setNewCostName] = useState('');
  const [newCostValue, setNewCostValue] = useState(0);
  const [newCostType, setNewCostType] = useState<'One time' | 'Monthly'>('One time');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingCostItem, setEditingCostItem] = useState<FixedCost | null>(null);
  const [editCostName, setEditCostName] = useState('');
  const [editCostType, setEditCostType] = useState<'One time' | 'Monthly'>('One time');
  const [editCostValue, setEditCostValue] = useState(0);

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
    const updateData: Partial<FixedCost> = { [field]: value };
    updateFixedCost(id, updateData);
  };

  const handleAddNewFixedCost = async () => {
    if (!newCostName.trim() || newCostValue < 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please provide a valid name and cost.' });
      return;
    }
    const success = await addFixedCost({ name: newCostName, cost: newCostValue, type: newCostType });
    if (success) {
      setNewCostName('');
      setNewCostValue(0);
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
    setEditCostValue(item.cost || 0);
  };

  const handleEditFixedCost = async () => {
    if (!editingCostItem) return;
    if (!editCostName.trim() || editCostValue < 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please provide a valid name and cost.' });
      return;
    }
    const success = await updateFixedCost(editingCostItem.id, {
      name: editCostName,
      cost: editCostValue,
      type: editCostType,
    });
    if (success) {
      setEditingCostItem(null);
      toast({ title: 'Success', description: 'Fixed cost item updated.' });
    } else {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not update fixed cost item.' });
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

  const calculateProjectMonths = (): number => {
    if (!project?.startDate || !project?.endDate) return 1;
    try {
        const start = parseISO(project.startDate);
        const end = parseISO(project.endDate);
        
        if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
            return 1;
        }
        
        const yearsDiff = end.getFullYear() - start.getFullYear();
        const monthsDiff = end.getMonth() - start.getMonth();
        return Math.max(1, yearsDiff * 12 + monthsDiff + 1);
    } catch(e) {
        console.error("Error calculating project months", e);
        return 1;
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      const date = parseISO(dateStr);
      if (isNaN(date.getTime())) return 'N/A';
      return format(date, 'MMM dd, yyyy');
    } catch (e) {
      return 'N/A';
    }
  };

  const getProjectDurationDays = (): number => {
    if (!project?.startDate || !project?.endDate) return 0;
    try {
      const start = parseISO(project.startDate);
      const end = parseISO(project.endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 0;
      return differenceInDays(end, start) + 1;
    } catch (e) {
      return 0;
    }
  };

  const revenueData = useMemo(() => {
    if (!employees || !fixedCosts) {
      return { totalRevenue: 0, totalResourceCost: 0, totalFixedCost: 0, profit: 0 };
    }
    
    let totalRevenue = 0;
    let totalResourceCost = 0;

    employees.forEach(user => {
      const workingDays = calculateBusinessDays(user.onboardingDate, user.offloadingDate);
      if (workingDays > 0) {
        totalRevenue += workingDays * (user.billedRate || 0);
        totalResourceCost += workingDays * (user.costRate || 0);
      }
    });
    
    const totalFixedCost = fixedCosts.reduce((acc, fc) => {
      if (fc.type === 'Monthly') {
        const months = calculateProjectMonths();
        return acc + ((fc.cost || 0) * months);
      }
      return acc + (fc.cost || 0);
    }, 0);
    const profit = totalRevenue - totalResourceCost - totalFixedCost;

    return { totalRevenue, totalResourceCost, totalFixedCost, profit };
  }, [employees, fixedCosts, holidays, weeklyOffDays, project]);

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader title="FB Billing" description="Manage billed and cost rates for project resources." />
      <Card>
        <CardContent className="p-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Resource</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Utilization (%)</TableHead>
                  <TableHead>Billed Rate (USD/Day)</TableHead>
                  <TableHead>Cost Rate (USD/Day)</TableHead>
                  <TableHead className="text-right">Total Billing</TableHead>
                  <TableHead className="text-right">Total Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map(user => {
                  const workingDays = calculateBusinessDays(user.onboardingDate, user.offloadingDate);
                  const totalBilling = workingDays * (user.billedRate || 0);
                  const totalCost = workingDays * (user.costRate || 0);

                  return (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.firstName} {user.lastName}</TableCell>
                      <TableCell>{user.role || 'N/A'}</TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">{formatDate(user.onboardingDate)}</TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">{formatDate(user.offloadingDate)}</TableCell>
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
                      <TableCell className="text-right font-semibold text-blue-500">
                        ${totalBilling.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-orange-500">
                        ${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <TableFooter className="bg-muted/10">
                <TableRow className="font-semibold border-t border-border/40">
                  <TableCell colSpan={7} className="text-left font-bold text-muted-foreground uppercase tracking-wider text-xs">Totals</TableCell>
                  <TableCell className="text-right text-blue-500 font-bold">
                    ${revenueData.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right text-orange-500 font-bold">
                    ${revenueData.totalResourceCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
                <TableRow className="font-semibold bg-muted/20 border-t border-border/40">
                  <TableCell colSpan={7} className="text-left font-bold text-muted-foreground uppercase tracking-wider text-xs">Resource Profit</TableCell>
                  <TableCell colSpan={2} className="text-right text-emerald-500 font-bold text-base">
                    ${(revenueData.totalRevenue - revenueData.totalResourceCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </CardContent>
      </Card>

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
                      type="number"
                      placeholder="0"
                      value={newCostValue}
                      onChange={(e) => setNewCostValue(parseFloat(e.target.value) || 0)}
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
                      type="number"
                      placeholder="0"
                      value={editCostValue}
                      onChange={(e) => setEditCostValue(parseFloat(e.target.value) || 0)}
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
                        <TableHead className="text-right">Total Cost (USD)</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {fixedCosts && fixedCosts.map(item => {
                        const months = calculateProjectMonths();
                        const totalCost = item.type === 'Monthly' ? (item.cost || 0) * months : (item.cost || 0);

                        return (
                             <TableRow key={item.id}>
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
      
      <Card id="invoice-print-area" className="mt-6 border-l-4 border-l-emerald-500 bg-card/60 backdrop-blur-sm">
        <CardHeader className="border-b border-border/40 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                Invoice
              </CardTitle>
              <CardDescription>Comprehensive invoice breakdown for client billing.</CardDescription>
            </div>
            <div className="text-right">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Project Duration</span>
              <p className="text-lg font-bold text-foreground">
                {getProjectDurationDays()} calendar days <span className="text-xs font-normal text-muted-foreground">({calculateBusinessDays(project?.startDate, project?.endDate)} working days)</span>
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
                    <TableHead className="text-right">Billed Days</TableHead>
                    <TableHead className="text-right">Total Billed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map(user => {
                    const workingDays = calculateBusinessDays(user.onboardingDate, user.offloadingDate);
                    const totalBilling = workingDays * (user.billedRate || 0);
                    return (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.firstName} {user.lastName}</TableCell>
                        <TableCell>{user.role || 'N/A'}</TableCell>
                        <TableCell className="text-right">${(user.billedRate || 0).toLocaleString()}/day</TableCell>
                        <TableCell className="text-right">{workingDays} days</TableCell>
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
                  {fixedCosts && fixedCosts.map(item => {
                    const months = calculateProjectMonths();
                    const totalCost = item.type === 'Monthly' ? (item.cost || 0) * months : (item.cost || 0);
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.type || 'One time'}</TableCell>
                        <TableCell className="text-right">${(item.cost || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right">{item.type === 'Monthly' ? `${months} months` : '1 (One-time)'}</TableCell>
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

