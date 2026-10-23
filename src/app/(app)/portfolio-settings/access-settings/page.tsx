'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/db-provider';
import { collection, doc, getDocs, setDoc } from '@/lib/db-provider';
import { AccessLevel, AccessControlSetting } from '@/types';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Save,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  LayoutGrid,
  ShieldAlert,
  ChevronsUpDown,
  Layers,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const accessLevels: AccessLevel[] = ['Super Admin', 'Administrator', 'Senior Management', 'Project Manager', 'Lead', 'Team Member', 'PMO'];

interface PageGroup {
  id: string;
  name: string;
  topNavName: string;
  pages: string[];
}

interface PageSection {
  sectionId: string;
  sectionTitle: string;
  description: string;
  groups: PageGroup[];
}

// Grouped hierarchy: Top Nav Pages -> Sub Nav Pages
const pageSections: PageSection[] = [
  {
    sectionId: 'portfolio_level',
    sectionTitle: 'Portfolio Level Pages',
    description: 'Top navigation bars and corresponding sidebar sub-pages across the portfolio.',
    groups: [
      {
        id: 'top_projects',
        name: 'Projects',
        topNavName: 'Projects',
        pages: ['Project Home', 'Portfolio Dashboard', 'Portfolio PromptBoard'],
      },
      {
        id: 'top_quality',
        name: 'Quality',
        topNavName: 'Quality',
        pages: ['Estimation Variance', 'Defect Containment'],
      },
      {
        id: 'top_billing',
        name: 'Billing',
        topNavName: 'Billing',
        pages: ['Billing', 'Billing Rate'],
      },
      {
        id: 'top_users',
        name: 'Users',
        topNavName: 'Users',
        pages: ['User List', 'Utilization'],
      },
      {
        id: 'top_holidays',
        name: 'Holidays',
        topNavName: 'Holidays',
        pages: ['Holiday Calendar', 'Leave Settings', 'Leave Tracker'],
      },
    ],
  },
  {
    sectionId: 'project_level',
    sectionTitle: 'Project Level Pages',
    description: 'Top navigation tabs and corresponding sidebar tools within project workspaces.',
    groups: [
      {
        id: 'top_proj_initial_estimation',
        name: 'Initial Estimation',
        topNavName: 'Initial Estimation',
        pages: [
          'Specifications (Initial Estimation)',
          'Project Status (Initial Estimation)',
        ],
      },
      {
        id: 'top_proj_details',
        name: 'Project Details',
        topNavName: 'Project Details',
        pages: [
          'Project Status',
          'PM Dashboard',
          'Project PromptBoard',
          'Specifications',
        ],
      },
      {
        id: 'top_proj_resources',
        name: 'Resources',
        topNavName: 'Resources',
        pages: [
          'Project Resources',
          'Worklog',
          'Resource Workload',
          'Project Gantt',
        ],
      },
      {
        id: 'top_proj_releases',
        name: 'Releases',
        topNavName: 'Releases',
        pages: ['Project Releases'],
      },
      {
        id: 'top_proj_development',
        name: 'Development',
        topNavName: 'Development',
        pages: [
          'Development Dashboard',
          'Product Backlog',
          'Grooming',
          'Kanban Board',
          'Sub-Tasks',
          'Defect Tracker',
        ],
      },
      {
        id: 'top_proj_testing',
        name: 'Testing',
        topNavName: 'Testing',
        pages: [
          'Test Dashboard',
          'Test Backlog',
          'Test Cycle',
          'Test Execution',
          'Defects',
        ],
      },
      {
        id: 'top_proj_governance',
        name: 'Governance',
        topNavName: 'Governance',
        pages: [
          'RAID Dashboard',
          'Risks',
          'Assumptions',
          'Issues',
          'Dependencies',
        ],
      },
      {
        id: 'top_proj_holidays',
        name: 'Holidays',
        topNavName: 'Holidays',
        pages: [
          'Project Holiday Calendar',
          'Leave Calendar',
        ],
      },
      {
        id: 'top_proj_pmo',
        name: 'PMO',
        topNavName: 'PMO',
        pages: [
          'PMO Documents',
          'PMO FB Billing',
          'PMO FB Payment Milestones',
          'PMO TnM Billing',
          'PMO TnM Payment Milestones',
          'Business Continuity',
        ],
      },
      {
        id: 'top_proj_settings',
        name: 'Project Settings',
        topNavName: 'Project Settings',
        pages: [
          'Board Settings',
          'Sprint Settings',
          'Effort Settings',
        ],
      },
      {
        id: 'top_proj_trash',
        name: 'Project Trash',
        topNavName: 'Project Trash',
        pages: ['Project Trash'],
      },
    ],
  },
  {
    sectionId: 'admin_level',
    sectionTitle: 'Admin Level Pages',
    description: 'System administration, portfolio settings, database config, and trash management.',
    groups: [
      {
        id: 'top_portfolio_settings',
        name: 'Portfolio Settings',
        topNavName: 'Portfolio Settings',
        pages: [
          'Access Settings',
          'Database',
          'Authentication',
          'AI Config',
          'Inactive Projects',
          'Cron Jobs',
          'Test Data Studio',
        ],
      },
      {
        id: 'top_portfolio_trash',
        name: 'Portfolio Trash',
        topNavName: 'Portfolio Trash',
        pages: ['Portfolio Trash'],
      },
    ],
  },
];

