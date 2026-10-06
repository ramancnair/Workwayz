
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { headers } from 'next/headers';
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
  title: 'Workwayz',
  description: 'Manage your projects with ease and clarity. Workwayz.in',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get('x-nonce') || undefined;

  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="font-body antialiased" suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          themes={["light", "dark", "system"]}
          enableSystem
          disableTransitionOnChange
          nonce={nonce}
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
