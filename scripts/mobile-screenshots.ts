import { chromium, devices } from '@playwright/test';

async function takeScreenshots() {
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const iPhone = devices['iPhone 12'];
  const context = await browser.newContext({
    ...iPhone,
    storageState: 'tests/e2e/.auth/user.json'
  });
  
  const page = await context.newPage();
  
  const pages = [
    { url: '/', name: 'dashboard' },
    { url: '/finanzen', name: 'finanzen' },
    { url: '/quests', name: 'quests' },
    { url: '/contacts', name: 'contacts' },
    { url: '/habits', name: 'habits' }
  ];
  
  for (const p of pages) {
    await page.goto(`http://localhost:3050${p.url}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({ 
      path: `/tmp/mobile-${p.name}.png`,
      fullPage: true 
    });
    console.log(`Screenshot saved: /tmp/mobile-${p.name}.png`);
  }
  
  await browser.close();
}

takeScreenshots().catch(console.error);
