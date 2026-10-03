import { test, expect, openBlankEditor, watchForErrors, expectNoPageErrors } from './fixtures'
import type { Locator, Page } from '@playwright/test'

/**
 * The editor, driven with a real pointer.
 *
 * The unit tests exercise the tree operations directly. These go through the
 * mouse, because the interesting failures live between the two: a drop target
 * that is never measured, a handle that swallows the click that should select,
 * a drag that lands one place short. None of that shows up when the store is
 * called from a test.
 */

/** The canvas the editor draws the site into. */
function canvasOf(page: Page) {
  return page.getByRole('region', { name: /Site preview/ })
}

/**
 * The left sidebar opens on Pages; the widget library and the layer list are
 * behind their own tabs. Every helper that needs one asks for it by name, so a
 * test never depends on which tab happened to be open last.
 */
async function openPanel(page: Page, name: 'Pages' | 'Widgets' | 'Layers') {
  await page.getByRole('button', { name, exact: true }).first().click()
}

/** The widget library's search box, with its panel opened first. */
async function widgetSearch(page: Page) {
  await openPanel(page, 'Widgets')
  return page.getByPlaceholder('Search 200+ widgets...')
}

/** Adds a widget from the library by clicking it, which appends it to the page. */
async function addWidget(page: Page, label: string) {
  await (await widgetSearch(page)).fill(label)
  await page.getByRole('button', { name: new RegExp(`^${label}$`) }).first().click()
}

/**
 * A drag the browser genuinely performs.
 *
 * Three things make this the same gesture a person makes rather than a
 * synthetic event:
 *
 * 1. dnd-kit only starts a drag after a few pixels of pointer movement, so the
 *    pointer travels a short distance before it heads anywhere.
 * 2. Landing places only exist while a drag is running, and adding them
 *    changes the layout â€” the header and the page each grow a drop strip. So
 *    the destination is measured *after* the drag has begun, not before, or
 *    the pointer arrives where the target used to be.
 * 3. Both ends have to be on screen; a bounding box is measured against the
 *    viewport, and a target below the fold gives coordinates the mouse can
 *    never reach.
 */
async function dragOnto(
  page: Page,
  source: Locator,
  target: Locator,
  options: { scrollToTarget?: boolean } = {},
) {
  // Centred, not merely in view. dnd-kit scrolls the canvas by itself when the
  // pointer sits near an edge, which slides the destination out from under a
  // pointer that is holding still â€” the drop then lands on whatever moved into
  // its place. A person watching the screen follows the movement; a test has
  // to start away from the edge instead.
  //
  // Some landing places only exist while a drag is running, and those cannot
  // be scrolled to beforehand; for those the source is centred instead and the
  // destination is found once the drag has begun.
  if (options.scrollToTarget === false) {
    await source.evaluate((node) => node.scrollIntoView({ block: 'center' }))
  } else {
    await target.evaluate((node) => node.scrollIntoView({ block: 'center' }))
    await source.scrollIntoViewIfNeeded()
  }

  const from = await source.boundingBox()
  if (!from) throw new Error('cannot drag: the thing being dragged is not on screen')

  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  // Past the sensor's activation distance, so the drag is running â€” and the
  // drop targets exist â€” before anything is measured.
  await page.mouse.move(from.x + from.width / 2 + 12, from.y + from.height / 2 + 12, { steps: 4 })

  const to = await target.boundingBox()
  if (!to) {
    await page.mouse.up()
    throw new Error('cannot drag: the destination is not on screen')
  }

  const x = to.x + to.width / 2
  const y = to.y + to.height / 2
  await page.mouse.move(x, y, { steps: 20 })
  // A second move at the destination gives dnd-kit a frame to register the
  // target under the pointer before the button comes up.
  await page.mouse.move(x, y + 1, { steps: 2 })
  await page.mouse.up()
}

/** The saved document, read from the editor's own JSON view. */
async function readConfig(page: Page) {
  await page.getByRole('button', { name: 'Toggle JSON drawer' }).click()
  const text = await page.locator('pre').first().innerText()
  await page.getByRole('button', { name: 'Toggle JSON drawer' }).click()
  return JSON.parse(text)
}

