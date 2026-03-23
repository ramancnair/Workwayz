'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { Project, Risk, Issue, RiskSeverity, RiskProbability, IssuePriority, RagStatus, Portfolio } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { Circle } from 'lucide-react';

type EnrichedRisk = Risk & { projectName: string; projectId: string; };
type EnrichedIssue = Issue & { projectName: string; projectId: string; };

const getRiskPotential = (severity: RiskSeverity, probability: RiskProbability) => {
  const potential = severity * probability;
  if (potential <= 3) return 'Low';
  if (potential <= 6) return 'Medium';
  return 'High';
};

const getRiskPotentialClass = (severity: RiskSeverity, probability: RiskProbability) => {
  const potential = getRiskPotential(severity, probability);
  if (potential === 'Low') return 'bg-green-500';
  if (potential === 'Medium') return 'bg-yellow-500';
  return 'bg-red-500';
};


const issuePriorityStyles: Record<IssuePriority, string> = {
    'Low': 'bg-gray-400',
    'Medium': 'bg-yellow-500',
    'High': 'bg-orange-500',
    'Critical': 'bg-red-500',
};

const issueStatusStyles: Record<Issue['status'], string> = {
    'Open': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    'In Progress': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    'Resolved': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    'Closed': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

const ragStatusStyles: Record<RagStatus, string> = {
  'Green': 'text-green-500',
  'Amber': 'text-yellow-500',
  'Red': 'text-red-500',
};

function RiskItem({ item, onClick }: { item: EnrichedRisk; onClick: () => void }) {
    return (
        <div className="p-3 border-b last:border-b-0 cursor-pointer hover:bg-muted/50" onClick={onClick}>
            <div className="flex justify-between items-start">
                <p className="text-sm font-medium flex-1 pr-2">{item.description}</p>
                <div className="flex items-center gap-2">
                    <div className={cn("h-3 w-3 rounded-full", getRiskPotentialClass(item.severity, item.probability))} />
                    <span className="text-xs font-semibold">{getRiskPotential(item.severity, item.probability)}</span>
                </div>
            </div>
            <Badge variant="outline" className="mt-1">{item.projectName}</Badge>
        </div>
    );
}

function IssueItem({ item, onClick }: { item: EnrichedIssue; onClick: () => void }) {
    return (
         <div className="p-3 border-b last:border-b-0 cursor-pointer hover:bg-muted/50" onClick={onClick}>
            <div className="flex justify-between items-start">
                 <p className="text-sm font-medium flex-1 pr-2">{item.description}</p>
                 <div className="flex items-center gap-2">
                    <div className={cn("h-3 w-3 rounded-full", issuePriorityStyles[item.priority])} />
                    <span className="text-xs font-semibold">{item.priority}</span>
                </div>
            </div>
            <Badge variant="outline" className="mt-1">{item.projectName}</Badge>
        </div>
    )
}

function ProjectItem({ project }: { project: Project }) {
    return (
        <Link href={`/projects/${project.id}/project-details/project-synopsis`} className="block p-3 border-b last:border-b-0 hover:bg-muted/50">
            <div className="flex justify-between items-start">
                <p className="text-sm font-medium flex-1 pr-2">{project.name}</p>
                 <div className="flex items-center gap-2">
                    <Circle className={cn("h-4 w-4", project.overallStatus ? ragStatusStyles[project.overallStatus] : 'text-gray-300')} />
                    <span className="text-xs font-semibold">{project.overallStatus}</span>
                </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate">{project.statusComments}</p>
        </Link>
    );
}

function RiskDetailDialog({ risk, isOpen, onOpenChange }: { risk: EnrichedRisk | null; isOpen: boolean; onOpenChange: (open: boolean) => void; }) {
    if (!risk) return null;
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Risk Details ({risk.riskId})</DialogTitle>
                    <DialogDescription>Viewing risk from project: {risk.projectName}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4 text-sm">
                    <div>
                        <h4 className="font-semibold">Description</h4>
                        <p className="text-muted-foreground">{risk.description}</p>
                    </div>
                     <div>
                        <h4 className="font-semibold">Mitigation Plan</h4>
                        <p className="text-muted-foreground">{risk.mitigationPlan}</p>
                    </div>
                    <div>
                        <h4 className="font-semibold">Contingency Plan</h4>
                        <p className="text-muted-foreground">{risk.contingencyPlan}</p>
                    </div>
                </div>
                <DialogFooter>
                    <Link href={`/projects/${risk.projectId}/risks`}>
                        <Button>Go to Project</Button>
                    </Link>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function IssueDetailDialog({ issue, isOpen, onOpenChange }: { issue: EnrichedIssue | null; isOpen: boolean; onOpenChange: (open: boolean) => void; }) {
    if (!issue) return null;
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Issue Details ({issue.issueId})</DialogTitle>
                    <DialogDescription>Viewing issue from project: {issue.projectName}</DialogDescription>
                </DialogHeader>
                 <div className="space-y-4 py-4 text-sm">
                    <div>
                        <h4 className="font-semibold">Description</h4>
                        <p className="text-muted-foreground">{issue.description}</p>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <h4 className="font-semibold">Status</h4>
                            <Badge className={cn(issueStatusStyles[issue.status])}>{issue.status}</Badge>
                        </div>
                        <div>
                            <h4 className="font-semibold">Priority</h4>
                            <div className="flex items-center gap-2">
                                <div className={cn("h-3 w-3 rounded-full", issuePriorityStyles[issue.priority])} />
                                <span className="text-sm font-semibold">{issue.priority}</span>
                            </div>
                        </div>
                     </div>
                     <div>
                        <h4 className="font-semibold">Reported Date</h4>
                        <p className="text-muted-foreground">{format(new Date(issue.reportedDate), 'PPP')}</p>
                    </div>
                </div>
                <DialogFooter>
                     <Link href={`/projects/${issue.projectId}/issues`}>
                        <Button>Go to Project</Button>
                    </Link>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}


export default function CtoDashboardPage() {
  const [allRisks, setAllRisks] = useState<EnrichedRisk[]>([]);
  const [allIssues, setAllIssues] = useState<EnrichedIssue[]>([]);
  const [allActiveProjects, setAllActiveProjects] = useState<Project[]>([]);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [viewingRisk, setViewingRisk] = useState<EnrichedRisk | null>(null);
  const [viewingIssue, setViewingIssue] = useState<EnrichedIssue | null>(null);

  const filteredProjects = selectedPortfolioId === 'all' ? allActiveProjects : allActiveProjects.filter(p => p.portfolioId === selectedPortfolioId);
  const validProjectIds = new Set(filteredProjects.map(p => p.id));
  
  const redHealthProjects = filteredProjects.filter(p => p.overallStatus === 'Red');
  const highRisks = allRisks.filter(r => validProjectIds.has(r.projectId));
  const criticalIssues = allIssues.filter(i => validProjectIds.has(i.projectId));

  useEffect(() => {
    const fetchData = async () => {
      if (!db) return;
      setIsLoading(true);

      try {
        const portfoliosQuery = query(collection(db, 'portfolios'), where('isDeleted', '!=', true));
        const portfoliosSnapshot = await getDocs(portfoliosQuery);
        setPortfolios(portfoliosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Portfolio)));

        const projectsQuery = query(collection(db, 'projects'), where('status', '==', 'Active'));
        const projectsSnapshot = await getDocs(projectsQuery);
        const activeProjects = projectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
        
        setAllActiveProjects(activeProjects);

        const fetchedRisks: EnrichedRisk[] = [];
        const fetchedIssues: EnrichedIssue[] = [];

        for (const project of activeProjects) {
            // Fetch risks for the project
            const risksSnapshot = await getDocs(collection(db, 'projects', project.id, 'risks'));
            risksSnapshot.forEach(doc => {
                const risk = doc.data() as Risk;
                if (getRiskPotential(risk.severity, risk.probability) === 'High') {
                    fetchedRisks.push({ ...risk, id: doc.id, projectName: project.name, projectId: project.id });
                }
            });

            // Fetch issues for the project
            const issuesSnapshot = await getDocs(collection(db, 'projects', project.id, 'issues'));
            issuesSnapshot.forEach(doc => {
                const data = doc.data();
                 const issue = {
                    ...data,
                    reportedDate: data.reportedDate?.toDate ? data.reportedDate.toDate().toISOString() : data.reportedDate,
                 } as Issue;

                 if (['Critical', 'High'].includes(issue.priority)) {
                    fetchedIssues.push({ ...issue, id: doc.id, projectName: project.name, projectId: project.id });
                }
            });
        }
        
        setAllRisks(fetchedRisks);
        setAllIssues(fetchedIssues.sort((a,b) => (a.priority === 'Critical' ? -1 : 1)));


      } catch (error) {
        console.error("Error fetching CTO dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <>
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader title="CTO Dashboard" description="High-level overview of all portfolios and projects.">
        <Select value={selectedPortfolioId} onValueChange={setSelectedPortfolioId}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select Portfolio" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Portfolios</SelectItem>
            {portfolios.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PageHeader>
      
      {isLoading ? (
        <p>Loading dashboard data...</p>
      ) : (
        <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>High Potential Risks</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-full max-h-[50vh] pr-4">
                            {highRisks.length > 0 ? (
                                highRisks.map((risk, index) => <RiskItem key={index} item={risk} onClick={() => setViewingRisk(risk)} />)
                            ) : (
                                <p className="text-muted-foreground text-center py-10">No high potential risks found in active projects.</p>
                            )}
                        </ScrollArea>
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle>Critical & High Priority Issues</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-full max-h-[50vh] pr-4">
                            {criticalIssues.length > 0 ? (
                               criticalIssues.map((issue, index) => <IssueItem key={index} item={issue} onClick={() => setViewingIssue(issue)} />)
                            ) : (
                                <p className="text-muted-foreground text-center py-10">No critical or high priority issues found in active projects.</p>
                            )}
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Red Health Projects</CardTitle>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-full max-h-[50vh] pr-4">
                        {redHealthProjects.length > 0 ? (
                           redHealthProjects.map((project) => <ProjectItem key={project.id} project={project} />)
                        ) : (
                            <p className="text-muted-foreground text-center py-10">No projects with red health status.</p>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
      )}
    </div>
    
    <RiskDetailDialog 
        risk={viewingRisk} 
        isOpen={!!viewingRisk} 
        onOpenChange={(open) => !open && setViewingRisk(null)}
    />
    <IssueDetailDialog 
        issue={viewingIssue} 
        isOpen={!!viewingIssue} 
        onOpenChange={(open) => !open && setViewingIssue(null)}
    />
    </>
  );
}
