/**
 * Cropping a logo.
 *
 * Two operations, both done on a canvas in the browser so nothing is uploaded
 * anywhere: trimming the empty border a logo file usually carries, and taking
 * a square out of it for the places that need one.
 */

/** Pixels that count as "nothing" when trimming: transparent or near-white. */
function isBlank(data: Uint8ClampedArray, offset: number): boolean {
  const alpha = data[offset + 3]
  if (alpha < 12) return true
  const [r, g, b] = [data[offset], data[offset + 1], data[offset + 2]]
  return r > 245 && g > 245 && b > 245
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('That image could not be opened'))
    image.src = source
  })
}

function toCanvas(image: HTMLImageElement): HTMLCanvasElement | null {
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return null
  context.drawImage(image, 0, 0)
  return canvas
}

/**
 * Removes the blank border around a logo.
 *
 * Logo files are almost always exported with padding, which makes them look
 * small and badly aligned in a header next to text. Trimming is the single
 * most useful thing that can be done to one automatically.
 */
export async function trimEdges(source: string): Promise<string> {
  const image = await loadImage(source)
  const canvas = toCanvas(image)
  if (!canvas) return source

  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return source

  const { width, height } = canvas
  const { data } = context.getImageData(0, 0, width, height)

  let top = 0
  let bottom = height - 1
  let left = 0
  let right = width - 1

  const rowBlank = (y: number) => {
    for (let x = 0; x < width; x += 1) {
      if (!isBlank(data, (y * width + x) * 4)) return false
    }
    return true
  }
  const colBlank = (x: number) => {
    for (let y = top; y <= bottom; y += 1) {
      if (!isBlank(data, (y * width + x) * 4)) return false
    }
    return true
  }

  while (top < bottom && rowBlank(top)) top += 1
  while (bottom > top && rowBlank(bottom)) bottom -= 1
  while (left < right && colBlank(left)) left += 1
  while (right > left && colBlank(right)) right -= 1

  const cropWidth = right - left + 1
  const cropHeight = bottom - top + 1

  // An image that is entirely blank, or already tight, is returned untouched
  // rather than reduced to a single pixel.
  if (cropWidth < 8 || cropHeight < 8) return source
  if (cropWidth === width && cropHeight === height) return source

  const out = document.createElement('canvas')
  out.width = cropWidth
  out.height = cropHeight
  out.getContext('2d')?.drawImage(canvas, left, top, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight)
  return out.toDataURL('image/png')
}

/**
 * Takes a square out of the middle, padding rather than stretching.
 *
 * A wide logo squeezed into a square would distort; this keeps its proportions
 * and leaves the rest transparent, which is what a square mark needs.
 */
export async function toSquare(source: string, size = 320): Promise<string> {
  const image = await loadImage(source)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size

  const context = canvas.getContext('2d')
  if (!context) return source

  const scale = Math.min(size / image.naturalWidth, size / image.naturalHeight)
  const width = image.naturalWidth * scale
  const height = image.naturalHeight * scale

  context.drawImage(image, (size - width) / 2, (size - height) / 2, width, height)
  return canvas.toDataURL('image/png')
}
