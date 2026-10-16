const {chromium} = require('playwright');
const {SHOTS, nuevaPagina, preparar} = require('./comun');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({viewport: {width: 1366, height: 860}});
  const errs = [];
  const page = await nuevaPagina(ctx, errs, 'P');
  page.on('dialog', d => d.accept());
  await preparar(page);
  // El equipo de prueba lleva Ferroantena, que se desbloquea en el modo historia: se da por conseguida
  await page.evaluate(() => localStorage.setItem('cnx.pases.v1', JSON.stringify({desbloqueados: ['ferroantena', 'espinaferoz']})));
  for (const [eq, f] of [['e1', 'singles'], ['e2', 'doubles']]) {
    await page.click('.mp-tarjeta[data-id=practica]');
    await page.selectOption('.formulario select >> nth=1', 'mio-vs-mio');
    await page.selectOption('.formulario select >> nth=2', eq);
    await page.selectOption('.formulario select >> nth=3', eq);
    await page.selectOption('.formulario select >> nth=4', f);
    await page.click('text=¡A combatir!');
    await page.waitForSelector('.preview');
    await page.screenshot({path: SHOTS + 'preview-' + f + '.png'});
    await page.click('.botones-cambio .btn-cambio >> nth=2');
    if (f === 'doubles') await page.click('.botones-cambio .btn-cambio >> nth=4');
    await page.waitForSelector('.btn-movimiento', {timeout: 20000});
    await page.waitForTimeout(800);
    await page.screenshot({path: SHOTS + 'turno1-' + f + '.png'});
    await page.click('.btn-movimiento >> nth=0');
    if (f === 'doubles') { await page.waitForTimeout(300); await page.screenshot({path: SHOTS + 'objetivo.png'}); }
    await page.waitForTimeout(3000);
    await page.screenshot({path: SHOTS + 'turno2-' + f + '.png'});
    await page.click('text=Rendirse').catch(()=>{});
    await page.waitForSelector('.fin-combate', {timeout: 10000}).catch(()=>{});
    await page.screenshot({path: SHOTS + 'tras-rendirse.png'});
    await page.click('.fin-botones >> text=Volver');
    await page.click('text=← Inicio');
  }
  console.log(errs);
  await browser.close();
})();
