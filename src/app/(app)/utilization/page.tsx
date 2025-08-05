
'use client';

import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, getDoc, doc } from 'firebase/firestore';
import { PageHeader } from '@/components/PageHeader';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { type User, type Project, type Story, type Worklog } from '@/types';
import { UtilizationGanttChart } from '@/components/UtilizationGanttChart';
import { Skeleton } from '@/components/ui/skeleton';

export interface ProjectTimelineData {
    project: Project;
    planned: Array<{ start: Date; end: Date; name: string; }>;
    actual: Array<{ start: Date; end: Date; name: string; }>;
}

export default function UtilizationPage() {
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [timelineData, setTimelineData] = useState<ProjectTimelineData[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [userInput, setUserInput] = useState('');
    
    useEffect(() => {
        const fetchUsers = async () => {
            if (!db) return;
            const usersSnapshot = await getDocs(collection(db, 'employees'));
            const usersList = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
            setAllUsers(usersList);
        };
        fetchUsers();
    }, []);

    const userOptions = useMemo(() => allUsers.map(user => ({
        value: user.id,
        label: `${user.firstName} ${user.lastName} (${user.empId})`
    })), [allUsers]);

    useEffect(() => {
        const fetchTimelineData = async () => {
            if (!selectedUser || !db) return;
            setIsLoading(true);

            try {
                const projectsSnapshot = await getDocs(collection(db, 'projects'));
                const userProjects: Project[] = [];

                for (const projectDoc of projectsSnapshot.docs) {
                    const employeeDocRef = doc(db, 'projects', projectDoc.id, 'employees', selectedUser.id);
                    const employeeDoc = await getDoc(employeeDocRef);
                    if (employeeDoc.exists()) {
                        userProjects.push({ id: projectDoc.id, ...projectDoc.data() } as Project);
                    }
                }
                
                const dataPromises = userProjects.map(async (project) => {
                    // Fetch planned tasks
                    const tasksQuery = query(
                        collection(db, 'projects', project.id, 'stories'), 
                        where('itemType', '==', 'Task'),
                        where('assigneeId', '==', selectedUser.id)
                    );
                    const tasksSnapshot = await getDocs(tasksQuery);
                    const planned = tasksSnapshot.docs.map(doc => {
                        const task = doc.data() as Story;
                        return { 
                            start: new Date(task.startDate!), 
                            end: new Date(task.endDate!),
                            name: task.title
                        };
                    }).filter(t => t.start && t.end);

                    // Fetch actual worklogs
                    const worklogsQuery = query(
                        collection(db, 'projects', project.id, 'worklogs'),
                        where('employeeId', '==', selectedUser.id)
                    );
                    const worklogsSnapshot = await getDocs(worklogsQuery);
                    const worklogDates = worklogsSnapshot.docs.map(doc => new Date(doc.id.split('-').slice(1).join('-')));
                    
                    const actual: Array<{ start: Date; end: Date; name: string }> = [];
                    if (worklogDates.length > 0) {
                        worklogDates.sort((a,b) => a.getTime() - b.getTime());
                        let currentRange = { start: worklogDates[0], end: worklogDates[0], name: 'Work Logged' };

                        for(let i = 1; i < worklogDates.length; i++) {
                            const dayDiff = (worklogDates[i].getTime() - currentRange.end.getTime()) / (1000 * 3600 * 24);
                            if(dayDiff <= 1) { // consecutive days
                                currentRange.end = worklogDates[i];
                            } else {
                                actual.push(currentRange);
                                currentRange = { start: worklogDates[i], end: worklogDates[i], name: 'Work Logged' };
                            }
                        }
                        actual.push(currentRange);
                    }
                    
                    return { project, planned, actual };
                });
                
                const resolvedData = await Promise.all(dataPromises);
                setTimelineData(resolvedData);

            } catch (error) {
                console.error("Error fetching timeline data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchTimelineData();

    }, [selectedUser]);
    
    const handleUserSelect = (label: string) => {
        const user = allUsers.find(u => `${u.firstName} ${u.lastName} (${u.empId})` === label);
        setSelectedUser(user || null);
        setUserInput(label);
    }

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <PageHeader title="Resource Utilization" description="Visualize resource allocation across all projects." />
            <Card>
                <CardContent className="p-4">
                    <div className="max-w-sm">
                        <label htmlFor="user-search" className="text-sm font-medium">Select a User</label>
                        <Input
                            id="user-search"
                            list="user-options"
                            placeholder="Search by name or employee ID..."
                            value={userInput}
                            onChange={(e) => {
                                setUserInput(e.target.value);
                                if (!e.target.value) setSelectedUser(null);
                            }}
                            onBlur={(e) => {
                                if (!userOptions.some(opt => opt.label === e.target.value)) {
                                    // If text doesn't match an option, clear selection
                                    // but keep the text for user to see
                                    setSelectedUser(null);
                                } else {
                                    handleUserSelect(e.target.value);
                                }
                            }}
                        />
                        <datalist id="user-options">
                            {userOptions.map(opt => <option key={opt.value} value={opt.label} />)}
                        </datalist>
                    </div>
                </CardContent>
            </Card>
            
            <Card>
                <CardContent className="p-4">
                    {selectedUser ? (
                        isLoading ? (
                            <div>
                                <Skeleton className="h-8 w-1/4 mb-4" />
                                <Skeleton className="h-64 w-full" />
                            </div>
                        ) : (
                            <UtilizationGanttChart data={timelineData} />
                        )
                    ) : (
                        <div className="text-center text-muted-foreground py-16">
                            Please select a user to view their utilization timeline.
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