test.describe('the editor', () => {
  test.beforeEach(async ({ page }) => {
    await openBlankEditor(page)
  })

  test('adds a widget from the library and draws it on the page', async ({ page }) => {
    const errors = watchForErrors(page)

    await addWidget(page, 'Heading')

    // The widget's own sample words appear on the page, which is what tells
    // someone it landed.
    await expect(canvasOf(page).getByText('Welcome to our business')).toBeVisible()

    expectNoPageErrors(errors)
  })

  test('selecting a section opens its controls, and a control changes the page', async ({ page }) => {
    const canvas = canvasOf(page)
    await canvas.locator('h1').first().click()

    const heading = page.getByLabel('Heading', { exact: true })
    await expect(heading).toBeVisible()

    await heading.fill('Controls really are wired up')
    await expect(canvas.locator('h1').first()).toHaveText('Controls really are wired up')
  })

  test('a style control changes the section it is pointed at', async ({ page }) => {
    const canvas = canvasOf(page)
    await canvas.locator('h1').first().click()

    await page.getByRole('button', { name: 'Advanced', exact: true }).click()
    await page.getByLabel('Space above').fill('120')

    // Read back from the document rather than from the pixels, so this cannot
    // pass on a coincidence of layout.
    const config = await readConfig(page)
    const blocks = config.pages?.[0]?.blocks ?? config.blocks
    const styled = blocks.find((block: { style?: { paddingTop?: number } }) => block.style?.paddingTop === 120)
    expect(styled, 'no section recorded the spacing that was set').toBeTruthy()
  })

  test('a responsive override leaves the other breakpoints alone', async ({ page }) => {
    const canvas = canvasOf(page)
    await canvas.locator('h1').first().click()
    await page.getByRole('button', { name: 'Advanced', exact: true }).click()

    // Desktop first.
    await page.getByLabel('Space above').fill('100')

    // Then the phone, which must record its own value without disturbing the
    // desktop one â€” the fault that makes people give up on responsive editing.
    await page.getByRole('button', { name: 'Mobile', exact: true }).click()
    await page.getByLabel('Space above').fill('20')

    const config = await readConfig(page)
    const blocks = config.pages?.[0]?.blocks ?? config.blocks
    const block = blocks.find((entry: { style?: { paddingTop?: number } }) => entry.style?.paddingTop === 100)

    expect(block, 'the desktop value was lost when the phone was edited').toBeTruthy()
    expect(block.style.mobile?.paddingTop).toBe(20)
    expect(block.style.paddingTop).toBe(100)
  })

  test('duplicates and deletes a section', async ({ page }) => {
    const before = (await readConfig(page)).pages[0].blocks.length

    await addWidget(page, 'Heading')
    const added = (await readConfig(page)).pages[0].blocks
    expect(added.length).toBe(before + 1)

    // Duplicate from the layers list, which addresses blocks by id.
    await openPanel(page, 'Layers')
    // The canvas draws the same section with the same name, so the layer's own
    // buttons are found by their exact labels ("Duplicate Heading", not "Duplicate heading block").
    const layer = page.locator('div.group').filter({ has: page.getByRole('button', { name: 'Duplicate Heading', exact: true }) }).first()
    await layer.hover()
    await layer.getByRole('button', { name: 'Duplicate Heading', exact: true }).click()
    expect((await readConfig(page)).pages[0].blocks.length).toBe(before + 2)

    await layer.hover()
    await layer.getByRole('button', { name: 'Remove Heading', exact: true }).first().click()
    expect((await readConfig(page)).pages[0].blocks.length).toBe(before + 1)
  })

  test.describe('nested layouts', () => {
    test('drags a widget from the library into an empty container', async ({ page }) => {
      const errors = watchForErrors(page)

      await addWidget(page, 'Container')
      const dropArea = canvasOf(page).getByText('Drop widgets here')
      await expect(dropArea).toBeVisible()

      await (await widgetSearch(page)).fill('Heading')
      const card = page.getByRole('button', { name: /^Heading$/ }).first()

      await dragOnto(page, card, dropArea)

      // The widget is inside the container in the document, not merely below it.
      const config = await readConfig(page)
      const container = config.pages[0].blocks.find(
        (block: { type: string }) => block.type === 'container',
      )
      expect(container.children).toHaveLength(1)
      expect(container.children[0].type).toBe('heading')

      // And it has the controls a nested widget gets.
      await expect(page.getByLabel('Move heading')).toBeVisible()

      expectNoPageErrors(errors)
    })

    test('selects and edits a widget that sits inside a container', async ({ page }) => {
      await addWidget(page, 'Container')
      await (await widgetSearch(page)).fill('Heading')
      await dragOnto(
        page,
        page.getByRole('button', { name: /^Heading$/ }).first(),
        canvasOf(page).getByText('Drop widgets here'),
      )

      await canvasOf(page).getByText('Welcome to our business').click()

      const control = page.getByLabel('Heading text')
      await expect(control).toBeVisible()
      await control.fill('Edited two levels down')
      await expect(canvasOf(page).getByText('Edited two levels down')).toBeVisible()
    })

    test('moves a widget from one container into another', async ({ page }) => {
      // Moving between parents is the operation nesting exists for, and the
      // one a flat list cannot express at all. Two containers side by side
      // keep both ends of the drag on screen, which a drag to the far end of
      // the page would not.
      await addWidget(page, 'Container')
      await (await widgetSearch(page)).fill('Heading')
      await dragOnto(
        page,
        page.getByRole('button', { name: /^Heading$/ }).first(),
        canvasOf(page).getByText('Drop widgets here'),
      )

      // New widgets go next to the selected one (here, inside the first container); the second
      // container is meant to sit beside it on the page, so ask for the end of the page.
      await page.getByRole('button', { name: 'Page end' }).click()
      await addWidget(page, 'Container')

      let config = await readConfig(page)
      let containers = config.pages[0].blocks.filter((b: { type: string }) => b.type === 'container')
      expect(containers).toHaveLength(2)
      expect(containers[0].children).toHaveLength(1)

      // The second container is the only empty one, so its drop area is the
      // only one offering to take something.
      const empty = canvasOf(page).getByText('Drop widgets here')
      await dragOnto(page, page.getByLabel('Move heading'), empty)

      config = await readConfig(page)
      containers = config.pages[0].blocks.filter((b: { type: string }) => b.type === 'container')

      expect(containers[0].children, 'the widget did not leave the first container').toHaveLength(0)
      expect(containers[1].children, 'the widget did not arrive in the second').toHaveLength(1)
      expect(containers[1].children[0].type).toBe('heading')
    })

    test('shows nested widgets in the layers list', async ({ page }) => {
      await addWidget(page, 'Container')
      await (await widgetSearch(page)).fill('Heading')
      await dragOnto(
        page,
        page.getByRole('button', { name: /^Heading$/ }).first(),
        canvasOf(page).getByText('Drop widgets here'),
      )

      // First establish that the widget really is nested â€” a heading sitting
      // beside the container would give the layer list an identical-looking
      // row, so the panel alone proves nothing.
      const config = await readConfig(page)
      const container = config.pages[0].blocks.find((b: { type: string }) => b.type === 'container')
      expect(container.children).toHaveLength(1)

      await openPanel(page, 'Layers')
      await expect(page.getByText('Section', { exact: true }).last()).toBeVisible()

      // The nested row is drawn indented, under its container, with the branch
      // marker the flat rows never carry.
      await expect(page.getByText('└', { exact: true }).first()).toBeAttached()
      await expect(page.getByLabel('Remove Heading').last()).toBeAttached()
    })

    test('refuses to move a container inside itself', async ({ page }) => {
      await addWidget(page, 'Container')
      await (await widgetSearch(page)).fill('Heading')
      await dragOnto(
        page,
        page.getByRole('button', { name: /^Heading$/ }).first(),
        canvasOf(page).getByText('Drop widgets here'),
      )

      const before = JSON.stringify((await readConfig(page)).pages[0].blocks)

      // Grab the container by its own section handle and aim it at the widget
      // it contains â€” the move that would detach the branch from the page.
      const section = canvasOf(page)
        .locator('[aria-label="container block"], [aria-label="container block, selected"]')
        .first()
      await section.scrollIntoViewIfNeeded()
      await section.hover()

      const handle = page.getByLabel('Drag container section to move it')
      const child = canvasOf(page).getByText('Welcome to our business')
      await dragOnto(page, handle, child)

      const after = JSON.stringify((await readConfig(page)).pages[0].blocks)
      expect(after, 'the document changed on an impossible move').toBe(before)
    })
  })
})
