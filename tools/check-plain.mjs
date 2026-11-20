// The landing page must be usable while its background video is still loading.
// Also exercise the scroll choreography, which the 3D world check never enters.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const url = new URL(process.argv[2]);
url.searchParams.set('plain', '');
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 800 }, isMobile: width < 500, hasTouch: width < 500 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    let releaseVideo;
    const held = new Promise(resolve => { releaseVideo = resolve; });
    await page.route(/\/assets\/hero\/.*\.(webm|mp4)$/, async route => {
      await held;
      await route.continue().catch(() => {});
    });
    try {
      await page.goto(url.href, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('body.pv-done .pv-hero.is-ready');
      await page.locator('.pv-hero [data-to=contact]').click();
    } finally {
      releaseVideo();
    }
    await page.waitForFunction(() => document.querySelector('.pv-hero video source'));
    await page.waitForFunction(() => window.__pv?.mascot);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.locator('#pvTabMsg').click();
    await page.locator('#pvPanelMsg textarea').waitFor();
    await page.locator('.pv-faq summary').first().click();
    assert.equal(await page.locator('.pv-faq details').first().getAttribute('open'), '');

    await page.locator('.pv-tl-item').first().evaluate(el => el.scrollIntoView({ block: 'center' }));
    await page.waitForSelector('.pv-tl-item.is-active');
    await page.waitForFunction(() => window.__pv.mascot.state().visible);
    assert.equal(await page.locator(width < 500 ? '#quests.is-deck' : '#quests.is-fan').count(), 1);
    assert.deepEqual(errors, []);
    console.log(`PASS plain view at ${width}px: video-independent opening, runner, timeline, tracks and forms`);
    await page.close();
  }
} finally {
  await browser.close();
}
