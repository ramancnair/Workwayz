'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

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
            if (pathname.startsWith('/setup-wizard')) {
              // Check if user is authenticated and is an Administrator
              const userStr = localStorage.getItem('projectflow_user');
              if (!userStr) {
                router.push('/login');
              } else {
                try {
                  const user = JSON.parse(userStr);
                  if (user.accessLevel !== 'Administrator') {
                    router.push('/project-home');
                  }
                } catch(e) {
                  router.push('/login');
                }
              }
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
