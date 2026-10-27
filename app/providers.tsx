'use client';

/**
 * Providers client-side: AppProvider (state + IndexedDB) + host Toast.
 */

import { AppProvider } from '@/lib/store';
import { ToastViewport } from '@/components/ui/ToastViewport';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      {children}
      <ToastViewport />
    </AppProvider>
  );
}
