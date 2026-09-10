'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { db } from '@/lib/db-provider';
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  onSnapshot,
} from '@/lib/db-provider';
import { PageHeader } from '@/components/PageHeader';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { Badge } from '@/components/ui/badge';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  Search,
  ArrowUpDown,
  Edit,
  Layers,
  Filter,
  Briefcase,
  ExternalLink,
  ShieldCheck,
  Percent,
  KeyRound,
  Grid,
  List,
  Sparkles,
  Server,
  GitCommit,
  CheckCircle2,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { getUserInitials, cn, formatRateInput } from '@/lib/utils';
import type { Project, User, AccessLevel, ImpactedSystem, Horizontal } from '@/types';

const SYSTEM_ACCESS_LEVELS: AccessLevel[] = [
  'Administrator',
  'Senior Management',
  'Project Manager',
  'Lead',
  'Team Member',
  'PMO',
];

interface ResourceRateRow {
  id: string;
  userId?: string;
  projectId: string;
  projectName: string;
  pricingModel: string;
  empId: string;
  firstName: string;
  lastName: string;
  role: string;
  accessLevel: AccessLevel;
  avatar?: string;
  availability: number;
  billedRate: number;
  costRate: number;
  margin: number;
  marginPercentage: number;
  onboardingDate?: string;
  offloadingDate?: string;
}

interface SpecRateItem {
  id: string;
  projectId: string;
  projectName: string;
  pricingModel: string;
  name: string;
  type: 'Impacted System' | 'Horizontal';
  categoryOrWeight: string;
  category?: 'Technology' | 'Function';
  weightage?: number;
  estimate?: number;
  isEnabled?: boolean;
  estimateOrDetails: string;
  dailyBillingRate: number;
}

interface BenchmarkItem {
  name: string;
  count: number;
  avgBilledRate: number;
  minBilledRate: number;
  maxBilledRate: number;
  avgCostRate: number;
  avgMargin: number;
  avgMarginPercentage: number;
}

