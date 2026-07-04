

'use client';

import { useState, useMemo } from 'react';
import { useProject } from '@/context/ProjectContext';
import { PageHeader } from '@/components/PageHeader';
import { Button, buttonVariants } from '@/components/ui/button';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from '@/components/ui/checkbox';
import { differenceInDays, formatDistanceToNow, parseISO } from 'date-fns';
import { BookOpen, Bug, CheckSquare, GitCommit, ClipboardCheck, ShieldAlert, NotebookText, AlertCircle, Link2 } from 'lucide-react';

type TrashedItemType = 'Story' | 'Task' | 'Bug' | 'Feature Change' | 'Test Case' | 'Risk' | 'Assumption' | 'Issue' | 'Dependency' | 'Sub Task';
type CollectionName = 'stories' | 'testCases' | 'risks' | 'assumptions' | 'issues' | 'dependencies';

type TrashedItem = {
  id: string;
  name: string;
  type: TrashedItemType;
  deletedAt: string;
  collection: CollectionName;
};

const itemTypeIcons: Partial<Record<TrashedItemType, React.ElementType>> = {
  'Story': BookOpen,
  'Bug': Bug,
  'Task': CheckSquare,
  'Sub Task': CheckSquare,
  'Feature Change': GitCommit,
  'Test Case': ClipboardCheck,
  'Risk': ShieldAlert,
  'Assumption': NotebookText,
  'Issue': AlertCircle,
  'Dependency': Link2,
};

