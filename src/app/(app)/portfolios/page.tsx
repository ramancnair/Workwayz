
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, getDocs, where, query, writeBatch, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/PageHeader';
import { type Portfolio } from '@/types';
import { deleteProjectAndSubcollections } from '@/lib/firebase-helpers';

const portfolioSchema = z.object({
  name: z.string().min(1, 'Portfolio name is required.'),
  description: z.string().optional(),
});

export default function PortfoliosPage() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPortfolio, setEditingPortfolio] = useState<Portfolio | null>(null);
  const [deletingPortfolio, setDeletingPortfolio] = useState<Portfolio | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof portfolioSchema>>({
    resolver: zodResolver(portfolioSchema),
    defaultValues: { name: '', description: '' },
  });

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, 'portfolios'), where('isDeleted', '!=', true));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const portfoliosData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Portfolio, 'id'>),
      }));
      setPortfolios(portfoliosData);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isDialogOpen) {
      if (editingPortfolio) {
        form.reset(editingPortfolio);
      } else {
        form.reset({ name: '', description: '' });
      }
    }
  }, [isDialogOpen, editingPortfolio, form]);

  const onSubmit = async (values: z.infer<typeof portfolioSchema>) => {
    if (!db) return;
    try {
      if (editingPortfolio) {
        const portfolioRef = doc(db, 'portfolios', editingPortfolio.id);
        await updateDoc(portfolioRef, values);
        toast({ title: 'Success', description: 'Portfolio updated successfully.' });
      } else {
        await addDoc(collection(db, 'portfolios'), { ...values, isDeleted: false });
        toast({ title: 'Success', description: 'Portfolio created successfully.' });
      }
      setEditingPortfolio(null);
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error saving portfolio:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not save portfolio.' });
    }
  };

  const handleDeletePortfolio = async () => {
    if (!deletingPortfolio || !db) return;
    try {
        const batch = writeBatch(db);
        const deletionTime = Timestamp.now();
        
        // Find all projects in the portfolio
        const projectsQuery = query(collection(db, 'projects'), where('portfolioId', '==', deletingPortfolio.id));
        const projectsSnapshot = await getDocs(projectsQuery);
        
        // Soft delete each project
        projectsSnapshot.forEach(projectDoc => {
            batch.update(projectDoc.ref, { isDeleted: true, deletedAt: deletionTime });
        });
        
        // Soft delete the portfolio document itself
        const portfolioRef = doc(db, 'portfolios', deletingPortfolio.id);
        batch.update(portfolioRef, { isDeleted: true, deletedAt: deletionTime });

        await batch.commit();

        toast({ title: 'Success', description: `Portfolio "${deletingPortfolio.name}" and its projects moved to Trash.` });
    } catch (error) {
        console.error('Error deleting portfolio:', error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not delete portfolio and its projects.' });
    } finally {
        setDeletingPortfolio(null);
    }
  };

  return (
    <>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <PageHeader title="Portfolios" description="Create, edit, and organize your project portfolios.">
          <Button onClick={() => { setEditingPortfolio(null); setIsDialogOpen(true); }}>
            <PlusCircle className="mr-2 h-4 w-4" />
            New Portfolio
          </Button>
        </PageHeader>
        
        <Card>
            <CardContent className="p-6">
            {isLoading ? (
              <p className="text-center">Loading portfolios...</p>
            ) : (
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Portfolio Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {portfolios.map((portfolio) => (
                    <TableRow key={portfolio.id}>
                        <TableCell className="font-medium">{portfolio.name}</TableCell>
                        <TableCell>{portfolio.description}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => { setEditingPortfolio(portfolio); setIsDialogOpen(true); }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeletingPortfolio(portfolio)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
            )}
            </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPortfolio ? 'Edit Portfolio' : 'Create New Portfolio'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Portfolio Name</FormLabel>
                    <FormControl>
                      <Input placeholder="E.g., Core Banking Solutions" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Describe this portfolio..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit">{editingPortfolio ? 'Save Changes' : 'Create Portfolio'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingPortfolio} onOpenChange={(isOpen) => !isOpen && setDeletingPortfolio(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will move the portfolio "{deletingPortfolio?.name}" and all of its associated projects to the Trash. They will be permanently deleted after 30 days.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeletePortfolio}
              className={cn(buttonVariants({ variant: 'destructive' }))}
            >
              Move to Trash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
