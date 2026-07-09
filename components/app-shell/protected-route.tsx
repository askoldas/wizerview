"use client";

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createSupabaseClientInstance, isSupabaseConfigured } from '@/lib/supabase';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useMemo(() => createSupabaseClientInstance(), []);
  const [isAllowed, setIsAllowed] = useState(!isSupabaseConfigured());

  useEffect(() => {
    if (!supabase) {
      setIsAllowed(true);
      return;
    }

    let ignored = false;
    supabase.auth.getUser().then(({ data }) => {
      if (ignored) return;
      if (data.user) {
        setIsAllowed(true);
        return;
      }

      router.replace(`/login?next=${encodeURIComponent(pathname || '/dashboard')}`);
    }).catch(() => {
      if (!ignored) router.replace(`/login?next=${encodeURIComponent(pathname || '/dashboard')}`);
    });

    return () => {
      ignored = true;
    };
  }, [pathname, router, supabase]);

  if (!isAllowed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas px-4 text-sm text-text-muted">
        Checking access...
      </main>
    );
  }

  return children;
}
