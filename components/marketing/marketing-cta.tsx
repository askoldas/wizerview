"use client";

import { useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createSupabaseClientInstance } from '@/lib/supabase';

export function StartFreeButton({ children = 'Start free', className = '' }: { children?: string; className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useMemo(() => createSupabaseClientInstance(), []);

  const start = async () => {
    const { data } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
    if (data.user) {
      router.push('/reviews/new');
      return;
    }
    router.push(`${pathname || '/'}?auth=signup&next=${encodeURIComponent('/reviews/new')}`);
  };

  return (
    <button type="button" onClick={start} className={className}>
      {children}
    </button>
  );
}
