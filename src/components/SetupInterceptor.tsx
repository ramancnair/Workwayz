'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export function SetupInterceptor() {
  const pathname = usePathname();
  const router = useRouter();
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    // Prevent interfering if we are already on the setup wizard.
    if (pathname.startsWith('/setup-wizard')) {
      return;
    }

    const checkConfig = async () => {
      try {
        const res = await fetch('/api/config/profiles');
        if (res.ok) {
          const data = await res.json();
          const dbSetup = Array.isArray(data.database) && data.database.length > 0;
          const authSetup = Array.isArray(data.authentication) && data.authentication.length > 0;
          const aiSetup = Array.isArray(data.ai) && data.ai.length > 0;

          if (!dbSetup && !authSetup && !aiSetup) {
            // First time run detected, nothing configured.
            router.push('/setup-wizard');
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
