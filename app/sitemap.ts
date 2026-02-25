import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://thewriteway.org';
  const now = new Date();

  const routes = [
    '',
    '/about',
    '/feed',
    '/standards',
    '/safety',
    '/issues',
    '/help',
    '/privacy',
    '/terms',
    '/login',
    '/signup',
  ];

  return routes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: now,
    changeFrequency: route === '' || route === '/feed' ? 'daily' : 'weekly',
    priority: route === '' ? 1 : 0.7,
  }));
}
