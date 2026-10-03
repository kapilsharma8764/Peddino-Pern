import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

test.beforeEach(async({page})=>{
  const html=await readFile(resolve('../reports/widget-browser-fixture.html'),'utf8')
  await page.route('**/widget-library-fixture',route=>route.fulfill({contentType:'text/html',body:html}))
  await page.goto('/widget-library-fixture',{waitUntil:'domcontentloaded'})
})
test('all exported widget roots initialize without runtime errors',async({page})=>{
  const roots=page.locator('[data-fw]')
  expect(await roots.count()).toBeGreaterThan(150)
  await expect(page.locator('[data-fw]:not([data-fw-ready])')).toHaveCount(0)
  for(const type of ['section','row','column','grid','auto-grid','masonry-layout','split-layout','sidebar-layout','sticky-container','scroll-container'])await expect(page.locator(`[data-type="${type}"]`)).toContainText('Nested child')
})
test('tab, stepper, flip and disclosure controls work with keyboard',async({page})=>{
  const tabs=page.locator('[data-type="vertical-tabs"]')
  await tabs.getByRole('tab').first().focus();await page.keyboard.press('ArrowDown')
  await expect(tabs.getByRole('tab').nth(1)).toHaveAttribute('aria-selected','true')
  await expect(tabs.getByRole('tabpanel')).toContainText('Flexible options')
  const flip=page.locator('[data-type="flip-card"]');await flip.getByRole('button').click();await expect(flip.locator('[data-panel]').nth(1)).toBeVisible()
  const drawer=page.locator('[data-type="drawer"]');await drawer.getByRole('button',{name:'Open drawer'}).click();await expect(drawer.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');await expect(drawer.getByRole('dialog')).not.toBeVisible()
})
test('carousel and lightbox remain interactive without the editor',async({page})=>{
  const carousel=page.locator('[data-type="testimonial-carousel"]');await carousel.getByRole('button',{name:'Next slide'}).click();await expect(carousel.locator('[data-slide]').nth(1)).toBeVisible()
  const gallery=page.locator('[data-type="lightbox-gallery"]');await gallery.getByRole('button',{name:/Enlarge/}).first().click();await expect(gallery.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');await expect(gallery.getByRole('dialog')).not.toBeVisible()
})
test('before/after, zoom and local search controls update their output',async({page})=>{
  const compare=page.locator('[data-type="before-after"]');await compare.locator('input').fill('80');await expect(compare.locator('[data-after]')).toHaveCSS('clip-path','inset(0px 20% 0px 0px)')
  const zoom=page.locator('[data-type="image-zoom"]');await zoom.locator('input').fill('2');await expect(zoom.locator('[data-zoom-image]')).toHaveCSS('transform','matrix(2, 0, 0, 2, 0, 0)')
  const search=page.locator('[data-type="search-widget"]');await search.getByRole('searchbox').fill('Contact');await expect(search.locator('[data-item]:visible')).toHaveCount(1)
})
test('forms validate and never pretend an unconfigured provider succeeded',async({page})=>{
  const form=page.locator('[data-type="register-form"]')
  await form.getByLabel('Your name').fill('Test Person');await form.getByLabel('Email address').fill('test@example.com');await form.getByLabel('Password',{exact:true}).fill('secret123');await form.getByLabel('Confirm password').fill('different')
  await form.getByRole('button',{name:'Register'}).click();expect(await form.getByLabel('Confirm password').evaluate((input:HTMLInputElement)=>input.validity.valid)).toBe(false)
  await form.getByLabel('Confirm password').fill('secret123');await form.getByRole('button',{name:'Register'}).click();await expect(form.getByRole('status')).toContainText('not connected')
})
test('configured form submits actual fields and reports rejected and accepted responses',async({page})=>{
  const form=page.locator('[data-type="form-container"]')
  await page.route('**/widget-service',route=>route.fulfill({status:422,contentType:'application/json',body:JSON.stringify({error:'Please use another email'})}))
  await form.locator('form').evaluate(el=>{el.dataset.endpoint='/widget-service'})
  await form.getByLabel('Email field').fill('test@example.com')
  await form.getByRole('button',{name:'Send request'}).click();await expect(form.getByRole('status')).toContainText('another email')
  await page.unroute('**/widget-service');let body=''
  await page.route('**/widget-service',route=>{body=route.request().postData()||'';return route.fulfill({contentType:'application/json',body:'{"ok":true,"message":"Received by provider"}'})})
  await form.getByRole('button',{name:'Send request'}).click();await expect(form.getByRole('status')).toHaveText('Received by provider');expect(body).toContain('test@example.com')
})
test('cart, quantity, variants and wishlist share real local state across reload',async({page})=>{
  await page.locator('[data-type="add-to-cart"]').getByRole('button',{name:'Add to cart'}).click()
  await expect(page.locator('[data-type="cart-summary"] [data-cart-total]')).toContainText('$24.00')
  await page.locator('[data-type="product-variations"]').getByRole('combobox').selectOption('1');await page.locator('[data-type="product-variations"]').getByRole('button').click()
  await expect(page.locator('[data-type="mini-cart"]')).toContainText('Large')
  const wishlist=page.locator('[data-type="wishlist"] button');await wishlist.click();await expect(wishlist).toHaveAttribute('aria-pressed','true');await page.reload({waitUntil:'domcontentloaded'});await expect(wishlist).toHaveAttribute('aria-pressed','true')
  await page.locator('[data-type="cart-summary"]').getByRole('button',{name:'Remove Everyday notebook'}).click();await expect(page.locator('[data-type="cart-summary"] [data-cart-total]')).toContainText('$24.00')
})
test('billing, tables, calendars and calculators compute working results',async({page})=>{
  const pricing=page.locator('[data-type="pricing-toggle"]');await pricing.getByRole('combobox').selectOption('annual');await expect(pricing.locator('output')).toContainText('$290.00 / year')
  const table=page.locator('[data-type="data-table"]');await table.getByRole('searchbox').fill('Engineering');await expect(table.locator('tbody tr:visible')).toHaveCount(1);await expect(table.locator('tbody tr:visible')).toContainText('Sam Lee')
  const calc=page.locator('[data-type="calculator"]');await calc.getByRole('combobox').selectOption('*');await expect(calc.locator('output')).toHaveText('50')
  const calendar=page.locator('[data-type="calendar"]');await calendar.getByRole('button',{name:'2026-09-20',exact:true}).click();await expect(calendar.locator('output')).toHaveText('2026-09-20');await calendar.getByRole('button',{name:'Next month'}).click();await expect(calendar.locator('[data-month-label]')).toContainText('October')
})
test('load more, read more, timer and checklist respond to user input',async({page})=>{
  const more=page.locator('[data-type="load-more"]');await more.getByRole('button').click();await expect(more.locator('[data-item]:visible')).toHaveCount(2)
  const text=page.locator('[data-type="read-more"]');await text.getByRole('button').click();await expect(text.locator('[data-full]')).toBeVisible()
  const timer=page.locator('[data-type="stopwatch"]');await timer.getByRole('button',{name:'Start'}).click();await expect(timer.locator('output')).not.toHaveText('00:00');await timer.getByRole('button',{name:'Reset'}).click();await expect(timer.locator('output')).toHaveText('00:00')
  const tracker=page.locator('[data-type="progress-tracker"]');await tracker.getByRole('checkbox').first().check();await expect(tracker.locator('output')).toHaveText('1 completed')
})
test('widget output fits desktop tablet and mobile widths',async({page})=>{
  for(const width of [1440,820,390]){
    await page.setViewportSize({width,height:900})
    const overflowing=await page.locator('[data-fw]').evaluateAll(roots=>roots.filter(root=>root.getBoundingClientRect().right>window.innerWidth+2).map(root=>root.getAttribute('data-type')))
    expect(overflowing).toEqual([])
  }
})
