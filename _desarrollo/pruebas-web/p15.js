// Móvil: fichas con toque, modo info y botón Salir
const {chromium, devices} = require('playwright');
const {SHOTS, nuevaPagina, preparar} = require('./comun');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({...devices['Pixel 7']});
  const errs = []; const p = await nuevaPagina(ctx, errs, 'M'); await preparar(p);
  console.log('hover none:', await p.evaluate(() => matchMedia('(hover: none)').matches));
  await p.tap('.mp-tarjeta[data-id=practica]'); await p.waitForTimeout(300);
  await p.tap('button.btn-grande'); await p.waitForSelector('.controles button.btn-cambio', {timeout: 20000}); await p.tap('.controles button.btn-cambio >> nth=0'); await p.waitForSelector('.controles button.btn-movimiento', {timeout: 20000});
  await p.waitForTimeout(800);
  // tocar el HUD rival
  await p.tap('.hud >> nth=0'); await p.waitForTimeout(300);
  console.log('hoja HUD visible:', await p.isVisible('.info-flotante.hoja.visible'));
  await p.screenshot({path: SHOTS + 'movil-hoja.png'});
  await p.tap('.hoja-cerrar'); await p.waitForTimeout(250);
  console.log('cerrada:', !(await p.isVisible('.info-flotante.visible')));
  // modo info
  await p.tap('.btn-info-movil'); await p.waitForTimeout(200);
  await p.tap('.controles button.btn-movimiento >> nth=0'); await p.waitForTimeout(400);
  console.log('modo info → ficha:', await p.isVisible('.info-flotante.hoja.visible'), 'sigue eligiendo:', await p.isVisible('.controles button.btn-movimiento'));
  await p.screenshot({path: SHOTS + 'movil-modoinfo.png'});
  await p.tap('.btn-info-movil'); await p.waitForTimeout(200);
  await p.tap('.controles button.btn-movimiento >> nth=0'); await p.waitForTimeout(1500);
  console.log('sin modo info → ataque elegido:', !(await p.isVisible('.controles button.btn-movimiento')) || (await p.textContent('.registro-lineas')).includes('usó'));
  // Salir siempre posible
  p.once('dialog', d => d.accept());
  await p.tap('text=⌂ Salir'); await p.waitForTimeout(600);
  console.log('vuelve al inicio:', await p.isVisible('.mp-fila'));
  console.log('ERRORES', errs); await b.close();
})();
