
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { Save, Check } from 'lucide-react';
import { cn } from '@/lib/utils';


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

function ColorPalette({ selectedH, selectedS, onColorSelect }: { selectedH: number, selectedS: number, onColorSelect: (h: number, s: number) => void }) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {colorPalette.map(({ h, s, name }) => {
        const isActive = h === selectedH && s === selectedS;
        return (
          <button
            key={name}
            type="button"
            className={cn(
              "h-10 w-10 rounded-full border-2 transition-transform hover:scale-110 flex items-center justify-center",
              isActive ? 'border-primary' : 'border-transparent'
            )}
            style={{ backgroundColor: `hsl(${h}, ${s}%, 50%)` }}
            onClick={() => onColorSelect(h, s)}
            title={name}
          >
            {isActive && <Check className="h-6 w-6 text-white" />}
          </button>
        );
      })}
    </div>
  );
}


export default function ThemePage() {
    const { toast } = useToast();
    const [theme, setTheme] = useState({
        primary: { h: 221, s: 83, l: 53 },
        background: { h: 0, s: 0, l: 100 },
        accent: { h: 0, s: 0, l: 96.1 },
        card: { h: 0, s: 0, l: 100 },
        topbar: { h: 0, s: 0, l: 100 },
        sidebar: { h: 0, s: 0, l: 100 },
        radius: 0.5,
    });

    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        document.documentElement.style.setProperty('--primary', `${theme.primary.h} ${theme.primary.s}% ${theme.primary.l}%`);
        document.documentElement.style.setProperty('--background', `${theme.background.h} ${theme.background.s}% ${theme.background.l}%`);
        document.documentElement.style.setProperty('--accent', `${theme.accent.h} ${theme.accent.s}% ${theme.accent.l}%`);
        document.documentElement.style.setProperty('--card', `${theme.card.h} ${theme.card.s}% ${theme.card.l}%`);
        document.documentElement.style.setProperty('--topbar-background', `${theme.topbar.h} ${theme.topbar.s}% ${theme.topbar.l}%`);
        document.documentElement.style.setProperty('--sidebar-background', `${theme.sidebar.h} ${theme.sidebar.s}% ${theme.sidebar.l}%`);
        document.documentElement.style.setProperty('--radius', `${theme.radius}rem`);
    }, [theme]);

    type ColorName = 'primary' | 'background' | 'accent' | 'card' | 'topbar' | 'sidebar';

    const handleColorChange = (colorName: ColorName, property: 'h' | 's' | 'l', value: number) => {
        setTheme(prev => ({
            ...prev,
            [colorName]: {
                ...prev[colorName],
                [property]: value
            }
        }));
    };
    
    const handlePaletteSelect = (colorName: ColorName, h: number, s: number) => {
      setTheme(prev => ({
        ...prev,
        [colorName]: {
          ...prev[colorName],
          h,
          s
        }
      }))
    }

    const handleRadiusChange = (value: number) => {
        setTheme(prev => ({ ...prev, radius: value }));
    }
    
    const createColorSection = (name: ColorName, label: string) => (
        <div className="space-y-4">
            <Label>{label}</Label>
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-md border" style={{ backgroundColor: `hsl(${theme[name].h}, ${theme[name].s}%, ${theme[name].l}%)` }} />
                <div className="flex-1 space-y-2">
                    <ColorPalette selectedH={theme[name].h} selectedS={theme[name].s} onColorSelect={(h, s) => handlePaletteSelect(name, h, s)} />
                    <Slider value={[theme[name].l]} onValueChange={([v]) => handleColorChange(name, 'l', v)} max={100} />
                </div>
            </div>
        </div>
    );

    const handleSaveTheme = async () => {
        setIsLoading(true);
        toast({ title: 'Saving Theme...', description: 'Please wait while we update your theme.' });
        
        // This is where you would typically make an API call to a server action
        // to write the file. For this prototype, we'll just simulate it.
        console.log("Saving theme with these values:", theme);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        toast({ title: 'Theme Saved!', description: 'Your new theme has been applied.' });
        setIsLoading(false);
    };

    return (
        <div className="space-y-4">
             <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium">Theme</h3>
                    <p className="text-sm text-muted-foreground">Customize the look and feel of the application.</p>
                </div>
                 <Button onClick={handleSaveTheme} disabled={isLoading}>
                    <Save className="mr-2 h-4 w-4" />
                    {isLoading ? 'Saving...' : 'Save Theme'}
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Colors</CardTitle>
                        <CardDescription>Adjust the main colors of the UI.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {createColorSection('primary', 'Primary Color')}
                        {createColorSection('background', 'Background Color')}
                        {createColorSection('accent', 'Accent Color')}
                        {createColorSection('card', 'Card Color')}
                        {createColorSection('topbar', 'Top Bar Color')}
                        {createColorSection('sidebar', 'Sidebar Color')}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Sizing & Spacing</CardTitle>
                        <CardDescription>Adjust font sizes and spacing.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label>Border Radius: {theme.radius}rem</Label>
                            <Slider value={[theme.radius]} onValueChange={([v]) => handleRadiusChange(v)} min={0} max={2} step={0.1} />
                        </div>
                         <div className="space-y-2">
                            <Label>Font Size (Not Implemented)</Label>
                             <Slider defaultValue={[16]} min={12} max={20} step={1} disabled />
                        </div>
                        <div className="space-y-2">
                            <Label>Padding (Not Implemented)</Label>
                            <Slider defaultValue={[4]} min={2} max={8} step={1} disabled />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
