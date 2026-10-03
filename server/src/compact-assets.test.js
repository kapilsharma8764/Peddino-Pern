import { test } from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import { gzipSync } from 'node:zlib'
import { compactAsset, dropLargeVideos } from './compact-assets.js'

test('compact images remain decodable and keep transparency and bounded dimensions', async () => {
  const original = await sharp({ create: { width: 2000, height: 1000, channels: 4, background: { r: 50, g: 100, b: 150, alpha: 0.4 } } }).png().toBuffer()
  const compact = await compactAsset(original, 'image/png')
  const metadata = await sharp(compact.data).metadata()
  assert.equal(compact.contentType, 'image/webp')
  assert.equal(metadata.format, 'webp')
  assert.equal(metadata.width, 1024)
  assert.equal(metadata.height, 512)
  assert.equal(metadata.hasAlpha, true)
  assert.ok(compact.data.length < original.length)
  assert.equal(compact.hash, (await compactAsset(original, 'image/png')).hash)
})

test('compressed HTML, fonts and videos retain their bytes and encoding', async () => {
  for (const [data, type, encoding] of [[gzipSync('<h1>Template</h1>'), 'text/html', 'gzip'], [Buffer.from('font'), 'font/woff', 'identity'], [Buffer.from('video'), 'video/mp4', 'identity']]) {
    const compact = await compactAsset(data, type, encoding)
    assert.deepEqual(compact.data, data)
    assert.equal(compact.contentType, type)
    assert.equal(compact.encoding, encoding)
  }
})

test('an invalid source image is preserved and reported instead of losing its URL', async () => {
  const original = Buffer.from('unreadable source image')
  const result = await compactAsset(original, 'image/png')
  assert.deepEqual(result.data, original)
  assert.equal(result.contentType, 'image/png')
  assert.ok(result.warning)
})

test('big videos and their URLs are left out of the hosted copy, everything else stays', () => {
  const MB = 1024 * 1024
  const manifest = {
    assets: [
      { id: 'a/hero.mp4', content_type: 'video/mp4', blob_hash: 'v1' },
      { id: 'b/hero.mp4', content_type: 'video/mp4', blob_hash: 'v1' },
      { id: 'a/small.webm', content_type: 'video/webm', blob_hash: 'v2' },
      { id: 'a/logo.webp', content_type: 'image/webp', blob_hash: 'i1' },
    ],
    blobs: [{ hash: 'v1', size: 9 * MB }, { hash: 'v2', size: 1 * MB }, { hash: 'i1', size: 10 }],
    bytes: 10 * MB + 10, catalog: [{ id: 'a' }], warnings: [],
  }
  const trimmed = dropLargeVideos(manifest, 3 * MB)
  assert.deepEqual(trimmed.assets.map((asset) => asset.id), ['a/small.webm', 'a/logo.webp'])
  assert.deepEqual(trimmed.blobs.map((blob) => blob.hash), ['v2', 'i1'])
  assert.equal(trimmed.bytes, 1 * MB + 10)
  assert.deepEqual(trimmed.droppedVideos, ['a/hero.mp4', 'b/hero.mp4'])
  assert.deepEqual(trimmed.catalog, manifest.catalog)
  assert.equal(manifest.assets.length, 4, 'the original manifest is not changed')
})
