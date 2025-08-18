
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useProject } from '@/context/ProjectContext';
import { PageHeader } from '@/components/PageHeader';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { PlusCircle, Edit, Trash2, Link as LinkIcon } from 'lucide-react';
import { type ProjectDocument } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';

const documentSchema = z.object({
  name: z.string().min(1, 'Document name is required.'),
  location: z.string().url('Please enter a valid URL.'),
});

const standardDocs = [
  'SOW',
  'Requirements',
  'HLD/DD',
  'UI/UX Designs',
  'Lessons learned',
  'Status Reports',
  'BCP',
  'GIT',
  'Closure',
];

export default function DocumentsPage() {
  const { documents, addDocument, updateDocument, deleteDocument } = useProject();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<ProjectDocument | null>(null);
  const [deletingDocument, setDeletingDocument] = useState<ProjectDocument | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [docNameInput, setDocNameInput] = useState('');

  const form = useForm<z.infer<typeof documentSchema>>({
    resolver: zodResolver(documentSchema),
    defaultValues: { name: '', location: '' },
  });

  useEffect(() => {
    if (isDialogOpen) {
      if (editingDocument) {
        form.reset(editingDocument);
        setDocNameInput(editingDocument.name);
      } else {
        form.reset({ name: '', location: '' });
        setDocNameInput('');
      }
    }
  }, [isDialogOpen, editingDocument, form]);

  const handleDialogOpen = (doc: ProjectDocument | null) => {
    setEditingDocument(doc);
    setIsDialogOpen(true);
  };
  
  const handleDeleteConfirm = async () => {
    if (!deletingDocument) return;
    const success = await deleteDocument(deletingDocument.id);
    if (success) {
      toast({ title: "Success", description: "Document deleted." });
    } else {
      toast({ variant: "destructive", title: "Error", description: "Could not delete document." });
    }
    setDeletingDocument(null);
  };
  
  const onSubmit = async (values: z.infer<typeof documentSchema>) => {
    setIsSubmitting(true);
    
    const success = editingDocument
      ? await updateDocument(editingDocument.id, values)
      : await addDocument(values);

    if (success) {
      toast({ title: "Success", description: `Document ${editingDocument ? 'updated' : 'added'} successfully.` });
      setIsDialogOpen(false);
    } else {
      toast({ variant: "destructive", title: "Error", description: `Could not ${editingDocument ? 'update' : 'add'} document.` });
    }
    setIsSubmitting(false);
  };

  return (
    <>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <PageHeader title="Project Documents" description="Manage all important project documents and links.">
          <Button onClick={() => handleDialogOpen(null)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Document
          </Button>
        </PageHeader>
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Date Added</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">{doc.name}</TableCell>
                  <TableCell>
                    <a href={doc.location} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center gap-1">
                      <LinkIcon className="h-4 w-4" />
                      View Document
                    </a>
                  </TableCell>
                  <TableCell>{format(new Date(doc.createdAt), 'PPP')}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleDialogOpen(doc)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeletingDocument(doc)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) setEditingDocument(null); setIsDialogOpen(open); }}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingDocument ? 'Edit Document' : 'Add New Document'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Document Name</FormLabel>
                    <FormControl>
                       <Input 
                        list="doc-names" 
                        placeholder="Select or type a document name" 
                        value={docNameInput}
                        onChange={(e) => {
                            setDocNameInput(e.target.value);
                            field.onChange(e.target.value);
                        }}
                      />
                    </FormControl>
                    <datalist id="doc-names">
                      {standardDocs.map(docName => (
                        <option key={docName} value={docName} />
                      ))}
                    </datalist>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location (URL)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com/your-document-link" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save Document'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!deletingDocument} onOpenChange={(isOpen) => !isOpen && setDeletingDocument(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the link to the document "{deletingDocument?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className={cn(buttonVariants({ variant: 'destructive' }))}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
