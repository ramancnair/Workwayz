'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Only run this on the client
    const checkAuth = () => {
      const userStr = localStorage.getItem('projectflow_user');
      if (!userStr) {
        setIsAuthenticated(false);
        // Only redirect if we're not already on an auth page or the root
        if (pathname !== '/login' && pathname !== '/signup' && pathname !== '/') {
          router.push('/login');
        }
      } else {
        try {
          // Validate it's proper JSON
          JSON.parse(userStr);
          setIsAuthenticated(true);
        } catch (e) {
          localStorage.removeItem('projectflow_user');
          setIsAuthenticated(false);
          router.push('/login');
        }
      }
    };

    checkAuth();
  }, [router, pathname]);

  // Show a loading state or nothing while checking authentication
  if (isAuthenticated === null) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  // If not authenticated, we return null as the router.push will handle the redirect
  if (!isAuthenticated && pathname !== '/login' && pathname !== '/signup' && pathname !== '/') {
    return null;
  }

  return <>{children}</>;
}
