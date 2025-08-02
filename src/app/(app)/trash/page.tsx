
'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, writeBatch, getDocs, deleteDoc, collectionGroup, orderBy } from 'firebase/firestore';
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

export default function TrashPage() {
    const [trashedItems, setTrashedItems] = useState<TrashedItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();
    const [itemToRestore, setItemToRestore] = useState<TrashedItem | null>(null);
    const [itemToDeleteForever, setItemToDeleteForever] = useState<TrashedItem | null>(null);

    useEffect(() => {
        if (!db) return;
        
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const collectionsToQuery = ['portfolios', 'projects', 'employees'];
        const unsubscribers = collectionsToQuery.map(collectionName => {
            const q = query(collection(db, collectionName), where('isDeleted', '==', true));
            
            return onSnapshot(q, (querySnapshot) => {
                const batch = writeBatch(db);
                let itemsToDelete = false;

                querySnapshot.docs.forEach(docSnap => {
                    const data = docSnap.data();
                    if (data.deletedAt && parseISO(data.deletedAt.toDate().toISOString()) < thirtyDaysAgo) {
                        itemsToDelete = true;
                        if(collectionName === 'portfolios') {
                            // This needs full project and sub-collection deletion logic
                        } else {
                           batch.delete(docSnap.ref);
                        }
                    }
                });

                if (itemsToDelete) {
                    batch.commit().then(() => {
                        toast({ title: 'Cleanup', description: 'Permanently removed items older than 30 days from trash.' });
                    }).catch(e => console.error("Error during auto-deletion cleanup:", e));
                }

                // We refetch all items after potential cleanup
                Promise.all(collectionsToQuery.map(async cName => {
                    const trashQuery = query(collection(db, cName), where('isDeleted', '==', true), orderBy('deletedAt', 'desc'));
                    const snapshot = await getDocs(trashQuery);
                    return snapshot.docs.map(d => {
                        const data = d.data();
                        const name = cName === 'employees' ? `${data.firstName} ${data.lastName}` : data.name;
                        const type = cName === 'portfolios' ? 'Portfolio' : (cName === 'projects' ? 'Project' : 'User');
                        return { id: d.id, name: name, type, deletedAt: data.deletedAt.toDate().toISOString() };
                    })
                })).then(allTrashed => {
                    const flattened = allTrashed.flat().sort((a, b) => parseISO(b.deletedAt).getTime() - parseISO(a.deletedAt).getTime());
                    setTrashedItems(flattened);
                    setIsLoading(false);
                });
            });
        });

        return () => unsubscribers.forEach(unsub => unsub());
    }, [toast]);

    const getCollectionName = (type: TrashedItem['type']) => {
        switch (type) {
            case 'Portfolio': return 'portfolios';
            case 'Project': return 'projects';
            case 'User': return 'employees';
        }
    };
    
    const handleRestore = async () => {
        if (!itemToRestore || !db) return;
        
        try {
            const collectionName = getCollectionName(itemToRestore.type);
            const itemRef = doc(db, collectionName, itemToRestore.id);
            await updateDoc(itemRef, { isDeleted: false, deletedAt: null });

            // If restoring a portfolio, we should also restore its projects
            if (itemToRestore.type === 'Portfolio') {
                const projectsQuery = query(collection(db, 'projects'), where('portfolioId', '==', itemToRestore.id), where('isDeleted', '==', true));
                const projectsSnapshot = await getDocs(projectsQuery);
                const batch = writeBatch(db);
                projectsSnapshot.forEach(projectDoc => {
                    batch.update(projectDoc.ref, { isDeleted: false, deletedAt: null });
                });
                await batch.commit();
            }

            toast({ title: 'Success', description: `${itemToRestore.type} "${itemToRestore.name}" has been restored.` });
        } catch (error) {
            console.error("Error restoring item:", error);
            toast({ variant: 'destructive', title: 'Error', description: `Could not restore ${itemToRestore.type}.` });
        } finally {
            setItemToRestore(null);
        }
    };
    
    const handleDeleteForever = async () => {
        if (!itemToDeleteForever || !db) return;
        try {
            if (itemToDeleteForever.type === 'Portfolio') {
                const projectsQuery = query(collection(db, 'projects'), where('portfolioId', '==', itemToDeleteForever.id));
                const projectsSnapshot = await getDocs(projectsQuery);
                for(const projectDoc of projectsSnapshot.docs) {
                    await deleteProjectAndSubcollections(projectDoc.id);
                }
                await deleteDoc(doc(db, 'portfolios', itemToDeleteForever.id));

            } else if (itemToDeleteForever.type === 'Project') {
                await deleteProjectAndSubcollections(itemToDeleteForever.id);
            } else { // User
                await deleteDoc(doc(db, 'employees', itemToDeleteForever.id));
            }

            toast({ title: 'Success', description: `${itemToDeleteForever.type} "${itemToDeleteForever.name}" has been permanently deleted.` });

        } catch (error) {
             console.error("Error permanently deleting item:", error);
             toast({ variant: 'destructive', title: 'Error', description: `Could not permanently delete ${itemToDeleteForever.type}.` });
        } finally {
            setItemToDeleteForever(null);
        }
    };

    return (
        <>
            <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                <PageHeader title="Trash" description="Items are permanently deleted after 30 days." />
                <Card>
                    <CardContent className="p-4">
                         {isLoading ? (
                          <p className="text-center">Loading trash...</p>
                        ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Deleted</TableHead>
                                    <TableHead>Time Left</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {trashedItems.length > 0 ? trashedItems.map((item) => {
                                    const deletedDate = parseISO(item.deletedAt);
                                    const daysLeft = 30 - differenceInDays(new Date(), deletedDate);
                                    return (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">{item.name}</TableCell>
                                            <TableCell>{item.type}</TableCell>
                                            <TableCell>{formatDistanceToNow(deletedDate, { addSuffix: true })}</TableCell>
                                            <TableCell>{daysLeft > 0 ? `${daysLeft} days` : 'Deleting soon'}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="outline" size="sm" onClick={() => setItemToRestore(item)}>Restore</Button>
                                                <Button variant="destructive" size="sm" className="ml-2" onClick={() => setItemToDeleteForever(item)}>
                                                    Delete Forever
                                                </Button>
                                            </TableCell>
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
             <AlertDialog open={!!itemToRestore} onOpenChange={(isOpen) => !isOpen && setItemToRestore(null)}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Restore Item?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to restore the {itemToRestore?.type} "{itemToRestore?.name}"?
                      {itemToRestore?.type === 'Portfolio' && " This will also restore its associated projects."}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRestore}>Restore</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <AlertDialog open={!!itemToDeleteForever} onOpenChange={(isOpen) => !isOpen && setItemToDeleteForever(null)}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Forever?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the {itemToDeleteForever?.type} "{itemToDeleteForever?.name}" and all its associated data.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                        onClick={handleDeleteForever}
                        className={cn(buttonVariants({ variant: 'destructive' }))}
                    >
                        Delete Forever
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
