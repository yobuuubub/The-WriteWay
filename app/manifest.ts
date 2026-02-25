import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'The WriteWay',
    short_name: 'The WriteWay',
    description: 'Journalism by and for serious youth.',
    start_url: '/',
    display: 'standalone',
    background_color: '#faf8f5',
    theme_color: '#2c5282',
    icons: [
      {
        src: '/writeway-logo.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };
}
