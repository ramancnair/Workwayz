'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, getDoc, doc, onSnapshot } from 'firebase/firestore';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Layers, 
  CheckCircle2, 
  ArrowUpDown, 
  Search, 
  ExternalLink,
  Briefcase
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { type Project, type User, type FixedCost, type PaymentMilestone, type Holiday, type ProjectSettings } from '@/types';
import { parseISO, eachDayOfInterval, isSameDay } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface ProjectBillingRow {
  id: string;
  name: string;
  startDate?: string;
  endDate?: string;
  revenue: number;
  resourceCost: number;
  fixedCosts: number;
  profit: number;
  completedPayments: number;
  pricingModel?: string;
  months: number;
}

const convertToDate = (val: any): Date | null => {
  if (!val) return null;
  // 1. If it's a Firestore Timestamp
  if (typeof val.toDate === 'function') {
    return val.toDate();
  }
  // 2. If it's already a Date
  if (val instanceof Date) {
    return val;
  }
  // 3. If it has seconds/nanoseconds (serialized Timestamp)
  if (typeof val.seconds === 'number') {
    return new Date(val.seconds * 1000);
  }
  // 4. If it's a string
  if (typeof val === 'string') {
    try {
      const parsed = parseISO(val);
      return isNaN(parsed.getTime()) ? null : parsed;
    } catch {
      const parsed = new Date(val);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
  }
  return null;
};

export default function BillingPage() {
  const [billingData, setBillingData] = useState<ProjectBillingRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sorting, setSorting] = useState<{ id: keyof ProjectBillingRow; desc: boolean }>({ id: 'name', desc: false });
  const [viewMode, setViewMode] = useState<'total' | 'month' | 'quarter' | 'year'>('total');
  const { toast } = useToast();

  useEffect(() => {
    if (!db) return;
    setIsLoading(true);

    const q = query(collection(db, 'projects'), where('isDeleted', '!=', true));
    const unsubscribe = onSnapshot(q, async (projectsSnapshot) => {
      try {
        const rawProjects = projectsSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Project))
          .filter(p => !p.isArchived);

        // Fetch global settings & holidays
        const globalSettingsDoc = await getDoc(doc(db, 'settings', 'main'));
        const globalSettings = globalSettingsDoc.exists() ? globalSettingsDoc.data() as ProjectSettings : null;

        const globalHolidaysSnapshot = await getDocs(collection(db, 'holidays'));
        const globalHolidays = globalHolidaysSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            date: data.date?.toDate ? data.date.toDate().toISOString() : data.date,
          } as Holiday;
        });

        // Gather billing information for each project in parallel
        const billingPromises = rawProjects.map(async (project) => {
          const [empSnap, fcSnap, pmSnap, settingsSnap, holidaysSnap] = await Promise.all([
            getDocs(collection(db, 'projects', project.id, 'employees')),
            getDocs(collection(db, 'projects', project.id, 'fixedCosts')),
            getDocs(collection(db, 'projects', project.id, 'paymentMilestones')),
            getDoc(doc(db, 'projects', project.id, 'settings', 'main')),
            getDocs(collection(db, 'projects', project.id, 'holidays')),
          ]);

          const employeesList = empSnap.docs.map(d => d.data() as User);
          const fixedCostsList = fcSnap.docs.map(d => d.data() as FixedCost);
          const paymentMilestonesList = pmSnap.docs.map(d => d.data() as PaymentMilestone);
          const projSettings = settingsSnap.exists() ? settingsSnap.data() as ProjectSettings : null;
          
          const projHolidaysList = holidaysSnap.docs.map(d => {
            const data = d.data();
            return {
              id: d.id,
              ...data,
              date: data.date?.toDate ? data.date.toDate().toISOString() : data.date,
            } as Holiday;
          });

          // Determine settings
          const projHolidays = projSettings?.overrideGlobalHolidays ? projHolidaysList : globalHolidays;
          const projWeeklyOffDays = projSettings?.overrideGlobalHolidays
            ? projSettings?.weeklyOffDays ?? globalSettings?.weeklyOffDays ?? [0, 6]
            : globalSettings?.weeklyOffDays ?? [0, 6];

          // Calculate calendar months duration for project
          let months = 1;
          const startProj = convertToDate(project.startDate);
          const endProj = convertToDate(project.endDate);
          if (startProj && endProj && endProj >= startProj) {
            const yearsDiff = endProj.getFullYear() - startProj.getFullYear();
            const monthsDiff = endProj.getMonth() - startProj.getMonth();
            months = Math.max(1, yearsDiff * 12 + monthsDiff + 1);
          }

          // Revenue & Resource Cost
          let revenue = 0;
          let resourceCost = 0;

          employeesList.forEach(user => {
            const start = convertToDate(user.onboardingDate);
            const end = convertToDate(user.offloadingDate);
            if (start && end && end >= start) {
              const holidayDates = projHolidays.map(h => convertToDate(h.date)).filter((d): d is Date => d !== null);
              const interval = eachDayOfInterval({ start, end });
              
              const businessDays = interval.filter(day => {
                const dayOfWeek = day.getDay();
                const isWeekend = projWeeklyOffDays.includes(dayOfWeek);
                const isHoliday = holidayDates.some(holiday => isSameDay(day, holiday));
                return !isWeekend && !isHoliday;
              });

              const workingDays = businessDays.length;
              revenue += workingDays * (user.billedRate || 0);
              resourceCost += workingDays * (user.costRate || 0);
            }
          });

          // Fixed Costs calculation (multiplying by calendar months if type is 'Monthly')
          const fixedCosts = fixedCostsList.reduce((acc, fc) => {
            if (fc.type === 'Monthly') {
              return acc + ((fc.cost || 0) * months);
            }
            return acc + (fc.cost || 0);
          }, 0);

          // Profit
          const profit = revenue - resourceCost - fixedCosts;

          // Completed Payments (milestones with status 'Payment Completed')
          const completedPayments = paymentMilestonesList
            .filter(pm => pm.status === 'Payment Completed')
            .reduce((acc, pm) => acc + (pm.amount || 0), 0);

          return {
            id: project.id,
            name: project.name,
            startDate: project.startDate,
            endDate: project.endDate,
            revenue,
            resourceCost,
            fixedCosts,
            profit,
            completedPayments,
            pricingModel: project.pricingModel,
            months,
          };
        });

        const calculatedData = await Promise.all(billingPromises);
        setBillingData(calculatedData);
      } catch (e) {
        console.error("Error fetching all billing data in real-time:", e);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to listen to billing details.' });
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [toast]);

  // Scale data based on viewMode
  const scaledBillingData = useMemo(() => {
    return billingData.map(project => {
      let factor = 1;
      if (viewMode === 'month') {
        factor = 1 / project.months;
      } else if (viewMode === 'quarter') {
        factor = 3 / project.months;
      } else if (viewMode === 'year') {
        factor = 12 / project.months;
      }

      return {
        ...project,
        revenue: project.revenue * factor,
        resourceCost: project.resourceCost * factor,
        fixedCosts: project.fixedCosts * factor,
        profit: project.profit * factor,
        completedPayments: project.completedPayments * factor,
      };
    });
  }, [billingData, viewMode]);

  const periodLabel = useMemo(() => {
    if (viewMode === 'month') return 'Monthly Average';
    if (viewMode === 'quarter') return 'Quarterly Average';
    if (viewMode === 'year') return 'Yearly Average';
    return 'Project Lifetime';
  }, [viewMode]);

  const periodSuffix = useMemo(() => {
    if (viewMode === 'month') return ' (/ Mo)';
    if (viewMode === 'quarter') return ' (/ Qtr)';
    if (viewMode === 'year') return ' (/ Yr)';
    return '';
  }, [viewMode]);

  // Aggregate metrics
  const aggregateMetrics = useMemo(() => {
    return scaledBillingData.reduce(
      (acc, curr) => {
        acc.totalRevenue += curr.revenue;
        acc.totalCost += curr.resourceCost;
        acc.totalFixed += curr.fixedCosts;
        acc.totalProfit += curr.profit;
        acc.totalCompleted += curr.completedPayments;
        return acc;
      },
      { totalRevenue: 0, totalCost: 0, totalFixed: 0, totalProfit: 0, totalCompleted: 0 }
    );
  }, [scaledBillingData]);

  // Sort and filter logic
  const handleSort = (columnId: keyof ProjectBillingRow) => {
    if (sorting.id === columnId) {
      setSorting({ id: columnId, desc: !sorting.desc });
    } else {
      setSorting({ id: columnId, desc: false });
    }
  };

  const processedData = useMemo(() => {
    const filtered = scaledBillingData.filter(row =>
      row.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    filtered.sort((a, b) => {
      let valA: any = a[sorting.id] ?? '';
      let valB: any = b[sorting.id] ?? '';

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sorting.desc ? valB - valA : valA - valB;
      }

      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      return sorting.desc ? strB.localeCompare(strA) : strA.localeCompare(strB);
    });

    return filtered;
  }, [scaledBillingData, searchQuery, sorting]);

  const SortableHeader = ({ columnId, children }: { columnId: keyof ProjectBillingRow; children: React.ReactNode }) => (
    <TableHead>
      <Button variant="ghost" onClick={() => handleSort(columnId)} className="-ml-4 hover:bg-transparent text-muted-foreground font-semibold">
        {children}
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    </TableHead>
  );

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <PageHeader title="Billing" description="Overview of project billing, revenue, and payments across all active projects." />

      {/* Aggregate Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20 mb-1" />
                <Skeleton className="h-3 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="transition-all hover:shadow-md border-l-4 border-l-blue-500 bg-card/60 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-500">
                ${aggregateMetrics.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Sum of resource billing</p>
            </CardContent>
          </Card>

          <Card className="transition-all hover:shadow-md border-l-4 border-l-orange-500 bg-card/60 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Resource Cost</CardTitle>
              <TrendingDown className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">
                ${aggregateMetrics.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Total resource daily costs</p>
            </CardContent>
          </Card>

          <Card className="transition-all hover:shadow-md border-l-4 border-l-purple-500 bg-card/60 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Fixed Costs</CardTitle>
              <Layers className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-500">
                ${aggregateMetrics.totalFixed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Toolings & fixed rates</p>
            </CardContent>
          </Card>

          <Card className={cn(
            "transition-all hover:shadow-md border-l-4 bg-card/60 backdrop-blur-sm",
            aggregateMetrics.totalProfit >= 0 ? "border-l-green-500" : "border-l-red-500"
          )}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Net Profit</CardTitle>
              <TrendingUp className={cn("h-4 w-4", aggregateMetrics.totalProfit >= 0 ? "text-green-500" : "text-red-500")} />
            </CardHeader>
            <CardContent>
              <div className={cn(
                "text-2xl font-bold",
                aggregateMetrics.totalProfit >= 0 ? "text-green-500" : "text-red-500"
              )}>
                ${aggregateMetrics.totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Revenue minus all expenses</p>
            </CardContent>
          </Card>

          <Card className="transition-all hover:shadow-md border-l-4 border-l-emerald-500 bg-card/60 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Collected Payments</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-500">
                ${aggregateMetrics.totalCompleted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Milestones fully received</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main projects billing list */}
      <Card className="bg-card/50 backdrop-blur-sm">
        <CardHeader className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 pb-4 border-b border-border/60">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <Briefcase className="h-5 w-5 text-blue-500" />
              Project Breakdown
              <Badge variant="outline" className="font-normal text-xs py-0.5 px-2 bg-blue-50/50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400 border-blue-200/50 transition-all duration-300">
                {periodLabel}
              </Badge>
            </CardTitle>
            <CardDescription>Detailed revenue, cost, profit, and actual completed milestones for all active projects.</CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full xl:w-auto">
            <Tabs value={viewMode} onValueChange={(val: any) => setViewMode(val)} className="w-full sm:w-auto">
              <TabsList className="grid grid-cols-4 w-full sm:w-auto">
                <TabsTrigger value="total" className="text-xs">Lifetime</TabsTrigger>
                <TabsTrigger value="month" className="text-xs">Month</TabsTrigger>
                <TabsTrigger value="quarter" className="text-xs">Quarter</TabsTrigger>
                <TabsTrigger value="year" className="text-xs">Year</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by project name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-background/50 border-muted"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : processedData.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              No projects found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent bg-muted/20">
                    <SortableHeader columnId="name">Project Name</SortableHeader>
                    <SortableHeader columnId="pricingModel">Pricing Model</SortableHeader>
                    <SortableHeader columnId="revenue">Revenue (USD)</SortableHeader>
                    <SortableHeader columnId="resourceCost">Resource Cost (USD)</SortableHeader>
                    <SortableHeader columnId="fixedCosts">Fixed Costs (USD)</SortableHeader>
                    <SortableHeader columnId="profit">Profit (USD)</SortableHeader>
                    <SortableHeader columnId="completedPayments">Completed Payments (USD)</SortableHeader>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processedData.map((project) => (
                    <TableRow key={project.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-semibold text-foreground min-w-[200px]">
                        <Link 
                          href={`/projects/${project.id}/pmo/${project.pricingModel === 'T&M' ? 'tnm-billing' : 'fb-billing'}`}
                          className="hover:text-blue-500 flex items-center gap-1.5 transition-colors group cursor-pointer"
                        >
                          {project.name}
                          <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-blue-500" />
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-semibold text-xs py-0.5 px-2.5 bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                          {project.pricingModel || 'T&M'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium text-blue-500">
                        ${project.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="font-medium text-orange-500">
                        ${project.resourceCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="font-medium text-purple-500">
                        ${project.fixedCosts.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className={cn(
                        "font-bold",
                        project.profit >= 0 ? "text-green-500" : "text-red-500"
                      )}>
                        ${project.profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="font-semibold text-emerald-500">
                        ${project.completedPayments.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" asChild className="hover:border-blue-500 hover:text-blue-500 cursor-pointer">
                          <Link href={`/projects/${project.id}/pmo/${project.pricingModel === 'T&M' ? 'tnm-billing' : 'fb-billing'}`}>
                            Manage PMO
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
