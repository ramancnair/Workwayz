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
import { useToast } from '@/hooks/use-toast';
import { Save, ChevronDown, ChevronRight, LayoutGrid, ShieldAlert } from 'lucide-react';

const accessLevels: AccessLevel[] = ['Administrator', 'Senior Management', 'Project Manager', 'Lead', 'Team Member', 'PMO'];

// Vertically grouped page and features layout
const pageGroups = [
  {
    id: 'admin',
    name: 'Admin Level Pages',
    pages: [
      'Access Settings',
      'Database',
      'Authentication',
      'AI Config',
      'Setup Wizard',
      'Archive',
    ]
  },
  {
    id: 'portfolio',
    name: 'Portfolio Level Pages',
    pages: [
      'My Projects',
      'Project Home',
      'Portfolio Dashboard',
      'Estimations',
      'Defects',
      'User List',
      'Utilization',
      'Holiday Calendar',
      'Allocated Leaves',
      'Billing',
      'Billing Rate',
      'Trash',
    ]
  },
  {
    id: 'project',
    name: 'Project Level Pages',
    pages: [
      'Development Dashboard',
      'Product Backlog',
      'Grooming',
      'Kanban Board',
      'Sub-Tasks',
      'Test Dashboard',
      'Test Backlog',
      'Test Plan',
      'Defects',
      'Project Status',
      'PM Dashboard',
      'Specifications',
      'Ballpark (Initial Estimation)',
      'Project Releases',
      'Project Resources',
      'Worklog',
      'Resource Workload',
      'RAID Dashboard',
      'Risks',
      'Assumptions',
      'Issues',
      'Dependencies',
      'Project Holiday Calendar',
      'Leave Tracker',
      'Leave Calendar',
      'PMO Documents',
      'PMO FB Billing',
      'PMO TnM Billing',
      'Business Continuity',
      'Board Settings',
      'Sprint Settings',
      'Effort Settings',
      'Project Trash',
    ]
  }
];

// CRUD Access scope levels
const scopeItems = [
  { id: 'portfolio_crud', dbId: 'portfolio', name: 'Portfolio Level' },
  { id: 'project_crud', dbId: 'project', name: 'Project Level' },
  { id: 'story_crud', dbId: 'story', name: 'Story / Feature Change / Task Level' },
  { id: 'subtask_crud', dbId: 'subtask', name: 'Sub tasks / Bugs / Test cases Level' },
];

// Flatten app pages list for database storage compatibility
const appPages = pageGroups.flatMap(g => g.pages);

// Seeded defaults mapping for each access level fallback (Page Access)
const defaultAccessSettings: Record<Exclude<AccessLevel, 'Administrator'>, string[]> = {
  'Senior Management': [
    'My Projects', 'Project Home', 'Portfolio Dashboard', 'Estimations', 'Defects', 'User List', 'Utilization', 'Holiday Calendar', 'Allocated Leaves', 'Billing', 'Billing Rate', 'Trash',
    'Development Dashboard', 'Product Backlog', 'Grooming', 'Kanban Board', 'Sub-Tasks', 'Test Dashboard', 'Test Backlog', 'Test Plan', 'Defects', 'Project Status', 'PM Dashboard', 'Specifications', 'Ballpark (Initial Estimation)', 'Project Releases', 'Project Resources', 'Worklog', 'Resource Workload', 'RAID Dashboard', 'Risks', 'Assumptions', 'Issues', 'Dependencies', 'Project Holiday Calendar', 'Leave Tracker', 'Leave Calendar', 'PMO Documents', 'PMO FB Billing', 'PMO TnM Billing', 'Business Continuity'
  ],
  'Project Manager': [
    'My Projects', 'Project Home', 'Estimations', 'Defects', 'User List', 'Utilization', 'Holiday Calendar', 'Allocated Leaves', 'Billing', 'Billing Rate',
    'Development Dashboard', 'Product Backlog', 'Grooming', 'Kanban Board', 'Sub-Tasks', 'Test Dashboard', 'Test Backlog', 'Test Plan', 'Defects', 'Project Status', 'PM Dashboard', 'Specifications', 'Ballpark (Initial Estimation)', 'Project Releases', 'Project Resources', 'Worklog', 'Resource Workload', 'RAID Dashboard', 'Risks', 'Assumptions', 'Issues', 'Dependencies', 'Project Holiday Calendar', 'Leave Tracker', 'Leave Calendar', 'PMO Documents', 'PMO FB Billing', 'PMO TnM Billing', 'Business Continuity', 'Board Settings', 'Sprint Settings', 'Effort Settings', 'Project Trash'
  ],
  'Lead': [
    'My Projects', 'Project Home', 'User List', 'Holiday Calendar',
    'Development Dashboard', 'Product Backlog', 'Grooming', 'Kanban Board', 'Sub-Tasks', 'Test Dashboard', 'Test Backlog', 'Test Plan', 'Defects', 'Project Status', 'Specifications', 'Project Releases', 'Project Resources', 'Worklog', 'Resource Workload', 'RAID Dashboard', 'Risks', 'Assumptions', 'Issues', 'Dependencies', 'Project Holiday Calendar', 'Leave Tracker', 'Leave Calendar', 'PMO Documents', 'Business Continuity', 'Board Settings', 'Sprint Settings'
  ],
  'Team Member': [
    'My Projects', 'Project Home',
    'Development Dashboard', 'Kanban Board', 'Sub-Tasks', 'Test Dashboard', 'Test Backlog', 'Defects', 'Project Status', 'Specifications', 'Project Resources', 'Worklog', 'RAID Dashboard', 'Project Holiday Calendar', 'Leave Tracker', 'PMO Documents'
  ],
  'PMO': [
    'My Projects', 'Project Home', 'User List', 'Utilization', 'Holiday Calendar', 'Billing', 'Billing Rate',
    'Project Status', 'PM Dashboard', 'Project Releases', 'Project Resources', 'Worklog', 'Resource Workload', 'PMO Documents', 'PMO FB Billing', 'PMO TnM Billing', 'Business Continuity'
  ]
};

