// Fase 5: Puntos Victoria, tienda, gacha sin repetidos, nombres sin sufijos, créditos
const {chromium, devices} = require('playwright');
const {SHOTS, nuevaPagina, preparar, jugar} = require('./comun');
const fallos = []; const ok = (n, c) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + n); if (!c) fallos.push(n); };
const col = p => p.evaluate(() => JSON.parse(localStorage.getItem('cnx.coleccion.v1') || '{}'));
const poner = (p, c) => p.evaluate(c => localStorage.setItem('cnx.coleccion.v1', JSON.stringify(c)), c);
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({viewport: {width: 1280, height: 900}}); const errs = [];
  const p = await nuevaPagina(ctx, errs, 'pc');
  await preparar(p);
  // Datos
  const datos = await p.evaluate(() => window.DATOS_AVATARES);
  const feos = datos.filter(a => /\d|sygna|adulto|remakes|neo campe|kimono|rainbow|cosplay|\b(M|F)$|hoenn|johto|kanto/i.test(a.nombre)).map(a => a.nombre);
  ok('nombres sin sufijos internos: ' + feos.join(', '), !feos.length);
  ok('226 entrenadores, ids únicos', datos.length === 226 && new Set(datos.map(a => a.id)).size === 226);
  const tiendaIds = datos.filter(a => a.origen === 'tienda').map(a => a.id).sort().join();
  ok('tienda: ' + tiendaIds, tiendaIds === 'camion-giratina,chimecho-girl,dj-porygon,gligarman,orni-chatot,orni-pidove,paco,tototo-fan');
  ok('autores sin "hyo" en minúscula', !datos.some(a => a.autor === 'hyo'));

  // Tienda
  await poner(p, {fichas: 0, pv: 1000, tengo: {sombra: 1}, avatar: 'sombra', tiradas: 0});
  await p.reload(); await p.waitForSelector('.mp-fila');
  await p.click('.mp-tarjeta[data-id=gacha]'); await p.click('[data-pestana=tienda]'); await p.waitForSelector('.tienda-item');
  await p.screenshot({path: SHOTS + 'tienda-pc.png', fullPage: true});
  ok('saldo visible "PV 1000"', (await p.textContent('.saldo-pv')) === 'PV 1000');
  const btn1 = p.locator('.tienda-item >> nth=0').locator('.btn-compra');
  await btn1.click();
  ok('primer clic solo pide confirmar', (await col(p)).pv === 1000 && /Gastar/.test(await btn1.textContent()));
  await btn1.dblclick(); await p.waitForTimeout(200);   // confirmar con doble clic: un solo cobro
  let c = await col(p);
  ok('1 ticket: cobra una vez: ' + JSON.stringify({pv: c.pv, f: c.fichas}), c.pv === 950 && c.fichas === 1);
  ok('el saldo de pantalla se actualiza', (await p.textContent('.saldo-pv')) === 'PV 950');
  const btn10 = p.locator('.tienda-item >> nth=1').locator('.btn-compra');
  await btn10.click(); await btn10.click(); await p.waitForTimeout(200);
  c = await col(p);
  ok('pack: exactamente 10 tickets: ' + JSON.stringify({pv: c.pv, f: c.fichas}), c.pv === 500 && c.fichas === 11);
  const chatot = p.locator('.tienda-avatar[data-id=orni-chatot] .btn-compra');
  ok('Orni Chatot cuesta PV 250 (raro)', (await chatot.textContent()) === 'PV 250');
  await chatot.click(); await chatot.click(); await p.waitForTimeout(200);
  c = await col(p);
  ok('compra Orni Chatot: ' + JSON.stringify({pv: c.pv, tengo: !!c.tengo['orni-chatot']}), c.pv === 250 && c.tengo['orni-chatot'] === 1);
  ok('ahora pone "Ya lo tienes"', (await p.textContent('.tienda-avatar[data-id=orni-chatot]')).includes('Ya lo tienes'));
  const epico = p.locator('.tienda-avatar[data-id=paco] .btn-compra');
  ok('@Paco (épico, PV 400) bloqueado sin PV suficientes', (await epico.textContent()) === 'PV 400' && await epico.isDisabled());
  ok('pack bloqueado con PV 250', await btn10.isDisabled());
  // Gacha
  await p.click('[data-pestana=gacha]'); await p.waitForSelector('.gacha-maquina');
  const enGacha = await p.$$eval('.avatares-grid .avatar-carta', e => e.map(x => x.dataset.id));
  ok(`el gacha no enseña tienda/pase/historia (${enGacha.length})`, !['paco', 'orni-chatot', 'seto-kaiba', 'titan', 'randes', 'handsome', 'giovanni-kaiba-cosplay'].some(i => enGacha.includes(i)) && enGacha.length === 210);
  await p.click('.gacha-botones .btn >> nth=1'); await p.waitForSelector('.gacha-premio'); await p.waitForTimeout(900);
  await p.screenshot({path: SHOTS + 'gacha10-pc.png'});
  ok('al abrir varios todos son NUEVO', (await p.$$eval('.gacha-premio .premio-nuevo', e => e.length)) === 10 && !(await p.$('.premio-repe')));
  await p.click('.gacha-caja .btn-sec');
  c = await col(p);
  const ganados = Object.keys(c.tengo).filter(i => !['sombra', 'orni-chatot'].includes(i));
  ok(`10 distintos, todos del gacha: ${ganados.length}`, ganados.length === 10 && ganados.every(i => (datos.find(a => a.id === i).origen || 'gacha') === 'gacha') && c.fichas === 1);
  // Gacha completo: no gasta tickets
  const todos = Object.fromEntries(datos.filter(a => !a.origen || a.rareza === 'base').map(a => [a.id, 1]));
  await poner(p, {fichas: 3, pv: 0, tengo: todos, avatar: 'sombra', tiradas: 0});
  await p.reload(); await p.waitForSelector('.mp-fila'); await p.click('.mp-tarjeta[data-id=gacha]'); await p.waitForSelector('.gacha-maquina');
  ok('gacha completo: aviso y botón desactivado', !!(await p.$('.gacha-completo')) && await p.locator('.gacha-botones .btn >> nth=0').isDisabled());
  ok('gacha completo: no se pierden tickets', (await col(p)).fichas === 3);
  // Créditos: un solo Hyo
  await p.click('text=← Inicio'); await p.click('.mp-tarjeta[data-id=creditos]'); await p.waitForTimeout(300);
  const hyos = await p.$$eval('.cred-grupo', e => e.filter(x => /^hyo$/i.test(x.querySelector('.cred-persona b').textContent)).length);
  ok('créditos: un solo grupo Hyo (' + hyos + ')', hyos === 1);
  // Combate de práctica: da PV, no tickets
  await poner(p, {fichas: 0, pv: 0, tengo: {sombra: 1}, avatar: 'sombra', tiradas: 0});
  await p.reload(); await p.waitForSelector('.mp-fila');
  await p.click('.mp-tarjeta[data-id=practica]'); await p.waitForSelector('.btn-grande'); await p.click('.btn-grande');
  ok('combate terminado', await jugar(p, 500, 999));
  c = await col(p);
  const fin = await p.textContent('.fin-combate');
  ok(`premio en PV (${c.pv}) sin tickets: ${fin.slice(0, 50)}`, [3, 15].includes(c.pv) && c.fichas === 0 && fin.includes(`+${c.pv} PV`) && c.premiados.length === 1);
  ok('sin errores', !errs.length); if (errs.length) console.log(errs);
  // Móvil: tienda
  const m = await b.newContext(devices['Pixel 7']); const pm = await nuevaPagina(m, errs, 'movil');
  await preparar(pm); await poner(pm, {fichas: 2, pv: 700, tengo: {sombra: 1}, avatar: 'sombra', tiradas: 0});
  await pm.reload(); await pm.waitForSelector('.mp-fila'); await pm.click('.mp-tarjeta[data-id=gacha]'); await pm.click('[data-pestana=tienda]');
  await pm.waitForTimeout(300); await pm.screenshot({path: SHOTS + 'tienda-movil.png', fullPage: true});
  const ancho = await pm.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  ok('móvil: sin desbordar a lo ancho', ancho);
  await b.close();
  console.log(fallos.length ? 'FALLOS: ' + fallos.length : 'Todo OK');
  process.exit(fallos.length ? 1 : 0);
})();
