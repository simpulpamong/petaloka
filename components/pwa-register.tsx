'use client';

/**
 * Registrasi Service Worker untuk PWA offline penuh.
 */

import { useEffect } from 'react';

export function PwaRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    // Jangan biarkan cache PWA menyajikan bundle lama selama development.
    if (process.env.NODE_ENV !== 'production') {
      void navigator.serviceWorker.getRegistrations().then((registrations) =>
        Promise.all(registrations.map((registration) => registration.unregister())),
      );
      void caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('sig-peta-hd-'))
            .map((key) => caches.delete(key)),
        ),
      );
      return;
    }
    if (!window.isSecureContext && location.hostname !== 'localhost') return;

    const register = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch((err) => {
          console.warn('[pwa] registrasi SW gagal:', err);
        });
    };

    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
  }, []);

  return null;
}