// Seeded defaults mapping for each access level fallback (CRUD Access)
const defaultCrudSettings: Record<Exclude<AccessLevel, 'Administrator'>, Record<string, { create: boolean; read: boolean; update: boolean; delete: boolean }>> = {
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
    const [accessSettings, setAccessSettings] = useState<Record<AccessLevel, Record<string, boolean>>>({});
    const [crudSettings, setCrudSettings] = useState<Record<AccessLevel, Record<string, { create: boolean; read: boolean; update: boolean; delete: boolean }>>>({} as any);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
        admin: true,
        portfolio: true,
        project: true,
        portfolio_crud: true,
        project_crud: true,
        story_crud: true,
        subtask_crud: true,
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
            
            snapshot.forEach(doc => {
                fetchedSettings[doc.id] = doc.data().pageAccess;
                fetchedCrudSettings[doc.id] = doc.data().crudAccess;
            });

            // Initialize Page Access settings
            const newSettings: Record<string, any> = {};
            for (const level of accessLevels) {
                newSettings[level] = {};
                for (const page of appPages) {
                    newSettings[level][page] = fetchedSettings[level]?.[page] ?? (
                        level === 'Administrator' ||
                        (level !== 'Administrator' && defaultAccessSettings[level]?.includes(page))
                    );
                }
            }

            // Initialize CRUD Access settings
            const newCrudSettings: Record<string, any> = {};
            for (const level of accessLevels) {
                newCrudSettings[level] = {};
                for (const scope of scopeItems) {
                    newCrudSettings[level][scope.dbId] = fetchedCrudSettings[level]?.[scope.dbId] ?? (
                        level === 'Administrator' 
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

    const toggleGroup = (groupId: string) => {
        setExpandedGroups(prev => ({
            ...prev,
            [groupId]: !prev[groupId]
        }));
    };

    // Page access helper methods
    const getGroupCheckState = (groupId: string, level: AccessLevel) => {
        const group = pageGroups.find(g => g.id === groupId);
        if (!group) return false;
        
        const total = group.pages.length;
        const checkedCount = group.pages.filter(page => accessSettings[level]?.[page] === true).length;
        
        if (checkedCount === total) return true;
        if (checkedCount > 0) return 'indeterminate';
        return false;
    };

    const handleGroupToggle = (groupId: string, level: AccessLevel, checked: boolean) => {
        const group = pageGroups.find(g => g.id === groupId);
        if (!group) return;
        
        setAccessSettings(prev => {
            const nextLevelSettings = { ...prev[level] };
            group.pages.forEach(page => {
                nextLevelSettings[page] = checked;
            });
            return {
                ...prev,
                [level]: nextLevelSettings
            };
        });
    };

    const handlePermissionChange = (level: AccessLevel, page: string, hasAccess: boolean) => {
        setAccessSettings(prev => ({
            ...prev,
            [level]: {
                ...prev[level],
                [page]: hasAccess,
            }
        }));
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

    if (isLoading && Object.keys(accessSettings).length === 0) {
        return <div className="p-8">Loading settings...</div>;
    }
    
    return (
        <div className="space-y-4 min-w-0 w-full">
            <PageHeader 
                title="Access Settings" 
                description="Configure page-level and operation-level permissions for different roles."
            >
                 <Button onClick={handleSaveChanges} disabled={isLoading}>
                    <Save className="mr-2 h-4 w-4" />
                    {isLoading ? 'Saving...' : 'Save Changes'}
                 </Button>
            </PageHeader>

            <Tabs defaultValue="pages" className="w-full">
                <TabsList className="bg-muted w-[320px] h-10 p-1 mb-4 grid grid-cols-2 rounded-lg">
                    <TabsTrigger value="pages" className="flex items-center gap-1.5 text-xs md:text-sm py-1.5 rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground font-semibold transition-all">
                        <LayoutGrid className="h-4 w-4 shrink-0" />
                        Page Access
                    </TabsTrigger>
                    <TabsTrigger value="crud" className="flex items-center gap-1.5 text-xs md:text-sm py-1.5 rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground font-semibold transition-all">
                        <ShieldAlert className="h-4 w-4 shrink-0" />
                        CRUD Access
                    </TabsTrigger>
                </TabsList>

                {/* ── Tab 1: Page Access Table ── */}
                <TabsContent value="pages" className="p-0 border-none outline-none">
                    <Card className="w-full overflow-hidden border">
                        <CardContent className="p-0">
                            <div className="overflow-x-auto w-full">
                                <Table className="min-w-full border-collapse">
                                    <TableHeader>
                                        <TableRow className="border-b bg-muted/10">
                                            <TableHead className="w-[300px] font-bold text-foreground pl-6">Page / Feature</TableHead>
                                            {accessLevels.map(level => (
                                                <TableHead key={level} className="text-center font-bold text-foreground min-w-[120px]">{level}</TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {pageGroups.map(group => {
                                            const isExpanded = !!expandedGroups[group.id];
                                            
                                            return (
                                                <React.Fragment key={group.id}>
                                                    {/* Group Row */}
                                                    <TableRow className="bg-muted/30 hover:bg-muted/40 font-semibold border-b">
                                                        <TableCell className="flex items-center gap-2 select-none py-3 h-12">
                                                            <Button 
                                                                variant="ghost" 
                                                                size="icon" 
                                                                className="h-6 w-6 p-0 shrink-0 hover:bg-muted/80" 
                                                                onClick={() => toggleGroup(group.id)}
                                                            >
                                                                {isExpanded ? (
                                                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                                                ) : (
                                                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                                                )}
                                                            </Button>
                                                            <span className="text-sm md:text-base font-bold text-foreground">{group.name}</span>
                                                        </TableCell>
                                                        {accessLevels.map(level => {
                                                            const checkState = getGroupCheckState(group.id, level);
                                                            return (
                                                                <TableCell key={`${group.id}-${level}`} className="text-center py-3">
                                                                    <Checkbox
                                                                        checked={checkState}
                                                                        onCheckedChange={(checked) => {
                                                                            const targetState = checked === true;
                                                                            handleGroupToggle(group.id, level, targetState);
                                                                        }}
                                                                        disabled={level === 'Administrator'}
                                                                    />
                                                                </TableCell>
                                                            );
                                                        })}
                                                    </TableRow>
                                                    
                                                    {/* Sub-pages */}
                                                    {isExpanded && group.pages.map(page => (
                                                        <TableRow key={`${group.id}-${page}`} className="hover:bg-muted/10 transition-colors border-b">
                                                            <TableCell className="pl-10 text-sm font-medium text-foreground py-2.5">
                                                                {page}
                                                            </TableCell>
                                                            {accessLevels.map(level => (
                                                                <TableCell key={`${level}-${page}`} className="text-center py-2.5">
                                                                    <Checkbox
                                                                        checked={accessSettings[level]?.[page] ?? false}
                                                                        onCheckedChange={(checked) => handlePermissionChange(level, page, !!checked)}
                                                                        disabled={level === 'Administrator'}
                                                                    />
                                                                </TableCell>
                                                            ))}
                                                        </TableRow>
                                                    ))}
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
                                                        const isBtnDisabled = level === 'Administrator';
                                                        
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