const allGroups = pageSections.flatMap(s => s.groups);
const appPages = allGroups.flatMap(g => g.pages);

// CRUD Access scope levels
const scopeItems = [
  { id: 'portfolio_crud', dbId: 'portfolio', name: 'Portfolio Level' },
  { id: 'project_crud', dbId: 'project', name: 'Project Level' },
  { id: 'story_crud', dbId: 'story', name: 'Story / Feature Change / Task Level' },
  { id: 'subtask_crud', dbId: 'subtask', name: 'Sub tasks / Bugs / Test cases Level' },
];

// Seeded defaults mapping for each access level fallback (Page Access)
const defaultAccessSettings: Record<Exclude<AccessLevel, 'Administrator' | 'Super Admin'>, string[]> = {
  'Senior Management': [
    'Project Home', 'Portfolio Dashboard', 'Portfolio PromptBoard', 'Estimation Variance', 'Defect Containment', 'Estimations', 'Defects', 'User List', 'Utilization', 'Holiday Calendar', 'Leave Settings', 'Leave Tracker', 'Billing', 'Billing Rate',
    'Development Dashboard', 'Product Backlog', 'Grooming', 'Kanban Board', 'Sub-Tasks', 'Defect Tracker', 'Test Dashboard', 'Test Backlog', 'Test Cycle', 'Test Plan', 'Test Execution', 'Defects', 'Project Status', 'PM Dashboard', 'Project PromptBoard', 'FP PM Dash', 'Specifications', 'Specifications (Initial Estimation)', 'Project Status (Initial Estimation)', 'Project Releases', 'Project Resources', 'Worklog', 'Resource Workload', 'Project Gantt', 'RAID Dashboard', 'Risks', 'Assumptions', 'Issues', 'Dependencies', 'Project Holiday Calendar', 'Leave Calendar', 'PMO Documents', 'PMO FB Billing', 'PMO FB Payment Milestones', 'PMO TnM Billing', 'PMO TnM Payment Milestones', 'Business Continuity'
  ],
  'Project Manager': [
    'Project Home', 'Portfolio PromptBoard', 'Estimation Variance', 'Defect Containment', 'Estimations', 'Defects', 'User List', 'Utilization', 'Holiday Calendar', 'Leave Settings', 'Leave Tracker', 'Billing', 'Billing Rate',
    'Development Dashboard', 'Product Backlog', 'Grooming', 'Kanban Board', 'Sub-Tasks', 'Defect Tracker', 'Test Dashboard', 'Test Backlog', 'Test Cycle', 'Test Plan', 'Test Execution', 'Defects', 'Project Status', 'PM Dashboard', 'Project PromptBoard', 'FP PM Dash', 'Specifications', 'Specifications (Initial Estimation)', 'Project Status (Initial Estimation)', 'Project Releases', 'Project Resources', 'Worklog', 'Resource Workload', 'Project Gantt', 'RAID Dashboard', 'Risks', 'Assumptions', 'Issues', 'Dependencies', 'Project Holiday Calendar', 'Leave Calendar', 'PMO Documents', 'PMO FB Billing', 'PMO FB Payment Milestones', 'PMO TnM Billing', 'PMO TnM Payment Milestones', 'Business Continuity', 'Board Settings', 'Sprint Settings', 'Effort Settings', 'Project Trash'
  ],
  'Lead': [
    'Project Home', 'User List', 'Holiday Calendar', 'Leave Tracker',
    'Development Dashboard', 'Product Backlog', 'Grooming', 'Kanban Board', 'Sub-Tasks', 'Defect Tracker', 'Test Dashboard', 'Test Backlog', 'Test Cycle', 'Test Plan', 'Test Execution', 'Defects', 'Project Status', 'Specifications', 'Project Releases', 'Project Resources', 'Worklog', 'Resource Workload', 'Project Gantt', 'RAID Dashboard', 'Risks', 'Assumptions', 'Issues', 'Dependencies', 'Project Holiday Calendar', 'Leave Calendar', 'PMO Documents', 'Business Continuity', 'Board Settings', 'Sprint Settings'
  ],
  'Team Member': [
    'Project Home', 'Leave Tracker',
    'Development Dashboard', 'Kanban Board', 'Sub-Tasks', 'Defect Tracker', 'Test Dashboard', 'Test Backlog', 'Test Execution', 'Defects', 'Project Status', 'Specifications', 'Project Resources', 'Worklog', 'RAID Dashboard', 'Project Holiday Calendar', 'PMO Documents'
  ],
  'PMO': [
    'Project Home', 'User List', 'Utilization', 'Holiday Calendar', 'Leave Tracker', 'Billing', 'Billing Rate',
    'Project Status', 'PM Dashboard', 'Project PromptBoard', 'FP PM Dash', 'Project Releases', 'Project Resources', 'Worklog', 'Resource Workload', 'Project Gantt', 'PMO Documents', 'PMO FB Billing', 'PMO FB Payment Milestones', 'PMO TnM Billing', 'PMO TnM Payment Milestones', 'Business Continuity'
  ]
};

