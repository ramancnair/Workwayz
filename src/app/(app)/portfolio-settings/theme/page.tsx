
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { Save } from 'lucide-react';
import { promises as fs } from 'fs';
import path from 'path';

// Helper to parse HSL values from the CSS file content
const parseCssVariable = (css: string, variable: string): [number, number, number] => {
  const regex = new RegExp(`${variable}:\\s*(\\d+)\\s*(\\d+)%\\s*(\\d+)%`);
  const match = css.match(regex);
  if (match) {
    return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
  }
  return [0, 0, 0];
};

const parseCssValue = (css: string, variable: string): number => {
    const regex = new RegExp(`${variable}:\\s*([0-9.]+)rem`);
    const match = css.match(regex);
    if (match) {
        return parseFloat(match[1]);
    }
    return 0.5; // default
}


export default function ThemePage() {
    const { toast } = useToast();
    const [theme, setTheme] = useState({
        primary: { h: 221, s: 83, l: 53 },
        background: { h: 0, s: 0, l: 100 },
        accent: { h: 0, s: 0, l: 96.1 },
        radius: 0.5,
    });

    const [isLoading, setIsLoading] = useState(false);

    // No need to fetch, we can just set a default state
    // In a real app, you'd fetch the saved theme from a database
    // and the CSS file content on server-side.
    // For this prototype, we'll just use client-side state and update CSS vars.

    useEffect(() => {
        // This effect applies the theme to the document in real-time
        document.documentElement.style.setProperty('--primary', `${theme.primary.h} ${theme.primary.s}% ${theme.primary.l}%`);
        document.documentElement.style.setProperty('--background', `${theme.background.h} ${theme.background.s}% ${theme.background.l}%`);
        document.documentElement.style.setProperty('--accent', `${theme.accent.h} ${theme.accent.s}% ${theme.accent.l}%`);
        document.documentElement.style.setProperty('--radius', `${theme.radius}rem`);
    }, [theme]);

    const handleColorChange = (colorName: 'primary' | 'background' | 'accent', property: 'h' | 's' | 'l', value: number) => {
        setTheme(prev => ({
            ...prev,
            [colorName]: {
                ...prev[colorName],
                [property]: value
            }
        }));
    };
    
    const handleRadiusChange = (value: number) => {
        setTheme(prev => ({ ...prev, radius: value }));
    }

    const handleSaveTheme = async () => {
        setIsLoading(true);
        toast({ title: 'Saving Theme...', description: 'Please wait while we update your theme.' });
        
        // In a real Next.js app, this would be an API route call.
        // We're simulating the file write for prototyping purposes.
        // This code will NOT work directly on the client.
        // We need a server action to handle this.
        
        const cssContent = `
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  font-family: 'Inter', sans-serif;
}

@layer base {
  :root {
    --background: ${theme.background.h} ${theme.background.s}% ${theme.background.l}%;
    --foreground: 240 5.9% 10%;
    --card: 0 0% 100%;
    --card-foreground: 240 5.9% 10%;
    --popover: 0 0% 100%;
    --popover-foreground: 240 5.9% 10%;
    --primary: ${theme.primary.h} ${theme.primary.s}% ${theme.primary.l}%;
    --primary-foreground: 0 0% 98%;
    --secondary: 0 0% 96.1%;
    --secondary-foreground: 240 5.9% 10%;
    --muted: 0 0% 96.1%;
    --muted-foreground: 240 3.8% 46.1%;
    --accent: ${theme.accent.h} ${theme.accent.s}% ${theme.accent.l}%;
    --accent-foreground: 240 5.9% 10%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 0 0% 89.8%;
    --input: 0 0% 89.8%;
    --ring: ${theme.primary.h} ${theme.primary.s}% ${theme.primary.l}%;
    --topbar-background: 0 0% 100%;
    --topbar-foreground: 240 5.9% 10%;
    --chart-1: 12 76% 61%;
    --chart-2: 173 58% 39%;
    --chart-3: 197 37% 24%;
    --chart-4: 43 74% 66%;
    --chart-5: 27 87% 67%;
    --radius: ${theme.radius}rem;
    --sidebar-background: 0 0% 100%;
    --sidebar-foreground: 240 5.9% 10%;
    --sidebar-primary: ${theme.primary.h} ${theme.primary.s}% ${theme.primary.l}%;
    --sidebar-primary-foreground: 0 0% 98%;
    --sidebar-accent: 0 0% 96.1%;
    --sidebar-accent-foreground: 240 5.9% 10%;
    --sidebar-border: 0 0% 89.8%;
    --sidebar-ring: ${theme.primary.h} ${theme.primary.s}% ${theme.primary.l}%;
  }
  .dark {
    /* Dark theme settings can be customized here as well */
    --background: 222 84% 4.9%;
    --foreground: 0 0% 98%;
    --card: 222 84% 4.9%;
    --card-foreground: 0 0% 98%;
    --popover: 222 84% 4.9%;
    --popover-foreground: 0 0% 98%;
    --primary: 217 91% 60%;
    --primary-foreground: 0 0% 98%;
    --secondary: 217 33% 17%;
    --secondary-foreground: 0 0% 98%;
    --muted: 217 33% 17%;
    --muted-foreground: 215 20% 65%;
    --accent: 217 33% 17%;
    --accent-foreground: 0 0% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 0% 98%;
    --border: 217 33% 17%;
    --input: 217 33% 17%;
    --ring: 217 91% 60%;
    --topbar-background: 222 84% 4.9%;
    --topbar-foreground: 0 0% 98%;
    --chart-1: 220 70% 50%;
    --chart-2: 210 60% 45%;
    --chart-3: 200 80% 55%;
    --chart-4: 190 65% 60%;
    --chart-5: 180 75% 55%;
    --sidebar-background: 222 84% 4.9%;
    --sidebar-foreground: 0 0% 95%;
    --sidebar-primary: 217 91% 60%;
    --sidebar-primary-foreground: 0 0% 98%;
    --sidebar-accent: 217 33% 17%;
    --sidebar-accent-foreground: 0 0% 98%;
    --sidebar-border: 217 33% 17%;
    --sidebar-ring: 217 91% 60%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
        `;
        
        // This is a placeholder for a server action
        console.log("Saving CSS:", cssContent);
        
        // Simulate a delay
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
                        {/* Primary Color */}
                        <div className="space-y-2">
                            <Label>Primary Color</Label>
                            <div className="flex items-center gap-4">
                               <div className="w-10 h-10 rounded-md border" style={{ backgroundColor: `hsl(${theme.primary.h}, ${theme.primary.s}%, ${theme.primary.l}%)` }} />
                               <div className="flex-1 space-y-2">
                                   <Slider value={[theme.primary.h]} onValueChange={([v]) => handleColorChange('primary', 'h', v)} max={360} />
                                   <Slider value={[theme.primary.s]} onValueChange={([v]) => handleColorChange('primary', 's', v)} max={100} />
                                   <Slider value={[theme.primary.l]} onValueChange={([v]) => handleColorChange('primary', 'l', v)} max={100} />
                               </div>
                            </div>
                        </div>
                        {/* Background Color */}
                        <div className="space-y-2">
                            <Label>Background Color</Label>
                             <div className="flex items-center gap-4">
                               <div className="w-10 h-10 rounded-md border" style={{ backgroundColor: `hsl(${theme.background.h}, ${theme.background.s}%, ${theme.background.l}%)` }} />
                               <div className="flex-1 space-y-2">
                                   <Slider value={[theme.background.h]} onValueChange={([v]) => handleColorChange('background', 'h', v)} max={360} />
                                   <Slider value={[theme.background.s]} onValueChange={([v]) => handleColorChange('background', 's', v)} max={100} />
                                   <Slider value={[theme.background.l]} onValueChange={([v]) => handleColorChange('background', 'l', v)} max={100} />
                               </div>
                            </div>
                        </div>
                         {/* Accent Color */}
                        <div className="space-y-2">
                            <Label>Accent Color</Label>
                             <div className="flex items-center gap-4">
                               <div className="w-10 h-10 rounded-md border" style={{ backgroundColor: `hsl(${theme.accent.h}, ${theme.accent.s}%, ${theme.accent.l}%)` }} />
                               <div className="flex-1 space-y-2">
                                   <Slider value={[theme.accent.h]} onValueChange={([v]) => handleColorChange('accent', 'h', v)} max={360} />
                                   <Slider value={[theme.accent.s]} onValueChange={([v]) => handleColorChange('accent', 's', v)} max={100} />
                                   <Slider value={[theme.accent.l]} onValueChange={([v]) => handleColorChange('accent', 'l', v)} max={100} />
                               </div>
                            </div>
                        </div>
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
