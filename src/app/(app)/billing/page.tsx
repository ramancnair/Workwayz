'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/db-provider';
import { collection, getDocs, query, where, getDoc, doc, onSnapshot } from '@/lib/db-provider';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Layers, 
  CheckCircle2, 
  ArrowUpDown, 
  Search, 
  ExternalLink,
  Briefcase,
  Calendar
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { type Project, type User, type FixedCost, type PaymentMilestone, type Holiday, type ProjectSettings } from '@/types';
import { 
  parseISO, 
  eachDayOfInterval, 
  isSameDay, 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfQuarter, 
  endOfQuarter, 
  startOfYear, 
  endOfYear,
  subMonths,
  addMonths,
  subQuarters,
  addQuarters,
  eachMonthOfInterval,
  getQuarter,
  getYear,
  getMonth
} from 'date-fns';
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

interface ProjectBillingSource {
  project: {
    id: string;
    name: string;
    startDate?: string;
    endDate?: string;
    pricingModel?: string;
  };
  employees: User[];
  fixedCosts: FixedCost[];
  paymentMilestones: PaymentMilestone[];
  holidays: Holiday[];
  weeklyOffDays: number[];
}

const convertToDate = (val: any): Date | null => {
  if (!val) return null;
  if (typeof val.toDate === 'function') {
    return val.toDate();
  }
  if (val instanceof Date) {
    return val;
  }
  if (typeof val.seconds === 'number') {
    return new Date(val.seconds * 1000);
  }
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

function SortableHeader({
  columnId,
  onSort,
  children,
}: {
  columnId: keyof ProjectBillingRow;
  onSort: (columnId: keyof ProjectBillingRow) => void;
  children: React.ReactNode;
}) {
  return (
    <TableHead>
      <Button
        variant="ghost"
        onClick={() => onSort(columnId)}
        className="-ml-4 hover:bg-transparent text-muted-foreground font-semibold"
      >
        {children}
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    </TableHead>
  );
}

export default function BillingPage() {
  const router = useRouter();
  const [billingSources, setBillingSources] = useState<ProjectBillingSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sorting, setSorting] = useState<{ id: keyof ProjectBillingRow; desc: boolean }>({ id: 'name', desc: false });
  
  // Executive Timeframe Filter State - Defaults to current month
  const [granularity, setGranularity] = useState<'month' | 'quarter' | 'year' | 'total'>('month');
  const [selectedYear, setSelectedYear] = useState<string>(() => String(getYear(new Date())));
  const [selectedMonthNum, setSelectedMonthNum] = useState<string>(() => format(new Date(), 'MM'));
  const [selectedQuarterNum, setSelectedQuarterNum] = useState<string>(() => String(getQuarter(new Date())));

  const { toast } = useToast();

  useEffect(() => {
    if (!db) return;
    setIsLoading(true);

    const q = query(collection(db, 'projects'), where('isDeleted', '!=', true));
    const unsubscribe = onSnapshot(q, async (projectsSnapshot: any) => {
      try {
        const rawProjects = projectsSnapshot.docs
          .map((doc: any) => ({ ...doc.data(), id: doc.id } as Project))
          .filter((p: any) => !p.isArchived);

        // Fetch global settings & holidays
        const globalSettingsDoc = await getDoc(doc(db, 'settings', 'main'));
        const globalSettings = globalSettingsDoc.exists() ? globalSettingsDoc.data() as ProjectSettings : null;

        const globalHolidaysSnapshot = await getDocs(collection(db, 'holidays'));
        const globalHolidays = globalHolidaysSnapshot.docs.map((doc: any) => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            date: data.date?.toDate ? data.date.toDate().toISOString() : data.date,
          } as Holiday;
        });

        // Gather billing source information for each project in parallel
        const billingPromises = rawProjects.map(async (project: any) => {
          const [empSnap, fcSnap, pmSnap, settingsSnap, holidaysSnap] = await Promise.all([
            getDocs(collection(db, 'projects', project.id, 'employees')),
            getDocs(collection(db, 'projects', project.id, 'fixedCosts')),
            getDocs(collection(db, 'projects', project.id, 'paymentMilestones')),
            getDoc(doc(db, 'projects', project.id, 'settings', 'main')),
            getDocs(collection(db, 'projects', project.id, 'holidays')),
          ]);

          const employeesList = empSnap.docs.map((d: any) => d.data() as User);
          const fixedCostsList = fcSnap.docs.map((d: any) => d.data() as FixedCost);
          const paymentMilestonesList = pmSnap.docs.map((d: any) => d.data() as PaymentMilestone);
          const projSettings = settingsSnap.exists() ? settingsSnap.data() as ProjectSettings : null;
          
          const projHolidaysList = holidaysSnap.docs.map((d: any) => {
            const data = d.data();
            return {
              ...data,
              id: d.id,
              date: data.date?.toDate ? data.date.toDate().toISOString() : data.date,
            } as Holiday;
          });

          // Determine project-specific settings
          const projHolidays = projSettings?.overrideGlobalHolidays ? projHolidaysList : globalHolidays;
          const projWeeklyOffDays = projSettings?.overrideGlobalHolidays
            ? projSettings?.weeklyOffDays ?? globalSettings?.weeklyOffDays ?? [0, 6]
            : globalSettings?.weeklyOffDays ?? [0, 6];

          return {
            project: {
              id: project.id,
              name: project.name,
              startDate: project.startDate,
              endDate: project.endDate,
              pricingModel: project.pricingModel,
            },
            employees: employeesList,
            fixedCosts: fixedCostsList,
            paymentMilestones: paymentMilestonesList,
            holidays: projHolidays,
            weeklyOffDays: projWeeklyOffDays,
          } as ProjectBillingSource;
        });

        const sources = await Promise.all(billingPromises);
        setBillingSources(sources);
      } catch (e) {
        console.error("Error fetching all billing sources in real-time:", e);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to listen to billing details.' });
      } finally {
        setIsLoading(false);
      }
    }, (err: any) => {
      console.warn('[Billing] Projects listener error:', err);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  // Generate Year Options: past 4 years to next 1 year
  const yearOptions = useMemo(() => {
    const today = new Date();
    const curYear = getYear(today);
    const options: { value: string; label: string }[] = [];
    for (let yr = curYear + 1; yr >= curYear - 4; yr--) {
      const val = String(yr);
      options.push({
        value: val,
        label: val,
      });
    }
    return options;
  }, []);

  // 12 Months Options
  const monthNamesOptions = useMemo(() => {
    const months = [
      { value: '01', name: 'January' },
      { value: '02', name: 'February' },
      { value: '03', name: 'March' },
      { value: '04', name: 'April' },
      { value: '05', name: 'May' },
      { value: '06', name: 'June' },
      { value: '07', name: 'July' },
      { value: '08', name: 'August' },
      { value: '09', name: 'September' },
      { value: '10', name: 'October' },
      { value: '11', name: 'November' },
      { value: '12', name: 'December' },
    ];

    return months.map(m => ({
      value: m.value,
      label: m.name,
    }));
  }, []);

  // 4 Quarters Options
  const quarterNamesOptions = useMemo(() => {
    const quarters = [
      { value: '1', name: 'Q1 (Jan - Mar)' },
      { value: '2', name: 'Q2 (Apr - Jun)' },
      { value: '3', name: 'Q3 (Jul - Sep)' },
      { value: '4', name: 'Q4 (Oct - Dec)' },
    ];

    return quarters.map(q => ({
      value: q.value,
      label: q.name,
    }));
  }, []);

  // Determine Active Calendar Interval
  const activeDateInterval = useMemo((): { start: Date; end: Date; label: string } | null => {
    if (granularity === 'total') return null;

    const yr = parseInt(selectedYear) || getYear(new Date());

    if (granularity === 'month') {
      const mIdx = Math.max(0, Math.min(11, parseInt(selectedMonthNum) - 1));
      const d = new Date(yr, mIdx, 1);
      return {
        start: startOfMonth(d),
        end: endOfMonth(d),
        label: format(d, 'MMMM yyyy'),
      };
    }

    if (granularity === 'quarter') {
      const q = Math.max(1, Math.min(4, parseInt(selectedQuarterNum) || 1));
      const d = new Date(yr, (q - 1) * 3, 1);
      return {
        start: startOfQuarter(d),
        end: endOfQuarter(d),
        label: `Q${q} ${yr}`,
      };
    }

    if (granularity === 'year') {
      const d = new Date(yr, 0, 1);
      return {
        start: startOfYear(d),
        end: endOfYear(d),
        label: `${yr}`,
      };
    }

    return null;
  }, [granularity, selectedYear, selectedMonthNum, selectedQuarterNum]);

  // Compute Project Financial Performance based on Active Date Range
  const calculatedBillingData = useMemo((): ProjectBillingRow[] => {
    return billingSources.map(({ project, employees, fixedCosts, paymentMilestones, holidays, weeklyOffDays }) => {
      const holidayDates = holidays
        .map(h => convertToDate(h.date))
        .filter((d): d is Date => d !== null);

      // Lifetime / Total View (unbounded)
      if (!activeDateInterval) {
        let months = 1;
        const startProj = convertToDate(project.startDate);
        const endProj = convertToDate(project.endDate);
        if (startProj && endProj && endProj >= startProj) {
          const yearsDiff = endProj.getFullYear() - startProj.getFullYear();
          const monthsDiff = endProj.getMonth() - startProj.getMonth();
          months = Math.max(1, yearsDiff * 12 + monthsDiff + 1);
        }

        let revenue = 0;
        let resourceCost = 0;

        employees.forEach(user => {
          const start = convertToDate(user.onboardingDate);
          const end = convertToDate(user.offloadingDate);
          if (start && end && end >= start) {
            const interval = eachDayOfInterval({ start, end });
            const businessDays = interval.filter(day => {
              const dayOfWeek = day.getDay();
              const isWeekend = weeklyOffDays.includes(dayOfWeek);
              const isHoliday = holidayDates.some(holiday => isSameDay(day, holiday));
              return !isWeekend && !isHoliday;
            });
            const workingDays = businessDays.length;
            revenue += workingDays * (user.billedRate || 0);
            resourceCost += workingDays * (user.costRate || 0);
          }
        });

        const totalFixedCosts = fixedCosts.reduce((acc, fc) => {
          if (fc.type === 'Monthly') {
            return acc + ((fc.cost || 0) * months);
          }
          return acc + (fc.cost || 0);
        }, 0);

        const profit = revenue - resourceCost - totalFixedCosts;

        const completedPayments = paymentMilestones
          .filter(pm => pm.status === 'Payment Completed')
          .reduce((acc, pm) => acc + (pm.amount || 0), 0);

        return {
          id: project.id,
          name: project.name,
          startDate: project.startDate,
          endDate: project.endDate,
          pricingModel: project.pricingModel,
          revenue,
          resourceCost,
          fixedCosts: totalFixedCosts,
          profit,
          completedPayments,
          months,
        };
      }

      // Specific Calendar Interval Calculation [periodStart, periodEnd]
      const { start: pStart, end: pEnd } = activeDateInterval;

      let revenue = 0;
      let resourceCost = 0;

      employees.forEach(user => {
        const userStart = convertToDate(user.onboardingDate);
        const userEnd = convertToDate(user.offloadingDate);
        if (userStart && userEnd && userEnd >= userStart) {
          // Clamp to active calendar interval
          const overlapStart = userStart < pStart ? pStart : userStart;
          const overlapEnd = userEnd > pEnd ? pEnd : userEnd;

          if (overlapStart <= overlapEnd) {
            const interval = eachDayOfInterval({ start: overlapStart, end: overlapEnd });
            const businessDays = interval.filter(day => {
              const dayOfWeek = day.getDay();
              const isWeekend = weeklyOffDays.includes(dayOfWeek);
              const isHoliday = holidayDates.some(holiday => isSameDay(day, holiday));
              return !isWeekend && !isHoliday;
            });
            const workingDays = businessDays.length;
            revenue += workingDays * (user.billedRate || 0);
            resourceCost += workingDays * (user.costRate || 0);
          }
        }
      });

      // Project lifetime overlap with this calendar period
      const projStart = convertToDate(project.startDate);
      const projEnd = convertToDate(project.endDate);

      let activeMonthsInPeriod = 0;
      let isProjectActiveInPeriod = false;

      if (projStart && projEnd && projEnd >= projStart) {
        const pOverlapStart = projStart < pStart ? pStart : projStart;
        const pOverlapEnd = projEnd > pEnd ? pEnd : projEnd;

        if (pOverlapStart <= pOverlapEnd) {
          isProjectActiveInPeriod = true;
          const yearsDiff = pOverlapEnd.getFullYear() - pOverlapStart.getFullYear();
          const monthsDiff = pOverlapEnd.getMonth() - pOverlapStart.getMonth();
          activeMonthsInPeriod = Math.max(1, yearsDiff * 12 + monthsDiff + 1);
        }
      } else {
        // Fallback if project dates are unspecified
        isProjectActiveInPeriod = true;
        activeMonthsInPeriod = granularity === 'month' ? 1 : (granularity === 'quarter' ? 3 : 12);
      }

      // Fixed Costs in Period:
      // Monthly fixed costs apply for active months in interval
      // One-time fixed costs apply only if project started in this period
      const totalFixedCosts = fixedCosts.reduce((acc, fc) => {
        if (fc.type === 'Monthly') {
          return acc + ((fc.cost || 0) * activeMonthsInPeriod);
        }
        if (projStart && projStart >= pStart && projStart <= pEnd) {
          return acc + (fc.cost || 0);
        }
        return acc;
      }, 0);

      const profit = revenue - resourceCost - totalFixedCosts;

      // Completed Payments in Period:
      const completedPayments = paymentMilestones
        .filter(pm => {
          if (pm.status !== 'Payment Completed') return false;
          if (pm.statusHistory && pm.statusHistory.length > 0) {
            const completedEntry = [...pm.statusHistory]
              .reverse()
              .find(sh => sh.status === 'Payment Completed' && sh.date);
            if (completedEntry && completedEntry.date) {
              const cDate = convertToDate(completedEntry.date);
              if (cDate) {
                return cDate >= pStart && cDate <= pEnd;
              }
            }
          }
          return isProjectActiveInPeriod;
        })
        .reduce((acc, pm) => acc + (pm.amount || 0), 0);

      return {
        id: project.id,
        name: project.name,
        startDate: project.startDate,
        endDate: project.endDate,
        pricingModel: project.pricingModel,
        revenue,
        resourceCost,
        fixedCosts: totalFixedCosts,
        profit,
        completedPayments,
        months: activeMonthsInPeriod,
      };
    });
  }, [billingSources, activeDateInterval, granularity]);

  // Aggregate metrics for top KPI cards
  const aggregateMetrics = useMemo(() => {
    return calculatedBillingData.reduce(
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
  }, [calculatedBillingData]);

  // Sort and filter logic
  const handleSort = (columnId: keyof ProjectBillingRow) => {
    if (sorting.id === columnId) {
      setSorting({ id: columnId, desc: !sorting.desc });
    } else {
      setSorting({ id: columnId, desc: false });
    }
  };

  const processedData = useMemo(() => {
    const filtered = calculatedBillingData.filter(row =>
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
  }, [calculatedBillingData, searchQuery, sorting]);

  const activePeriodTitle = activeDateInterval ? activeDateInterval.label : 'Lifetime';

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <PageHeader 
        title="Billing" 
        description="Executive financial overview of project revenue, cost, profit, and payments." 
      />

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
              <p className="text-xs text-muted-foreground mt-1">
                {activeDateInterval ? `Revenue for ${activeDateInterval.label}` : 'Sum of all resource billing'}
              </p>
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
              <p className="text-xs text-muted-foreground mt-1">
                {activeDateInterval ? `Resource costs for ${activeDateInterval.label}` : 'Total resource daily costs'}
              </p>
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
              <p className="text-xs text-muted-foreground mt-1">
                {activeDateInterval ? `Fixed expenses for ${activeDateInterval.label}` : 'Toolings & fixed rates'}
              </p>
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
              <p className="text-xs text-muted-foreground mt-1">
                {activeDateInterval ? `Net profit for ${activeDateInterval.label}` : 'Revenue minus all expenses'}
              </p>
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
              <p className="text-xs text-muted-foreground mt-1">
                {activeDateInterval ? `Milestones received in ${activeDateInterval.label}` : 'Milestones fully received'}
              </p>
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
              <span>Project Financial Performance</span>
              <Badge variant="outline" className="ml-1 text-xs font-semibold border-blue-500/30 text-blue-400">
                {activePeriodTitle}
              </Badge>
            </CardTitle>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full xl:w-auto">
            {/* Timeframe Granularity Dropdown */}
            <Select value={granularity} onValueChange={(val: any) => setGranularity(val)}>
              <SelectTrigger className="w-full sm:w-[130px] bg-background/50 border-muted text-xs h-9">
                <Calendar className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder="Timeframe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month" className="text-xs">Monthly</SelectItem>
                <SelectItem value="quarter" className="text-xs">Quarterly</SelectItem>
                <SelectItem value="year" className="text-xs">Yearly</SelectItem>
                <SelectItem value="total" className="text-xs">Lifetime</SelectItem>
              </SelectContent>
            </Select>

            {/* Year Dropdown (Displayed for Monthly, Quarterly, and Yearly; hidden for Lifetime) */}
            {granularity !== 'total' && (
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-full sm:w-[110px] bg-background/50 border-muted font-medium text-xs h-9">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {yearOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Sub-period Dropdown: Month or Quarter based on Timeframe (Hidden for Yearly and Lifetime) */}
            {granularity === 'month' && (
              <Select value={selectedMonthNum} onValueChange={setSelectedMonthNum}>
                <SelectTrigger className="w-full sm:w-[150px] bg-background/50 border-muted font-medium text-xs h-9">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {monthNamesOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {granularity === 'quarter' && (
              <Select value={selectedQuarterNum} onValueChange={setSelectedQuarterNum}>
                <SelectTrigger className="w-full sm:w-[160px] bg-background/50 border-muted font-medium text-xs h-9">
                  <SelectValue placeholder="Quarter" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {quarterNamesOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Project Search Box */}
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by project name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-background/50 border-muted text-xs h-9"
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
              No projects found for {activePeriodTitle}.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent bg-muted/20">
                    <SortableHeader columnId="name" onSort={handleSort}>Project Name</SortableHeader>
                    <SortableHeader columnId="pricingModel" onSort={handleSort}>Pricing Model</SortableHeader>
                    <SortableHeader columnId="revenue" onSort={handleSort}>Revenue (USD)</SortableHeader>
                    <SortableHeader columnId="resourceCost" onSort={handleSort}>Resource Cost (USD)</SortableHeader>
                    <SortableHeader columnId="fixedCosts" onSort={handleSort}>Fixed Costs (USD)</SortableHeader>
                    <SortableHeader columnId="profit" onSort={handleSort}>Profit (USD)</SortableHeader>
                    <SortableHeader columnId="completedPayments" onSort={handleSort}>Completed Payments (USD)</SortableHeader>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processedData.map((project) => {
                    const pmoUrl = `/projects/${project.id}/pmo/${project.pricingModel === 'T&M' ? 'tnm-billing' : 'fb-billing'}`;
                    return (
                      <TableRow
                        key={project.id}
                        onClick={() => router.push(pmoUrl)}
                        className="hover:bg-muted/40 cursor-pointer transition-colors group"
                        title={`View ${project.name} PMO`}
                      >
                        <TableCell className="font-semibold text-foreground min-w-[200px]">
                          <div className="flex items-center gap-1.5 group-hover:text-blue-500 transition-colors">
                            <span>{project.name}</span>
                            <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-blue-500 shrink-0" />
                          </div>
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
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