// Seeded defaults mapping for each access level fallback (CRUD Access)
const defaultCrudSettings: Record<Exclude<AccessLevel, 'Administrator' | 'Super Admin'>, Record<string, { create: boolean; read: boolean; update: boolean; delete: boolean }>> = {
  'Senior Management': {
    portfolio: { create: true, read: true, update: true, delete: false },
    project: { create: true, read: true, update: true, delete: false },
    story: { create: true, read: true, update: true, delete: false },
    subtask: { create: true, read: true, update: true, delete: false }
  },
  'Project Manager': {
    portfolio: { create: false, read: true, update: false, delete: false },
    project: { create: true, read: true, update: true, delete: true },
    story: { create: true, read: true, update: true, delete: true },
    subtask: { create: true, read: true, update: true, delete: true }
  },
  'Lead': {
    portfolio: { create: false, read: true, update: false, delete: false },
    project: { create: false, read: true, update: true, delete: false },
    story: { create: true, read: true, update: true, delete: true },
    subtask: { create: true, read: true, update: true, delete: true }
  },
  'Team Member': {
    portfolio: { create: false, read: true, update: false, delete: false },
    project: { create: false, read: true, update: false, delete: false },
    story: { create: false, read: true, update: true, delete: false },
    subtask: { create: true, read: true, update: true, delete: false }
  },
  'PMO': {
    portfolio: { create: true, read: true, update: true, delete: true },
    project: { create: true, read: true, update: true, delete: true },
    story: { create: false, read: true, update: false, delete: false },
    subtask: { create: false, read: true, update: false, delete: false }
  }
};

