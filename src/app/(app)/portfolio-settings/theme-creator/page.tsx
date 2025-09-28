
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { Save, Check, Plus, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import themesData from '@/lib/themes.json';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


const colorPalette = [
  { h: 0, s: 84, name: 'Red' },
  { h: 25, s: 95, name: 'Orange' },
  { h: 45, s: 95, name: 'Yellow' },
  { h: 145, s: 63, name: 'Green' },
  { h: 200, s: 80, name: 'Blue' },
  { h: 221, s: 83, name: 'Indigo' },
  { h: 260, s: 85, name: 'Violet' },
  { h: 320, s: 70, name: 'Pink' },
  { h: 210, s: 40, name: 'Slate' },
  { h: 0, s: 0, name: 'Gray' },
];

const fontOptions = [
  { value: 'Inter, sans-serif', label: 'Inter' },
  { value: 'Roboto, sans-serif', label: 'Roboto' },
  { value: 'Lato, sans-serif', label: 'Lato' },
  { value: 'Montserrat, sans-serif', label: 'Montserrat' },
  { value: 'Oswald, sans-serif', label: 'Oswald' },
];

function ColorPalette({ selectedH, selectedS, onColorSelect }: { selectedH: number, selectedS: number, onColorSelect: (h: number, s: number) => void }) {
  return (
    <div className="grid grid-cols-5 gap-1">
      {colorPalette.map(({ h, s, name }) => {
        const isActive = h === selectedH && s === selectedS;
        return (
          <button
            key={name}
            type="button"
            className={cn(
              "h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 flex items-center justify-center",
              isActive ? 'border-primary' : 'border-transparent'
            )}
            style={{ backgroundColor: `hsl(${h}, ${s}%, 50%)` }}
            onClick={() => onColorSelect(h, s)}
            title={name}
          >
            {isActive && <Check className="h-4 w-4 text-white" />}
          </button>
        );
      })}
    </div>
  );
}

type Theme = {
    primary: { h: number; s: number; l: number };
    background: { h: number; s: number; l: number };
    foreground: { h: number; s: number; l: number };
    accent: { h: number; s: number; l: number };
    card: { h: number; s: number; l: number };
    popover: { h: number; s: number; l: number };
    topbar: { h: number; s: number; l: number };
    sidebar: { h: number; s: number; l: number };
    radius: number;
    fontFamily: string;
    fontSize: number;
};

type Themes = Record<string, Theme>;

export default function ThemeCreatorPage() {
    const { toast } = useToast();
    const [themes, setThemes] = useState<Themes>(themesData);
    const [selectedTheme, setSelectedTheme] = useState<string>('Default');
    const [currentTheme, setCurrentTheme] = useState<Theme>(themes.Default);
    const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
    const [newThemeName, setNewThemeName] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        document.documentElement.style.setProperty('--primary', `${currentTheme.primary.h} ${currentTheme.primary.s}% ${currentTheme.primary.l}%`);
        document.documentElement.style.setProperty('--background', `${currentTheme.background.h} ${currentTheme.background.s}% ${currentTheme.background.l}%`);
        document.documentElement.style.setProperty('--foreground', `${currentTheme.foreground.h} ${currentTheme.foreground.s}% ${currentTheme.foreground.l}%`);
        document.documentElement.style.setProperty('--accent', `${currentTheme.accent.h} ${currentTheme.accent.s}% ${currentTheme.accent.l}%`);
        document.documentElement.style.setProperty('--card', `${currentTheme.card.h} ${currentTheme.card.s}% ${currentTheme.card.l}%`);
        document.documentElement.style.setProperty('--popover', `${currentTheme.popover.h} ${currentTheme.popover.s}% ${currentTheme.popover.l}%`);
        document.documentElement.style.setProperty('--popover-foreground', `${currentTheme.foreground.h} ${currentTheme.foreground.s}% ${currentTheme.foreground.l}%`);
        document.documentElement.style.setProperty('--topbar-background', `${currentTheme.topbar.h} ${currentTheme.topbar.s}% ${currentTheme.topbar.l}%`);
        document.documentElement.style.setProperty('--sidebar-background', `${currentTheme.sidebar.h} ${currentTheme.sidebar.s}% ${currentTheme.sidebar.l}%`);
        document.documentElement.style.setProperty('--radius', `${currentTheme.radius}rem`);
        document.documentElement.style.setProperty('--font-body-family', currentTheme.fontFamily);
        document.documentElement.style.fontSize = `${currentTheme.fontSize}px`;
    }, [currentTheme]);

    type ColorName = 'primary' | 'background' | 'foreground' | 'accent' | 'card' | 'popover' | 'topbar' | 'sidebar';

    const handleColorChange = (colorName: ColorName, property: 'h' | 's' | 'l', value: number) => {
        setCurrentTheme(prev => ({
            ...prev,
            [colorName]: {
                ...prev[colorName],
                [property]: value
            }
        }));
    };
    
    const handlePaletteSelect = (colorName: ColorName, h: number, s: number) => {
      setCurrentTheme(prev => ({
        ...prev,
        [colorName]: {
          ...prev[colorName],
          h,
          s
        }
      }))
    }

    const handleRadiusChange = (value: number) => {
        setCurrentTheme(prev => ({ ...prev, radius: value }));
    }

    const handleFontChange = (fontFamily: string) => {
        setCurrentTheme(prev => ({ ...prev, fontFamily }));
    };

    const handleFontSizeChange = (direction: 'increase' | 'decrease') => {
        setCurrentTheme(prev => ({
            ...prev,
            fontSize: direction === 'increase' ? prev.fontSize + 1 : prev.fontSize - 1,
        }));
    };
    
    const handleThemeSelect = (themeName: string) => {
        setSelectedTheme(themeName);
        setCurrentTheme(themes[themeName]);
    };

    const createColorSection = (name: ColorName, label: string) => (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label className="text-sm w-24">{label}</Label>
          <div className="w-8 h-8 rounded-md border" style={{ backgroundColor: `hsl(${currentTheme[name].h}, ${currentTheme[name].s}%, ${currentTheme[name].l}%)` }} />
          <div className="flex-1">
            <ColorPalette selectedH={currentTheme[name].h} selectedS={currentTheme[name].s} onColorSelect={(h, s) => handlePaletteSelect(name, h, s)} />
          </div>
          <div className="w-24">
            <Slider value={[currentTheme[name].l]} onValueChange={([v]) => handleColorChange(name, 'l', v)} max={100} />
          </div>
        </div>
      </div>
    );

    const handleSaveTheme = async () => {
        if (!newThemeName.trim()) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please enter a theme name.' });
            return;
        }
        setIsLoading(true);
        toast({ title: 'Saving Theme...', description: 'Please wait while we update your theme.' });
        
        const newThemes = { ...themes, [newThemeName]: currentTheme };
        setThemes(newThemes);
        setSelectedTheme(newThemeName);

        // This is a simulation. In a real app, this would be an API call to a server action to write the file.
        console.log("Simulating save of themes.json:", JSON.stringify(newThemes, null, 2));
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        toast({ title: 'Theme Saved!', description: `Theme "${newThemeName}" has been saved.` });
        setIsLoading(false);
        setIsSaveDialogOpen(false);
        setNewThemeName('');
    };

    return (
        <>
            <div className="space-y-4">
                 <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-medium">Theme Creator</h3>
                        <p className="text-sm text-muted-foreground">Customize the look and feel of the application.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Select value={selectedTheme} onValueChange={handleThemeSelect}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Select a theme" />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.keys(themes).map(themeName => (
                                    <SelectItem key={themeName} value={themeName}>{themeName}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button onClick={() => setIsSaveDialogOpen(true)} disabled={isLoading}>
                            <Save className="mr-2 h-4 w-4" />
                            {isLoading ? 'Saving...' : 'Save Theme'}
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Colors</CardTitle>
                            <CardDescription>Adjust the main colors of the UI.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {createColorSection('primary', 'Primary')}
                            {createColorSection('background', 'Background')}
                            {createColorSection('foreground', 'Foreground')}
                            {createColorSection('accent', 'Accent')}
                            {createColorSection('card', 'Card')}
                            {createColorSection('popover', 'Popover')}
                            {createColorSection('topbar', 'Top Bar')}
                            {createColorSection('sidebar', 'Sidebar')}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Sizing & Spacing</CardTitle>
                            <CardDescription>Adjust font sizes and spacing.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label>Font Family</Label>
                                <Select value={currentTheme.fontFamily} onValueChange={handleFontChange}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        {fontOptions.map(font => (
                                            <SelectItem key={font.value} value={font.value} style={{fontFamily: font.value}}>{font.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Font Size: {currentTheme.fontSize}px</Label>
                                <div className='flex items-center gap-2'>
                                    <Button size="icon" variant="outline" onClick={() => handleFontSizeChange('decrease')}><Minus/></Button>
                                    <Slider value={[currentTheme.fontSize]} onValueChange={([v]) => setCurrentTheme(p => ({...p, fontSize: v}))} min={12} max={20} step={1} />
                                    <Button size="icon" variant="outline" onClick={() => handleFontSizeChange('increase')}><Plus/></Button>
                                </div>
                            </div>
                             <div className="space-y-2">
                                <Label>Border Radius: {currentTheme.radius}rem</Label>
                                <Slider value={[currentTheme.radius]} onValueChange={([v]) => handleRadiusChange(v)} min={0} max={2} step={0.1} />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
            
            <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Save New Theme</DialogTitle>
                        <DialogDescription>
                            Enter a name for your current theme configuration to save it for later use.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="theme-name">Theme Name</Label>
                        <Input 
                            id="theme-name" 
                            value={newThemeName} 
                            onChange={(e) => setNewThemeName(e.target.value)} 
                            placeholder="E.g., Dark Mode" 
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsSaveDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveTheme} disabled={isLoading}>
                            {isLoading ? 'Saving...' : 'Save Theme'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
