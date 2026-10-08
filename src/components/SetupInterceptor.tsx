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
          const dbSetup = Array.isArray(data.database) && data.database.length > 0;
          const authSetup = Array.isArray(data.authentication) && data.authentication.length > 0;
          const aiSetup = Array.isArray(data.ai) && data.ai.length > 0;

          const isConfigured = dbSetup || authSetup || aiSetup;

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
