import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'VMC Platform | Valhalla Motorcycles',
    short_name: 'VMC Platform',
    description: 'Secure operations platform for Valhalla Motorcycles.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f4f8fb',
    theme_color: '#071b36',
    icons: [
      {
        src: '/vmc-logo.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/vmc-logo.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/vmc-logo.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
