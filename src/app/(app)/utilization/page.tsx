'use client';

import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/db-provider';
import { collection, getDocs, query, where, getDoc, doc } from '@/lib/db-provider';
import { PageHeader } from '@/components/PageHeader';
import { Input } from '@/components/ui/input';
import { ThemedAutocomplete } from '@/components/ui/themed-autocomplete';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { type User, type Project, type Story } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, getUserInitials } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
    startOfMonth, 
    endOfMonth, 
    eachDayOfInterval, 
    format, 
    startOfDay, 
    isSameDay,
    addMonths,
    subMonths
} from 'date-fns';
import { 
    Calendar as CalendarIcon, 
    Clock, 
    UserCheck, 
    AlertCircle, 
    CheckCircle2, 
    Activity, 
    TrendingUp, 
    Info,
    Briefcase,
    ChevronLeft,
    ChevronRight,
    X,
    Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28'];

export interface ProjectTimelineData {
    project: Project;
    planned: Array<{ start: Date; end: Date; name: string; }>;
    actual: Array<{ start: Date; end: Date; name: string; }>;
    onboardingDate: Date | null;
    offloadingDate: Date | null;
    availability: number;
}

export default function UtilizationPage() {
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [timelineData, setTimelineData] = useState<ProjectTimelineData[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [userInput, setUserInput] = useState('');
    const [selectedCalendarDay, setSelectedCalendarDay] = useState<Date | null>(null);
    const [currentCalendarMonth, setCurrentCalendarMonth] = useState<Date>(new Date());
    
    useEffect(() => {
        const fetchUsers = async () => {
            if (!db) return;
            const usersSnapshot = await getDocs(collection(db, 'employees'));
            const usersList = usersSnapshot.docs.map((doc: any) => ({ ...doc.data(), id: doc.id } as User));
            setAllUsers(usersList);
        };
        fetchUsers();
    }, []);

    const userOptions = useMemo(() => allUsers
        .filter(user => !user.isDeleted && user.isEnabled !== false && !!user.empId && user.empId.trim() !== '')
        .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, undefined, { numeric: true, sensitivity: 'base' }))
        .map(user => ({
            value: user.id,
            label: `${user.firstName} ${user.lastName} (${user.empId.trim()})`
        })), [allUsers]);

    useEffect(() => {
        const fetchTimelineData = async () => {
            if (!selectedUser || !db) return;
            setIsLoading(true);

            try {
                const projectsSnapshot = await getDocs(collection(db, 'projects'));
                const resolvedData: ProjectTimelineData[] = [];

                for (const projectDoc of projectsSnapshot.docs) {
                    const employeeDocRef = doc(db, 'projects', projectDoc.id, 'employees', selectedUser.id);
                    const employeeDoc = await getDoc(employeeDocRef);
                    if (employeeDoc.exists()) {
                        const project = { ...projectDoc.data(), id: projectDoc.id } as Project;
                        const empData = employeeDoc.data();

                        // Fetch planned tasks
                        const tasksQuery = query(
                            collection(db, 'projects', project.id, 'stories'), 
                            where('itemType', '==', 'Task'),
                            where('assigneeId', '==', selectedUser.id)
                        );
                        const tasksSnapshot = await getDocs(tasksQuery);
                        const planned = tasksSnapshot.docs.map((doc: any) => {
                            const task = doc.data() as Story;
                            return { 
                                start: task.startDate ? new Date(task.startDate) : null, 
                                end: task.endDate ? new Date(task.endDate) : null,
                                name: task.title
                            };
                        }).filter((t: any) => t.start && t.end && !isNaN(t.start.getTime()) && !isNaN(t.end.getTime())) as Array<{ start: Date; end: Date; name: string; }>;

                        // Fetch actual worklogs
                        const worklogsQuery = query(
                            collection(db, 'projects', project.id, 'worklogs'),
                            where('employeeId', '==', selectedUser.id)
                        );
                        const worklogsSnapshot = await getDocs(worklogsQuery);
                        const worklogDates = worklogsSnapshot.docs
                            .map((doc: any) => new Date(doc.id.split('-').slice(1).join('-')))
                            .filter((d: any) => !isNaN(d.getTime()));
                        
                        const actual: Array<{ start: Date; end: Date; name: string }> = [];
                        if (worklogDates.length > 0) {
                            worklogDates.sort((a: any, b: any) => a.getTime() - b.getTime());
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

                        // Helper to safely parse dates (Firestore Timestamps vs ISO Strings)
                        const convertToDate = (val: any): Date | null => {
                            if (!val) return null;
                            if (typeof val.toDate === 'function') {
                                return val.toDate();
                            }
                            const d = new Date(val);
                            return isNaN(d.getTime()) ? null : d;
                        };

                        resolvedData.push({
                            project,
                            planned,
                            actual,
                            onboardingDate: convertToDate(empData.onboardingDate),
                            offloadingDate: convertToDate(empData.offloadingDate),
                            availability: empData.availability !== undefined ? Number(empData.availability) : 100
                        });
                    }
                }
                
                setTimelineData(resolvedData);

            } catch (error) {
                console.error("Error fetching timeline data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchTimelineData();

    }, [selectedUser]);

    useEffect(() => {
        if (selectedUser) {
            setSelectedCalendarDay(new Date());
            setCurrentCalendarMonth(new Date());
        } else {
            setSelectedCalendarDay(null);
            setCurrentCalendarMonth(new Date());
        }
    }, [selectedUser]);
    
    const handleUserSelect = (labelOrId: string) => {
        const user = allUsers.find(u => 
            (u.empId && `${u.firstName} ${u.lastName} (${u.empId.trim()})`.toLowerCase() === labelOrId.toLowerCase()) || 
            u.id === labelOrId
        );
        setSelectedUser(user || null);
        if (user && user.empId) {
            setUserInput(`${user.firstName} ${user.lastName} (${user.empId.trim()})`);
        } else if (user) {
            setUserInput(`${user.firstName} ${user.lastName}`);
        }
    };

    const handlePrevMonth = () => {
        setCurrentCalendarMonth(prev => subMonths(prev, 1));
    };

    const handleNextMonth = () => {
        setCurrentCalendarMonth(prev => addMonths(prev, 1));
    };

    const getOccupancyForDate = (date: Date, data: ProjectTimelineData[]) => {
        const activeProjects: Array<{ id: string; name: string; color: string; availability: number; onboardingDate: Date | null; offloadingDate: Date | null }> = [];
        data.forEach((item, index) => {
            if (item.onboardingDate && item.offloadingDate) {
                const start = startOfDay(new Date(item.onboardingDate));
                const end = startOfDay(new Date(item.offloadingDate));
                const current = startOfDay(new Date(date));
                if (current >= start && current <= end) {
                    activeProjects.push({
                        id: item.project.id,
                        name: item.project.name,
                        color: COLORS[index % COLORS.length],
                        availability: item.availability,
                        onboardingDate: item.onboardingDate,
                        offloadingDate: item.offloadingDate
                    });
                }
            }
        });
        return activeProjects;
    };

    const getInitials = (firstName?: string, lastName?: string) => {
        if (!firstName && !lastName) return '?';
        return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
    };

    const activeProjectsInMonth = useMemo(() => {
        const startOfSelectedMonth = startOfMonth(currentCalendarMonth);
        const endOfSelectedMonth = endOfMonth(currentCalendarMonth);
        
        return timelineData.filter(item => {
            if (!item.onboardingDate || !item.offloadingDate) return false;
            const start = startOfDay(item.onboardingDate);
            const end = startOfDay(item.offloadingDate);
            return start <= endOfSelectedMonth && end >= startOfSelectedMonth;
        }).map((item, index) => ({
            ...item,
            color: COLORS[index % COLORS.length]
        }));
    }, [timelineData, currentCalendarMonth]);

    const availabilityOutlook = useMemo(() => {
        if (!timelineData.length) return null;
        
        const today = startOfDay(new Date());
        const startOfSelectedMonth = startOfMonth(currentCalendarMonth);
        const endOfSelectedMonth = endOfMonth(currentCalendarMonth);
        
        // 1. Calculate monthly utilization rate for selected month (average cumulative utilization)
        const daysInMonthList = eachDayOfInterval({ start: startOfSelectedMonth, end: endOfSelectedMonth });
        let totalUtilSum = 0;
        
        daysInMonthList.forEach(day => {
            const activeProjects = getOccupancyForDate(day, timelineData);
            const dailyUtil = activeProjects.reduce((sum, proj) => sum + proj.availability, 0);
            totalUtilSum += dailyUtil;
        });
        
        const monthlyRate = totalUtilSum / daysInMonthList.length;
        
        // 2. Determine today's status
        const todayProjects = getOccupancyForDate(today, timelineData);
        const todayUtil = todayProjects.reduce((sum, proj) => sum + proj.availability, 0);
        const isOccupiedToday = todayUtil > 0;
        
        // 3. Find next available date (from today onwards, look up to 90 days ahead)
        let nextAvailable: Date | null = null;
        let checkDate = new Date(today);
        
        for (let i = 0; i < 90; i++) {
            const projects = getOccupancyForDate(checkDate, timelineData);
            const totalUtil = projects.reduce((sum, proj) => sum + proj.availability, 0);
            if (totalUtil < 100) {
                nextAvailable = new Date(checkDate);
                break;
            }
            checkDate.setDate(checkDate.getDate() + 1);
        }
        
        // 4. Find occupied until date (maximum offloading date of any active range starting today)
        let occupiedUntil: Date | null = null;
        let maxDateMs = 0;
        
        timelineData.forEach(item => {
            if (item.offloadingDate) {
                const endMs = item.offloadingDate.getTime();
                if (item.offloadingDate >= today && endMs > maxDateMs) {
                    maxDateMs = endMs;
                    occupiedUntil = item.offloadingDate;
                }
            }
        });

        // 5. Calculate active projects list in the viewed month
        const activeProjectsInMonthSet = new Set<string>();
        daysInMonthList.forEach(day => {
            const activeProjects = getOccupancyForDate(day, timelineData);
            activeProjects.forEach(proj => activeProjectsInMonthSet.add(proj.id));
        });
        
        return {
            monthlyRate: Math.round(monthlyRate),
            isOccupiedToday,
            todayProjects,
            nextAvailable,
            occupiedUntil,
            activeProjectsCount: activeProjectsInMonthSet.size
        };
    }, [timelineData, currentCalendarMonth]);

    const calendarDays = useMemo(() => {
        const startOfCurMonth = startOfMonth(currentCalendarMonth);
        const endOfCurMonth = endOfMonth(currentCalendarMonth);
        const days = eachDayOfInterval({ start: startOfCurMonth, end: endOfCurMonth });
        
        const startDayIndex = startOfCurMonth.getDay();
        const padCount = startDayIndex === 0 ? 6 : startDayIndex - 1;
        const padding = Array.from({ length: padCount });
        
        return { days, padding };
    }, [currentCalendarMonth]);

    const selectedDayAssignments = useMemo(() => {
        if (!selectedCalendarDay) return [];
        return getOccupancyForDate(selectedCalendarDay, timelineData);
    }, [selectedCalendarDay, timelineData]);

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <PageHeader title="Resource Utilization" description="Visualize resource allocation across all projects." />
            <Card>
                <CardContent className="p-4">
                    <div className="max-w-sm space-y-1.5">
                        <label htmlFor="user-search" className="text-sm font-medium">Select a User</label>
                        <ThemedAutocomplete
                            id="user-search"
                            value={selectedUser?.id}
                            onChange={(val) => {
                                if (!val) {
                                    setSelectedUser(null);
                                    setUserInput('');
                                } else {
                                    const user = allUsers.find(u => u.id === val);
                                    setSelectedUser(user || null);
                                    if (user && user.empId) {
                                        setUserInput(`${user.firstName} ${user.lastName} (${user.empId.trim()})`);
                                    } else if (user) {
                                        setUserInput(`${user.firstName} ${user.lastName}`);
                                    }
                                }
                            }}
                            options={userOptions}
                            placeholder="Search by name or employee ID..."
                            emptyText="No matching users found."
                        />
                    </div>
                </CardContent>
            </Card>
            
            {selectedUser ? (
                isLoading ? (
                    <Card>
                        <CardContent className="p-8">
                            <div className="space-y-4">
                                <Skeleton className="h-8 w-1/4" />
                                <Skeleton className="h-64 w-full" />
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-6">
                        {/* Availability Outlook & Monthly Calendar Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Left: Outlook Card */}
                            <Card className="lg:col-span-1 border-border bg-card">
                                <CardHeader className="pb-3 border-b">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <Activity className="h-5 w-5 text-primary" />
                                        Availability Outlook
                                    </CardTitle>
                                    <CardDescription>Real-time occupancy status & monthly forecast</CardDescription>
                                </CardHeader>
                                <CardContent className="pt-6 space-y-6">
                                    {/* User Micro Profile */}
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-10 w-10 border">
                                            <AvatarImage src={selectedUser.avatar} alt={`${selectedUser.firstName} ${selectedUser.lastName}`} />
                                            <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                                {getUserInitials(selectedUser.firstName, selectedUser.lastName)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <h4 className="font-semibold text-sm">{selectedUser.firstName} {selectedUser.lastName}</h4>
                                            <p className="text-xs text-muted-foreground font-mono">{selectedUser.empId} • {selectedUser.accessLevel}</p>
                                        </div>
                                    </div>

                                    {/* Status Badge */}
                                    <div className="space-y-2">
                                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Current Status</span>
                                        {availabilityOutlook?.isOccupiedToday ? (
                                            <Badge variant="outline" className="text-rose-700 border-rose-300 bg-rose-50 dark:text-rose-300 dark:border-rose-700 dark:bg-rose-950/20 py-1.5 px-3 w-full flex items-center justify-center gap-1.5">
                                                <AlertCircle className="h-4 w-4" />
                                                Occupied Today
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50 dark:text-green-300 dark:border-green-700 dark:bg-green-950/20 py-1.5 px-3 w-full flex items-center justify-center gap-1.5">
                                                <CheckCircle2 className="h-4 w-4" />
                                                Available Today
                                            </Badge>
                                        )}
                                    </div>

                                    {/* Statistics Metrics */}
                                    <div className="grid grid-cols-2 gap-4 border-t border-b py-4">
                                        <div className="space-y-1">
                                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Monthly Utilization</span>
                                            <span className="text-2xl font-bold flex items-center gap-1">
                                                {availabilityOutlook?.monthlyRate}%
                                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                            </span>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Active Projects</span>
                                            <span className="text-2xl font-bold">{availabilityOutlook?.activeProjectsCount ?? 0}</span>
                                        </div>
                                    </div>

                                    {/* Availability Details */}
                                    <div className="space-y-3 text-sm">
                                        <div className="flex items-center justify-between">
                                            <span className="text-muted-foreground flex items-center gap-1.5">
                                                <UserCheck className="h-4 w-4 text-emerald-500" />
                                                Next Available
                                            </span>
                                            <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                                {availabilityOutlook?.nextAvailable 
                                                    ? isSameDay(availabilityOutlook.nextAvailable, new Date())
                                                        ? 'Available Today'
                                                        : format(availabilityOutlook.nextAvailable, 'MMM d, yyyy')
                                                    : 'Fully Occupied'
                                                }
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-muted-foreground flex items-center gap-1.5">
                                                <Clock className="h-4 w-4 text-amber-500" />
                                                Occupied Until
                                            </span>
                                            <span className="font-medium text-amber-600 dark:text-amber-400">
                                                {availabilityOutlook?.occupiedUntil 
                                                    ? format(availabilityOutlook.occupiedUntil, 'MMM d, yyyy')
                                                    : 'No Planned Tasks'
                                                }
                                            </span>
                                        </div>
                                    </div>

                                    {/* Monthly Project Allocations List */}
                                    <div className="border-t pt-4 space-y-3">
                                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                                            Allocated Projects ({format(currentCalendarMonth, 'MMMM yyyy')})
                                        </span>
                                        {activeProjectsInMonth.length === 0 ? (
                                            <p className="text-xs text-muted-foreground italic">No project allocations in this month.</p>
                                        ) : (
                                            <div className="space-y-2">
                                                {activeProjectsInMonth.map((item) => {
                                                    return (
                                                        <div key={item.project.id} className="flex flex-col space-y-1 p-2.5 rounded-md border bg-muted/20">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <span className="text-xs font-bold flex items-center gap-1.5 truncate">
                                                                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                                                                    <span className="truncate" title={item.project.name}>{item.project.name}</span>
                                                                </span>
                                                                <Badge variant="secondary" className="text-[10px] font-bold py-0 px-1.5 shrink-0 bg-primary/10 text-primary border-none">
                                                                    {item.availability}% Util
                                                                </Badge>
                                                            </div>
                                                            <div className="flex flex-col text-[10px] text-muted-foreground space-y-0.5">
                                                                <div className="flex justify-between">
                                                                    <span>Onboard:</span>
                                                                    <span className="font-mono">{item.onboardingDate ? format(item.onboardingDate, 'MMM d, yyyy') : 'N/A'}</span>
                                                                </div>
                                                                <div className="flex justify-between">
                                                                    <span>Offload:</span>
                                                                    <span className="font-mono">{item.offloadingDate ? format(item.offloadingDate, 'MMM d, yyyy') : 'N/A'}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Right: Calendar Grid Card */}
                            <Card className="lg:col-span-2 border-border bg-card flex flex-col">
                                <CardHeader className="pb-3 border-b flex flex-row items-center justify-between space-y-0">
                                    <div>
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <CalendarIcon className="h-5 w-5 text-primary" />
                                            Availability Grid
                                        </CardTitle>
                                        <CardDescription>Daily occupancy map for {format(currentCalendarMonth, 'MMMM yyyy')}</CardDescription>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={handlePrevMonth}>
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <Badge variant="secondary" className="font-semibold text-xs py-1 px-3 min-w-[90px] text-center justify-center">
                                            {format(currentCalendarMonth, 'MMM yyyy')}
                                        </Badge>
                                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleNextMonth}>
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-4 flex-1 flex flex-col gap-4">
                                    {/* Calendar Weeks header */}
                                    <div className="grid grid-cols-7 gap-1 text-center font-medium text-xs text-muted-foreground pb-1">
                                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                            <div key={day} className="py-1">{day}</div>
                                        ))}
                                    </div>

                                    {/* Days Grid */}
                                    <div className="grid grid-cols-7 gap-1 flex-1">
                                        {/* Padding before startOfMonth */}
                                        {calendarDays.padding.map((_, index) => (
                                            <div key={`pad-${index}`} className="aspect-square bg-muted/20 dark:bg-muted/5 rounded border border-transparent" />
                                        ))}

                                        {/* Month days */}
                                        {calendarDays.days.map((day) => {
                                            const activeProjects = getOccupancyForDate(day, timelineData);
                                            const isSelected = selectedCalendarDay && isSameDay(day, selectedCalendarDay);
                                            const isToday = isSameDay(day, new Date());
                                            
                                            // Sum up utilization percentage
                                            const totalUtilization = activeProjects.reduce((sum, proj) => sum + proj.availability, 0);
                                            
                                            // Color schemes based on utilization level
                                            let bgClass = "bg-background hover:bg-muted/50 dark:hover:bg-muted/20";
                                            let borderClass = "border-border";
                                            let textClass = "text-foreground";
                                            let utilLabel = `${totalUtilization}%`;
                                            
                                            if (totalUtilization > 0 && totalUtilization <= 100) {
                                                bgClass = "bg-indigo-50 dark:bg-indigo-950/20 hover:bg-indigo-100/70 dark:hover:bg-indigo-950/40";
                                                borderClass = "border-indigo-200 dark:border-indigo-800";
                                                textClass = "text-indigo-800 dark:text-indigo-300";
                                            } else if (totalUtilization > 100) {
                                                bgClass = "bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100/70 dark:hover:bg-rose-950/40";
                                                borderClass = "border-rose-200 dark:border-rose-800";
                                                textClass = "text-rose-800 dark:text-rose-300";
                                            }

                                            if (isToday) {
                                                borderClass = "border-primary ring-1 ring-primary";
                                            }
                                            if (isSelected) {
                                                bgClass = "bg-primary text-primary-foreground hover:bg-primary/90";
                                                borderClass = "border-primary shadow-sm";
                                                textClass = "text-primary-foreground";
                                            }

                                            return (
                                                <button
                                                    key={day.toISOString()}
                                                    onClick={() => setSelectedCalendarDay(day)}
                                                    className={cn(
                                                        "aspect-square rounded border flex flex-col justify-between p-1 md:p-1.5 transition-all duration-200 cursor-pointer select-none text-left focus:outline-none relative group overflow-hidden",
                                                        bgClass,
                                                        borderClass,
                                                        textClass
                                                    )}
                                                >
                                                    <span className="text-xs font-semibold">{format(day, 'd')}</span>
                                                    
                                                    {/* Gantt-like colored filling bars */}
                                                    <div className="w-full space-y-0.5 my-1 flex-1 flex flex-col justify-center">
                                                        {activeProjects.map((proj) => (
                                                            <div
                                                                key={proj.id}
                                                                className="h-1.5 w-full rounded-sm opacity-80 hover:opacity-100 transition-opacity animate-in fade-in"
                                                                style={{ backgroundColor: proj.color }}
                                                                title={`${proj.name} (${proj.availability}% Allocation)`}
                                                            />
                                                        ))}
                                                    </div>

                                                    <span className={cn(
                                                        "text-[9px] md:text-[10px] font-bold block text-right mt-auto opacity-80 w-full",
                                                        isSelected ? "text-primary-foreground" : "text-muted-foreground"
                                                    )}>
                                                        {utilLabel}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Daily Assignment Detail view */}
                                    {selectedCalendarDay && (
                                        <div className="border-t pt-3 mt-auto">
                                            <div className="flex items-center gap-1.5 mb-2">
                                                <Info className="h-4 w-4 text-muted-foreground" />
                                                <h4 className="text-xs font-semibold text-muted-foreground">
                                                    Assignments for {format(selectedCalendarDay, 'EEEE, MMMM d, yyyy')}
                                                </h4>
                                            </div>
                                            {selectedDayAssignments.length === 0 ? (
                                                <p className="text-xs text-muted-foreground italic">No assignments scheduled. The user is 100% available on this day.</p>
                                            ) : (
                                                <div className="flex flex-wrap gap-2">
                                                    {selectedDayAssignments.map((proj) => {
                                                        return (
                                                            <Badge 
                                                                key={proj.id} 
                                                                variant="outline" 
                                                                className="flex items-center gap-1.5 text-xs py-1 px-2.5 animate-in slide-in-from-bottom-1"
                                                                style={{ borderColor: `${proj.color}40`, backgroundColor: `${proj.color}08` }}
                                                            >
                                                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: proj.color }} />
                                                                <span className="font-medium text-foreground">{proj.name}</span>
                                                                <span className="text-muted-foreground ml-1">({proj.availability}% Allocation)</span>
                                                            </Badge>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )
            ) : (
                <Card>
                    <CardContent className="p-16 flex flex-col items-center justify-center text-center">
                        <div className="rounded-full bg-muted p-4 mb-4">
                            <Briefcase className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">No User Selected</h3>
                        <p className="text-muted-foreground max-w-sm">
                            Select a team member above to visualize their current month calendar, availability metrics, and project allocation.
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
