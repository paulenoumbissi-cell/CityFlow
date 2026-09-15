const puppeteer = require('puppeteer-core');
(async () => {
  try {
    const browser = await puppeteer.launch({ executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', headless: true });
    const page = await browser.newPage();
    page.setViewport({ width: 1280, height: 800 });
    page.on('console', msg => console.log('LOG:', msg.text()));
    page.on('pageerror', err => console.log('ERR:', err.toString()));
    
    await page.goto('http://127.0.0.1:5173/urgences');
    await new Promise(r => setTimeout(r, 2000));
    
    const tabs = await page.$$('.tab-btn');
    if (tabs.length > 1) {
      await tabs[1].click();
      await new Promise(r => setTimeout(r, 1000));
    } else {
      console.log('Tabs not found');
    }
    
    const inputs = await page.$$('input.input-custom-text');
    console.log('Found custom inputs:', inputs.length);
    if (inputs.length > 1) {
      await inputs[1].type('Gare Voyageur');
      await new Promise(r => setTimeout(r, 500));
    }
    
    const buttons = await page.$$('button.btn-calculate-route');
    if (buttons.length > 0) {
      console.log('Calculate button found! Clicking...');
      await buttons[0].click();
      await new Promise(r => setTimeout(r, 3000));
      await page.screenshot({ path: 'screenshot.png' });
    } else {
      console.log('Calculate button not found');
      await page.screenshot({ path: 'screenshot.png' });
    }
    
    await browser.close();
  } catch(e) {
    console.log('PUPPETEER ERROR:', e);
  }
})();
