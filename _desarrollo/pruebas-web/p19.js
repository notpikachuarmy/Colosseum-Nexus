// La barra del rival se actualiza cuando se cura el sueño con Baya Ziuela
const {chromium} = require('playwright');
const {SHOTS, nuevaPagina} = require('./comun');
const set = (species, moves, item = '') => ({species, item, ability: '', moves, name: '', nature: 'Hardy', evs: {hp: 84, atk: 84, def: 84, spa: 84, spd: 84, spe: 84}, ivs: {hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31}, level: 100, gender: '', shiny: false, teraType: 'Normal'});
const EQ = [{id: 'a', nombre: 'A', formato: 'singles', sets: [set('Breloom', ['Spore'])]}, {id: 'b', nombre: 'B', formato: 'singles', sets: [set('Snorlax', ['Splash'], 'Lum Berry')]}];
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({viewport: {width: 1280, height: 860}}); const errs = [];
  const p = await nuevaPagina(ctx, errs, 'pc');
  await p.goto('http://127.0.0.1:8080/index.html');
  await p.evaluate(eq => { localStorage.setItem('cnx.equipos.v1', JSON.stringify(eq)); localStorage.setItem('cnx.rapido', 'true'); localStorage.setItem('cnx.modoPractica', '"mio-vs-mio"'); localStorage.setItem('cnx.seriePractica', '"uno"'); localStorage.setItem('cnx.ultimoEquipo', '"a"'); }, EQ);
  await p.reload(); await p.waitForSelector('.mp-fila');
  await p.click('.mp-tarjeta[data-id=practica]'); await p.waitForTimeout(300);
  await p.selectOption('.formulario select >> nth=3', 'b').catch(e => console.log('sel', e.message));
  await p.click('button.btn-grande');
  await p.waitForTimeout(1500); console.log('toast', await p.$$eval('.toast', e => e.map(x => x.textContent)));
  if (await p.$('.controles button.btn-cambio')) await p.click('.controles button.btn-cambio >> nth=0');
  await p.waitForSelector('.controles button.btn-movimiento:not([disabled])', {timeout: 20000});
  await p.click('.controles button.btn-movimiento >> nth=0');
  await p.waitForSelector('.controles button.btn-movimiento:not([disabled])', {timeout: 20000});
  await p.waitForTimeout(500);
  const log = await p.$$eval('.registro-lineas > *', e => e.map(x => x.textContent).slice(-6));
  const tag = await p.$$eval('.lado-rival .estado-tag', e => e.map(x => x.textContent));
  console.log(log.join(' / ')); console.log('estado en la barra del rival:', tag.length ? tag : 'ninguno');
  await p.screenshot({path: SHOTS + 'baya.png'});
  console.log('errores', errs); await b.close();
})();
