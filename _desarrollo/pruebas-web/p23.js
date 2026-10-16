// Fase 9: música de menú y de combate
const {chromium} = require('playwright');
const {nuevaPagina, preparar} = require('./comun');
const fallos = []; const ok = (n, c) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + n); if (!c) fallos.push(n); };
const estado = p => p.evaluate(() => window.cnxMusica());
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({viewport: {width: 1280, height: 860}}); const errs = [];
  const p = await nuevaPagina(ctx, errs, 'pc');
  p.on('dialog', d => d.accept());
  await preparar(p); await p.waitForTimeout(500);
  let e = await estado(p);
  ok('antes de tocar nada no suena: ' + JSON.stringify(e), !e.desbloqueado && !e.sonando.length);
  await p.mouse.click(5, 5); await p.waitForTimeout(1200);
  e = await estado(p);
  ok('tras el primer clic suena el menú: ' + JSON.stringify(e), e.sonando.join() === 'menu' && e.volumen.menu > 0.3);
  // Pasar por otras pantallas no reinicia ni cambia la música
  await p.click('.mp-tarjeta[data-id=pokedex]'); await p.waitForTimeout(300);
  e = await estado(p);
  ok('en otras pantallas sigue el menú', e.sonando.join() === 'menu');
  // Combate
  await p.reload(); await p.waitForSelector('.mp-fila');
  await p.mouse.click(5, 5);
  await p.click('.mp-tarjeta[data-id=practica]'); await p.waitForSelector('.btn-grande');
  await p.click('.btn-grande'); await p.waitForSelector('.combate'); await p.waitForTimeout(1500);
  e = await estado(p);
  ok('en combate suena solo la de combate: ' + JSON.stringify(e), e.sonando.join() === 'combate' && e.volumen.combate > 0.3);
  // Ajustes: silenciar desde el menú
  await p.click('button:has-text("Salir")'); await p.waitForSelector('.mp-fila'); await p.waitForTimeout(1500);
  e = await estado(p);
  ok('al salir del combate vuelve el menú: ' + JSON.stringify(e), e.sonando.join() === 'menu');
  await p.click('.mp-ajustes');
  await p.check('.modal input[type=checkbox] >> nth=0'); await p.waitForTimeout(1200);
  e = await estado(p);
  ok('silenciar para la música: ' + JSON.stringify(e), !e.sonando.length);
  await p.uncheck('.modal input[type=checkbox] >> nth=0');
  await p.fill('.vol-barra', '20'); await p.dispatchEvent('.vol-barra', 'input'); await p.waitForTimeout(1200);
  e = await estado(p);
  ok('volumen 20% se aplica: ' + JSON.stringify(e), e.sonando.join() === 'menu' && Math.abs(e.volumen.menu - 0.04) < 0.02);
  await p.keyboard.press('Escape');
  await p.reload(); await p.waitForSelector('.mp-fila'); await p.mouse.click(5, 5); await p.waitForTimeout(1200);
  e = await estado(p);
  ok('tras recargar mantiene el volumen bajo: ' + JSON.stringify(e), e.volumen.menu < 0.06 && e.volumen.menu > 0);
  // Volumen 0
  await p.evaluate(() => localStorage.setItem('cnx.ajustes', JSON.stringify({volumen: 0, silencio: false})));
  await p.reload(); await p.waitForSelector('.mp-fila'); await p.mouse.click(5, 5); await p.waitForTimeout(800);
  e = await estado(p);
  ok('volumen 0: no suena nada', !e.sonando.length);
  // Créditos de Suno
  await p.click('.mp-tarjeta[data-id=creditos]'); await p.waitForTimeout(400);
  ok('crédito de Suno', (await p.textContent('body')).includes('Música creada con Suno'));
  ok('sin errores', !errs.length); if (errs.length) console.log(errs);
  await b.close();
  console.log(fallos.length ? 'FALLOS: ' + fallos.length : 'Todo OK');
  process.exit(fallos.length ? 1 : 0);
})();
