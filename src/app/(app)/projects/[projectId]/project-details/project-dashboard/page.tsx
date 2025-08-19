
'use client';

import { useMemo, useState } from 'react';
import { useProject } from '@/context/ProjectContext';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { type ProjectStatus, type Story } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO, eachDayOfInterval, isBefore, startOfDay, isSameDay } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';


const statusStyles: Record<ProjectStatus, string> = {
    'Initial Estimation': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    'Not Started': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    'Active': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    'On Hold': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    'Completed': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    'Cancelled': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

function DetailCard({ title, value, className }: { title: string; value: React.ReactNode; className?: string }) {
    return (
        <div className={className}>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="text-lg font-semibold">{value || <span className="text-muted-foreground/70">N/A</span>}</div>
        </div>
    );
}

function BurndownChart() {
    const { sprints, stories, holidays, weeklyOffDays } = useProject();
    const [selectedSprintId, setSelectedSprintId] = useState('');

    const currentSprint = useMemo(() => sprints.find(s => s.isCurrent), [sprints]);
    
    useEffect(() => {
        if (currentSprint) {
            setSelectedSprintId(currentSprint.id);
        } else if (sprints.length > 0) {
            setSelectedSprintId(sprints[0].id);
        }
    }, [currentSprint, sprints]);

    const burndownData = useMemo(() => {
        const sprint = sprints.find(s => s.id === selectedSprintId);
        if (!sprint || !sprint.startDate || !sprint.endDate) return [];
        
        const sprintStories = stories.filter(s => s.sprintId === sprint.id);
        const totalHours = sprintStories.reduce((sum, s) => sum + (s.estimatedHours || 0), 0);
        
        const sprintStart = startOfDay(parseISO(sprint.startDate));
        const sprintEnd = startOfDay(parseISO(sprint.endDate));

        const holidayDates = holidays.map(h => parseISO(h.date));
        
        const workingDays = eachDayOfInterval({ start: sprintStart, end: sprintEnd }).filter(day => {
            const dayOfWeek = day.getDay();
            const isWeekend = weeklyOffDays.includes(dayOfWeek);
            const isHoliday = holidayDates.some(h => isSameDay(day, h));
            return !isWeekend && !isHoliday;
        });

        if (workingDays.length === 0) return [];
        
        const idealHoursPerDay = totalHours / workingDays.length;
        
        let remainingHours = totalHours;
        let idealHours = totalHours;

        return eachDayOfInterval({ start: sprintStart, end: sprintEnd }).map(date => {
            const storiesCompletedOnThisDay = sprintStories.filter(s =>
                s.status === 'Done' && s.endDate && isSameDay(parseISO(s.endDate), date)
            );
            
            remainingHours -= storiesCompletedOnThisDay.reduce((sum, s) => sum + (s.estimatedHours || 0), 0);
            
            const isWorkingDay = workingDays.some(wd => isSameDay(wd, date));
            if(isWorkingDay) {
                idealHours -= idealHoursPerDay;
            }

            return {
                date: format(date, 'MMM d'),
                'Actual Remaining': remainingHours,
                'Ideal Burndown': Math.max(0, idealHours),
            };
        });
    }, [selectedSprintId, sprints, stories, holidays, weeklyOffDays]);

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Sprint Burndown</CardTitle>
                    <CardDescription>Track the progress of work in a sprint.</CardDescription>
                </div>
                <Select value={selectedSprintId} onValueChange={setSelectedSprintId}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select Sprint" />
                    </SelectTrigger>
                    <SelectContent>
                        {sprints.map(s => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
                    </SelectContent>
                </Select>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={burndownData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="Ideal Burndown" stroke="#8884d8" strokeDasharray="5 5" />
                        <Line type="monotone" dataKey="Actual Remaining" stroke="#82ca9d" strokeWidth={2} />
                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    )
}

function BurnupChart() {
    const { stories, releasesAndMilestones } = useProject();
    const releases = releasesAndMilestones.filter(r => r.itemType === 'Release');
    const [selectedReleaseId, setSelectedReleaseId] = useState('');

    useEffect(() => {
        if (releases.length > 0) {
            setSelectedReleaseId(releases[0].id);
        }
    }, [releases]);

    const burnupData = useMemo(() => {
        const release = releases.find(r => r.id === selectedReleaseId);
        if (!release || !release.startDate || !release.endDate) return [];
        
        const releaseStories = stories.filter(s => s.releaseId === release.id);
        const totalScope = releaseStories.reduce((sum, s) => sum + (s.estimatedHours || 0), 0);
        
        const releaseStart = startOfDay(parseISO(release.startDate));
        const releaseEnd = startOfDay(parseISO(release.endDate));

        let completedHours = 0;

        return eachDayOfInterval({ start: releaseStart, end: releaseEnd }).map(date => {
            const storiesCompletedByThisDay = releaseStories.filter(s =>
                s.status === 'Done' && s.endDate && isBefore(parseISO(s.endDate), addDays(date, 1))
            );
            
            completedHours = storiesCompletedByThisDay.reduce((sum, s) => sum + (s.estimatedHours || 0), 0);

            return {
                date: format(date, 'MMM d'),
                'Scope': totalScope,
                'Completed Work': completedHours,
            };
        });

    }, [selectedReleaseId, releases, stories]);
    
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Release Burnup</CardTitle>
                    <CardDescription>Track progress towards the release goal.</CardDescription>
                </div>
                <Select value={selectedReleaseId} onValueChange={setSelectedReleaseId}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select Release" />
                    </SelectTrigger>
                    <SelectContent>
                        {releases.map(r => <SelectItem key={r.id} value={r.id}>[{r.releaseId}] {r.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={burnupData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }}/>
                        <Tooltip />
                        <Legend />
                        <Area type="monotone" dataKey="Completed Work" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.6} />
                        <Line type="monotone" dataKey="Scope" stroke="#ffc658" strokeWidth={2} dot={false} />
                    </AreaChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}

export default function ProjectDashboardPage() {
    const { project, isLoading, allUsers } = useProject();

    const projectManager = project?.projectManagerId
        ? allUsers.find(e => e.id === project.projectManagerId)
        : null;
        
    if (isLoading) {
        return (
             <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                <Skeleton className="h-12 w-1/3" />
                <div className="space-y-6">
                    <Card>
                        <CardHeader><Skeleton className="h-8 w-1/4" /></CardHeader>
                        <CardContent><Skeleton className="h-20 w-full" /></CardContent>
                    </Card>
                    <Card>
                        <CardHeader><Skeleton className="h-8 w-1/4" /></CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-16 w-full" />
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader><Skeleton className="h-8 w-1/4" /></CardHeader>
                        <CardContent><Skeleton className="h-72 w-full" /></CardContent>
                    </Card>
                     <Card>
                        <CardHeader><Skeleton className="h-8 w-1/4" /></CardHeader>
                        <CardContent><Skeleton className="h-72 w-full" /></CardContent>
                    </Card>
                </div>
            </div>
        )
    }

    if (!project) {
        return <div className="p-8 text-center">Project not found.</div>;
    }
    
    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <PageHeader title="Project Dashboard" description="A high-level overview of your project details." />
            
            <div className="space-y-6">
                <Card>
                    <CardHeader><CardTitle>Project Objective</CardTitle></CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground whitespace-pre-wrap">
                            {project.description || "No description provided."}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Key Information</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <DetailCard 
                            title="Status" 
                            value={project.status ? (
                                <Badge className={cn('font-semibold text-base', statusStyles[project.status])}>
                                    {project.status}
                                </Badge>
                            ) : 'N/A'}
                        />
                        <DetailCard 
                            title="Project Manager"
                            value={projectManager ? `${projectManager.firstName} ${projectManager.lastName}` : "Unassigned"}
                        />
                         <DetailCard 
                            title="Methodology" 
                            value={project.methodology}
                        />
                         <DetailCard 
                            title="Pricing Model" 
                            value={project.pricingModel}
                        />
                        <DetailCard 
                            title="Start Date" 
                            value={project.startDate ? format(parseISO(project.startDate), 'PPP') : 'N/A'}
                        />
                        <DetailCard 
                            title="End Date" 
                            value={project.endDate ? format(parseISO(project.endDate), 'PPP') : 'N/A'}
                        />
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <BurndownChart />
                    <BurnupChart />
                </div>
            </div>
        </div>
    );
}

```></content>
  </change>
  <change>
    <file>/src/types/index.ts</file>
    <content><![CDATA[

export type TaskStatus = 'To Do' | 'In Development' | 'In QA' | 'Complete';

export type Task = {
  id:string;
  title: string;
  description: string;
  status: TaskStatus;
  assigneeId: string;
  storyId: string;
  plannedStartDate: Date;
  plannedEndDate: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;
};

export type Epic = {
  id: string;
  title: string;
  description?: string;
};

export type StoryStatus = string;
export type WorkItemType = 'Requirement/Story' | 'Bug' | 'Task' | 'Feature Change' | 'Sub Task';
export type BugCriticality = 'Low' | 'Medium' | 'High' | 'Critical';

export type Story = {
  id: string;
  storyId: string;
  title: string;
  description: string;
  itemType: WorkItemType;
  acceptanceCriteria?: string;
  reporterId?: string;
  assigneeId?: string;
  epicId?: string;
  sprintId?: string | null;
  status: StoryStatus;
  estimatedHours?: number;
  criticality?: BugCriticality;
  startDate?: string; // ISO String
  endDate?: string; // ISO String
  effortDays?: number;
  impactedSystemId?: string; // For Sub-Task
  impactedSystemIds?: string[]; // For Story/Feature Change
  releaseId?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  parentStoryId?: string;
  attachments?: string;
  environmentId?: string;
};

export type Sprint = {
  id: string;
  title: string;
  isCurrent: boolean;
  startDate?: string; // ISO String
  endDate?: string; // ISO String
};

export type TestCaseStatus = 'Not Run' | 'Passed' | 'Failed' | 'Blocked' | 'Skipped';
export type TestCaseType = 'Functional' | 'Non-functional';

export type TestCase = {
  id: string;
  testCaseId: string;
  title: string;
  type: TestCaseType;
  description: string;
  expectedResult: string;
  status: TestCaseStatus;
  assigneeId?: string;
  storyId?: string;
  releaseId?: string;
  sprintId?: string;
  environmentIds?: string[];
  isDeleted?: boolean;
  deletedAt?: string;
};

export type UserRole = 'Developer' | 'Tester' | 'Architect' | 'BA' | 'PM' | 'Program Director';

export type AccessLevel = 'Administrator' | 'Senior Management' | 'Project Manager' | 'Lead' | 'Team Member' | 'PMO';

export type LeavePeriod = {
  id: string; // uuid on the client
  startDate: string; // ISO String
  endDate: string; // ISO String
};

export type User = {
  id: string;
  empId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  avatar?: string;
  clientEmpId?: string;
  clientEmail?: string;
  role?: UserRole;
  experience?: number;
  onboardingDate?: string; // ISO String - Project Specific
  offloadingDate?: string; // ISO String - Project Specific
  employmentStartDate?: string; // ISO String - Global
  employmentEndDate?: string; // ISO String - Global
  accessLevel?: AccessLevel;
  billedRate?: number;
  availability?: number;
  leavePeriods?: LeavePeriod[];
  isDeleted?: boolean;
  deletedAt?: string; // ISO String
  capabilities?: string[];
  isBcpSupport?: boolean;
};

export type Employee = User;

export type RiskSeverity = 1 | 2 | 3;
export type RiskProbability = 1 | 2 | 3;

export type Risk = {
  id: string;
  riskId: string;
  description: string;
  severity: RiskSeverity;
  probability: RiskProbability;
  mitigationPlan: string;
  residualRisk: string;
  contingencyPlan: string;
  isDeleted?: boolean;
  deletedAt?: string;
};

export type AssumptionStatus = 'Active' | 'Validated' | 'Invalidated';
export type AssumptionCategory = 'Technical' | 'Resource' | 'Business' | 'External';

export type Assumption = {
  id: string;
  assumptionId: string;
  description: string;
  category: AssumptionCategory;
  status: AssumptionStatus;
  validationDate?: string; // ISO String
  ownerId?: string;
  isDeleted?: boolean;
  deletedAt?: string;
};

export type IssueStatus = 'Open' | 'In Progress' | 'Resolved' | 'Closed';
export type IssuePriority = 'Low' | 'Medium' | 'High' | 'Critical';

export type Issue = {
  id: string;
  issueId: string;
  description: string;
  priority: IssuePriority;
  status: IssueStatus;
  reportedDate: string; // ISO String
  resolvedDate?: string; // ISO String
  assigneeId?: string;
  isDeleted?: boolean;
  deletedAt?: string;
};

export type DependencyStatus = 'On Track' | 'At Risk' | 'Blocked';
export type DependencyType = 'Internal' | 'External';

export type Dependency = {
  id: string;
  dependencyId: string;
  description: string;
  type: DependencyType;
  dependencyOn: string;
  expectedByDate: string; // ISO String
  status: DependencyStatus;
  ownerId?: string;
  isDeleted?: boolean;
  deletedAt?: string;
};

export type KanbanColumn = {
  id: string;
  name: string;
  order: number;
  isDefault: boolean;
  isDoneColumn: boolean;
};

export type Holiday = {
    id: string;
    date: string; // ISO String
    description: string;
};

export type ProjectSettings = {
    id: 'main';
    weeklyOffDays?: number[]; // 0 for Sunday, 6 for Saturday
    sprintDurationInWeeks?: number;
    sprintStartDay?: number; // 0 for Sunday, 1 for Monday etc.
    overrideGlobalHolidays?: boolean;
};

export type ImpactedSystemCategory = 'Technology' | 'Function';

export type ImpactedSystem = {
  id: string;
  name: string;
  description: string;
  category: ImpactedSystemCategory;
  explanation?: string;
  estimate?: number; // in man-days
  dailyBillingRate?: number;
};

export type ReleaseItemType = 'Release' | 'Stage' | 'Milestone';

export type Release = {
  id: string;
  releaseId: string;
  name: string;
  description: string;
  startDate?: string; // ISO String
  endDate?: string; // ISO String
  milestoneDate?: string; // ISO String
  itemType: ReleaseItemType;
  parentReleaseId?: string;
};

export type WorklogItem = {
  id: string; // Client-side UUID
  itemId: string; // Story ID, or special values like 'meeting'
  itemType: 'WorkItem' | 'Meeting' | 'Other';
  hours: number;
  description?: string; // Only for 'Other'
};

export type Worklog = {
  id: string; // employeeId-date (e.g., 'emp1-2024-07-25')
  employeeId: string;
  date: string; // ISO String
  items: Omit<WorklogItem, 'id'>[];
  totalHours: number;
};

export type WorklogSubmission = {
  id: string; // employeeId-weekStartDate (e.g., 'emp1-2024-07-21')
  employeeId: string;
  weekStartDate: string; // ISO string
  submittedAt: string; // ISO string
};

export type Portfolio = {
  id: string;
  name: string;
  description?: string;
  isDeleted?: boolean;
  deletedAt?: string; // ISO String
};

export type ProjectMethodology = 'Agile' | 'SDLC' | 'Hybrid';
export type PricingModel = 'Fixed Price' | 'T&M' | 'Fixed Capacity';
export type ProjectStatus = 'Not Started' | 'Active' | 'On Hold' | 'Completed' | 'Cancelled' | 'Initial Estimation';

export type Project = {
  id: string;
  name: string;
  description?: string;
  portfolioId: string;
  isDeleted?: boolean;
  deletedAt?: string; // ISO String
  summary?: string;
  projectManagerId?: string;
  methodology?: ProjectMethodology;
  pricingModel?: PricingModel;
  status?: ProjectStatus;
  startDate?: string; // ISO String
  endDate?: string; // ISO String
};

export type AccessControlSetting = {
  id: AccessLevel; // The access level itself is the ID
  pageAccess: Record<string, boolean>; // Key is page name, value is true/false
};

export type TrashedItem = {
  id: string;
  name: string;
  type: 'Portfolio' | 'Project' | 'User';
  deletedAt: string;
};

export type Horizontal = {
  id: string;
  name: string;
  weightage: number; // percentage
  isEnabled: boolean;
  dailyBillingRate?: number;
};

export type Environment = {
  id: string;
  name: string;
  order: number;
  url?: string;
  renewalDate?: string; // ISO String
};

export type ProjectDocument = {
  id: string;
  name: string;
  location: string;
  createdAt: string; // ISO String
};

export type PaymentMilestoneStatus = 'TBD' | 'In Progress' | 'Milestone completed' | 'Invoice raised' | 'Payment Completed';

export type PaymentMilestone = {
  id: string;
  milestoneId: string;
  name: string;
  billingPercentage: number;
  amount: number;
  status: PaymentMilestoneStatus;
  attachments?: string;
};

export type CodeRepository = {
  id: string;
  name: string;
  url: string;
  expiryDate?: string; // ISO String
};
