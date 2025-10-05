
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { applyTheme } from '@/lib/theme-utils';
import type { Theme } from '@/lib/theme-utils';

type Themes = Record<string, Theme>;

export default function ThemesPage() {
    const { toast } = useToast();
    const [themes, setThemes] = useState<Themes | null>(null);
    const [activeTheme, setActiveTheme] = useState('Default');
    const [deletingTheme, setDeletingTheme] = useState<string | null>(null);

    useEffect(() => {
        async function fetchThemes() {
            const themesData = await getThemes();
            setThemes(themesData);
            const savedTheme = localStorage.getItem('active-theme') || 'Default';
            setActiveTheme(savedTheme);
            applyTheme(themesData[savedTheme] || themesData.Default);
        }
        fetchThemes();
    }, []);

    const handleThemeSelect = (themeName: string) => {
        if (!themes) return;
        setActiveTheme(themeName);
        localStorage.setItem('active-theme', themeName);
        applyTheme(themes[themeName]);
    };

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
            if (activeTheme === deletingTheme) {
                handleThemeSelect('Default');
            }
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
                        <p className="text-sm text-muted-foreground">Select a theme to apply it across the application.</p>
                    </div>
                </div>

                <Card>
                    <CardContent className="p-0">
                        <RadioGroup value={activeTheme} onValueChange={handleThemeSelect}>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-12"></TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Palette</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {Object.entries(themes).map(([themeName, theme]) => (
                                        <TableRow key={themeName} className="cursor-pointer" onClick={() => handleThemeSelect(themeName)}>
                                            <TableCell>
                                                <RadioGroupItem value={themeName} id={themeName} />
                                            </TableCell>
                                            <TableCell>
                                                <Label htmlFor={themeName} className="font-medium">{themeName}</Label>
                                            </TableCell>
                                            <TableCell>
                                                 <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-md border" style={{ backgroundColor: `hsl(${theme.primary.h}, ${theme.primary.s}%, ${theme.primary.l}%)` }} title="Primary" />
                                                    <div className="w-6 h-6 rounded-md border" style={{ backgroundColor: `hsl(${theme.background.h}, ${theme.background.s}%, ${theme.background.l}%)` }} title="Background" />
                                                    <div className="w-6 h-6 rounded-md border" style={{ backgroundColor: `hsl(${theme.accent.h}, ${theme.accent.s}%, ${theme.accent.l}%)` }} title="Accent" />
                                                    <div className="w-6 h-6 rounded-md border" style={{ backgroundColor: `hsl(${theme.card.h}, ${theme.card.s}%, ${theme.card.l}%)` }} title="Card" />
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {themeName !== 'Default' && (
                                                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setDeletingTheme(themeName); }}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </RadioGroup>
                    </CardContent>
                </Card>
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
