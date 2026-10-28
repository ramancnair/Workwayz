'use client';

import { useState, useEffect, useMemo, Fragment } from 'react';
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
  ExternalLink,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { StickyXScroll } from '@/components/ui/sticky-x-scroll';
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
import { groupResourceRatesByPerson, type PersonResourceGroup } from '@/lib/billing-rate-grouping';
import type { Project, User, AccessLevel } from '@/types';

const SYSTEM_ACCESS_LEVELS: AccessLevel[] = [
  'Super Admin',
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

export default function BillingRatePage() {
  const { toast } = useToast();
  const [resourceRates, setResourceRates] = useState<ResourceRateRow[]>([]);
  const [projectsList, setProjectsList] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>('ALL');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL');
  const [selectedAccessLevelFilter, setSelectedAccessLevelFilter] = useState<string>('ALL');
  const [selectedModelFilter, setSelectedModelFilter] = useState<string>('ALL');

  // Sorting
  const [sortField, setSortField] = useState<keyof ResourceRateRow>('billedRate');
  const [sortAsc, setSortAsc] = useState(false);

  // Expanded Persons State for Collapsible Grouping
  const [expandedPersons, setExpandedPersons] = useState<Record<string, boolean>>({});

  const togglePersonExpand = (key: string) => {
    setExpandedPersons((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

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

          // Fetch global users and employees map for accurate access level resolution
          const [usersSnapshot, employeesSnapshot] = await Promise.all([
            getDocs(collection(db, 'users')).catch(() => ({ docs: [] })),
            getDocs(collection(db, 'employees')).catch(() => ({ docs: [] })),
          ]);
          const userAccessMap: Record<string, AccessLevel> = {};
          [...usersSnapshot.docs, ...employeesSnapshot.docs].forEach((uDoc: any) => {
            const uData = uDoc.data() as User;
            const access = (uData.accessLevel || 'Team Member') as AccessLevel;
            if (uData.empId) userAccessMap[uData.empId.toLowerCase()] = access;
            userAccessMap[uDoc.id.toLowerCase()] = access;
          });

          const allResourceRates: ResourceRateRow[] = [];

          await Promise.all(
            rawProjects.map(async (project) => {
              const empSnap = await getDocs(collection(db, 'projects', project.id, 'employees'));

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
            })
          );

          setResourceRates(allResourceRates);
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

  // Group filtered resource rates by person (empId or name) with aggregate statistics
  const groupedResourceRates = useMemo<PersonResourceGroup[]>(() => {
    return groupResourceRatesByPerson(filteredResourceRates, sortField, sortAsc);
  }, [filteredResourceRates, sortField, sortAsc]);

  const multiProjectGroups = useMemo(
    () => groupedResourceRates.filter((g) => g.allocations.length > 1),
    [groupedResourceRates]
  );

  const areAllExpanded =
    multiProjectGroups.length > 0 &&
    multiProjectGroups.every((g) => expandedPersons[g.key]);

  const handleExpandAll = () => {
    const all: Record<string, boolean> = {};
    groupedResourceRates.forEach((g) => {
      if (g.allocations.length > 1) {
        all[g.key] = true;
      }
    });
    setExpandedPersons(all);
  };

  const handleCollapseAll = () => {
    setExpandedPersons({});
  };

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
      case 'Super Admin':
        return (
          <Badge className="bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700/60 font-semibold text-[10px] whitespace-nowrap gap-1 inline-flex items-center">
            <ShieldCheck className="w-3 h-3 text-purple-600 dark:text-purple-400" />
            Super Admin
          </Badge>
        );
      case 'Administrator':
        return <Badge className="bg-red-500/15 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/50 text-[10px] whitespace-nowrap">Admin</Badge>;
      case 'Senior Management':
        return <Badge className="bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800/50 text-[10px] whitespace-nowrap">Senior Management</Badge>;
      case 'Project Manager':
        return <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/50 text-[10px] whitespace-nowrap">PM</Badge>;
      case 'Lead':
        return <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/50 text-[10px] whitespace-nowrap">Lead</Badge>;
      case 'PMO':
        return <Badge className="bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800/50 text-[10px] whitespace-nowrap">PMO</Badge>;
      case 'Team Member':
        return <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50 text-[10px] whitespace-nowrap">Team Member</Badge>;
      default:
        return <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50 text-[10px] whitespace-nowrap">{level || 'Team Member'}</Badge>;
    }
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <PageHeader
        title="Billing Rates"
        description="Master directory of resource daily billing rates, internal costs, profit margins, and access levels across all projects."
      />

      {/* Main Tabs Container */}
      <Tabs defaultValue="resources" className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 border-b pb-3">
          <TabsList className="inline-flex w-auto items-center justify-start gap-1 p-1 bg-muted/80 rounded-lg shrink-0">
            <TabsTrigger value="resources" className="gap-2 px-3 py-1.5 whitespace-nowrap text-xs font-medium shrink-0">
              <Users className="w-3.5 h-3.5" />
              <span>Resource Rates</span>
              <Badge variant="secondary" className="ml-0.5 px-1.5 py-0 text-[10px] h-4">
                {resourceRates.length}
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
                <div className="flex items-center gap-3">
                  {multiProjectGroups.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={areAllExpanded ? handleCollapseAll : handleExpandAll}
                      className="h-7 text-xs px-2.5 gap-1.5 font-medium border-border/80 hover:bg-muted/60"
                    >
                      <Layers className="w-3.5 h-3.5 text-primary" />
                      {areAllExpanded ? 'Collapse All' : `Expand Multi-Project (${multiProjectGroups.length})`}
                    </Button>
                  )}
                  <div className="text-xs text-muted-foreground">
                    Showing <span className="font-semibold text-foreground">{groupedResourceRates.length}</span> people (<span className="font-semibold text-foreground">{filteredResourceRates.length}</span> allocations)
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <StickyXScroll><Table wrapperClassName="overflow-visible">
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
                  ) : groupedResourceRates.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="h-32 text-center text-muted-foreground text-sm">
                        No resource billing rates found matching your filter criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    groupedResourceRates.map((group) => {
                      const isMulti = group.allocations.length > 1;
                      const isExpanded = Boolean(expandedPersons[group.key]);

                      if (isMulti) {
                        const isHighMargin = group.avgMarginPercentage >= 35;
                        const isLowMargin = group.avgMarginPercentage < 15;
                        const uniqueRoles = Array.from(new Set(group.allocations.map((a) => a.role)));
                        const uniqueModels = Array.from(new Set(group.allocations.map((a) => a.pricingModel)));

                        return (
                          <Fragment key={group.key}>
                            {/* Parent Collapsible Group Row */}
                            <TableRow
                              className={cn(
                                'hover:bg-muted/40 transition-colors cursor-pointer select-none',
                                isExpanded && 'bg-muted/20 border-b border-border/60'
                              )}
                              onClick={() => togglePersonExpand(group.key)}
                            >
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      togglePersonExpand(group.key);
                                    }}
                                    className="p-1 -ml-1 text-muted-foreground hover:text-foreground rounded transition-colors"
                                    aria-label={isExpanded ? 'Collapse allocations' : 'Expand allocations'}
                                  >
                                    {isExpanded ? (
                                      <ChevronDown className="h-4 w-4 text-primary" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4" />
                                    )}
                                  </button>
                                  <Avatar className="h-8 w-8 border shrink-0">
                                    <AvatarImage src={group.avatar} alt={`${group.firstName} ${group.lastName}`} />
                                    <AvatarFallback className="text-xs font-semibold">
                                      {getUserInitials(group.firstName, group.lastName)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-semibold text-xs text-foreground truncate">
                                        {group.firstName} {group.lastName}
                                      </span>
                                      <Badge
                                        variant="secondary"
                                        className="text-[10px] px-1.5 py-0 font-semibold bg-primary/10 text-primary border-primary/20 shrink-0"
                                      >
                                        {group.allocations.length} Projects
                                      </Badge>
                                    </div>
                                    <div className="text-[11px] font-mono text-muted-foreground">
                                      {group.empId}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                {getAccessLevelBadge(group.accessLevel)}
                              </TableCell>
                              <TableCell>
                                {uniqueRoles.length === 1 ? (
                                  <Badge variant="outline" className="text-[11px] font-medium bg-muted/40">
                                    {uniqueRoles[0]}
                                  </Badge>
                                ) : (
                                  <div className="flex flex-wrap gap-1 max-w-[160px]">
                                    {uniqueRoles.map((r) => (
                                      <Badge key={r} variant="outline" className="text-[10px] font-medium bg-muted/40">
                                        {r}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                                  <span>{group.allocations.length} Project Allocations</span>
                                  {isExpanded ? (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  ) : (
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  )}
                                </div>
                                <div
                                  className="text-[10px] text-muted-foreground truncate max-w-[240px]"
                                  title={group.allocations.map((a) => a.projectName).join(', ')}
                                >
                                  {group.allocations.map((a) => a.projectName).join(', ')}
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                {uniqueModels.length === 1 ? (
                                  <Badge
                                    variant="secondary"
                                    className={cn(
                                      'text-[10px] px-2 py-0.5 border font-semibold',
                                      uniqueModels[0] === 'Fixed Bid'
                                        ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                                        : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                    )}
                                  >
                                    {uniqueModels[0]}
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] px-2 py-0.5 border font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                                  >
                                    Mixed
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    'text-[11px] font-mono',
                                    group.totalAvailability > 100 &&
                                    'text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700 bg-amber-500/10 font-bold'
                                  )}
                                >
                                  {group.totalAvailability}%
                                </Badge>
                                <div className="text-[9px] text-muted-foreground">total</div>
                              </TableCell>
                              <TableCell className="text-right font-mono text-xs">
                                <div className="font-semibold text-foreground">
                                  ${group.avgBilledRate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                                <div className="text-[10px] text-muted-foreground font-sans">avg / day</div>
                              </TableCell>
                              <TableCell className="text-right font-mono text-xs">
                                <div className="text-muted-foreground">
                                  ${group.avgCostRate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                                <div className="text-[10px] text-muted-foreground font-sans">avg / day</div>
                              </TableCell>
                              <TableCell className="text-right font-mono text-xs">
                                <div
                                  className={cn(
                                    'font-semibold',
                                    group.avgMargin >= 0
                                      ? 'text-emerald-600 dark:text-emerald-400'
                                      : 'text-red-600 dark:text-red-400'
                                  )}
                                >
                                  ${group.avgMargin.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                                <div
                                  className={cn(
                                    'text-[10px] font-sans',
                                    isHighMargin
                                      ? 'text-emerald-600'
                                      : isLowMargin
                                        ? 'text-amber-600'
                                        : 'text-muted-foreground'
                                  )}
                                >
                                  {group.avgMarginPercentage.toFixed(1)}% avg
                                </div>
                              </TableCell>
                              <TableCell className="text-right pr-6" onClick={(e) => e.stopPropagation()}>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => togglePersonExpand(group.key)}
                                  className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                                  title={isExpanded ? 'Collapse project allocations' : 'Expand project allocations'}
                                >
                                  {isExpanded ? (
                                    <>
                                      <ChevronDown className="w-3.5 h-3.5 text-primary" />
                                      <span className="text-[11px]">Hide</span>
                                    </>
                                  ) : (
                                    <>
                                      <ChevronRight className="w-3.5 h-3.5" />
                                      <span className="text-[11px]">View</span>
                                    </>
                                  )}
                                </Button>
                              </TableCell>
                            </TableRow>

                            {/* Nested Project Allocation Rows */}
                            {isExpanded &&
                              group.allocations.map((alloc, allocIdx) => {
                                const isAllocHighMargin = alloc.marginPercentage >= 35;
                                const isAllocLowMargin = alloc.marginPercentage < 15;

                                return (
                                  <TableRow
                                    key={`${group.key}-${alloc.projectId}-${alloc.id}`}
                                    className="bg-muted/15 hover:bg-muted/30 border-l-2 border-l-primary/60 transition-colors"
                                  >
                                    <TableCell className="font-medium pl-8">
                                      <div className="flex items-center gap-2">
                                        <span className="text-muted-foreground/60 text-xs font-mono select-none">↳</span>
                                        <span className="text-[11px] font-medium text-muted-foreground">
                                          Allocation {allocIdx + 1}
                                        </span>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <span className="text-[11px] text-muted-foreground">—</span>
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant="outline" className="text-[11px] font-medium bg-background">
                                        {alloc.role}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      <Link
                                        href={`/projects/${alloc.projectId}/pmo/${alloc.pricingModel === 'Fixed Bid' ? 'fb-billing' : 'tnm-billing'}`}
                                        className="group inline-flex items-center gap-1 font-medium text-xs text-foreground hover:text-primary transition-colors"
                                      >
                                        <span>{alloc.projectName}</span>
                                        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" />
                                      </Link>
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <Badge
                                        variant="secondary"
                                        className={cn(
                                          'text-[10px] px-2 py-0.5 border font-semibold',
                                          alloc.pricingModel === 'Fixed Bid'
                                            ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                                            : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                        )}
                                      >
                                        {alloc.pricingModel}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <Badge variant="outline" className="text-[11px] font-mono bg-background">
                                        {alloc.availability}%
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-mono font-medium text-xs text-foreground">
                                      ${alloc.billedRate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                                      ${alloc.costRate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-xs">
                                      <div
                                        className={cn(
                                          'font-medium',
                                          alloc.margin >= 0
                                            ? 'text-emerald-600 dark:text-emerald-400'
                                            : 'text-red-600 dark:text-red-400'
                                        )}
                                      >
                                        ${alloc.margin.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </div>
                                      <div
                                        className={cn(
                                          'text-[10px]',
                                          isAllocHighMargin
                                            ? 'text-emerald-600'
                                            : isAllocLowMargin
                                              ? 'text-amber-600'
                                              : 'text-muted-foreground'
                                        )}
                                      >
                                        {alloc.marginPercentage.toFixed(1)}%
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-right pr-6" onClick={(e) => e.stopPropagation()}>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => openEditModal(alloc)}
                                        className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                                        title={`Edit Rate for ${alloc.projectName}`}
                                      >
                                        <Edit className="w-3.5 h-3.5" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                          </Fragment>
                        );
                      }

                      // Single-project person allocation
                      const res = group.allocations[0];
                      const isHighMargin = res.marginPercentage >= 35;
                      const isLowMargin = res.marginPercentage < 15;

                      return (
                        <TableRow key={group.key} className="hover:bg-muted/40 transition-colors">
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2.5">
                              <div className="w-4 shrink-0" />
                              <Avatar className="h-8 w-8 border shrink-0">
                                <AvatarImage src={res.avatar} alt={`${res.firstName} ${res.lastName}`} />
                                <AvatarFallback className="text-xs font-semibold">
                                  {getUserInitials(res.firstName, res.lastName)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <div className="font-semibold text-xs text-foreground truncate">
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
              </Table></StickyXScroll>
            </CardContent>
          </Card>
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
