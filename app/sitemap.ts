import type { MetadataRoute } from 'next';

const marketingRoutes = [
  '',
  '/features',
  '/pricing',
  '/design-feedback-tool',
  '/website-feedback-tool',
  '/image-review-tool',
  '/pdf-proofing-tool',
  '/for-freelancers',
  '/for-agencies',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://wizerview.app';

  return marketingRoutes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: route === '' ? 1 : 0.8,
  }));
}
