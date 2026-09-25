const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const outputDir = 'C:\\Users\\asher\\.gemini\\antigravity\\brain\\ea29ee6c-2a2c-4289-b420-9189a96b0993';
const baseUrl = 'https://fieldledger.bridgewayapps.com';

async function run() {
  console.log('🚀 Launching Playwright browser...');
  const browser = await chromium.launch({ headless: true });

  // 1. Desktop Screenshot: Homepage Hero & Interactive Product Tour
  console.log('📸 1. Capturing Desktop Homepage & Product Tour...');
  const page1 = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page1.goto(baseUrl, { waitUntil: 'networkidle' });
  await page1.waitForTimeout(1500);
  
  const heroPath = path.join(outputDir, 'playwright_fieldledger_hero_tour.png');
  await page1.screenshot({ path: heroPath });
  console.log(`   Saved: ${heroPath}`);

  // 2. Desktop Screenshot: Interactive Compliance Calculators & Pricing
  console.log('📸 2. Capturing Pricing & Compliance Tools...');
  await page1.evaluate(() => window.scrollTo(0, 1400));
  await page1.waitForTimeout(1000);
  const pricingPath = path.join(outputDir, 'playwright_fieldledger_pricing.png');
  await page1.screenshot({ path: pricingPath });
  console.log(`   Saved: ${pricingPath}`);

  // 3. Mobile Screenshot: PWA Mobile Tech Experience (iPhone 14 / Pixel Viewport)
  console.log('📸 3. Capturing Mobile App Technician Viewport...');
  const page2 = await browser.newPage({
    viewport: { width: 393, height: 852 },
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });
  await page2.goto(`${baseUrl}/app?company=Ozark%20Fire%20%26%20Safety&trade=extinguisher`, { waitUntil: 'networkidle' });
  await page2.waitForTimeout(1500);
  
  const mobileAppPath = path.join(outputDir, 'playwright_fieldledger_mobile_app.png');
  await page2.screenshot({ path: mobileAppPath });
  console.log(`   Saved: ${mobileAppPath}`);

  // 4. Interactive Tour Click Screenshot (Switching to Kitchen Hood in the Tour)
  console.log('📸 4. Capturing Interactive Kitchen Hood Tour Tab...');
  const page3 = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page3.goto(baseUrl, { waitUntil: 'networkidle' });
  await page3.waitForTimeout(1000);
  
  // Click on "Kitchen Hood" button inside the simulator
  const hoodButton = page3.locator('button:has-text("Kitchen Hood")').first();
  if (await hoodButton.isVisible()) {
    await hoodButton.click();
    await page3.waitForTimeout(500);
  }
  
  // Click on "2. Branded PDF Report"
  const reportTab = page3.locator('button:has-text("2. Branded PDF Report")').first();
  if (await reportTab.isVisible()) {
    await reportTab.click();
    await page3.waitForTimeout(500);
  }

  const tourReportPath = path.join(outputDir, 'playwright_fieldledger_tour_report.png');
  await page3.screenshot({ path: tourReportPath });
  console.log(`   Saved: ${tourReportPath}`);

  await browser.close();
  console.log('🎉 All Playwright screenshots captured successfully!');
}

run().catch((err) => {
  console.error('Playwright capture failed:', err);
  process.exit(1);
});