export default function AccessSettingsPage() {
    const [accessSettings, setAccessSettings] = useState<Record<AccessLevel, Record<string, boolean>>>({} as any);
    const [crudSettings, setCrudSettings] = useState<Record<AccessLevel, Record<string, { create: boolean; read: boolean; update: boolean; delete: boolean }>>>({} as any);
    const [isLoading, setIsLoading] = useState(true);
    const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        portfolio_level: true,
        project_level: true,
        admin_level: true,
    });
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
        const initial: Record<string, boolean> = {
            portfolio_crud: true,
            project_crud: true,
            story_crud: true,
            subtask_crud: true,
        };
        allGroups.forEach(g => {
            initial[g.id] = true;
        });
        return initial;
    });
    const { toast } = useToast();

    useEffect(() => {
        const fetchAccessSettings = async () => {
            if (!db) return;
            setIsLoading(true);
            const settingsCollection = collection(db, 'accessControl');
            const snapshot = await getDocs(settingsCollection);
            
            const fetchedSettings: Record<string, any> = {};
            const fetchedCrudSettings: Record<string, any> = {};
            
            snapshot.forEach((doc: any) => {
                fetchedSettings[doc.id] = doc.data().pageAccess;
                fetchedCrudSettings[doc.id] = doc.data().crudAccess;
            });

            // Initialize Page Access settings
            const newSettings: Record<string, any> = {};
            for (const level of accessLevels) {
                newSettings[level] = {};
                for (const page of appPages) {
                    const dbVal = fetchedSettings[level]?.[page] ?? (
                        page === 'Portfolio Trash' ? fetchedSettings[level]?.['Trash'] : undefined
                    );
                    newSettings[level][page] = dbVal ?? (
                        (level as string) === 'Administrator' ||
                        (level as string) === 'Super Admin' ||
                        ((level as string) !== 'Administrator' && (level as string) !== 'Super Admin' && (defaultAccessSettings as any)[level]?.includes(page))
                    );
                }
            }

            // Initialize CRUD Access settings
            const newCrudSettings: Record<string, any> = {};
            for (const level of accessLevels) {
                newCrudSettings[level] = {};
                for (const scope of scopeItems) {
                    newCrudSettings[level][scope.dbId] = fetchedCrudSettings[level]?.[scope.dbId] ?? (
                        (level === 'Administrator' || level === 'Super Admin')
                            ? { create: true, read: true, update: true, delete: true }
                            : (defaultCrudSettings[level]?.[scope.dbId] ?? { create: false, read: false, update: false, delete: false })
                    );
                }
            }

            setAccessSettings(newSettings as Record<AccessLevel, Record<string, boolean>>);
            setCrudSettings(newCrudSettings as Record<AccessLevel, Record<string, { create: boolean; read: boolean; update: boolean; delete: boolean }>>);
            setIsLoading(false);
        };

        fetchAccessSettings();
    }, []);

    const toggleSection = (sectionId: string) => {
        setExpandedSections(prev => ({
            ...prev,
            [sectionId]: !prev[sectionId]
        }));
    };

    const toggleGroup = (groupId: string) => {
        setExpandedGroups(prev => ({
            ...prev,
            [groupId]: !prev[groupId]
        }));
    };

    const toggleAllGroups = (expand: boolean) => {
        setExpandedSections({
            portfolio_level: expand,
            project_level: expand,
            admin_level: expand,
        });
        setExpandedGroups(prev => {
            const next = { ...prev };
            allGroups.forEach(g => {
                next[g.id] = expand;
            });
            return next;
        });
    };

    const allGroupsExpanded = useMemo(() => {
        const sectionsAllOpen = Object.values(expandedSections).every(Boolean);
        const groupsAllOpen = allGroups.every(g => !!expandedGroups[g.id]);
        return sectionsAllOpen && groupsAllOpen;
    }, [expandedSections, expandedGroups]);

    // Page access helper methods
    const getGroupCheckState = (groupId: string, level: AccessLevel) => {
        const group = allGroups.find(g => g.id === groupId);
        if (!group) return false;
        
        const total = group.pages.length;
        const checkedCount = group.pages.filter(page => accessSettings[level]?.[page] === true).length;
        
        if (checkedCount === total) return true;
        if (checkedCount > 0) return 'indeterminate';
        return false;
    };

    const handleGroupToggle = (groupId: string, level: AccessLevel, checked: boolean) => {
        const group = allGroups.find(g => g.id === groupId);
        if (!group) return;
        
        setAccessSettings(prev => {
            const nextLevelSettings = { ...prev[level] };
            group.pages.forEach(page => {
                nextLevelSettings[page] = checked;
                if (page === 'Portfolio Trash') {
                    nextLevelSettings['Trash'] = checked;
                }
            });
            return {
                ...prev,
                [level]: nextLevelSettings
            };
        });
    };

    const handlePermissionChange = (level: AccessLevel, page: string, hasAccess: boolean) => {
        setAccessSettings(prev => {
            const nextLevel = {
                ...prev[level],
                [page]: hasAccess,
            };
            if (page === 'Portfolio Trash') {
                nextLevel['Trash'] = hasAccess;
            }
            return {
                ...prev,
                [level]: nextLevel
            };
        });
    };

    // CRUD access helper methods
    const handleCrudPermissionChange = (level: AccessLevel, scopeDbId: string, action: 'create' | 'read' | 'update' | 'delete', val: boolean) => {
        setCrudSettings(prev => ({
            ...prev,
            [level]: {
                ...prev[level],
                [scopeDbId]: {
                    ...prev[level][scopeDbId],
                    [action]: val
                }
            }
        }));
    };

    const handleSaveChanges = async () => {
        if (!db) return;
        setIsLoading(true);
        try {
            for (const level of accessLevels) {
                const settingDoc: AccessControlSetting = {
                    id: level,
                    pageAccess: accessSettings[level],
                    crudAccess: crudSettings[level],
                };
                await setDoc(doc(db, 'accessControl', level), settingDoc);
            }
            toast({ title: 'Success', description: 'Access settings saved successfully.' });
        } catch (error) {
            console.error('Error saving access settings:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not save access settings.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetToDefaults = async () => {
        if (!db) return;
        setIsResetting(true);
        try {
            // Build default page access
            const newSettings: Record<string, any> = {};
            for (const level of accessLevels) {
                newSettings[level] = {};
                for (const page of appPages) {
                    newSettings[level][page] = (
                        (level as string) === 'Administrator' ||
                        (level as string) === 'Super Admin' ||
                        ((level as string) !== 'Administrator' && (level as string) !== 'Super Admin' && (defaultAccessSettings as any)[level]?.includes(page) === true)
                    );
                }
                // Ensure legacy Trash follows Administrator and Super Admin
                newSettings[level]['Trash'] = (level as string) === 'Administrator' || (level as string) === 'Super Admin';
            }

            // Build default CRUD access
            const newCrudSettings: Record<string, any> = {};
            for (const level of accessLevels) {
                newCrudSettings[level] = {};
                for (const scope of scopeItems) {
                    newCrudSettings[level][scope.dbId] = (level === 'Administrator' || level === 'Super Admin')
                        ? { create: true, read: true, update: true, delete: true }
                        : (defaultCrudSettings[level]?.[scope.dbId] ?? { create: false, read: false, update: false, delete: false });
                }
            }

            // Persist defaults directly to Firestore accessControl collection
            for (const level of accessLevels) {
                const settingDoc: AccessControlSetting = {
                    id: level,
                    pageAccess: newSettings[level],
                    crudAccess: newCrudSettings[level],
                };
                await setDoc(doc(db, 'accessControl', level), settingDoc);
            }

            setAccessSettings(newSettings as Record<AccessLevel, Record<string, boolean>>);
            setCrudSettings(newCrudSettings as Record<AccessLevel, Record<string, { create: boolean; read: boolean; update: boolean; delete: boolean }>>);
            setIsResetDialogOpen(false);
            toast({
                title: 'Access Settings Reset',
                description: 'All permissions have been restored to system defaults and saved. Admin Level pages are restricted exclusively to Administrator.',
            });
        } catch (error: any) {
            console.error('Error resetting access settings:', error);
            toast({
                variant: 'destructive',
                title: 'Reset Failed',
                description: error.message || 'Could not reset access settings.',
            });
        } finally {
            setIsResetting(false);
        }
    };

    if (isLoading && Object.keys(accessSettings).length === 0) {
        return <div className="p-8 text-sm text-muted-foreground">Loading access settings...</div>;
    }
    
    return (
        <div className="space-y-4 min-w-0 w-full p-4 md:p-8 pt-6">
            <PageHeader 
                title="Access Settings" 
                description="Configure page-level and operation-level permissions for different roles."
            >
                <div className="flex items-center gap-2">
                    <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
                        <AlertDialogTrigger asChild>
                            <Button variant="outline" disabled={isLoading || isResetting} className="gap-2 text-xs h-9">
                                <RotateCcw className="h-3.5 w-3.5" />
                                Reset to Defaults
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Reset Access Settings to System Defaults?</AlertDialogTitle>
                                <AlertDialogDescription className="text-xs space-y-2 text-muted-foreground">
                                    <span>
                                        This will restore all page access and CRUD permissions to their original factory defaults across all access levels.
                                    </span>
                                    <span className="block font-medium text-foreground pt-1">
                                        • Admin Level pages (Access Settings, Database, Authentication, AI Config, Inactive Projects, and Portfolio Trash) will be accessible exclusively by Administrator.
                                    </span>
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel disabled={isResetting}>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={(e) => {
                                        e.preventDefault();
                                        handleResetToDefaults();
                                    }}
                                    disabled={isResetting}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                    {isResetting ? 'Resetting...' : 'Confirm Reset'}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>

                    <Button onClick={handleSaveChanges} disabled={isLoading || isResetting} className="gap-2 text-xs h-9">
                        <Save className="h-3.5 w-3.5" />
                        {isLoading ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </PageHeader>

            <Tabs defaultValue="pages" className="w-full">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <TabsList className="bg-muted w-[320px] h-10 p-1 grid grid-cols-2 rounded-lg">
                        <TabsTrigger value="pages" className="flex items-center gap-1.5 text-xs md:text-sm py-1.5 rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground font-semibold transition-all">
                            <LayoutGrid className="h-4 w-4 shrink-0" />
                            Page Access
                        </TabsTrigger>
                        <TabsTrigger value="crud" className="flex items-center gap-1.5 text-xs md:text-sm py-1.5 rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground font-semibold transition-all">
                            <ShieldAlert className="h-4 w-4 shrink-0" />
                            CRUD Access
                        </TabsTrigger>
                    </TabsList>

                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => toggleAllGroups(!allGroupsExpanded)}
                        className="h-9 self-start sm:self-auto gap-1.5 text-xs"
                    >
                        <ChevronsUpDown className="h-3.5 w-3.5" />
                        {allGroupsExpanded ? 'Collapse All' : 'Expand All'}
                    </Button>
                </div>

                {/* ── Tab 1: Page Access Table (Grouped by Top Nav & Section) ── */}
                <TabsContent value="pages" className="p-0 border-none outline-none">
                    <Card className="w-full overflow-hidden border">
                        <CardContent className="p-0">
                            <div className="overflow-x-auto w-full">
                                <Table className="min-w-full border-collapse">
                                    <TableHeader>
                                        <TableRow className="border-b bg-muted/20">
                                            <TableHead className="w-[340px] font-bold text-foreground pl-6">Top Nav & Sidenav Pages</TableHead>
                                            {accessLevels.map(level => (
                                                <TableHead key={level} className="text-center font-bold text-foreground min-w-[120px]">{level}</TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {pageSections.map(section => {
                                            const isSectionExpanded = !!expandedSections[section.sectionId];
                                            const totalSectionPages = section.groups.reduce((sum, g) => sum + g.pages.length, 0);

                                            return (
                                                <React.Fragment key={section.sectionId}>
                                                    {/* Section Header Divider with interactive Expand / Collapse */}
                                                    <TableRow 
                                                        className="bg-primary/5 hover:bg-primary/10 border-y font-bold cursor-pointer transition-colors select-none"
                                                        onClick={() => toggleSection(section.sectionId)}
                                                    >
                                                        <TableCell colSpan={accessLevels.length + 1} className="py-2.5 px-4">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-2">
                                                                    <Button 
                                                                        variant="ghost" 
                                                                        size="icon" 
                                                                        className="h-6 w-6 p-0 shrink-0 hover:bg-primary/20 text-primary" 
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            toggleSection(section.sectionId);
                                                                        }}
                                                                    >
                                                                        {isSectionExpanded ? (
                                                                            <ChevronDown className="h-4 w-4" />
                                                                        ) : (
                                                                            <ChevronRight className="h-4 w-4" />
                                                                        )}
                                                                    </Button>
                                                                    <Layers className="h-4 w-4 text-primary shrink-0" />
                                                                    <span className="text-xs md:text-sm font-bold uppercase tracking-wider text-primary">
                                                                        {section.sectionTitle}
                                                                    </span>
                                                                    <Badge variant="outline" className="text-[10px] font-semibold px-2 py-0 h-4 bg-primary/10 text-primary border-primary/20 ml-2">
                                                                        {section.groups.length} Top Nav Groups • {totalSectionPages} pages
                                                                    </Badge>
                                                                    <span className="text-[11px] font-normal text-muted-foreground ml-2 hidden lg:inline">
                                                                        {section.description}
                                                                    </span>
                                                                </div>
                                                                <span className="text-[11px] text-muted-foreground hidden sm:inline mr-2">
                                                                    {isSectionExpanded ? 'Click to collapse section' : 'Click to expand section'}
                                                                </span>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>

                                                    {/* Top Nav Group Rows (rendered when section is expanded) */}
                                                    {isSectionExpanded && section.groups.map(group => {
                                                        const isExpanded = !!expandedGroups[group.id];
                                                        
                                                        return (
                                                            <React.Fragment key={group.id}>
                                                                {/* Group Header Row */}
                                                                <TableRow className="bg-muted/40 hover:bg-muted/50 font-semibold border-b transition-colors">
                                                                    <TableCell className="flex items-center gap-2 select-none py-2.5 pl-6">
                                                                        <Button 
                                                                            variant="ghost" 
                                                                            size="icon" 
                                                                            className="h-6 w-6 p-0 shrink-0 hover:bg-muted/80 text-muted-foreground" 
                                                                            onClick={() => toggleGroup(group.id)}
                                                                        >
                                                                            {isExpanded ? (
                                                                                <ChevronDown className="h-4 w-4" />
                                                                            ) : (
                                                                                <ChevronRight className="h-4 w-4" />
                                                                        )}
                                                                    </Button>
                                                                    <div className="flex items-center gap-2">
                                                                        <Badge variant="outline" className="text-[10px] font-semibold px-1.5 py-0 h-4 bg-background text-muted-foreground border-border/80">
                                                                            Top Nav
                                                                        </Badge>
                                                                        <span className="text-sm font-bold text-foreground">
                                                                            {group.name}
                                                                        </span>
                                                                        <span className="text-[11px] font-normal text-muted-foreground">
                                                                            ({group.pages.length} {group.pages.length === 1 ? 'page' : 'pages'})
                                                                        </span>
                                                                    </div>
                                                                </TableCell>
                                                                {accessLevels.map(level => {
                                                                    const checkState = getGroupCheckState(group.id, level);
                                                                    return (
                                                                        <TableCell key={`${group.id}-${level}`} className="text-center py-2.5">
                                                                            <Checkbox
                                                                                checked={checkState}
                                                                                onCheckedChange={(checked) => {
                                                                                    const targetState = checked === true;
                                                                                    handleGroupToggle(group.id, level, targetState);
                                                                                }}
                                                                                disabled={level === 'Administrator' || level === 'Super Admin'}
                                                                                title={`Toggle all pages under ${group.name} for ${level}`}
                                                                            />
                                                                        </TableCell>
                                                                    );
                                                                })}
                                                            </TableRow>
                                                            
                                                            {/* Indented Sidenav Sub-pages */}
                                                            {isExpanded && group.pages.map(page => (
                                                                <TableRow key={`${group.id}-${page}`} className="hover:bg-muted/10 transition-colors border-b">
                                                                    <TableCell className="pl-14 text-sm font-medium text-foreground py-2">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-muted-foreground/60 text-xs">↳</span>
                                                                            <span>{page}</span>
                                                                        </div>
                                                                    </TableCell>
                                                                    {accessLevels.map(level => (
                                                                        <TableCell key={`${level}-${page}`} className="text-center py-2">
                                                                            <Checkbox
                                                                                checked={accessSettings[level]?.[page] ?? false}
                                                                                onCheckedChange={(checked) => handlePermissionChange(level, page, !!checked)}
                                                                                disabled={level === 'Administrator' || level === 'Super Admin'}
                                                                                title={`Toggle access to ${page} for ${level}`}
                                                                            />
                                                                        </TableCell>
                                                                    ))}
                                                                </TableRow>
                                                            ))}
                                                        </React.Fragment>
                                                    );
                                                })}
                                            </React.Fragment>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>

            {/* ── Tab 2: CRUD Access Cards ── */}
            <TabsContent value="crud" className="mt-2 space-y-4 border-none outline-none">
                    {scopeItems.map(scope => {
                        const isExpanded = !!expandedGroups[scope.id];
                        
                        return (
                            <Card key={scope.id} className="w-full overflow-hidden border">
                                <div 
                                    className="flex items-center justify-between p-4 bg-muted/30 cursor-pointer hover:bg-muted/40 transition-colors select-none font-bold border-b"
                                    onClick={() => toggleGroup(scope.id)}
                                >
                                    <div className="flex items-center gap-2">
                                        {isExpanded ? (
                                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                        ) : (
                                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                        )}
                                        <span className="text-sm md:text-base text-foreground font-bold">{scope.name}</span>
                                    </div>
                                    <span className="text-xs font-normal text-muted-foreground hidden sm:inline">Expand to configure role permissions</span>
                                </div>
                                
                                {isExpanded && (
                                    <CardContent className="p-0">
                                        <div className="overflow-x-auto w-full">
                                            <Table className="min-w-full">
                                                <TableHeader>
                                                    <TableRow className="border-b bg-muted/10">
                                                        <TableHead className="w-[200px] font-bold text-foreground pl-6">Access Level</TableHead>
                                                        <TableHead className="text-center font-bold text-foreground">Create (C)</TableHead>
                                                        <TableHead className="text-center font-bold text-foreground">Read (R)</TableHead>
                                                        <TableHead className="text-center font-bold text-foreground">Update (U)</TableHead>
                                                        <TableHead className="text-center font-bold text-foreground">Delete (D)</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {accessLevels.map(level => {
                                                        const permissions = crudSettings[level]?.[scope.dbId] || { create: false, read: false, update: false, delete: false };
                                                        const isBtnDisabled = level === 'Administrator' || level === 'Super Admin';
                                                        
                                                        return (
                                                            <TableRow key={level} className="hover:bg-muted/5 transition-colors border-b">
                                                                <TableCell className="font-semibold text-foreground pl-6 py-3">{level}</TableCell>
                                                                <TableCell className="text-center py-3">
                                                                    <Checkbox
                                                                        checked={permissions.create}
                                                                        onCheckedChange={(checked) => handleCrudPermissionChange(level, scope.dbId, 'create', !!checked)}
                                                                        disabled={isBtnDisabled}
                                                                    />
                                                                </TableCell>
                                                                <TableCell className="text-center py-3">
                                                                    <Checkbox
                                                                        checked={permissions.read}
                                                                        onCheckedChange={(checked) => handleCrudPermissionChange(level, scope.dbId, 'read', !!checked)}
                                                                        disabled={isBtnDisabled}
                                                                    />
                                                                </TableCell>
                                                                <TableCell className="text-center py-3">
                                                                    <Checkbox
                                                                        checked={permissions.update}
                                                                        onCheckedChange={(checked) => handleCrudPermissionChange(level, scope.dbId, 'update', !!checked)}
                                                                        disabled={isBtnDisabled}
                                                                    />
                                                                </TableCell>
                                                                <TableCell className="text-center py-3">
                                                                    <Checkbox
                                                                        checked={permissions.delete}
                                                                        onCheckedChange={(checked) => handleCrudPermissionChange(level, scope.dbId, 'delete', !!checked)}
                                                                        disabled={isBtnDisabled}
                                                                    />
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </CardContent>
                                )}
                            </Card>
                        );
                    })}
                </TabsContent>
            </Tabs>
        </div>
    );
}
