
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { SetupInterceptor } from "@/components/SetupInterceptor";
import { SupabaseBootstrap } from "@/components/SupabaseBootstrap";
import { GlobalErrorReporter } from "@/components/GlobalErrorReporter";
import { FlowPilotWidgetClient } from "@/components/flowpilot/FlowPilotWidgetClient";
import { MaintenanceInterceptor } from "@/components/MaintenanceInterceptor";

import { getServerRuntimeConfig } from '@/app/api/runtime-config/route';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'ProjectFlow',
  description: 'Manage your projects with ease and clarity.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const runtimeConfig = getServerRuntimeConfig();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          id="projectflow-runtime-config"
          dangerouslySetInnerHTML={{
            __html: `window.__PROJECTFLOW_CONFIG__ = ${JSON.stringify(runtimeConfig)};`,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Lato:wght@400;700&family=Montserrat:wght@400;500;600;700&family=Open+Sans:wght@400;600;700&family=Oswald:wght@400;500;600;700&family=PT+Sans:wght@400;700&family=Raleway:wght@400;500;600;700&family=Roboto:wght@400;500;700&family=Source+Sans+Pro:wght@400;600;700&family=Ubuntu:wght@400;500;700&display=swap" rel="stylesheet" />
      </head>
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
          <MaintenanceInterceptor />
          <SetupInterceptor />
          {children}
          <FlowPilotWidgetClient />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
