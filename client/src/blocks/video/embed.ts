/**
 * Working out an embed URL from a link someone pasted.
 *
 * Shared by the editor and the published page so a video that plays while
 * editing also plays once the site is live.
 */

export function extractYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([a-zA-Z0-9_-]{11})/,
  )
  return match?.[1] ?? null
}

export function extractVimeoId(url: string): string | null {
  return url.match(/vimeo\.com\/(\d+)/)?.[1] ?? null
}

/** Null when the link is not one we can embed, so callers can say so. */
export function videoEmbedUrl(url: string, variant: string): string | null {
  if (variant === 'vimeo') {
    const id = extractVimeoId(url)
    return id ? `https://player.vimeo.com/video/${id}` : null
  }
  const id = extractYouTubeId(url)
  // youtube-nocookie so a visitor is not tracked before pressing play.
  return id ? `https://www.youtube-nocookie.com/embed/${id}` : null
}
