import sharp from 'sharp'
import { createHash } from 'node:crypto'

/** Keep URLs and animated media; compact still images for the hosted catalog. */
export async function compactAsset(data, contentType, encoding = 'identity') {
  let bytes = data
  let type = contentType
  let warning
  if (encoding === 'identity' && ['image/jpeg', 'image/png'].includes(contentType)) {
    try {
      const image = sharp(data, { animated: true })
      const metadata = await image.metadata()
      if ((metadata.pages ?? 1) === 1) {
        const compact = await image.rotate().resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 55, effort: 4 }).toBuffer()
        if (compact.length < data.length) {
          bytes = compact
          type = 'image/webp'
        }
      }
    } catch {
      warning = 'The source image could not be optimized'
    }
  }
  return { data: bytes, contentType: type, encoding, hash: createHash('sha256').update(bytes).digest('hex'), warning }
}

/**
 * Leaves the big videos out of an export. A hosted 1 GB database cannot hold them, and a
 * template without its background video still opens and reads fine. Their URLs are dropped
 * too, so nothing in the database points at a file that is not there.
 */
export function dropLargeVideos(manifest, maxBytes) {
  const size = new Map(manifest.blobs.map((blob) => [blob.hash, blob.size]))
  const isLarge = (asset) => asset.content_type.startsWith('video/') && (size.get(asset.blob_hash) ?? 0) > maxBytes
  const assets = manifest.assets.filter((asset) => !isLarge(asset))
  const used = new Set(assets.map((asset) => asset.blob_hash))
  const blobs = manifest.blobs.filter((blob) => used.has(blob.hash))
  const dropped = manifest.assets.filter(isLarge).map((asset) => asset.id)
  return { ...manifest, assets, blobs, bytes: blobs.reduce((sum, blob) => sum + blob.size, 0), droppedVideos: dropped }
}
