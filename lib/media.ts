import 'server-only'

const PROVIDERS = new Map([
  ['youtube.com', 'YouTube'],
  ['www.youtube.com', 'YouTube'],
  ['youtu.be', 'YouTube'],
  ['vimeo.com', 'Vimeo'],
  ['www.vimeo.com', 'Vimeo'],
])

export function detectMediaProvider(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl)
    return PROVIDERS.get(url.hostname.toLowerCase()) ?? null
  } catch {
    return null
  }
}

export function mediaEmbedUrl(rawUrl: string, provider: string | null): string | null {
  if (!provider) return null
  try {
    const url = new URL(rawUrl)
    const host = url.hostname.toLowerCase()
    if (provider === 'YouTube' && host === 'youtu.be') {
      const id = url.pathname.slice(1)
      return id ? `https://www.youtube.com/embed/${encodeURIComponent(id)}` : null
    }
    if (provider === 'YouTube' && host.endsWith('youtube.com')) {
      const id = url.searchParams.get('v')
      return id ? `https://www.youtube.com/embed/${encodeURIComponent(id)}` : null
    }
    if (provider === 'Vimeo' && host.endsWith('vimeo.com')) {
      const id = url.pathname.split('/').filter(Boolean).pop()
      return id && /^\d+$/.test(id) ? `https://player.vimeo.com/video/${id}` : null
    }
  } catch {
    return null
  }
  return null
}
