// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { ImageReadError, MAX_FILE_BYTES, compressPhotoAsDataUrl } from './read-image'

function fakeFile(name: string, type: string, size = 1024): File {
  const file = new File([new Uint8Array(size)], name, { type })
  return file
}

describe('compressPhotoAsDataUrl', () => {
  it('refuses a file that is not an image', async () => {
    await expect(compressPhotoAsDataUrl(fakeFile('brochure.pdf', 'application/pdf'))).rejects.toBeInstanceOf(ImageReadError)
  })

  it('refuses an image over the size limit', async () => {
    await expect(compressPhotoAsDataUrl(fakeFile('huge.jpg', 'image/jpeg', MAX_FILE_BYTES + 1))).rejects.toThrow('too large')
  })

  it('keeps an SVG untouched, since it has no pixels to resample', async () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1"/></svg>'
    const file = new File([svg], 'mark.svg', { type: 'image/svg+xml' })
    const result = await compressPhotoAsDataUrl(file)
    expect(result).toMatch(/^data:image\/svg\+xml/)
  })
})
