import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

const BUILD_DATE = new Date();

export default function sitemap(): MetadataRoute.Sitemap {
    const routes = ['', '/about', '/contact', '/extension'];
    return routes.map((path) => ({
        url: `${SITE_URL}${path || '/'}`,
        lastModified: BUILD_DATE,
        changeFrequency: 'monthly',
        priority: path === '' ? 1 : 0.7
    }));
}
