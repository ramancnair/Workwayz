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
  CreditCard,
  Plus,
  Trash2,
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
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { getUserInitials, cn, formatRateInput } from '@/lib/utils';
import { groupResourceRatesByPerson, type PersonResourceGroup } from '@/lib/billing-rate-grouping';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  subscribeRateCards,
  saveRateCard,
  deleteRateCard,
  STANDARD_TECH_ROLES,
  STANDARD_HORIZONTAL_ROLES,
} from '@/lib/rate-cards-service';
import type { RateCardItem, RateCardRoleCategory } from '@/types';
import type { Project, User, AccessLevel } from '@/types';

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
  const [isLoading, setIsLoading] = useState(true);

  // Search
  const [searchQuery, setSearchQuery] = useState('');

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

  // Active Tab State
  const [activeTab, setActiveTab] = useState<'resources' | 'rate-card'>('resources');

  // Rate Cards State
  const [rateCards, setRateCards] = useState<RateCardItem[]>([]);
  const [rateCardCategoryFilter, setRateCardCategoryFilter] = useState<'all' | 'Tech' | 'Horizontal'>('all');
  const [rateCardSortField, setRateCardSortField] = useState<'roleName' | 'category' | 'lowRate' | 'mediumRate' | 'highRate'>('roleName');
  const [rateCardSortAsc, setRateCardSortAsc] = useState(true);

  // Rate Card Add/Edit Modal State
  const [isRateCardModalOpen, setIsRateCardModalOpen] = useState(false);
  const [editingRateCard, setEditingRateCard] = useState<RateCardItem | null>(null);
  const [rcRoleName, setRcRoleName] = useState('');
  const [rcCategory, setRcCategory] = useState<RateCardRoleCategory>('Tech');
  const [rcLowRate, setRcLowRate] = useState('');
  const [rcMediumRate, setRcMediumRate] = useState('');
  const [rcHighRate, setRcHighRate] = useState('');
  const [isRcSaving, setIsRcSaving] = useState(false);

  // Rate Card Delete Confirmation State
  const [deletingRateCard, setDeletingRateCard] = useState<RateCardItem | null>(null);
  const [isRcDeleting, setIsRcDeleting] = useState(false);

  // Real-time subscription to rate cards
  useEffect(() => {
    const unsub = subscribeRateCards((items) => {
      setRateCards(items);
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

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

  // Filtered & Sorted Resource Rates
  const filteredResourceRates = useMemo(() => {
    return resourceRates
      .filter((item) => {
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const fullName = `${item.firstName} ${item.lastName}`.toLowerCase();
          const empId = (item.empId || '').toLowerCase();
          const role = (item.role || '').toLowerCase();
          const access = (item.accessLevel || '').toLowerCase();
          const project = item.projectName.toLowerCase();
          const pricingModel = (item.pricingModel || '').toLowerCase();
          return (
            fullName.includes(q) ||
            empId.includes(q) ||
            role.includes(q) ||
            access.includes(q) ||
            project.includes(q) ||
            pricingModel.includes(q)
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
  }, [resourceRates, searchQuery, sortField, sortAsc]);

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

  // Filtered and Sorted Rate Cards
  const filteredRateCards = useMemo(() => {
    let result = [...rateCards];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (rc) =>
          rc.roleName.toLowerCase().includes(q) ||
          rc.category.toLowerCase().includes(q)
      );
    }

    if (rateCardCategoryFilter !== 'all') {
      result = result.filter((rc) => rc.category === rateCardCategoryFilter);
    }

    result.sort((a, b) => {
      let comparison = 0;
      if (rateCardSortField === 'roleName') {
        comparison = a.roleName.localeCompare(b.roleName);
      } else if (rateCardSortField === 'category') {
        comparison = a.category.localeCompare(b.category);
      } else {
        comparison = a[rateCardSortField] - b[rateCardSortField];
      }
      return rateCardSortAsc ? comparison : -comparison;
    });

    return result;
  }, [rateCards, searchQuery, rateCardCategoryFilter, rateCardSortField, rateCardSortAsc]);

  const handleRateCardSort = (field: 'roleName' | 'category' | 'lowRate' | 'mediumRate' | 'highRate') => {
    if (rateCardSortField === field) {
      setRateCardSortAsc(!rateCardSortAsc);
    } else {
      setRateCardSortField(field);
      setRateCardSortAsc(true);
    }
  };

  const openAddRateCardModal = () => {
    setEditingRateCard(null);
    setRcRoleName('');
    setRcCategory('Tech');
    setRcLowRate('');
    setRcMediumRate('');
    setRcHighRate('');
    setIsRateCardModalOpen(true);
  };

  const openEditRateCardModal = (item: RateCardItem) => {
    setEditingRateCard(item);
    setRcRoleName(item.roleName);
    setRcCategory(item.category);
    setRcLowRate(item.lowRate ? item.lowRate.toString() : '');
    setRcMediumRate(item.mediumRate ? item.mediumRate.toString() : '');
    setRcHighRate(item.highRate ? item.highRate.toString() : '');
    setIsRateCardModalOpen(true);
  };

  const handleSaveRateCard = async () => {
    if (!rcRoleName.trim()) {
      toast({
        title: 'Role Name Required',
        description: 'Please enter a role name for the rate card.',
        variant: 'destructive',
      });
      return;
    }

    setIsRcSaving(true);
    try {
      const saved = await saveRateCard({
        id: editingRateCard?.id,
        roleName: rcRoleName.trim(),
        category: rcCategory,
        lowRate: Number(rcLowRate) || 0,
        mediumRate: Number(rcMediumRate) || 0,
        highRate: Number(rcHighRate) || 0,
      });

      setRateCards((prev) => {
        const idx = prev.findIndex((i) => i.id === saved.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = saved;
          return updated;
        }
        return [...prev, saved];
      });

      toast({
        title: editingRateCard ? 'Rate Card Updated' : 'Rate Card Added',
        description: `Successfully ${editingRateCard ? 'updated' : 'added'} "${rcRoleName.trim()}".`,
      });

      setIsRateCardModalOpen(false);
    } catch (err: any) {
      toast({
        title: 'Error Saving Rate Card',
        description: err?.message || 'Failed to save rate card entry.',
        variant: 'destructive',
      });
    } finally {
      setIsRcSaving(false);
    }
  };

  const handleDeleteRateCard = async () => {
    if (!deletingRateCard) return;

    setIsRcDeleting(true);
    try {
      await deleteRateCard(deletingRateCard.id);
      setRateCards((prev) => prev.filter((i) => i.id !== deletingRateCard.id));
      toast({
        title: 'Rate Card Entry Deleted',
        description: `Removed "${deletingRateCard.roleName}" from the rate card.`,
      });
      setDeletingRateCard(null);
    } catch (err: any) {
      toast({
        title: 'Error Deleting Entry',
        description: err?.message || 'Failed to delete rate card entry.',
        variant: 'destructive',
      });
    } finally {
      setIsRcDeleting(false);
    }
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <PageHeader
        title="Billing Rates"
        description="Master directory of resource daily billing rates, internal costs, profit margins, and access levels across all projects."
      />

      {/* Main Tabs Container */}
      <Tabs defaultValue="resources" value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 border-b pb-3">
          <TabsList className="inline-flex w-auto items-center justify-start gap-1 p-1 bg-muted/80 rounded-lg shrink-0">
            <TabsTrigger value="resources" className="gap-2 px-3 py-1.5 whitespace-nowrap text-xs font-medium shrink-0">
              <Users className="w-3.5 h-3.5" />
              <span>Resource Rates</span>
              <Badge variant="secondary" className="ml-0.5 px-1.5 py-0 text-[10px] h-4">
                {resourceRates.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="rate-card" className="gap-2 px-3 py-1.5 whitespace-nowrap text-xs font-medium shrink-0">
              <CreditCard className="w-3.5 h-3.5" />
              <span>Rate Card</span>
              <Badge variant="secondary" className="ml-0.5 px-1.5 py-0 text-[10px] h-4">
                {rateCards.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* Search bar */}
          <div className="flex items-center gap-2 flex-wrap lg:justify-end">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={activeTab === 'rate-card' ? 'Search role name, category...' : 'Search name, role, access level, project...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
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
                    <TableHead className="text-center">Allocation</TableHead>
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

        {/* Tab 2: Rate Card */}
        <TabsContent value="rate-card" className="space-y-4">
          <Card className="border shadow-sm">
            <CardHeader className="py-4 px-6 border-b">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <span>Rate Card</span>
                    <Badge variant="outline" className="text-[10px] font-normal border-primary/30 text-primary">
                      Sales & Client Reference
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Standard daily billing rates for technical and horizontal roles segmented by experience tier (Low, Medium, High).
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2.5">
                  <Select
                    value={rateCardCategoryFilter}
                    onValueChange={(val: any) => setRateCardCategoryFilter(val)}
                  >
                    <SelectTrigger className="h-8 text-xs w-[140px]">
                      <SelectValue placeholder="All Roles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="Tech">Tech Roles</SelectItem>
                      <SelectItem value="Horizontal">Horizontal Roles</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    size="sm"
                    onClick={openAddRateCardModal}
                    className="h-8 text-xs px-3 gap-1.5 font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Role</span>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[280px]">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRateCardSort('roleName')}
                        className="-ml-3 h-8 text-xs font-semibold"
                      >
                        Role
                        <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
                      </Button>
                    </TableHead>
                    <TableHead className="w-[160px]">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRateCardSort('category')}
                        className="-ml-3 h-8 text-xs font-semibold"
                      >
                        Category
                        <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRateCardSort('lowRate')}
                        className="-mr-3 h-8 text-xs font-semibold"
                      >
                        Low Experience
                        <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
                      </Button>
                      <div className="text-[10px] font-normal text-muted-foreground">Junior (0-3 yrs)</div>
                    </TableHead>
                    <TableHead className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRateCardSort('mediumRate')}
                        className="-mr-3 h-8 text-xs font-semibold"
                      >
                        Medium Experience
                        <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
                      </Button>
                      <div className="text-[10px] font-normal text-muted-foreground">Mid-Level (4-7 yrs)</div>
                    </TableHead>
                    <TableHead className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRateCardSort('highRate')}
                        className="-mr-3 h-8 text-xs font-semibold"
                      >
                        High Experience
                        <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
                      </Button>
                      <div className="text-[10px] font-normal text-muted-foreground">Senior / Lead (8+ yrs)</div>
                    </TableHead>
                    <TableHead className="w-[100px] text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRateCards.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-60 text-center">
                        <div className="flex flex-col items-center justify-center gap-2.5 text-muted-foreground py-8">
                          <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground/80">
                            <CreditCard className="w-6 h-6" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-foreground">
                              {searchQuery || rateCardCategoryFilter !== 'all' ? 'No matching roles' : 'Rate card is currently empty'}
                            </p>
                            <p className="text-xs max-w-md text-muted-foreground">
                              {searchQuery || rateCardCategoryFilter !== 'all'
                                ? 'Try clearing your search or category filter to view all roles.'
                                : 'No rate card roles configured yet. Add standard tech and horizontal roles with Low, Medium, and High experience rates as a reference for sales and client billing.'}
                            </p>
                          </div>
                          {(!searchQuery && rateCardCategoryFilter === 'all') && (
                            <Button
                              size="sm"
                              onClick={openAddRateCardModal}
                              className="mt-2 text-xs h-8 gap-1.5"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Add First Role
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRateCards.map((rc) => (
                      <TableRow key={rc.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium text-foreground">
                          {rc.roleName}
                        </TableCell>
                        <TableCell>
                          {rc.category === 'Tech' ? (
                            <Badge className="bg-blue-500/15 text-blue-400 border-blue-800/50 text-[10px] whitespace-nowrap">
                              Tech Role
                            </Badge>
                          ) : (
                            <Badge className="bg-purple-500/15 text-purple-400 border-purple-800/50 text-[10px] whitespace-nowrap">
                              Horizontal Role
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          ${rc.lowRate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          <span className="text-[10px] text-muted-foreground font-sans ml-1">/ day</span>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm font-medium">
                          ${rc.mediumRate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          <span className="text-[10px] text-muted-foreground font-sans ml-1">/ day</span>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm font-semibold text-emerald-400">
                          ${rc.highRate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          <span className="text-[10px] text-muted-foreground font-sans ml-1">/ day</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditRateCardModal(rc)}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                              title="Edit Role Rate"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeletingRateCard(rc)}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                              title="Delete Role Rate"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
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

      {/* Rate Card Add/Edit Dialog */}
      <Dialog open={isRateCardModalOpen} onOpenChange={setIsRateCardModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingRateCard ? 'Edit Rate Card Entry' : 'Add Rate Card Entry'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure standard client billing daily rates across experience tiers (Low, Medium, High).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Category Selection */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Role Category</Label>
              <Select
                value={rcCategory}
                onValueChange={(val: any) => setRcCategory(val)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tech">Tech Role (Engineering, Architecture, DevOps)</SelectItem>
                  <SelectItem value="Horizontal">Horizontal Role (PM, BA, QA, Design, Compliance)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Role Name */}
            <div className="space-y-1.5">
              <Label htmlFor="rcRoleName" className="text-xs font-semibold">
                Role Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="rcRoleName"
                placeholder={rcCategory === 'Tech' ? 'e.g., Software Engineer, Solution Architect' : 'e.g., Project Management, Business Analysis'}
                value={rcRoleName}
                onChange={(e) => setRcRoleName(e.target.value)}
                className="text-xs h-9"
              />

              {/* Quick Role Suggestions */}
              <div className="pt-1">
                <div className="text-[11px] text-muted-foreground mb-1.5">Quick Suggestions:</div>
                <div className="flex flex-wrap gap-1.5">
                  {(rcCategory === 'Tech' ? STANDARD_TECH_ROLES : STANDARD_HORIZONTAL_ROLES)
                    .slice(0, 7)
                    .map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setRcRoleName(role)}
                        className={cn(
                          "text-[10px] px-2 py-0.5 rounded-full border transition-colors",
                          rcRoleName === role
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border-border/60"
                        )}
                      >
                        {role}
                      </button>
                    ))}
                </div>
              </div>
            </div>

            {/* Experience Rates Grid */}
            <div className="space-y-1.5 pt-1">
              <Label className="text-xs font-semibold">Daily Billing Rates by Experience (USD)</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Low */}
                <div className="space-y-1">
                  <span className="text-[11px] text-muted-foreground font-medium">Low (Junior)</span>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2.5 text-xs text-muted-foreground font-mono">$</span>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={rcLowRate}
                      onChange={(e) => {
                        let val = e.target.value;
                        if (val.length > 1 && /^0[0-9]/.test(val)) val = val.replace(/^0+/, '');
                        if (/^(0|[1-9]\d{0,7})?(\.\d{0,2})?$/.test(val)) setRcLowRate(val);
                      }}
                      onBlur={() => setRcLowRate(formatRateInput(rcLowRate))}
                      className="pl-6 font-mono text-xs h-9"
                    />
                  </div>
                </div>

                {/* Medium */}
                <div className="space-y-1">
                  <span className="text-[11px] text-muted-foreground font-medium">Medium (Mid)</span>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2.5 text-xs text-muted-foreground font-mono">$</span>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={rcMediumRate}
                      onChange={(e) => {
                        let val = e.target.value;
                        if (val.length > 1 && /^0[0-9]/.test(val)) val = val.replace(/^0+/, '');
                        if (/^(0|[1-9]\d{0,7})?(\.\d{0,2})?$/.test(val)) setRcMediumRate(val);
                      }}
                      onBlur={() => setRcMediumRate(formatRateInput(rcMediumRate))}
                      className="pl-6 font-mono text-xs h-9"
                    />
                  </div>
                </div>

                {/* High */}
                <div className="space-y-1">
                  <span className="text-[11px] text-muted-foreground font-medium">High (Senior)</span>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2.5 text-xs text-muted-foreground font-mono">$</span>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={rcHighRate}
                      onChange={(e) => {
                        let val = e.target.value;
                        if (val.length > 1 && /^0[0-9]/.test(val)) val = val.replace(/^0+/, '');
                        if (/^(0|[1-9]\d{0,7})?(\.\d{0,2})?$/.test(val)) setRcHighRate(val);
                      }}
                      onBlur={() => setRcHighRate(formatRateInput(rcHighRate))}
                      className="pl-6 font-mono text-xs h-9"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsRateCardModalOpen(false)}
              disabled={isRcSaving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveRateCard}
              disabled={isRcSaving}
            >
              {isRcSaving ? 'Saving...' : editingRateCard ? 'Save Changes' : 'Add Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rate Card Delete Confirmation Alert Dialog */}
      <AlertDialog open={!!deletingRateCard} onOpenChange={(open) => !open && setDeletingRateCard(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Rate Card Entry?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Are you sure you want to remove &quot;{deletingRateCard?.roleName}&quot; ({deletingRateCard?.category} Role) from the rate card? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRcDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRateCard}
              disabled={isRcDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRcDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
