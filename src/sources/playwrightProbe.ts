import { chromium } from "playwright";

export async function capturePublicPageScreenshot(url: string, outputPath: string): Promise<void> {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 1600 } });
    await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
    await page.screenshot({ path: outputPath, fullPage: true });
  } finally {
    await browser.close();
  }
}
