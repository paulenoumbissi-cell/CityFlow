const puppeteer = require('puppeteer');

(async () => {
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
    
    await page.goto('http://127.0.0.1:5173/routes');
    await new Promise(r => setTimeout(r, 4000));
    
    console.log("Done waiting");
    await browser.close();
  } catch (err) {
    console.error("Script error:", err);
  }
})();
