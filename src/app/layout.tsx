
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { SetupInterceptor } from "@/components/SetupInterceptor";
import { SupabaseBootstrap } from "@/components/SupabaseBootstrap";
import { GlobalErrorReporter } from "@/components/GlobalErrorReporter";
import { FlowPilotWidgetClient } from "@/components/flowpilot/FlowPilotWidgetClient";

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'ProjectFlow',
  description: 'Manage your projects with ease and clarity.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="font-body antialiased" suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          themes={["light", "dark", "green", "blue", "system"]}
          enableSystem
          disableTransitionOnChange
        >
          <GlobalErrorReporter />
          <SupabaseBootstrap />
          <SetupInterceptor />
          {children}
          <FlowPilotWidgetClient />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
