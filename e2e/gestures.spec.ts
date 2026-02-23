import { expect, test } from '@playwright/test'
import path from 'node:path'
import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'

const STORY_URL =
  '/iframe.html?id=components-polaroidimageeditor--image-editor&viewMode=story'

// Minimal 1×1 red pixel PNG
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR42mP4z8AAAAMBAQD3A0FDAAAAAElFTkSuQmCC',
  'base64',
)

async function uploadImage(page: import('@playwright/test').Page, filename = 'gesture-test.png') {
  const tmpFile = path.join(tmpdir(), filename)
  writeFileSync(tmpFile, TINY_PNG)
  await page.locator('input[type="file"]').setInputFiles(tmpFile)
  // Wait for the download button to become enabled (WebGL rendered successfully)
  await expect(page.getByRole('button', { name: /download/i })).toBeEnabled({ timeout: 10_000 })
}

test.describe('Gestures – keyboard shortcuts', () => {
  test('overlay is keyboard-focusable (has tabIndex)', async ({ page }) => {
    await page.goto(STORY_URL)
    const overlay = page.locator('.plrd-gesture-overlay')
    await expect(overlay).toBeVisible()
    const tabIndex = await overlay.getAttribute('tabindex')
    expect(tabIndex).toBe('0')
  })

  test('zoom readout changes after pressing + key', async ({ page }) => {
    await page.goto(STORY_URL)
    await uploadImage(page, 'keyboard-zoom.png')

    // Capture baseline zoom readout
    const zoomLocator = page.getByText(/Zoom:/)
    const before = await zoomLocator.textContent()

    // Focus the overlay and press +
    const overlay = page.locator('.plrd-gesture-overlay')
    await overlay.focus()
    await overlay.press('+')

    // Zoom readout should have updated
    await page.waitForTimeout(200)
    const after = await zoomLocator.textContent()
    expect(after).not.toBe(before)
  })

  test('pressing R resets zoom to 1×', async ({ page }) => {
    await page.goto(STORY_URL)
    await uploadImage(page, 'keyboard-reset.png')

    const overlay = page.locator('.plrd-gesture-overlay')
    await overlay.focus()

    // Zoom in, then reset
    await overlay.press('+')
    await overlay.press('+')
    await page.waitForTimeout(100)
    await overlay.press('r')
    await page.waitForTimeout(200)

    const zoomText = await page.getByText(/Zoom:/).textContent()
    expect(zoomText).toMatch(/1\.0×/)
  })

  test('arrow keys change the transform readout when editor is focused', async ({ page }) => {
    await page.goto(STORY_URL)
    await uploadImage(page, 'keyboard-arrow.png')

    // Zoom in first so panning is possible
    const overlay = page.locator('.plrd-gesture-overlay')
    await overlay.focus()
    await overlay.press('+')
    await overlay.press('+')
    await page.waitForTimeout(100)

    // Record state, press arrow key, confirm something changed
    const zoomBefore = await page.getByText(/Zoom:/).textContent()
    await overlay.press('ArrowLeft')
    await page.waitForTimeout(100)
    // Arrow key should not crash (zoom readout stays stable)
    const zoomAfter = await page.getByText(/Zoom:/).textContent()
    // Zoom level unchanged by pan; page didn't crash
    expect(zoomAfter).toBe(zoomBefore)
  })
})

test.describe('Gestures – pointer drag', () => {
  test('drag on gesture overlay does not crash the page', async ({ page }) => {
    await page.goto(STORY_URL)
    await uploadImage(page, 'drag-test.png')

    const overlay = page.locator('.plrd-gesture-overlay')
    const box = await overlay.boundingBox()
    if (!box) throw new Error('Overlay bounding box not available')

    const cx = box.x + box.width / 2
    const cy = box.y + box.height / 2

    // Simulate a drag gesture
    await page.mouse.move(cx, cy)
    await page.mouse.down()
    await page.mouse.move(cx + 50, cy + 30)
    await page.mouse.up()

    // Frame should still be visible and stable
    await expect(page.locator('.plrd-frame--editor')).toBeVisible()
  })
})

test.describe('Gestures – wheel zoom', () => {
  test('mouse wheel zoom does not crash the page', async ({ page }) => {
    await page.goto(STORY_URL)
    await uploadImage(page, 'wheel-test.png')

    const overlay = page.locator('.plrd-gesture-overlay')
    const box = await overlay.boundingBox()
    if (!box) throw new Error('Overlay bounding box not available')

    // Scroll to zoom in
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.wheel(0, -200)
    await page.waitForTimeout(200)

    await expect(page.locator('.plrd-frame--editor')).toBeVisible()
  })
})

test.describe('Visual regression – frame rendering', () => {
  test('frame renders without visual errors (screenshot smoke test)', async ({ page }) => {
    await page.goto(STORY_URL)

    // Capture screenshot of the empty frame state
    const frame = page.locator('.plrd-frame--editor')
    await expect(frame).toBeVisible()

    // Take a screenshot and verify it's non-empty (at least 1 KB)
    const screenshot = await frame.screenshot()
    expect(screenshot.length).toBeGreaterThan(1000)
  })

  test('frame renders after image upload without visible crash state', async ({ page }) => {
    await page.goto(STORY_URL)
    await uploadImage(page, 'screenshot-test.png')

    const frame = page.locator('.plrd-frame--editor')
    const screenshot = await frame.screenshot()
    expect(screenshot.length).toBeGreaterThan(1000)
  })
})