export default function BillingRatePage() {
  const { toast } = useToast();
  const [resourceRates, setResourceRates] = useState<ResourceRateRow[]>([]);
  const [specRates, setSpecRates] = useState<SpecRateItem[]>([]);
  const [projectsList, setProjectsList] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>('ALL');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL');
  const [selectedAccessLevelFilter, setSelectedAccessLevelFilter] = useState<string>('ALL');
  const [selectedModelFilter, setSelectedModelFilter] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'resources' | 'benchmarks' | 'specifications'>('resources');

  // Sub-tab / View state for Benchmarks & Specs
  const [benchmarkView, setBenchmarkView] = useState<'all' | 'accessLevels' | 'projectRoles'>('all');
  const [specView, setSpecView] = useState<'all' | 'impactedSystems' | 'horizontals'>('all');

  // Sorting
  const [sortField, setSortField] = useState<keyof ResourceRateRow>('billedRate');
  const [sortAsc, setSortAsc] = useState(false);

  // Edit Rate Modal State
  const [editingResource, setEditingResource] = useState<ResourceRateRow | null>(null);
  const [editBilledRate, setEditBilledRate] = useState<string>('');
  const [editCostRate, setEditCostRate] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Fetch all projects, global users & rates in real-time
  useEffect(() => {
    if (!db) return;
    setIsLoading(true);

    const q = query(collection(db, 'projects'), where('isDeleted', '!=', true));
    const unsubscribe = onSnapshot(
      q,
      async (projectsSnapshot) => {
        try {
          const rawProjects = projectsSnapshot.docs
            .map((d: any) => ({ ...d.data(), id: d.id } as Project))
            .filter((p) => !p.isArchived);

          setProjectsList(rawProjects.map((p) => ({ id: p.id, name: p.name })));

          // Fetch global users map for accurate access level resolution
          const usersSnapshot = await getDocs(collection(db, 'users'));
          const userAccessMap: Record<string, AccessLevel> = {};
          usersSnapshot.docs.forEach((uDoc: any) => {
            const uData = uDoc.data() as User;
            const access = (uData.accessLevel || 'Team Member') as AccessLevel;
            if (uData.empId) userAccessMap[uData.empId.toLowerCase()] = access;
            userAccessMap[uDoc.id.toLowerCase()] = access;
          });

          const allResourceRates: ResourceRateRow[] = [];
          const allSpecRates: SpecRateItem[] = [];

          await Promise.all(
            rawProjects.map(async (project) => {
              const [empSnap, impSnap, horizSnap] = await Promise.all([
                getDocs(collection(db, 'projects', project.id, 'employees')),
                getDocs(collection(db, 'projects', project.id, 'impactedSystems')),
                getDocs(collection(db, 'projects', project.id, 'horizontals')),
              ]);

              // Process Project Resources
              empSnap.docs.forEach((docSnap: any) => {
                const data = docSnap.data() as User;
                const billed = Number(data.billedRate) || 0;
                const cost = Number(data.costRate) || 0;
                const margin = billed - cost;
                const marginPercentage = billed > 0 ? (margin / billed) * 100 : 0;

                const empKey = (data.empId || docSnap.id || '').toLowerCase();
                const resolvedAccessLevel: AccessLevel =
                  data.accessLevel ||
                  userAccessMap[empKey] ||
                  (data.role === 'PM' || data.role === 'Program Director'
                    ? 'Project Manager'
                    : data.role === 'Lead'
                    ? 'Lead'
                    : 'Team Member');

                allResourceRates.push({
                  id: docSnap.id,
                  userId: data.id || docSnap.id,
                  projectId: project.id,
                  projectName: project.name,
                  pricingModel: project.pricingModel || 'Fixed Bid',
                  empId: data.empId || docSnap.id,
                  firstName: data.firstName || '',
                  lastName: data.lastName || '',
                  role: data.role || 'Developer',
                  accessLevel: resolvedAccessLevel,
                  avatar: data.avatar || '',
                  availability: data.availability ?? 100,
                  billedRate: billed,
                  costRate: cost,
                  margin,
                  marginPercentage,
                  onboardingDate: data.onboardingDate,
                  offloadingDate: data.offloadingDate,
                });
              });

              // Process Impacted Systems
              impSnap.docs.forEach((d: any) => {
                const s = d.data() as ImpactedSystem;
                const rate = Number(s.dailyBillingRate) || 0;
                allSpecRates.push({
                  id: d.id,
                  projectId: project.id,
                  projectName: project.name,
                  pricingModel: project.pricingModel || 'Fixed Bid',
                  name: s.name,
                  type: 'Impacted System',
                  category: s.category || 'Technology',
                  categoryOrWeight: s.category || 'Technology',
                  estimate: s.estimate || 0,
                  estimateOrDetails: `${s.estimate || 0} man-days`,
                  dailyBillingRate: rate,
                });
              });

              // Process Horizontals
              horizSnap.docs.forEach((d: any) => {
                const h = d.data() as Horizontal;
                const rate = Number(h.dailyBillingRate) || 0;
                allSpecRates.push({
                  id: d.id,
                  projectId: project.id,
                  projectName: project.name,
                  pricingModel: project.pricingModel || 'Fixed Bid',
                  name: h.name,
                  type: 'Horizontal',
                  weightage: h.weightage || 0,
                  isEnabled: h.isEnabled !== false,
                  categoryOrWeight: `${h.weightage || 0}% weight`,
                  estimateOrDetails: h.isEnabled !== false ? 'Active' : 'Disabled',
                  dailyBillingRate: rate,
                });
              });
            })
          );

          setResourceRates(allResourceRates);
          setSpecRates(allSpecRates);
        } catch (err) {
          console.error('[BillingRate] Error fetching rates:', err);
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Failed to load billing rate data.',
          });
        } finally {
          setIsLoading(false);
        }
      },
      (err) => {
        console.warn('[BillingRate] Snapshot error:', err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [toast]);

  // Unique project roles dynamically discovered across all projects
  const availableRoles = useMemo(() => {
    const rolesSet = new Set<string>();
    resourceRates.forEach((r) => {
      if (r.role && r.role.trim()) rolesSet.add(r.role.trim());
    });
    return Array.from(rolesSet).sort();
  }, [resourceRates]);

  // Filtered & Sorted Resource Rates
  const filteredResourceRates = useMemo(() => {
    return resourceRates
      .filter((item) => {
        if (selectedProjectFilter !== 'ALL' && item.projectId !== selectedProjectFilter) {
          return false;
        }
        if (selectedRoleFilter !== 'ALL' && item.role !== selectedRoleFilter) {
          return false;
        }
        if (selectedAccessLevelFilter !== 'ALL' && item.accessLevel !== selectedAccessLevelFilter) {
          return false;
        }
        if (selectedModelFilter !== 'ALL' && item.pricingModel !== selectedModelFilter) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const fullName = `${item.firstName} ${item.lastName}`.toLowerCase();
          const empId = (item.empId || '').toLowerCase();
          const role = (item.role || '').toLowerCase();
          const access = (item.accessLevel || '').toLowerCase();
          const project = item.projectName.toLowerCase();
          return (
            fullName.includes(q) ||
            empId.includes(q) ||
            role.includes(q) ||
            access.includes(q) ||
            project.includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];

        if (typeof valA === 'string') {
          valA = (valA as string).toLowerCase();
          valB = ((valB as string) || '').toLowerCase();
        }

        if (valA < valB) return sortAsc ? -1 : 1;
        if (valA > valB) return sortAsc ? 1 : -1;
        return 0;
      });
  }, [
    resourceRates,
    selectedProjectFilter,
    selectedRoleFilter,
    selectedAccessLevelFilter,
    selectedModelFilter,
    searchQuery,
    sortField,
    sortAsc,
  ]);

  // Helper to calculate benchmark statistics for any group
  const calculateBenchmark = (groupItems: ResourceRateRow[], name: string): BenchmarkItem => {
    const count = groupItems.length;
    const billedRates = groupItems.map((i) => i.billedRate);
    const costRates = groupItems.map((i) => i.costRate);
    const margins = groupItems.map((i) => i.margin);

    const totalBilled = billedRates.reduce((a, b) => a + b, 0);
    const totalCost = costRates.reduce((a, b) => a + b, 0);
    const totalMargin = margins.reduce((a, b) => a + b, 0);

    const avgBilledRate = count > 0 ? totalBilled / count : 0;
    const avgCostRate = count > 0 ? totalCost / count : 0;
    const avgMargin = count > 0 ? totalMargin / count : 0;
    const avgMarginPercentage = avgBilledRate > 0 ? (avgMargin / avgBilledRate) * 100 : 0;

    return {
      name,
      count,
      avgBilledRate,
      minBilledRate: billedRates.length > 0 ? Math.min(...billedRates) : 0,
      maxBilledRate: billedRates.length > 0 ? Math.max(...billedRates) : 0,
      avgCostRate,
      avgMargin,
      avgMarginPercentage,
    };
  };

  // 1. Access Level Rate Benchmarks
  const accessLevelBenchmarks = useMemo((): BenchmarkItem[] => {
    return SYSTEM_ACCESS_LEVELS.map((lvl) => {
      const items = resourceRates.filter((r) => r.accessLevel === lvl);
      return calculateBenchmark(items, lvl);
    }).sort((a, b) => b.avgBilledRate - a.avgBilledRate);
  }, [resourceRates]);

  // 2. Project Roles Rate Benchmarks (dynamically discovers newly created roles in any project)
  const projectRoleBenchmarks = useMemo((): BenchmarkItem[] => {
    return availableRoles
      .map((roleName) => {
        const items = resourceRates.filter((r) => r.role === roleName);
        return calculateBenchmark(items, roleName);
      })
      .sort((a, b) => b.avgBilledRate - a.avgBilledRate);
  }, [resourceRates, availableRoles]);

  // Impacted Systems only
  const impactedSystemsRates = useMemo(() => {
    return specRates
      .filter((s) => s.type === 'Impacted System')
      .filter((item) => {
        if (selectedProjectFilter !== 'ALL' && item.projectId !== selectedProjectFilter) return false;
        if (selectedModelFilter !== 'ALL' && item.pricingModel !== selectedModelFilter) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            item.name.toLowerCase().includes(q) ||
            item.projectName.toLowerCase().includes(q) ||
            (item.category || '').toLowerCase().includes(q)
          );
        }
        return true;
      });
  }, [specRates, selectedProjectFilter, selectedModelFilter, searchQuery]);

  // Horizontals only
  const horizontalsRates = useMemo(() => {
    return specRates
      .filter((s) => s.type === 'Horizontal')
      .filter((item) => {
        if (selectedProjectFilter !== 'ALL' && item.projectId !== selectedProjectFilter) return false;
        if (selectedModelFilter !== 'ALL' && item.pricingModel !== selectedModelFilter) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            item.name.toLowerCase().includes(q) ||
            item.projectName.toLowerCase().includes(q) ||
            item.categoryOrWeight.toLowerCase().includes(q)
          );
        }
        return true;
      });
  }, [specRates, selectedProjectFilter, selectedModelFilter, searchQuery]);

  // High-level workspace rate statistics
  const metrics = useMemo(() => {
    if (resourceRates.length === 0) {
      return {
        avgBilledRate: 0,
        avgCostRate: 0,
        avgMargin: 0,
        avgMarginPercent: 0,
        totalAllocations: 0,
        totalProjectsWithRates: 0,
      };
    }

    const totalBilled = resourceRates.reduce((sum, r) => sum + r.billedRate, 0);
    const totalCost = resourceRates.reduce((sum, r) => sum + r.costRate, 0);
    const totalMargin = resourceRates.reduce((sum, r) => sum + r.margin, 0);
    const count = resourceRates.length;

    const avgBilledRate = totalBilled / count;
    const avgCostRate = totalCost / count;
    const avgMargin = totalMargin / count;
    const avgMarginPercent = avgBilledRate > 0 ? (avgMargin / avgBilledRate) * 100 : 0;
    const uniqueProjects = new Set(resourceRates.map((r) => r.projectId)).size;

    return {
      avgBilledRate,
      avgCostRate,
      avgMargin,
      avgMarginPercent,
      totalAllocations: count,
      totalProjectsWithRates: uniqueProjects,
    };
  }, [resourceRates]);

  const handleSort = (field: keyof ResourceRateRow) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const openEditModal = (res: ResourceRateRow) => {
    setEditingResource(res);
    setEditBilledRate(formatRateInput(res.billedRate));
    setEditCostRate(formatRateInput(res.costRate));
  };

  const handleSaveRate = async () => {
    if (!editingResource || !db) return;
    setIsSaving(true);
    try {
      const billed = parseFloat(editBilledRate) || 0;
      const cost = parseFloat(editCostRate) || 0;

      const employeeDocRef = doc(
        db,
        'projects',
        editingResource.projectId,
        'employees',
        editingResource.id
      );
      await updateDoc(employeeDocRef, {
        billedRate: billed,
        costRate: cost,
        updatedAt: new Date().toISOString(),
      });

      // Update local state optimistically
      setResourceRates((prev) =>
        prev.map((item) => {
          if (item.id === editingResource.id && item.projectId === editingResource.projectId) {
            const margin = billed - cost;
            const marginPercentage = billed > 0 ? (margin / billed) * 100 : 0;
            return {
              ...item,
              billedRate: billed,
              costRate: cost,
              margin,
              marginPercentage,
            };
          }
          return item;
        })
      );

      toast({
        title: 'Billing Rate Updated',
        description: `Updated rates for ${editingResource.firstName} ${editingResource.lastName} in ${editingResource.projectName}.`,
      });

      setEditingResource(null);
    } catch (err: any) {
      console.error('Error saving billing rate:', err);
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: err.message || 'Could not update billing rate in database.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getAccessLevelBadge = (level: AccessLevel) => {
    switch (level) {
      case 'Administrator':
        return <Badge className="bg-red-500/15 text-red-600 dark:text-red-400 border-red-200 text-[10px]">Admin</Badge>;
      case 'Senior Management':
        return <Badge className="bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-200 text-[10px]">Sr. Mgmt</Badge>;
      case 'Project Manager':
        return <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-200 text-[10px]">PM</Badge>;
      case 'Lead':
        return <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-200 text-[10px]">Lead</Badge>;
      case 'PMO':
        return <Badge className="bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-200 text-[10px]">PMO</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px] text-muted-foreground">Team Member</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing Rates"
        description="Master directory of resource daily billing rates, internal costs, profit margins, access levels & role benchmarks across all projects."
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Average Billing Rate
            </CardTitle>
            <div className="p-2 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              <>
                <div className="text-2xl font-bold text-foreground font-mono">
                  ${metrics.avgBilledRate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  <span className="text-xs font-normal text-muted-foreground font-sans ml-1">/ day</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Across all project allocations</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Average Cost Rate
            </CardTitle>
            <div className="p-2 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <TrendingDown className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              <>
                <div className="text-2xl font-bold text-foreground font-mono">
                  ${metrics.avgCostRate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  <span className="text-xs font-normal text-muted-foreground font-sans ml-1">/ day</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Internal daily resource cost</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Average Profit Margin
            </CardTitle>
            <div className="p-2 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              <>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                  ${metrics.avgMargin.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  <span className="text-xs font-semibold ml-1.5 font-sans">
                    ({metrics.avgMarginPercent.toFixed(1)}%)
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Daily net profit spread per resource</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Allocations
            </CardTitle>
            <div className="p-2 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Users className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold text-foreground font-mono">
                  {metrics.totalAllocations}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Active across {metrics.totalProjectsWithRates} projects
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs Container */}
      <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 border-b pb-3">
          <TabsList className="inline-flex w-auto items-center justify-start gap-1 p-1 bg-muted/80 rounded-lg shrink-0">
            <TabsTrigger value="resources" className="gap-2 px-3 py-1.5 whitespace-nowrap text-xs font-medium shrink-0">
              <Users className="w-3.5 h-3.5" />
              <span>Resource Rates</span>
              <Badge variant="secondary" className="ml-0.5 px-1.5 py-0 text-[10px] h-4">
                {resourceRates.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="benchmarks" className="gap-2 px-3 py-1.5 whitespace-nowrap text-xs font-medium shrink-0">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Role Benchmarks</span>
              <Badge variant="secondary" className="ml-0.5 px-1.5 py-0 text-[10px] h-4">
                {accessLevelBenchmarks.filter((b) => b.count > 0).length + projectRoleBenchmarks.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="specifications" className="gap-2 px-3 py-1.5 whitespace-nowrap text-xs font-medium shrink-0">
              <Layers className="w-3.5 h-3.5" />
              <span>Specifications Rates</span>
              <Badge variant="secondary" className="ml-0.5 px-1.5 py-0 text-[10px] h-4">
                {specRates.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* Search bar & Filters */}
          <div className="flex items-center gap-2 flex-wrap lg:justify-end">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name, role, access level..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
            <Select value={selectedProjectFilter} onValueChange={setSelectedProjectFilter}>
              <SelectTrigger className="w-[140px] h-9 text-xs">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Projects</SelectItem>
                {projectsList.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {activeTab === 'resources' && (
              <>
                <Select value={selectedRoleFilter} onValueChange={setSelectedRoleFilter}>
                  <SelectTrigger className="w-[130px] h-9 text-xs">
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Roles</SelectItem>
                    {availableRoles.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedAccessLevelFilter} onValueChange={setSelectedAccessLevelFilter}>
                  <SelectTrigger className="w-[130px] h-9 text-xs">
                    <SelectValue placeholder="Access Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Access Levels</SelectItem>
                    {SYSTEM_ACCESS_LEVELS.map((lvl) => (
                      <SelectItem key={lvl} value={lvl}>
                        {lvl}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}

            <Select value={selectedModelFilter} onValueChange={setSelectedModelFilter}>
              <SelectTrigger className="w-[120px] h-9 text-xs">
                <SelectValue placeholder="Pricing Model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Models</SelectItem>
                <SelectItem value="Fixed Bid">Fixed Bid</SelectItem>
                <SelectItem value="T&M">T&M</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tab 1: Resource Rates Directory */}
        <TabsContent value="resources" className="space-y-4">
          <Card className="border shadow-sm">
            <CardHeader className="py-4 px-6 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">Project Resource Rate Directory</CardTitle>
                  <CardDescription className="text-xs">
                    Comprehensive view of assigned project resources, Access Levels, designated project roles, daily billed rates, and profit margins.
                  </CardDescription>
                </div>
                <div className="text-xs text-muted-foreground">
                  Showing <span className="font-semibold text-foreground">{filteredResourceRates.length}</span> of {resourceRates.length} allocations
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[220px]">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort('firstName')}
                        className="-ml-3 h-8 text-xs font-semibold"
                      >
                        Resource
                        <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
                      </Button>
                    </TableHead>
                    <TableHead>Access Level</TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort('role')}
                        className="-ml-3 h-8 text-xs font-semibold"
                      >
                        Project Role
                        <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort('projectName')}
                        className="-ml-3 h-8 text-xs font-semibold"
                      >
                        Project
                        <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-center">Pricing Model</TableHead>
                    <TableHead className="text-center">Availability</TableHead>
                    <TableHead className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort('billedRate')}
                        className="-mr-3 h-8 text-xs font-semibold"
                      >
                        Daily Billed Rate
                        <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort('costRate')}
                        className="-mr-3 h-8 text-xs font-semibold"
                      >
                        Daily Cost Rate
                        <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort('margin')}
                        className="-mr-3 h-8 text-xs font-semibold"
                      >
                        Daily Margin
                        <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-right pr-6 w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 6 }).map((_, idx) => (
                      <TableRow key={idx}>
                        <TableCell><Skeleton className="h-9 w-40" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                        <TableCell className="text-center"><Skeleton className="h-5 w-16 mx-auto" /></TableCell>
                        <TableCell className="text-center"><Skeleton className="h-5 w-12 mx-auto" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-7 w-7 ml-auto rounded" /></TableCell>
                      </TableRow>
                    ))
                  ) : filteredResourceRates.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="h-32 text-center text-muted-foreground text-sm">
                        No resource billing rates found matching your filter criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredResourceRates.map((res) => {
                      const isHighMargin = res.marginPercentage >= 35;
                      const isLowMargin = res.marginPercentage < 15;

                      return (
                        <TableRow key={`${res.projectId}-${res.id}`} className="hover:bg-muted/40 transition-colors">
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2.5">
                              <Avatar className="h-8 w-8 border">
                                <AvatarImage src={res.avatar} alt={`${res.firstName} ${res.lastName}`} />
                                <AvatarFallback className="text-xs font-semibold">
                                  {getUserInitials(res.firstName, res.lastName)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-semibold text-xs text-foreground">
                                  {res.firstName} {res.lastName}
                                </div>
                                <div className="text-[11px] font-mono text-muted-foreground">
                                  {res.empId}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getAccessLevelBadge(res.accessLevel)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[11px] font-medium bg-muted/40">
                              {res.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Link
                              href={`/projects/${res.projectId}/pmo/${res.pricingModel === 'Fixed Bid' ? 'fb-billing' : 'tnm-billing'}`}
                              className="group inline-flex items-center gap-1 font-medium text-xs text-foreground hover:text-primary transition-colors"
                            >
                              <span>{res.projectName}</span>
                              <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" />
                            </Link>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="secondary"
                              className={cn(
                                'text-[10px] px-2 py-0.5 border font-semibold',
                                res.pricingModel === 'Fixed Bid'
                                  ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                                  : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                              )}
                            >
                              {res.pricingModel}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-[11px] font-mono">
                              {res.availability}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold text-xs text-foreground">
                            ${res.billedRate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs text-muted-foreground">
                            ${res.costRate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            <div className={cn('font-semibold', res.margin >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
                              ${res.margin.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className={cn('text-[10px]', isHighMargin ? 'text-emerald-600' : isLowMargin ? 'text-amber-600' : 'text-muted-foreground')}>
                              {res.marginPercentage.toFixed(1)}%
                            </div>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEditModal(res)}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                              title="Edit Billing & Cost Rate"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Role & Access Level Benchmarks */}
        <TabsContent value="benchmarks" className="space-y-6">
          {/* Sub-view switcher */}
          <div className="flex items-center justify-between border-b pb-2 flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant={benchmarkView === 'all' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setBenchmarkView('all')}
                className="h-8 text-xs"
              >
                All Benchmarks
              </Button>
              <Button
                variant={benchmarkView === 'accessLevels' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setBenchmarkView('accessLevels')}
                className="h-8 text-xs gap-1.5"
              >
                <KeyRound className="w-3.5 h-3.5" />
                Access Levels Rates
              </Button>
              <Button
                variant={benchmarkView === 'projectRoles' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setBenchmarkView('projectRoles')}
                className="h-8 text-xs gap-1.5"
              >
                <Users className="w-3.5 h-3.5" />
                Project Roles Rates
              </Button>
            </div>
          </div>

          {/* Section 1: System Access Levels Rates */}
          {(benchmarkView === 'all' || benchmarkView === 'accessLevels') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-purple-500" />
                    System Access Levels Rates Benchmark
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Aggregated daily billing rates, internal cost, and profit margins organized by System Access Level.
                  </p>
                </div>
              </div>

              <Card className="border shadow-sm">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-[200px]">Access Level</TableHead>
                        <TableHead className="text-center">Assigned Resources</TableHead>
                        <TableHead className="text-right font-semibold">Average Daily Rate</TableHead>
                        <TableHead className="text-right">Min Daily Rate</TableHead>
                        <TableHead className="text-right">Max Daily Rate</TableHead>
                        <TableHead className="text-right">Average Cost Rate</TableHead>
                        <TableHead className="text-right pr-6">Average Margin (%)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {accessLevelBenchmarks.map((bm) => (
                        <TableRow key={bm.name} className="hover:bg-muted/40">
                          <TableCell className="font-semibold text-xs">
                            <div className="flex items-center gap-2">
                              {getAccessLevelBadge(bm.name as AccessLevel)}
                              <span className="text-foreground">{bm.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-xs font-mono">
                              {bm.count} resource{bm.count === 1 ? '' : 's'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-xs text-foreground">
                            {bm.count > 0 ? (
                              `$${bm.avgBilledRate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/day`
                            ) : (
                              <span className="text-muted-foreground font-normal">N/A</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs text-muted-foreground">
                            {bm.count > 0 ? `$${bm.minBilledRate.toFixed(2)}` : '-'}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs text-muted-foreground">
                            {bm.count > 0 ? `$${bm.maxBilledRate.toFixed(2)}` : '-'}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs text-muted-foreground">
                            {bm.count > 0 ? `$${bm.avgCostRate.toFixed(2)}` : '-'}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs pr-6">
                            {bm.count > 0 ? (
                              <div className="font-semibold text-emerald-600 dark:text-emerald-400">
                                ${bm.avgMargin.toFixed(2)}{' '}
                                <span className="text-[11px] font-normal">({bm.avgMarginPercentage.toFixed(1)}%)</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground font-normal">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Section 2: Project Roles Rates (Dynamically discovers any new project role) */}
          {(benchmarkView === 'all' || benchmarkView === 'projectRoles') && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-500" />
                    Project Roles Rates Benchmark
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Dynamically aggregated daily billing rates for all project designations. New roles created in any project are automatically listed here.
                  </p>
                </div>
                <Badge variant="outline" className="text-xs font-mono">
                  {projectRoleBenchmarks.length} Roles Discovered
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, idx) => (
                    <Card key={idx} className="border shadow-sm">
                      <CardHeader className="pb-3"><Skeleton className="h-6 w-32" /></CardHeader>
                      <CardContent className="space-y-3"><Skeleton className="h-16 w-full" /></CardContent>
                    </Card>
                  ))
                ) : projectRoleBenchmarks.length === 0 ? (
                  <Card className="col-span-full border shadow-sm p-8 text-center text-muted-foreground">
                    No project roles found in active projects.
                  </Card>
                ) : (
                  projectRoleBenchmarks.map((bm) => (
                    <Card key={bm.name} className="border shadow-sm hover:border-primary/40 transition-colors">
                      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                        <div>
                          <CardTitle className="text-base font-semibold">{bm.name}</CardTitle>
                          <CardDescription className="text-xs">
                            {bm.count} assigned resource{bm.count > 1 ? 's' : ''}
                          </CardDescription>
                        </div>
                        <Badge variant="outline" className="text-xs font-mono font-bold bg-primary/5 text-primary border-primary/20">
                          Avg: ${bm.avgBilledRate.toFixed(0)}/day
                        </Badge>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t">
                          <div>
                            <span className="text-muted-foreground text-[11px]">Min Daily Rate:</span>
                            <div className="font-mono font-semibold text-foreground">${bm.minBilledRate.toFixed(2)}</div>
                          </div>
                          <div className="text-right">
                            <span className="text-muted-foreground text-[11px]">Max Daily Rate:</span>
                            <div className="font-mono font-semibold text-foreground">${bm.maxBilledRate.toFixed(2)}</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t">
                          <div>
                            <span className="text-muted-foreground text-[11px]">Avg Cost Rate:</span>
                            <div className="font-mono text-muted-foreground">${bm.avgCostRate.toFixed(2)}</div>
                          </div>
                          <div className="text-right">
                            <span className="text-muted-foreground text-[11px]">Avg Margin:</span>
                            <div className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                              ${bm.avgMargin.toFixed(2)} ({bm.avgMarginPercentage.toFixed(1)}%)
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Tab 3: Specifications Rates (Impacted Systems & Horizontals Wise) */}
        <TabsContent value="specifications" className="space-y-6">
          {/* Sub-view switcher */}
          <div className="flex items-center justify-between border-b pb-2 flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant={specView === 'all' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setSpecView('all')}
                className="h-8 text-xs"
              >
                All Specifications ({specRates.length})
              </Button>
              <Button
                variant={specView === 'impactedSystems' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setSpecView('impactedSystems')}
                className="h-8 text-xs gap-1.5"
              >
                <Server className="w-3.5 h-3.5 text-cyan-600" />
                Impacted Systems ({impactedSystemsRates.length})
              </Button>
              <Button
                variant={specView === 'horizontals' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setSpecView('horizontals')}
                className="h-8 text-xs gap-1.5"
              >
                <GitCommit className="w-3.5 h-3.5 text-purple-600" />
                Horizontals ({horizontalsRates.length})
              </Button>
            </div>
          </div>

          {/* Section A: Impacted Systems Rates */}
          {(specView === 'all' || specView === 'impactedSystems') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                    <Server className="w-4 h-4 text-cyan-500" />
                    Impacted Systems Daily Rates
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Component and module-level daily billing rates configured across Technology and Functional systems.
                  </p>
                </div>
                <Badge variant="outline" className="text-xs font-mono">
                  {impactedSystemsRates.length} Impacted Systems
                </Badge>
              </div>

              <Card className="border shadow-sm">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-[260px]">System / Module Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead className="text-center">Pricing Model</TableHead>
                        <TableHead className="text-center">Estimated Effort</TableHead>
                        <TableHead className="text-right">Daily Billing Rate (USD)</TableHead>
                        <TableHead className="text-right pr-6">Estimated Total Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        Array.from({ length: 4 }).map((_, idx) => (
                          <TableRow key={idx}>
                            <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                            <TableCell className="text-center"><Skeleton className="h-5 w-16 mx-auto" /></TableCell>
                            <TableCell className="text-center"><Skeleton className="h-5 w-20 mx-auto" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                          </TableRow>
                        ))
                      ) : impactedSystemsRates.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="h-28 text-center text-muted-foreground text-sm">
                            No impacted systems billing rates configured.
                          </TableCell>
                        </TableRow>
                      ) : (
                        impactedSystemsRates.map((sys) => {
                          const totalVal = (sys.estimate || 0) * sys.dailyBillingRate;
                          return (
                            <TableRow key={`${sys.projectId}-${sys.id}`} className="hover:bg-muted/40 transition-colors">
                              <TableCell className="font-semibold text-xs text-foreground">
                                {sys.name}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    'text-[10px] font-medium',
                                    sys.category === 'Technology'
                                      ? 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-200'
                                      : 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-200'
                                  )}
                                >
                                  {sys.category || 'Technology'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Link
                                  href={`/projects/${sys.projectId}/project-details/specifications`}
                                  className="group inline-flex items-center gap-1 font-medium text-xs text-foreground hover:text-primary transition-colors"
                                >
                                  <span>{sys.projectName}</span>
                                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" />
                                </Link>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant="secondary" className="text-[10px]">
                                  {sys.pricingModel}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center font-mono text-xs">
                                {sys.estimate || 0} man-days
                              </TableCell>
                              <TableCell className="text-right font-mono font-semibold text-xs text-foreground">
                                ${sys.dailyBillingRate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell className="text-right font-mono font-semibold text-xs text-blue-600 dark:text-blue-400 pr-6">
                                ${totalVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Section B: Horizontals Rates */}
          {(specView === 'all' || specView === 'horizontals') && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                    <GitCommit className="w-4 h-4 text-purple-500" />
                    Horizontals Daily Rates
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Standard daily billing rates for cross-cutting horizontal capabilities (QA & Testing, Architecture, DevOps, Compliance).
                  </p>
                </div>
                <Badge variant="outline" className="text-xs font-mono">
                  {horizontalsRates.length} Horizontals Configured
                </Badge>
              </div>

              <Card className="border shadow-sm">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-[260px]">Horizontal Capability</TableHead>
                        <TableHead className="text-center">Weightage (%)</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead className="text-center">Pricing Model</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-right pr-6">Daily Billing Rate (USD)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        Array.from({ length: 4 }).map((_, idx) => (
                          <TableRow key={idx}>
                            <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                            <TableCell className="text-center"><Skeleton className="h-5 w-16 mx-auto" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                            <TableCell className="text-center"><Skeleton className="h-5 w-16 mx-auto" /></TableCell>
                            <TableCell className="text-center"><Skeleton className="h-5 w-16 mx-auto" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                          </TableRow>
                        ))
                      ) : horizontalsRates.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="h-28 text-center text-muted-foreground text-sm">
                            No horizontals billing rates configured.
                          </TableCell>
                        </TableRow>
                      ) : (
                        horizontalsRates.map((h) => (
                          <TableRow key={`${h.projectId}-${h.id}`} className="hover:bg-muted/40 transition-colors">
                            <TableCell className="font-semibold text-xs text-foreground">
                              {h.name}
                            </TableCell>
                            <TableCell className="text-center font-mono font-semibold text-xs text-purple-600 dark:text-purple-400">
                              {h.weightage || 0}%
                            </TableCell>
                            <TableCell>
                              <Link
                                href={`/projects/${h.projectId}/project-details/specifications`}
                                className="group inline-flex items-center gap-1 font-medium text-xs text-foreground hover:text-primary transition-colors"
                              >
                                <span>{h.projectName}</span>
                                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" />
                              </Link>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary" className="text-[10px]">
                                {h.pricingModel}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                variant="outline"
                                className={cn(
                                  'text-[10px]',
                                  h.isEnabled !== false
                                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200'
                                    : 'bg-muted text-muted-foreground'
                                )}
                              >
                                {h.isEnabled !== false ? 'Active' : 'Disabled'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono font-semibold text-xs text-foreground pr-6">
                              ${h.dailyBillingRate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Rate Dialog */}
      <Dialog open={!!editingResource} onOpenChange={(open) => !open && setEditingResource(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Resource Rates</DialogTitle>
            <DialogDescription className="text-xs">
              Update daily billing and internal cost rate for {editingResource?.firstName} {editingResource?.lastName} ({editingResource?.role}) in {editingResource?.projectName}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="billedRateInput" className="text-xs font-semibold">
                Daily Billing Rate (USD)
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-mono">$</span>
                <Input
                  id="billedRateInput"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={editBilledRate}
                  onChange={(e) => {
                    let val = e.target.value;
                    if (val.length > 1 && /^0[0-9]/.test(val)) {
                      val = val.replace(/^0+/, '');
                    }
                    if (/^(0|[1-9]\d{0,7})?(\.\d{0,2})?$/.test(val)) {
                      setEditBilledRate(val);
                    }
                  }}
                  onBlur={() => {
                    setEditBilledRate(formatRateInput(editBilledRate));
                  }}
                  className="pl-7 font-mono text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="costRateInput" className="text-xs font-semibold">
                Daily Cost Rate (USD)
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-mono">$</span>
                <Input
                  id="costRateInput"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={editCostRate}
                  onChange={(e) => {
                    let val = e.target.value;
                    if (val.length > 1 && /^0[0-9]/.test(val)) {
                      val = val.replace(/^0+/, '');
                    }
                    if (/^(0|[1-9]\d{0,7})?(\.\d{0,2})?$/.test(val)) {
                      setEditCostRate(val);
                    }
                  }}
                  onBlur={() => {
                    setEditCostRate(formatRateInput(editCostRate));
                  }}
                  className="pl-7 font-mono text-sm"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditingResource(null)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveRate}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
