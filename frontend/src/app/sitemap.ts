import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const landingUrl = 'https://www.usepontus.com.br'

  return [
    {
      url: `${landingUrl}/`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
  ]
}
