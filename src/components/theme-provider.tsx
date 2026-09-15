"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

// Filter out React 19 false-positive warning for next-themes inline script tag
const filterScriptWarning = (originalFn: (...data: any[]) => void) => {
  return (...args: any[]) => {
    if (
      args.some(
        (arg) =>
          typeof arg === 'string' &&
          (arg.includes('Encountered a script tag') || arg.includes('Scripts inside React components'))
      )
    ) {
      return;
    }
    originalFn.apply(console, args);
  };
};

if (typeof console !== 'undefined') {
  console.error = filterScriptWarning(console.error);
  console.warn = filterScriptWarning(console.warn);
}

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
