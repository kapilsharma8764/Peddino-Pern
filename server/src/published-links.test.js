import { test } from 'node:test'
import assert from 'node:assert/strict'
import { publishedPageLinks } from './published-links.js'

test('first publish resolves page links before a site slug was known to the client', () => {
  const pages = [{ slug: '', html: '<a href="/">Home</a><a href="/about">About</a>' }, { slug: 'about', html: '<a href="/about#team">Team</a><a href="https://example.com/about">Other site</a><a href="//example.com">External</a>' }]
  const before = JSON.stringify(pages)
  const output = publishedPageLinks(pages, 'demo')
  assert.match(output[0].html, /href="\/site\/demo"/)
  assert.match(output[0].html, /href="\/site\/demo\/about"/)
  assert.match(output[1].html, /href="\/site\/demo\/about#team"/)
  assert.match(output[1].html, /href="https:\/\/example.com\/about"/)
  assert.match(output[1].html, /href="\/\/example.com"/)
  assert.equal(JSON.stringify(pages), before)
  assert.deepEqual(publishedPageLinks(output, 'demo'), output)
})
