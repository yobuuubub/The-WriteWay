import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://thewriteway.org';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/dashboard', '/my-articles', '/notifications', '/submit'],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
