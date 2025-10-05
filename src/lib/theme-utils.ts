
export type Theme = {
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

export const applyTheme = (theme: Theme) => {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  root.style.setProperty('--primary', `${theme.primary.h} ${theme.primary.s}% ${theme.primary.l}%`);
  root.style.setProperty('--background', `${theme.background.h} ${theme.background.s}% ${theme.background.l}%`);
  root.style.setProperty('--foreground', `${theme.foreground.h} ${theme.foreground.s}% ${theme.foreground.l}%`);
  root.style.setProperty('--accent', `${theme.accent.h} ${theme.accent.s}% ${theme.accent.l}%`);
  root.style.setProperty('--card', `${theme.card.h} ${theme.card.s}% ${theme.card.l}%`);
  root.style.setProperty('--border', `${theme.border.h} ${theme.border.s}% ${theme.border.l}%`);
  root.style.setProperty('--popover', `${theme.popover.h} ${theme.popover.s}% ${theme.popover.l}%`);
  root.style.setProperty('--popover-foreground', `${theme.foreground.h} ${theme.foreground.s}% ${theme.foreground.l}%`);
  root.style.setProperty('--topbar-background', `${theme.topbar.h} ${theme.topbar.s}% ${theme.topbar.l}%`);
  root.style.setProperty('--sidebar-background', `${theme.sidebar.h} ${theme.sidebar.s}% ${theme.sidebar.l}%`);
  root.style.setProperty('--radius', `${theme.radius}rem`);
  root.style.setProperty('--font-body-family', theme.fontFamily);
  root.style.fontSize = `${theme.fontSize}px`;
  
  const shadowValue = theme.shadow === 'none' ? '0 0 #0000' : `var(--shadow-${theme.shadow})`;
  root.style.setProperty('--shadow', shadowValue);
  root.style.setProperty('--shadow-sm', `var(--shadow-sm-${theme.shadow})`);
  root.style.setProperty('--shadow-md', `var(--shadow-md-${theme.shadow})`);
  root.style.setProperty('--shadow-lg', `var(--shadow-lg-${theme.shadow})`);
};
