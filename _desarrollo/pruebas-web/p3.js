const {chromium} = require('playwright');
const {SHOTS, nuevaPagina, preparar} = require('./comun');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({viewport: {width: 1366, height: 860}});
  const errs = [];
  const page = await nuevaPagina(ctx, errs, 'P');
  page.on('console', m => console.log('console:', m.type(), m.text().slice(0, 300)));
  await preparar(page);
  await page.click('.mp-tarjeta[data-id=practica]');
  await page.selectOption('.formulario select >> nth=0', 'e1');
  await page.click('text=¡A combatir!');
  await page.waitForTimeout(4000);
  await page.screenshot({path: SHOTS + 'dbg.png'});
  console.log(await page.$eval('.controles', e => e.innerText));
  console.log(await page.$eval('.registro-lineas', e => e.innerText));
  console.log(errs);
  await browser.close();
})();
