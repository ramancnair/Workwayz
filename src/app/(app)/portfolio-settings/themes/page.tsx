
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getThemes, saveThemes } from '@/app/actions';
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
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

type Theme = {
    primary: { h: number; s: number; l: number };
    background: { h: number; s: number; l: number };
    foreground: { h: number; s: number; l: number };
    accent: { h: number; s: number; l: number };
    card: { h: number; s: number; l: number };
    border: { h: number; s: number; l: number };
    popover: { h: number; s: number; l: number };
    topbar: { h: number; s: number; l: number };
    sidebar: { h: number; s: number; l: number };
    radius: number;
    fontFamily: string;
    fontSize: number;
    shadow: 'none' | 'sm' | 'md' | 'lg';
};

type Themes = Record<string, Theme>;

export default function ThemesPage() {
    const { toast } = useToast();
    const [themes, setThemes] = useState<Themes | null>(null);
    const [deletingTheme, setDeletingTheme] = useState<string | null>(null);

    useEffect(() => {
        async function fetchThemes() {
            const themesData = await getThemes();
            setThemes(themesData);
        }
        fetchThemes();
    }, []);

    const handleDeleteTheme = async () => {
        if (!deletingTheme || !themes) return;

        if (deletingTheme === 'Default') {
            toast({ variant: 'destructive', title: 'Error', description: 'The Default theme cannot be deleted.' });
            setDeletingTheme(null);
            return;
        }

        const newThemes = { ...themes };
        delete newThemes[deletingTheme];
        
        const result = await saveThemes(newThemes);

        if (result.success) {
            setThemes(newThemes);
            toast({ title: 'Theme Deleted', description: `Theme "${deletingTheme}" has been deleted.` });
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
        
        setDeletingTheme(null);
    };

    if (!themes) {
        return <div>Loading themes...</div>;
    }

    return (
        <>
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-medium">Manage Themes</h3>
                        <p className="text-sm text-muted-foreground">View and delete your saved themes.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(themes).map(([themeName, theme]) => (
                        <Card key={themeName}>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle>{themeName}</CardTitle>
                                {themeName !== 'Default' && (
                                    <Button variant="ghost" size="icon" onClick={() => setDeletingTheme(themeName)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-md border" style={{ backgroundColor: `hsl(${theme.primary.h}, ${theme.primary.s}%, ${theme.primary.l}%)` }} title="Primary" />
                                    <div className="w-8 h-8 rounded-md border" style={{ backgroundColor: `hsl(${theme.background.h}, ${theme.background.s}%, ${theme.background.l}%)` }} title="Background" />
                                    <div className="w-8 h-8 rounded-md border" style={{ backgroundColor: `hsl(${theme.accent.h}, ${theme.accent.s}%, ${theme.accent.l}%)` }} title="Accent" />
                                    <div className="w-8 h-8 rounded-md border" style={{ backgroundColor: `hsl(${theme.card.h}, ${theme.card.s}%, ${theme.card.l}%)` }} title="Card" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            <AlertDialog open={!!deletingTheme} onOpenChange={(isOpen) => !isOpen && setDeletingTheme(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the theme "{deletingTheme}". This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteTheme}
                            className={cn(buttonVariants({ variant: 'destructive' }))}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

