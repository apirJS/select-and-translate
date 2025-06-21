import { test, expect } from './fixture';

test.describe('End-to-end test', () => {
  test('Should load the popup.html properly', async ({ page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await expect(page.locator('h2')).toHaveText('Select and Translate');
  });

  test('Should activate selection, select text, and show a result', async ({
    page,
  }) => {
    await page.goto('https://guthib.com/');
    await page.evaluate(() =>
      window.dispatchEvent(new CustomEvent('trigger-select-and-translate'))
    );

    const textElement = page.locator('h1');
    await textElement.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    // Get updated bounding box
    const boundingBox = await textElement.boundingBox();
    if (!boundingBox) {
      throw new Error('Element not visible or has no dimensions');
    }

    // Add small offsets to avoid edge cases
    const startX = boundingBox.x + 5;
    const startY = boundingBox.y + 5;
    const endX = boundingBox.x + boundingBox.width - 5;
    const endY = boundingBox.y + boundingBox.height - 5;

    // Perform the selection with small delays
    await page.mouse.move(startX, startY);
    await page.waitForTimeout(100);
    await page.mouse.down({ button: 'left' });
    await page.waitForTimeout(100);
    await page.mouse.move(endX, endY, { steps: 10 }); // Move in steps for smoother selection
    await page.waitForTimeout(100);
    await page.mouse.up();
    await page.waitForTimeout(500); // Allow time for selection to register

    const originalText = page.locator('.original-text-content');
    await expect(originalText).toBeVisible({ timeout: 5000 });
    await expect(originalText).toContainText('You spelled it wrong.');

    const translatedText = page.locator('.translated-text-content');
    await expect(translatedText).toBeVisible({ timeout: 5000 });
    await expect(translatedText).toContainText('salah');
  });
});
