import { expect, test } from '@playwright/test'
import path from 'node:path'
import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'

const STORY_URL =
  '/iframe.html?id=components-polaroidimageeditor--image-editor&viewMode=story'

// Minimal 1×1 red pixel PNG (valid, RGB colortype=2)
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR42mP4z8AAAAMBAQD3A0FDAAAAAElFTkSuQmCC',
  'base64',
)

test.describe('InstantPhotoImageEditor', () => {
  test('renders frame and gesture overlay without a source image', async ({ page }) => {
    await page.goto(STORY_URL)
    await expect(page.locator('.ipf-frame--editor')).toBeVisible()
    await expect(page.locator('.ipf-gesture-overlay')).toBeVisible()
  })

  test('shows upload prompt when no image is loaded', async ({ page }) => {
    await page.goto(STORY_URL)
    await expect(page.getByText('Upload a photo to begin')).toBeVisible()
  })

  test('upload button is visible', async ({ page }) => {
    await page.goto(STORY_URL)
    await expect(page.getByRole('button', { name: /upload photo/i })).toBeVisible()
  })

  test('download button is disabled before upload', async ({ page }) => {
    await page.goto(STORY_URL)
    const btn = page.getByRole('button', { name: /no image/i })
    await expect(btn).toBeVisible()
    await expect(btn).toBeDisabled()
  })

  test('after upload the download button becomes enabled', async ({ page }) => {
    await page.goto(STORY_URL)

    // Write the tiny PNG to a temp file so setInputFiles can read it
    const tmpFile = path.join(tmpdir(), 'playwright-test.png')
    writeFileSync(tmpFile, TINY_PNG)

    await page.locator('input[type="file"]').setInputFiles(tmpFile)

    // After WebGL renders (or fails gracefully), the button text changes
    await expect(
      page.getByRole('button', { name: /download/i }),
    ).toBeEnabled({ timeout: 10_000 })
  })

  test('zoom readout is hidden before upload', async ({ page }) => {
    await page.goto(STORY_URL)
    // The zoom readout only appears once an image is loaded
    await expect(page.getByText(/Zoom:/)).not.toBeVisible()
  })

  test('zoom readout appears after upload', async ({ page }) => {
    await page.goto(STORY_URL)

    const tmpFile = path.join(tmpdir(), 'playwright-test2.png')
    writeFileSync(tmpFile, TINY_PNG)

    await page.locator('input[type="file"]').setInputFiles(tmpFile)
    await expect(page.getByText(/Zoom:/)).toBeVisible({ timeout: 10_000 })
  })

  test('frame format radio buttons are present', async ({ page }) => {
    await page.goto(STORY_URL)
    await expect(page.getByRole('radio', { name: /polaroid 600/i })).toBeVisible()
    await expect(page.getByRole('radio', { name: /instax mini/i })).toBeVisible()
    await expect(page.getByRole('radio', { name: /instax square/i })).toBeVisible()
    await expect(page.getByRole('radio', { name: /instax wide/i })).toBeVisible()
  })

  test('switching frame type remounts the canvas', async ({ page }) => {
    await page.goto(STORY_URL)

    // Record initial canvas dimensions
    const initialAspect = await page
      .locator('.ipf-frame')
      .evaluate(el => getComputedStyle(el).getPropertyValue('--ipf-frame-aspect').trim())

    // Switch to Instax Mini
    await page.getByRole('radio', { name: /instax mini/i }).click()

    // Frame aspect ratio CSS var should change
    const newAspect = await page
      .locator('.ipf-frame')
      .evaluate(el => getComputedStyle(el).getPropertyValue('--ipf-frame-aspect').trim())

    expect(newAspect).not.toBe(initialAspect)
  })
})
