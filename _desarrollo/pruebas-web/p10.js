const {chromium} = require('playwright');
const {SHOTS, nuevaPagina, preparar, jugar} = require('./comun');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({viewport: {width: 1366, height: 860}});
  const errs = [];
  const page = await nuevaPagina(ctx, errs, 'P');
  page.on('dialog', d => d.accept());
  await preparar(page);
  // Práctica: draft al mejor de 3 con plantillas aleatorias
  await page.click('.mp-tarjeta[data-id=practica]');
  await page.selectOption('.formulario select >> nth=0', 'draft');
  await page.waitForTimeout(200);
  await page.selectOption('.formulario select >> nth=1', 'parejos');
  await page.click('text=¡A combatir!');
  for (let juego = 1; juego <= 3; juego++) {
    const sel = await page.waitForSelector('.sel-grid', {timeout: 15000}).catch(() => null);
    if (!sel) break;
    if (juego === 1) await page.screenshot({path: SHOTS + 'v4-draft-sel.png'});
    const n = (await page.$$('.sel-card')).length;
    if (!(await page.$('.sel-card.elegido'))) for (let i = 0; i < 6; i++) await page.click(`.sel-card >> nth=${(i * 2 + juego) % n}`);
    await page.click('button:has-text("¡Listo!")');
    const fin = await jugar(page, 700, 999, 'x');
    const marc = await page.$eval('.fin-combate', e => e.innerText.replace(/\n/g, ' | '));
    console.log('juego', juego, 'fin', fin, '->', marc);
    if (juego === 1) await page.screenshot({path: SHOTS + 'v4-draft-fin1.png'});
    const sig = await page.$('button:has-text("Siguiente combate")');
    if (!sig) break;
    await sig.click();
  }
  console.log('errores', errs.slice(0, 5));
  await browser.close();
})();