export default function ProjectTrashPage() {
  const { 
    stories, 
    testCases, 
    risks,
    assumptions,
    issues,
    dependencies,
    restoreItem, 
    permanentlyDeleteItem 
  } = useProject();
  const { toast } = useToast();
  const [selectedItems, setSelectedItems] = useState<TrashedItem[]>([]);
  const [actionType, setActionType] = useState<'restore' | 'delete' | null>(null);

  const trashedItems = useMemo(() => {
    const deletedStories = stories
      .filter(s => s.isDeleted && s.deletedAt)
      .map(s => ({
        id: s.id,
        name: s.title,
        type: s.itemType === 'Requirement/Story' ? 'Story' : s.itemType,
        deletedAt: s.deletedAt!,
        collection: 'stories' as 'stories',
      }));
      
    const deletedTestCases = testCases
      .filter(tc => tc.isDeleted && tc.deletedAt)
      .map(tc => ({
        id: tc.id,
        name: tc.title,
        type: 'Test Case' as 'Test Case',
        deletedAt: tc.deletedAt!,
        collection: 'testCases' as 'testCases',
      }));

    const deletedRisks = risks
      .filter(r => r.isDeleted && r.deletedAt)
      .map(r => ({
        id: r.id,
        name: r.description,
        type: 'Risk' as 'Risk',
        deletedAt: r.deletedAt!,
        collection: 'risks' as 'risks',
      }));
      
    const deletedAssumptions = assumptions
      .filter(a => a.isDeleted && a.deletedAt)
      .map(a => ({
        id: a.id,
        name: a.description,
        type: 'Assumption' as 'Assumption',
        deletedAt: a.deletedAt!,
        collection: 'assumptions' as 'assumptions',
      }));
    
    const deletedIssues = issues
      .filter(i => i.isDeleted && i.deletedAt)
      .map(i => ({
        id: i.id,
        name: i.description,
        type: 'Issue' as 'Issue',
        deletedAt: i.deletedAt!,
        collection: 'issues' as 'issues',
      }));

    const deletedDependencies = dependencies
      .filter(d => d.isDeleted && d.deletedAt)
      .map(d => ({
        id: d.id,
        name: d.description,
        type: 'Dependency' as 'Dependency',
        deletedAt: d.deletedAt!,
        collection: 'dependencies' as 'dependencies',
      }));

    return [...deletedStories, ...deletedTestCases, ...deletedRisks, ...deletedAssumptions, ...deletedIssues, ...deletedDependencies]
      .sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
  }, [stories, testCases, risks, assumptions, issues, dependencies]);

  const handleSelectAll = (checked: boolean) => {
    setSelectedItems(checked ? trashedItems : []);
  };

  const handleSelectItem = (item: TrashedItem, checked: boolean) => {
    setSelectedItems(prev => 
      checked ? [...prev, item] : prev.filter(i => i.id !== item.id)
    );
  };
  
  const handleAction = async () => {
    if (selectedItems.length === 0 || !actionType) return;
    
    const isRestore = actionType === 'restore';
    let successCount = 0;

    for (const item of selectedItems) {
      const success = isRestore 
        ? await restoreItem(item.id, item.collection)
        : await permanentlyDeleteItem(item.id, item.collection);
      if (success) successCount++;
    }

    if (successCount > 0) {
      toast({
        title: 'Success',
        description: `${successCount} of ${selectedItems.length} item(s) have been ${isRestore ? 'restored' : 'permanently deleted'}.`
      });
    }

    if (successCount < selectedItems.length) {
       toast({
        variant: 'destructive',
        title: 'Error',
        description: `Could not ${actionType} ${selectedItems.length - successCount} item(s).`
      });
    }

    setSelectedItems([]);
    setActionType(null);
  };


  const isAllSelected = trashedItems.length > 0 && selectedItems.length === trashedItems.length;

  const dialogTitle = actionType === 'restore' ? 'Restore Items?' : 'Delete Forever?';
  const dialogDescription = actionType === 'restore' 
      ? `Are you sure you want to restore the selected ${selectedItems.length} item(s)?`
      : `This action cannot be undone. This will permanently delete the selected ${selectedItems.length} item(s).`;

  return (
    <>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <PageHeader title="Project Trash" description="Deleted items are permanently removed after 30 days.">
            <Button variant="outline" onClick={() => setActionType('restore')} disabled={selectedItems.length === 0}>Restore</Button>
            <Button variant="destructive" onClick={() => setActionType('delete')} disabled={selectedItems.length === 0}>Delete Forever</Button>
        </PageHeader>
        <Card>
          <CardContent className="p-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox 
                        onCheckedChange={handleSelectAll}
                        checked={isAllSelected}
                        aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Deleted</TableHead>
                  <TableHead>Time Left</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trashedItems.length > 0 ? trashedItems.map(item => {
                  const deletedDate = parseISO(item.deletedAt);
                  const daysLeft = 30 - differenceInDays(new Date(), deletedDate);
                  const isSelected = selectedItems.some(i => i.id === item.id);
                  const Icon = itemTypeIcons[item.type as keyof typeof itemTypeIcons];

                  return (
                    <TableRow key={item.id} data-state={isSelected ? "selected" : ""}>
                      <TableCell>
                          <Checkbox 
                              checked={isSelected}
                              onCheckedChange={(checked) => handleSelectItem(item, !!checked)}
                              aria-label={`Select ${item.name}`}
                          />
                      </TableCell>
                      <TableCell className="font-medium truncate max-w-xs">{item.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
                          {item.type}
                        </div>
                      </TableCell>
                      <TableCell>{formatDistanceToNow(deletedDate, { addSuffix: true })}</TableCell>
                      <TableCell>{daysLeft > 0 ? `${daysLeft} days` : 'Deleting soon'}</TableCell>
                    </TableRow>
                  )
                }) : (
                  <TableRow>
                      <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">The trash is empty.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

       <AlertDialog open={!!actionType} onOpenChange={(isOpen) => !isOpen && setActionType(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{dialogTitle}</AlertDialogTitle>
                <AlertDialogDescription>
                  {dialogDescription}
                </AlertDialogDescription>
                <ul className="mt-2 list-disc list-outside pl-5 text-sm text-muted-foreground max-h-40 overflow-y-auto space-y-1">
                  {selectedItems.map(i => (
                    <li key={i.id} className="break-words">
                      {i.name} ({i.type})
                    </li>
                  ))}
                </ul>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                    onClick={handleAction}
                    className={cn(actionType === 'delete' && buttonVariants({ variant: 'destructive' }))}
                >
                    {actionType === 'restore' ? 'Restore' : 'Delete Forever'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
}
