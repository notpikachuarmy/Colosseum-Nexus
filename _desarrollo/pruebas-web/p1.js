const {chromium} = require('playwright');
const {SHOTS} = require('./comun');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({viewport: {width: 1366, height: 860}});
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_|net::/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
  await page.route(/fonts\.g|jsdelivr|unpkg|pokemonshowdown/, r => r.abort());
  await page.goto('http://127.0.0.1:8080/index.html');
  await page.waitForSelector('.mp-fila');
  await page.screenshot({path: SHOTS + 'inicio.png'});
  // Builder
  await page.click('.mp-tarjeta[data-id=equipos]');
  await page.click('text=+ Nuevo equipo');
  for (const name of ['Somnistera', 'Railspike', 'Metagross']) {
    await page.click('.slot-nuevo');
    await page.fill('.buscador', name);
    await page.click('.selector-lista .opcion >> nth=0');
    // moves
    for (let k = 0; k < 4; k++) {
      await page.click(`.btn-mov >> nth=${k}`);
      await page.click(`.selector-lista .opcion >> nth=${k + 2}`);
    }
  }
  // item for metagross
  await page.click('.btn-campo');
  await page.fill('.buscador', 'metagrossita');
  await page.click('.selector-lista .opcion >> nth=0');
  await page.click('text=Atacante físico');
  await page.screenshot({path: SHOTS + 'constructor.png', fullPage: true});
  const avisos = await page.$$eval('.avisos div', els => els.map(e => e.textContent));
  console.log('avisos equipo:', avisos);
  // selector screenshot
  await page.click('.slot-nuevo');
  await page.fill('.buscador', '');
  await page.screenshot({path: SHOTS + 'selector.png'});
  await page.keyboard.press('Escape');
  console.log('errores:', errs);
  await browser.close();
})();
