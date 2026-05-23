

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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { type User, type FixedCost } from '@/types';
import { differenceInDays, eachDayOfInterval, format, isSameDay, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2 } from 'lucide-react';
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
  const { toast } = useToast();
  const [editingRates, setEditingRates] = useState<Record<string, { billedRate?: number; costRate?: number }>>({});
  const [newCostName, setNewCostName] = useState('');
  const [newCostValue, setNewCostValue] = useState(0);
  const [newCostType, setNewCostType] = useState<'One time' | 'Monthly'>('One time');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

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

  const handleFixedCostChange = (id: string, field: 'name' | 'cost', value: string | number) => {
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
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-1/2">Item</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Cost (USD)</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {fixedCosts && fixedCosts.map(item => (
                        <TableRow key={item.id}>
                            <TableCell className="font-medium">
                                <Input
                                    defaultValue={item.name}
                                    onBlur={(e) => handleFixedCostChange(item.id, 'name', e.target.value)}
                                    className="border-none bg-transparent -ml-2 focus-visible:ring-1"
                                />
                            </TableCell>
                            <TableCell>
                                <Select
                                    defaultValue={item.type || 'One time'}
                                    onValueChange={(val) => handleFixedCostChange(item.id, 'type', val)}
                                >
                                    <SelectTrigger className="border-none bg-transparent shadow-none w-32 focus:ring-0">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="One time">One time</SelectItem>
                                        <SelectItem value="Monthly">Monthly</SelectItem>
                                    </SelectContent>
                                </Select>
                            </TableCell>
                            <TableCell>
                                <Input
                                    type="number"
                                    defaultValue={item.cost}
                                    onBlur={(e) => handleFixedCostChange(item.id, 'cost', parseFloat(e.target.value) || 0)}
                                    className="w-32"
                                />
                            </TableCell>
                            <TableCell className="text-right">
                                <Button variant="ghost" size="icon" onClick={() => deleteFixedCost(item.id)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
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
                <TableHead>Resource Cost (USD)</TableHead>
                <TableHead>Fixed Costs (USD)</TableHead>
                <TableHead>Profit (USD)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-semibold">Planned Overall</TableCell>
                <TableCell>${revenueData.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                <TableCell>${revenueData.totalResourceCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                <TableCell>${revenueData.totalFixedCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                <TableCell>${revenueData.profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

