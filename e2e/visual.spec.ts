import { expect, test } from '@playwright/test'

// Minimal 1×1 red pixel PNG (valid, RGB colortype=2) — same as other specs
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR42mP4z8AAAAMBAQD3A0FDAAAAAElFTkSuQmCC',
  'base64',
)

// Story iframe URLs per frame/film combination
const STORIES = [
  {
    name: 'polaroid_600-polaroid',
    url: '/iframe.html?id=components-instantphotoframe--polaroid-600&viewMode=story',
  },
  {
    name: 'instax_mini-instax',
    url: '/iframe.html?id=components-instantphotoframe--instax-mini&viewMode=story',
  },
  {
    name: 'instax_square-instax',
    url: '/iframe.html?id=components-instantphotoframe--instax-square&viewMode=story',
  },
  {
    name: 'instax_wide-instax',
    url: '/iframe.html?id=components-instantphotoframe--instax-wide&viewMode=story',
  },
  {
    name: 'polaroid_600-original',
    url: '/iframe.html?id=components-instantphotoframe--original&viewMode=story',
  },
]

test.describe('Visual regression – InstantPhotoFrame', () => {
  for (const story of STORIES) {
    test(story.name, async ({ page }) => {
      // Intercept remote images so tests are fully offline and deterministic
      await page.route('**/picsum.photos/**', route =>
        route.fulfill({ contentType: 'image/png', body: TINY_PNG }),
      )

      await page.goto(story.url)
      await expect(page.locator('canvas.ipf-canvas')).toBeVisible()

      // Brief wait for WebGL to complete the first render pass
      await page.waitForTimeout(500)

      await expect(page).toHaveScreenshot(`${story.name}.png`)
    })
  }
})
