// Créditos: mensaje de gratuidad y Mega Metagross; guardado con claves cnx.*
const {chromium} = require('playwright');
const {SHOTS, nuevaPagina, preparar} = require('./comun');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({viewport: {width: 1280, height: 900}});
  const errs = []; const p = await nuevaPagina(ctx, errs, 'A'); await preparar(p);
  const fallos = []; const ok = (n, c) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + n); if (!c) fallos.push(n); };
  await p.click('.mp-tarjeta[data-id=creditos]'); await p.waitForSelector('.creditos');
  const txt = await p.textContent('.creditos');
  ok('mensaje de gratuidad', txt.includes('Colosseum Nexus es y será gratis: sin anuncios, sin compras externas (con dinero real) y sin ventajas de pago.'));
  const pokes = await p.$$eval('.cred-poke small', e => e.map(x => x.textContent));
  ok('Mega Metagross en créditos: ' + pokes.filter(n => /Metagross/.test(n)).join(','), pokes.some(n => /Mega/.test(n) && /Metagross/.test(n)));
  await p.screenshot({path: SHOTS + 'creditos-cnx.png', fullPage: true});
  const claves = await p.evaluate(() => Object.keys(localStorage));
  ok('sin claves arena.* nuevas: ' + claves.join(','), !claves.some(k => k.startsWith('arena.')));
  ok('sin errores', !errs.length);
  console.log(fallos.length ? fallos.length + ' FALLOS' : 'Todo OK', errs); await b.close(); process.exit(fallos.length ? 1 : 0);
})();
