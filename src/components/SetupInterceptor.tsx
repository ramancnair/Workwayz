'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { validateSession } from '@/lib/session';

export function SetupInterceptor() {
  const pathname = usePathname();
  const router = useRouter();
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    const checkConfig = async () => {
      try {
        const res = await fetch('/api/config/profiles');
        if (res.ok) {
          const data = await res.json();
          const dbSetup = Array.isArray(data.database) && data.database.some((d: any) => Boolean(d.provider));
          const authSetup = Array.isArray(data.authentication) && data.authentication.some((a: any) => Boolean(a.provider));
          const aiSetup = Array.isArray(data.ai) && data.ai.length > 0;
          const hasAdmin = typeof data.hasAdmin === 'boolean' ? data.hasAdmin : true;

          const isConfigured = dbSetup;

          if (!isConfigured) {
            // First time run detected, nothing configured.
            if (!pathname.startsWith('/setup-wizard')) {
              router.push('/setup-wizard');
            }
          } else {
            // It is configured.
            // If user is currently on /setup-wizard and the app is already configured, redirect them out
            if (pathname.startsWith('/setup-wizard')) {
              const isForced = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('force') === 'true';
              if (isForced) return;

              // If no admin user exists in the database, allow setup-wizard so they can create the admin account
              if (!hasAdmin) return;

              const { isValid } = validateSession(false);
              if (isValid) {
                router.replace('/my-projects');
                return;
              }
              router.replace('/login');
            }
          }
        }
      } catch (error) {
        console.error('Failed to check configuration status', error);
      } finally {
        setHasChecked(true);
      }
    };

    checkConfig();
  }, [pathname, router]);

  return null;
}
