import { test, expect, signUp, completeWizard, applyTemplate, watchForErrors, expectNoPageErrors } from './fixtures'

/**
 * The path every other spec depends on.
 *
 * If signing up, filling in the form, choosing a template and landing in the
 * editor stops working, every later failure is noise. This runs first and says
 * so plainly.
 */

test('a new user can sign up, fill the form, choose a template and reach the editor', async ({ page }) => {
  const errors = watchForErrors(page)

  await signUp(page)
  await completeWizard(page, 'Sharma Coaching')
  await applyTemplate(page)

  // The original template renders in a sandboxed iframe, not the generic
  // block canvas — a real HTML page, not this builder's own widgets.
  const canvas = page.frameLocator('iframe[title$="website canvas"]')

  // A finished website, not a blank canvas. Personalising the business's own
  // name into the page only rewrites specific known slots (`.navbar-brand`,
  // `.logo a`, `.site-title`) — real, but not every one of the 146 designs
  // uses one of those classes for its logo, so this checks the page actually
  // rendered rather than a specific design's markup.
  await expect(canvas.locator('nav, header').first()).toBeVisible()
  await expect(canvas.locator('footer, [class*="footer" i], [id*="footer" i]').first()).toBeVisible()
  await expect(canvas.locator('body')).not.toBeEmpty()

  expectNoPageErrors(errors)
})
