import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const landingUrl = 'https://www.usepontus.com.br'
  const appUrl = 'https://app.usepontus.com.br'

  return [
    {
      url: `${landingUrl}/`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
    {
      url: `${appUrl}/cadastro`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.8,
    },
    {
      url: `${appUrl}/login`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.8,
    }
  ]
}
