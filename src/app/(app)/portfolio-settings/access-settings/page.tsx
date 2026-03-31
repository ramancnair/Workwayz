
'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { AccessLevel, AccessControlSetting } from '@/types';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Save } from 'lucide-react';

const accessLevels: AccessLevel[] = ['Administrator', 'Senior Management', 'Project Manager', 'Lead', 'Team Member', 'PMO'];

// Define your application's pages/features here
const appPages = [
    'Portfolios',
    'Projects',
    'Users',
    'Development Dashboard',
    'Kanban Board',
    'Backlog',
    'Development Tasks',
    'Testing Dashboard',
    'Test Cases',
    'Bug List',
    'Impacted Systems',
    'Releases',
    'Resources',
    'Resource Gantt',
    'Worklog',
    'Leave Tracker',
    'RAID Dashboard',
    'Risks',
    'Assumptions',
    'Issues',
    'Dependencies',
    'Holiday Calendar',
    'Project Settings',
];


export default function AccessSettingsPage() {
    const [accessSettings, setAccessSettings] = useState<Record<AccessLevel, Record<string, boolean>>>({});
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const fetchAccessSettings = async () => {
            if (!db) return;
            setIsLoading(true);
            const settingsCollection = collection(db, 'accessControl');
            const snapshot = await getDocs(settingsCollection);
            
            const fetchedSettings: Record<string, any> = {};
            snapshot.forEach(doc => {
                fetchedSettings[doc.id] = doc.data().pageAccess;
            });

            // Initialize with defaults if not present
            const newSettings: Record<string, any> = {};
            for (const level of accessLevels) {
                newSettings[level] = {};
                for (const page of appPages) {
                    newSettings[level][page] = fetchedSettings[level]?.[page] ?? (level === 'Administrator');
                }
            }

            setAccessSettings(newSettings as Record<AccessLevel, Record<string, boolean>>);
            setIsLoading(false);
        };

        fetchAccessSettings();
    }, []);

    const handlePermissionChange = (level: AccessLevel, page: string, hasAccess: boolean) => {
        setAccessSettings(prev => ({
            ...prev,
            [level]: {
                ...prev[level],
                [page]: hasAccess,
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
        <div className="space-y-4">
            <PageHeader 
                title="Access Settings" 
                description="Define page-level access for different roles."
            >
                 <Button onClick={handleSaveChanges} disabled={isLoading}>
                    <Save className="mr-2 h-4 w-4" />
                    {isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
            </PageHeader>
            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table className="min-w-full">
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="sticky left-0 bg-background z-10 w-1/4">Access Level</TableHead>
                                    {appPages.map(page => (
                                        <TableHead key={page} className="text-center">{page}</TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {accessLevels.map(level => (
                                    <TableRow key={level}>
                                        <TableCell className="font-medium sticky left-0 bg-background z-10">{level}</TableCell>
                                        {appPages.map(page => (
                                            <TableCell key={`${level}-${page}`} className="text-center">
                                                <Checkbox
                                                    checked={accessSettings[level]?.[page] ?? false}
                                                    onCheckedChange={(checked) => handlePermissionChange(level, page, !!checked)}
                                                    disabled={level === 'Administrator'}
                                                />
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
