
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
import { PlusCircle, Edit, Trash2, Link as LinkIcon, ShieldCheck, ShieldAlert, Lock, CheckCircle2, AlertCircle } from 'lucide-react';
import { type ProjectDocument } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';

const documentSchema = z.object({
  name: z.string().min(1, 'Document name is required.'),
  location: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
});

const defaultDocsList = [
  'sow',
  'requirements',
  'hld/dd',
  'ui/ux designs',
  'lessons learned',
  'status reports',
  'bcp',
  'git',
  'closure',
  'qa approval'
];


export default function DocumentsPage() {
  const { documents, addDocument, updateDocument, deleteDocument, project, updateProject } = useProject();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string; accessLevel: string } | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<ProjectDocument | null>(null);
  const [deletingDocument, setDeletingDocument] = useState<ProjectDocument | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem('projectflow_user');
    if (userStr) {
      try {
        setCurrentUser(JSON.parse(userStr));
      } catch (e) {
        console.error("Failed to parse user session", e);
      }
    }
  }, []);

  const form = useForm<z.infer<typeof documentSchema>>({
    resolver: zodResolver(documentSchema),
    defaultValues: { name: '', location: '' },
  });

  useEffect(() => {
    if (isDialogOpen) {
      if (editingDocument) {
        form.reset(editingDocument);
      } else {
        form.reset({ name: '', location: '' });
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
    
    const payload = {
      name: values.name,
      location: values.location || '',
    };

    const success = editingDocument
      ? await updateDocument(editingDocument.id, payload)
      : await addDocument(payload);

    if (success) {
      toast({ title: "Success", description: `Document ${editingDocument ? 'updated' : 'added'} successfully.` });
      setIsDialogOpen(false);
    } else {
      toast({ variant: "destructive", title: "Error", description: `Could not ${editingDocument ? 'update' : 'add'} document.` });
    }
    setIsSubmitting(false);
  };

  const sowDoc = documents.find(d => d.name.toLowerCase() === 'sow');
  const hasValidSow = !!(sowDoc && sowDoc.location && sowDoc.location.trim() !== '');

  const qaDoc = documents.find(d => d.name.toLowerCase() === 'qa approval' || d.name.toLowerCase() === 'qa sign-off');
  const hasValidQaApproval = !!(qaDoc && qaDoc.location && qaDoc.location.trim() !== '');

  const isAuthorized = !!(currentUser && ['PMO', 'Senior Management', 'Administrator'].includes(currentUser.accessLevel));

  const permitToBuildApproved = !!project?.pmoApproval?.permitToBuild?.approved;
  const permitToBuildBy = project?.pmoApproval?.permitToBuild?.approvedBy;
  const permitToBuildAt = project?.pmoApproval?.permitToBuild?.approvedAt;

  const permitToDeployApproved = !!project?.pmoApproval?.permitToDeploy?.approved;
  const permitToDeployBy = project?.pmoApproval?.permitToDeploy?.approvedBy;
  const permitToDeployAt = project?.pmoApproval?.permitToDeploy?.approvedAt;

  const handlePermitToBuildChange = async (checked: boolean) => {
    if (!currentUser) return;
    const now = new Date().toISOString();
    const updatedApproval = {
      ...project?.pmoApproval,
      permitToBuild: {
        approved: checked,
        approvedBy: checked ? `${currentUser.name} (${currentUser.email})` : '',
        approvedAt: checked ? now : '',
      }
    };
    const success = await updateProject({ pmoApproval: updatedApproval });
    if (success) {
      toast({
        title: checked ? "Permit to Build Granted" : "Permit to Build Revoked",
        description: checked 
          ? "Permit to Build has been successfully signed off by you." 
          : "Permit to Build has been revoked.",
      });
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update project approval.",
      });
    }
  };

  const handlePermitToDeployChange = async (checked: boolean) => {
    if (!currentUser) return;
    const now = new Date().toISOString();
    const updatedApproval = {
      ...project?.pmoApproval,
      permitToDeploy: {
        approved: checked,
        approvedBy: checked ? `${currentUser.name} (${currentUser.email})` : '',
        approvedAt: checked ? now : '',
      }
    };
    const success = await updateProject({ pmoApproval: updatedApproval });
    if (success) {
      toast({
        title: checked ? "Permit to Deploy Granted" : "Permit to Deploy Revoked",
        description: checked 
          ? "Permit to Deploy has been successfully signed off by you." 
          : "Permit to Deploy has been revoked.",
      });
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update project approval.",
      });
    }
  };

  return (
    <>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <PageHeader title="Project Documents" description="Manage all important project documents and links.">
          <Button onClick={() => handleDialogOpen(null)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Custom Document
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
              {documents.sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">{doc.name}</TableCell>
                  <TableCell>
                    {doc.location ? (
                       <a href={doc.location} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center gap-1">
                          <LinkIcon className="h-4 w-4" />
                          View Document
                        </a>
                    ) : (
                        <Button variant="link" className="p-0 h-auto" onClick={() => handleDialogOpen(doc)}>
                          Add URL here
                        </Button>
                    )}
                  </TableCell>
                  <TableCell>{format(new Date(doc.createdAt), 'PPP')}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleDialogOpen(doc)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setDeletingDocument(doc)}
                      disabled={defaultDocsList.includes(doc.name.toLowerCase())}
                      className={defaultDocsList.includes(doc.name.toLowerCase()) ? "opacity-30 cursor-not-allowed" : ""}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        {/* PMO Approval Sign-offs Section */}
        <Card className="relative overflow-hidden border border-border/80 bg-background/40 backdrop-blur-md shadow-xl transition-all duration-300 hover:shadow-2xl">
          {/* Glowing cyan top accent border */}
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500" />
          
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500/10 to-cyan-500/10 border border-indigo-500/20 shadow-inner">
                <ShieldCheck className="h-6 w-6 text-indigo-500 animate-pulse" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold tracking-tight text-foreground">PMO Approval Sign-offs</CardTitle>
                <CardDescription className="text-sm text-muted-foreground mt-0.5">
                  Manage critical PMO build and deployment milestones. Only PMO, Senior Management, or Administrators can sign off.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="grid gap-6 md:grid-cols-2 pt-2">
            {/* 1. Permit to Build */}
            <div className={cn(
              "relative p-5 rounded-2xl border transition-all duration-300",
              permitToBuildApproved 
                ? "bg-emerald-950/10 border-emerald-500/30 dark:bg-emerald-950/10" 
                : "bg-muted/10 border-border/50 hover:border-border/80"
            )}>
              <div className="flex items-start gap-4">
                <div className="pt-0.5">
                  <Checkbox 
                    id="permitToBuild" 
                    checked={permitToBuildApproved}
                    onCheckedChange={handlePermitToBuildChange}
                    disabled={!hasValidSow || !isAuthorized}
                    className={cn(
                      "h-5 w-5 rounded-md border-2 transition-all duration-200",
                      permitToBuildApproved 
                        ? "border-emerald-500 data-[state=checked]:bg-emerald-500" 
                        : "border-muted-foreground/40",
                      (!hasValidSow || !isAuthorized) && "cursor-not-allowed opacity-50"
                    )}
                  />
                </div>
                
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <label 
                      htmlFor="permitToBuild" 
                      className={cn(
                        "text-base font-semibold leading-none select-none tracking-tight cursor-pointer",
                        (!hasValidSow || !isAuthorized) && "cursor-not-allowed opacity-70"
                      )}
                    >
                      Permit to Build
                    </label>
                    {permitToBuildApproved ? (
                      <Badge variant="default" className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Approved
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border border-amber-500/20 font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 animate-pulse" />
                        Pending
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-sm text-muted-foreground/80 leading-relaxed">
                    Authorizes development to begin. Requires a valid **Statement of Work (SOW)** linked in the documents list above.
                  </p>

                  {/* Requirements & Permissions Badges */}
                  <div className="flex flex-wrap gap-2 pt-1 text-xs">
                    {hasValidSow ? (
                      <Badge variant="outline" className="border-emerald-500/30 text-emerald-500 bg-emerald-500/5 font-normal">
                        URL Present
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="border-destructive/30 text-destructive bg-destructive/5 hover:bg-destructive/10 font-normal">
                        SOW Link Missing
                      </Badge>
                    )}
                    
                    {!isAuthorized && (
                      <Badge variant="outline" className="border-amber-500/30 text-amber-500 bg-amber-500/5 font-normal flex items-center gap-1">
                        <Lock className="h-3 w-3" />
                        Access Restricted
                      </Badge>
                    )}
                  </div>

                  {/* Audit Trail Log */}
                  {permitToBuildApproved && (
                    <div className="mt-4 pt-3 border-t border-emerald-500/10 text-xs text-muted-foreground/90 space-y-1">
                      <div className="flex items-center gap-1.5 font-medium text-emerald-500/90">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Audit Log
                      </div>
                      <div className="pl-5 space-y-0.5">
                        <p>Approved By: <span className="font-semibold text-foreground">{permitToBuildBy}</span></p>
                        <p>Approved At: <span className="font-semibold text-foreground">{permitToBuildAt ? format(new Date(permitToBuildAt), 'PPP p') : 'N/A'}</span></p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Permit to Deploy */}
            <div className={cn(
              "relative p-5 rounded-2xl border transition-all duration-300",
              permitToDeployApproved 
                ? "bg-emerald-950/10 border-emerald-500/30 dark:bg-emerald-950/10" 
                : "bg-muted/10 border-border/50 hover:border-border/80"
            )}>
              <div className="flex items-start gap-4">
                <div className="pt-0.5">
                  <Checkbox 
                    id="permitToDeploy" 
                    checked={permitToDeployApproved}
                    onCheckedChange={handlePermitToDeployChange}
                    disabled={!hasValidQaApproval || !isAuthorized}
                    className={cn(
                      "h-5 w-5 rounded-md border-2 transition-all duration-200",
                      permitToDeployApproved 
                        ? "border-emerald-500 data-[state=checked]:bg-emerald-500" 
                        : "border-muted-foreground/40",
                      (!hasValidQaApproval || !isAuthorized) && "cursor-not-allowed opacity-50"
                    )}
                  />
                </div>
                
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <label 
                      htmlFor="permitToDeploy" 
                      className={cn(
                        "text-base font-semibold leading-none select-none tracking-tight cursor-pointer",
                        (!hasValidQaApproval || !isAuthorized) && "cursor-not-allowed opacity-70"
                      )}
                    >
                      Permit to Deploy
                    </label>
                    {permitToDeployApproved ? (
                      <Badge variant="default" className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Approved
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border border-amber-500/20 font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 animate-pulse" />
                        Pending
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-sm text-muted-foreground/80 leading-relaxed">
                    Authorizes deployment to production environment. Requires a valid **QA Approval** link in the documents list above.
                  </p>

                  {/* Requirements & Permissions Badges */}
                  <div className="flex flex-wrap gap-2 pt-1 text-xs">
                    {hasValidQaApproval ? (
                      <Badge variant="outline" className="border-emerald-500/30 text-emerald-500 bg-emerald-500/5 font-normal">
                        URL Present
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="border-destructive/30 text-destructive bg-destructive/5 hover:bg-destructive/10 font-normal">
                        QA Sign-off Missing
                      </Badge>
                    )}
                    
                    {!isAuthorized && (
                      <Badge variant="outline" className="border-amber-500/30 text-amber-500 bg-amber-500/5 font-normal flex items-center gap-1">
                        <Lock className="h-3 w-3" />
                        Access Restricted
                      </Badge>
                    )}
                  </div>

                  {/* Audit Trail Log */}
                  {permitToDeployApproved && (
                    <div className="mt-4 pt-3 border-t border-emerald-500/10 text-xs text-muted-foreground/90 space-y-1">
                      <div className="flex items-center gap-1.5 font-medium text-emerald-500/90">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Audit Log
                      </div>
                      <div className="pl-5 space-y-0.5">
                        <p>Approved By: <span className="font-semibold text-foreground">{permitToDeployBy}</span></p>
                        <p>Approved At: <span className="font-semibold text-foreground">{permitToDeployAt ? format(new Date(permitToDeployAt), 'PPP p') : 'N/A'}</span></p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) setEditingDocument(null); setIsDialogOpen(open); }}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingDocument ? `Edit "${editingDocument.name}"` : 'Add New Document'}</DialogTitle>
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
                        placeholder="e.g., Project Charter" 
                        {...field}
                        disabled={!!(editingDocument && defaultDocsList.includes(editingDocument.name.toLowerCase()))}
                      />
                    </FormControl>
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
