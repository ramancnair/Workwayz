'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { validateSession } from '@/lib/session';

const FlowPilotChatWidget = dynamic(
  () => import('./FlowPilotChatWidget').then((mod) => mod.FlowPilotChatWidget),
  { ssr: false }
);

const PUBLIC_PATHS = ['/', '/login', '/signup', '/setup-wizard'];

function isUserAuthenticated(): boolean {
  return validateSession(false).isValid;
}

export function FlowPilotWidgetClient() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsAuthenticated(isUserAuthenticated());

    const handleAuthCheck = () => {
      setIsAuthenticated(isUserAuthenticated());
    };

    window.addEventListener('storage', handleAuthCheck);
    window.addEventListener('focus', handleAuthCheck);
    const interval = setInterval(handleAuthCheck, 1000);

    return () => {
      window.removeEventListener('storage', handleAuthCheck);
      window.removeEventListener('focus', handleAuthCheck);
      clearInterval(interval);
    };
  }, [pathname]);

  // Prevent SSR vs client initial hydration mismatch by delaying render until client has mounted
  if (!mounted) {
    return null;
  }

  const isPublicRoute =
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/setup-wizard');

  // Security guard: strictly hide the AI agent on public pages or unauthenticated sessions
  if (isPublicRoute || !isAuthenticated) {
    return null;
  }

  return <FlowPilotChatWidget />;
}

