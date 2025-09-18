
'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Project, Risk, Issue, RiskSeverity, RiskProbability, IssuePriority } from '@/types';

type EnrichedRisk = Risk & { projectName: string };
type EnrichedIssue = Issue & { projectName: string };

const getRiskPotential = (severity: RiskSeverity, probability: RiskProbability) => {
  const potential = severity * probability;
  if (potential <= 3) return 'Low';
  if (potential <= 6) return 'Medium';
  return 'High';
};

const issuePriorityStyles: Record<IssuePriority, string> = {
    'Low': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    'Medium': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    'High': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    'Critical': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};


function RiskItem({ item }: { item: EnrichedRisk }) {
    return (
        <div className="p-3 border-b last:border-b-0">
            <p className="text-sm font-medium">{item.description}</p>
            <Badge variant="outline" className="mt-1">{item.projectName}</Badge>
        </div>
    );
}

function IssueItem({ item }: { item: EnrichedIssue }) {
    return (
         <div className="p-3 border-b last:border-b-0">
            <div className="flex justify-between items-start">
                 <p className="text-sm font-medium flex-1 pr-2">{item.description}</p>
                 <Badge className={cn(issuePriorityStyles[item.priority])}>{item.priority}</Badge>
            </div>
            <Badge variant="outline" className="mt-1">{item.projectName}</Badge>
        </div>
    )
}

export default function CtoDashboardPage() {
  const [highRisks, setHighRisks] = useState<EnrichedRisk[]>([]);
  const [criticalIssues, setCriticalIssues] = useState<EnrichedIssue[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!db) return;
      setIsLoading(true);

      try {
        const projectsQuery = query(collection(db, 'projects'), where('status', '==', 'Active'));
        const projectsSnapshot = await getDocs(projectsQuery);
        const activeProjects = projectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));

        const allRisks: EnrichedRisk[] = [];
        const allIssues: EnrichedIssue[] = [];

        for (const project of activeProjects) {
            // Fetch risks for the project
            const risksSnapshot = await getDocs(collection(db, 'projects', project.id, 'risks'));
            risksSnapshot.forEach(doc => {
                const risk = doc.data() as Risk;
                if (getRiskPotential(risk.severity, risk.probability) === 'High') {
                    allRisks.push({ ...risk, projectName: project.name });
                }
            });

            // Fetch issues for the project
            const issuesSnapshot = await getDocs(collection(db, 'projects', project.id, 'issues'));
            issuesSnapshot.forEach(doc => {
                const issue = doc.data() as Issue;
                 if (['Critical', 'High'].includes(issue.priority)) {
                    allIssues.push({ ...issue, projectName: project.name });
                }
            });
        }
        
        setHighRisks(allRisks);
        setCriticalIssues(allIssues.sort((a,b) => (a.priority === 'Critical' ? -1 : 1)));


      } catch (error) {
        console.error("Error fetching CTO dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader title="CTO Dashboard" description="High-level overview of all portfolios and projects." />
      
      {isLoading ? (
        <p>Loading dashboard data...</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>High Potential Risks</CardTitle>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-full max-h-[50vh] pr-4">
                        {highRisks.length > 0 ? (
                            highRisks.map((risk, index) => <RiskItem key={index} item={risk} />)
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
                           criticalIssues.map((issue, index) => <IssueItem key={index} item={issue} />)
                        ) : (
                            <p className="text-muted-foreground text-center py-10">No critical or high priority issues found in active projects.</p>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
      )}
    </div>
  );
}
