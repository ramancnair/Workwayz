'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';

const FlowPilotChatWidget = dynamic(
  () => import('./FlowPilotChatWidget').then((mod) => mod.FlowPilotChatWidget),
  { ssr: false }
);

const PUBLIC_PATHS = ['/', '/login', '/signup', '/setup-wizard'];

function isUserAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const userStr = localStorage.getItem('projectflow_user');
    if (!userStr) return false;
    const session = JSON.parse(userStr);
    return Boolean(session && (session.email || session.empId || session.uid));
  } catch {
    return false;
  }
}

export function FlowPilotWidgetClient() {
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => isUserAuthenticated());

  useEffect(() => {
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

