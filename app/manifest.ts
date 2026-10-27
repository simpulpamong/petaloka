import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'PetaLoka — Pemetaan Kerawanan Wilayah',
    short_name: 'PetaLoka',
    description:
      'Sistem informasi geografis untuk pemetaan kerawanan wilayah Kabupaten Ponorogo.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#f1f5f9',
    theme_color: '#0f172a',
    lang: 'id',
    categories: ['government', 'maps', 'productivity'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  };
}
