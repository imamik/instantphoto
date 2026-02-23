import { expect, test } from '@playwright/test'

// Storybook iframe URL for the Polaroid600 story.
// Route all picsum.photos image requests to a tiny 1×1 PNG so the test
// does not depend on external network access.
const STORY_URL =
  '/iframe.html?id=components-polaroidframe--polaroid-600&viewMode=story'

// Minimal 1×1 red pixel PNG (valid, RGB colortype=2)
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR42mP4z8AAAAMBAQD3A0FDAAAAAElFTkSuQmCC',
  'base64',
)

test.describe('PolaroidFrame', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept remote images so the test is fully offline
    await page.route('**/picsum.photos/**', route =>
      route.fulfill({ contentType: 'image/png', body: TINY_PNG }),
    )
  })

  test('renders .plrd-frame container', async ({ page }) => {
    await page.goto(STORY_URL)
    await expect(page.locator('.plrd-frame')).toBeVisible()
  })

  test('renders a <canvas> element', async ({ page }) => {
    await page.goto(STORY_URL)
    await expect(page.locator('canvas.plrd-canvas')).toBeVisible()
  })

  test('canvas has non-zero dimensions', async ({ page }) => {
    await page.goto(STORY_URL)
    const box = await page.locator('canvas.plrd-canvas').boundingBox()
    expect(box).not.toBeNull()
    expect(box!.width).toBeGreaterThan(0)
    expect(box!.height).toBeGreaterThan(0)
  })

  test('frame has correct CSS aspect-ratio custom property', async ({ page }) => {
    await page.goto(STORY_URL)
    const frameAspect = await page.locator('.plrd-frame').evaluate(el =>
      getComputedStyle(el).getPropertyValue('--plrd-frame-aspect').trim(),
    )
    // polaroid_600 totalSize = 1080 × 1296 → "1080 / 1296"
    expect(frameAspect).toBe('1080 / 1296')
  })

  test('canvas pixel width matches polaroid_600 canvasSize (933px)', async ({ page }) => {
    await page.goto(STORY_URL)
    // The canvas is physically sized to 300 DPI; CSS scales it visually.
    const canvasW = await page
      .locator('canvas.plrd-canvas')
      .evaluate((el: HTMLCanvasElement) => el.width)
    expect(canvasW).toBe(933)
  })
})
