/**
 * Reading a logo the user picked from their computer.
 *
 * The picture is scaled down and returned as a data URL, which is then stored
 * with the site. That means no file server and no upload to configure — the
 * logo travels with the site and appears in the published page.
 *
 * Scaling matters more than it looks: a logo straight off a phone can be four
 * megabytes, and a data URL of that size would sit inside every save, every
 * publish and every autosave request. A few hundred pixels is plenty for a
 * header.
 */

export const MAX_FILE_BYTES = 8 * 1024 * 1024

export class ImageReadError extends Error {}

/** Longest side of the stored image, in pixels. */
const DEFAULT_MAX_SIZE = 480

export async function readImageAsDataUrl(
  file: File,
  maxSize = DEFAULT_MAX_SIZE,
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new ImageReadError('That file is not an image')
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new ImageReadError('That image is too large — please pick one under 8 MB')
  }

  // SVG has no pixels to resample and is already small; keep it as it is so a
  // vector logo stays sharp at any size.
  if (file.type === 'image/svg+xml') {
    return readAsDataUrl(file)
  }

  const source = await readAsDataUrl(file)
  const image = await loadImage(source)

  const scale = Math.min(1, maxSize / Math.max(image.width, image.height))
  if (scale === 1) return source

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(image.width * scale)
  canvas.height = Math.round(image.height * scale)

  const context = canvas.getContext('2d')
  if (!context) return source

  context.drawImage(image, 0, 0, canvas.width, canvas.height)

  // PNG rather than JPEG, because logos are usually transparent and JPEG would
  // fill that transparency with black.
  return canvas.toDataURL('image/png')
}

/**
 * Reading a general content photo — a hero image, a gallery picture, a blog
 * cover — picked from a widget's Image field.
 *
 * Unlike a logo, a content photo can reasonably fill the width of a page, so
 * it is resized larger and, because it rarely needs transparency, is allowed
 * to become a WebP or JPEG. Whichever encoding comes out smallest — WebP,
 * JPEG, or the untouched original — is what gets stored, so a photo can only
 * ever get lighter than what the visitor picked, never heavier.
 */
const CONTENT_MAX_SIZE = 1600
const CONTENT_QUALITY = 0.82

export async function compressPhotoAsDataUrl(
  file: File,
  maxSize = CONTENT_MAX_SIZE,
  quality = CONTENT_QUALITY,
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new ImageReadError('That file is not an image')
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new ImageReadError('That image is too large — please pick one under 8 MB')
  }

  // A vector has no pixels to resample, and is already small.
  if (file.type === 'image/svg+xml') {
    return readAsDataUrl(file)
  }

  const original = await readAsDataUrl(file)
  const image = await loadImage(original)

  const scale = Math.min(1, maxSize / Math.max(image.width, image.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(image.width * scale)
  canvas.height = Math.round(image.height * scale)

  const context = canvas.getContext('2d')
  if (!context) return original

  context.drawImage(image, 0, 0, canvas.width, canvas.height)

  const candidates = [original]
  try {
    candidates.push(canvas.toDataURL('image/webp', quality))
  } catch {
    // Some browsers cannot encode WebP; JPEG and the original still apply.
  }
  candidates.push(canvas.toDataURL('image/jpeg', quality))

  // The smallest data URL wins, so a photo never gets heavier than what the
  // visitor picked — a canvas that silently failed to encode just returns
  // the tiny fixed string "data:," which sorts as the shortest candidate but
  // is filtered out first so it can never be chosen by accident.
  const usable = candidates.filter((candidate) => candidate.length > 32)
  return usable.reduce((smallest, candidate) => (candidate.length < smallest.length ? candidate : smallest), usable[0] ?? original)
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new ImageReadError('Could not read that file'))
    reader.readAsDataURL(file)
  })
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new ImageReadError('That image could not be opened'))
    image.src = source
  })
}
