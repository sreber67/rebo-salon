import type { MetadataRoute } from 'next';

const SITE_URL = 'https://rebosalon.de';

// Served as /sitemap.xml. The salon's sections (services, booking, ...) are #hash views
// of the home page, so only the real URLs are listed.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/impressum`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/datenschutz`, changeFrequency: 'yearly', priority: 0.3 },
  ];
}
