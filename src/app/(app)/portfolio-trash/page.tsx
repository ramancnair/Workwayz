'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/db-provider';
import { collection, query, where, onSnapshot, doc, updateDoc, writeBatch, getDocs, deleteDoc, collectionGroup, orderBy, Timestamp, getDoc } from '@/lib/db-provider';
import { PageHeader } from '@/components/PageHeader';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { type TrashedItem, type Portfolio, type Project, type User } from '@/types';
import { differenceInDays, formatDistanceToNow, parseISO } from 'date-fns';
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
import { deleteProjectAndSubcollections } from '@/lib/firebase-helpers';
import { Checkbox } from '@/components/ui/checkbox';

export default function PortfolioTrashPage() {
    const [trashedItems, setTrashedItems] = useState<TrashedItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();
    const [selectedItems, setSelectedItems] = useState<TrashedItem[]>([]);
    const [actionType, setActionType] = useState<'restore' | 'delete' | null>(null);

    useEffect(() => {
        if (!db) return;
        
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const collectionsToQuery = ['portfolios', 'projects', 'employees'];
        
        const fetchAndSetData = () => {
             Promise.all(collectionsToQuery.map(async cName => {
                const trashQuery = query(collection(db, cName), where('isDeleted', '==', true));
                const snapshot = await getDocs(trashQuery);
                 return snapshot.docs.map((d: any) => {
                    const data = d.data();
                    if (!data.deletedAt) return null; // Skip items without a deletion date
                    
                    // Auto-delete logic
                    if (data.deletedAt.toDate() < thirtyDaysAgo) {
                        // This will be handled by a scheduled function in a real app
                        // For now, we'll just filter them out from the view
                        return null;
                    }

                    const name = cName === 'employees' ? `${data.firstName} ${data.lastName}` : data.name;
                    const type: any = cName === 'portfolios' ? 'Portfolio' : (cName === 'projects' ? 'Project' : 'User');
                    return { id: d.id, name: name, type, deletedAt: data.deletedAt.toDate().toISOString() };
                }).filter(Boolean) as TrashedItem[]; // filter(Boolean) removes nulls
            })).then(allTrashed => {
                const flattened = allTrashed.flat().sort((a, b) => parseISO(b.deletedAt).getTime() - parseISO(a.deletedAt).getTime());
                setTrashedItems(flattened);
                setIsLoading(false);
            }).catch(e => {
                console.error("Error fetching trashed items:", e);
                setError(e.message);
                setIsLoading(false);
            });
        };
        
        // Initial fetch
        fetchAndSetData();

        // Set up listeners to refetch when data changes
        const unsubscribers = collectionsToQuery.map(collectionName => {
            const q = query(collection(db, collectionName), where('isDeleted', '==', true));
            return onSnapshot(q, fetchAndSetData, (error: any) => {
                 console.error(`Error listening to ${collectionName}:`, error);
                 setError(`Failed to listen for updates in ${collectionName}.`);
            });
        });

        return () => unsubscribers.forEach(unsub => unsub());
    }, [toast]);
    
    const [error, setError] = useState<string | null>(null);
    if (error) {
        return <div className="p-8 text-red-500">Error: {error} <br /> This is likely due to a missing Firestore index. Please check the developer console for a link to create it.</div>;
    }


    const getCollectionName = (type: TrashedItem['type']) => {
        switch (type) {
            case 'Portfolio': return 'portfolios';
            case 'Project': return 'projects';
            case 'User': return 'employees';
        }
    };
    
    const handleRestore = async () => {
        if (selectedItems.length === 0 || !db) return;
        
        try {
            const batch = writeBatch(db);
            for (const item of selectedItems) {
                const collectionName = getCollectionName(item.type);
                const itemRef = doc(db, collectionName, item.id);
                batch.update(itemRef, { isDeleted: false, deletedAt: null });

                if (item.type === 'Portfolio') {
                    const projectsQuery = query(collection(db, 'projects'), where('portfolioId', '==', item.id), where('isDeleted', '==', true));
                    const projectsSnapshot = await getDocs(projectsQuery);
                    projectsSnapshot.forEach((projectDoc: any) => {
                        batch.update(projectDoc.ref, { isDeleted: false, deletedAt: null });
                    });
                }
            }
            await batch.commit();
            toast({ title: 'Success', description: `${selectedItems.length} item(s) have been restored.` });
        } catch (error) {
            console.error("Error restoring items:", error);
            toast({ variant: 'destructive', title: 'Error', description: `Could not restore selected items.` });
        } finally {
            setSelectedItems([]);
            setActionType(null);
        }
    };
    
    const handleDeleteForever = async () => {
        if (selectedItems.length === 0 || !db) return;
        try {
             for (const item of selectedItems) {
                if (item.type === 'Portfolio') {
                    const projectsQuery = query(collection(db, 'projects'), where('portfolioId', '==', item.id));
                    const projectsSnapshot = await getDocs(projectsQuery);
                    for(const projectDoc of projectsSnapshot.docs) {
                        await deleteProjectAndSubcollections(projectDoc.id);
                    }
                    await deleteDoc(doc(db, 'portfolios', item.id));

                } else if (item.type === 'Project') {
                    await deleteProjectAndSubcollections(item.id);
                } else { // User
                    const userDoc = await getDoc(doc(db, 'employees', item.id));
                    if (userDoc.exists()) {
                        const email = userDoc.data().email;
                        if (email) {
                            try {
                                await fetch(`/api/users?email=${encodeURIComponent(email)}`, { method: 'DELETE' });
                            } catch (e) {
                                console.error("Failed to delete identity from auth pool:", e);
                            }
                        }
                    }
                    await deleteDoc(doc(db, 'employees', item.id));
                }
            }
            toast({ title: 'Success', description: `${selectedItems.length} item(s) have been permanently deleted.` });

        } catch (error) {
             console.error("Error permanently deleting items:", error);
             toast({ variant: 'destructive', title: 'Error', description: `Could not permanently delete selected items.` });
        } finally {
            setSelectedItems([]);
            setActionType(null);
        }
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedItems(trashedItems);
        } else {
            setSelectedItems([]);
        }
    };

    const handleSelectItem = (item: TrashedItem, checked: boolean) => {
        if (checked) {
            setSelectedItems(prev => [...prev, item]);
        } else {
            setSelectedItems(prev => prev.filter(i => i.id !== item.id));
        }
    };

    useEffect(() => {
        setSelectedItems(prev => prev.filter(item => trashedItems.some(ti => ti.id === item.id)));
    }, [trashedItems]);

    const isAllSelected = trashedItems.length > 0 && selectedItems.length === trashedItems.length;

    const dialogTitle = actionType === 'restore' ? 'Restore Items?' : 'Delete Forever?';
    const dialogDescription = actionType === 'restore' 
        ? `Are you sure you want to restore the selected ${selectedItems.length} item(s)? Portfolios will also have their projects restored.`
        : `This action cannot be undone. This will permanently delete the selected ${selectedItems.length} item(s) and all associated data.`;
    const dialogAction = actionType === 'restore' ? handleRestore : handleDeleteForever;


    return (
        <>
            <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                <PageHeader title="Portfolio Trash" description="Items are permanently deleted after 30 days.">
                    <Button variant="outline" onClick={() => setActionType('restore')} disabled={selectedItems.length === 0}>Restore</Button>
                    <Button variant="destructive" onClick={() => setActionType('delete')} disabled={selectedItems.length === 0}>Delete Forever</Button>
                </PageHeader>
                <Card>
                    <CardContent className="p-4">
                         {isLoading ? (
                          <p className="text-center">Loading trash...</p>
                        ) : (
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
                                {trashedItems.length > 0 ? trashedItems.map((item) => {
                                    const deletedDate = parseISO(item.deletedAt);
                                    const daysLeft = 30 - differenceInDays(new Date(), deletedDate);
                                    const isSelected = selectedItems.some(i => i.id === item.id);
                                    return (
                                        <TableRow key={item.id} data-state={isSelected ? "selected" : ""}>
                                            <TableCell>
                                                <Checkbox 
                                                    checked={isSelected}
                                                    onCheckedChange={(checked) => handleSelectItem(item, !!checked)}
                                                    aria-label={`Select ${item.name}`}
                                                />
                                            </TableCell>
                                            <TableCell className="font-medium">{item.name}</TableCell>
                                            <TableCell>{item.type}</TableCell>
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
                        )}
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
                        onClick={dialogAction}
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
