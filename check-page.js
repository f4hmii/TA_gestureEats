import puppeteer from 'puppeteer';

(async () => {
    try {
        const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
        const page = await browser.newPage();
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 15000 });
        const text = await page.evaluate(() => document.body.innerText);
        console.log("PAGE TEXT:", text);
        await browser.close();
    } catch (e) {
        console.error(e);
    }
})();
