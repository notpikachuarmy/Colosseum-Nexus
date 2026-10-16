// Niebla: la capa sale con Neblina (Mist) activa y durante el turno de Niebla Espejo
const {chromium} = require('playwright');
const {nuevaPagina, preparar, SHOTS} = require('./comun');
const fallos = []; const ok = (n, c) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + n); if (!c) fallos.push(n); };
const poner = (p, k, v) => p.evaluate(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [k, v]);
const S = (species, moves) => ({name: '', species, item: 'Leftovers', ability: '', moves, nature: 'Hardy', evs: {hp: 252, atk: 0, def: 128, spa: 0, spd: 128, spe: 0}, ivs: {hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31}, level: 100, gender: '', shiny: false, teraType: 'Normal'});
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({viewport: {width: 1280, height: 860}}); const errs = [];
  const p = await nuevaPagina(ctx, errs, 'pc'); p.on('dialog', d => d.accept());
  await preparar(p);
  await poner(p, 'cnx.equipos.v1', [
    {id: 'a', nombre: 'Niebla', formato: 'singles', sets: [S('Lapras-Custom', ['Niebla Espejo', 'Moonblast', 'Wish', 'Calm Mind'])]},
    {id: 'b', nombre: 'Neblina', formato: 'singles', sets: [S('Lapras', ['Mist', 'Ice Beam', 'Surf', 'Rest'])]}]);
  await poner(p, 'cnx.modoPractica', 'mio-vs-mio');
  await p.reload(); await p.waitForSelector('.mp-fila');
  await p.click('.mp-tarjeta[data-id=practica]'); await p.waitForSelector('.btn-grande');
  const sels = []; for (const s of await p.$$('select')) if ((await s.$$eval('option', o => o.map(x => x.value))).includes('b')) sels.push(s);
  await sels[0].selectOption('a'); await sels[sels.length - 1].selectOption('b');
  await p.click('.btn-grande'); await p.waitForSelector('.controles button:not([disabled])'); await (await p.$('.controles button:not([disabled])')).click();
  let vioNiebla = false, vioEspejo = false, malos = [];
  // Observa la capa mientras se reproduce cada turno
  const obs = setInterval(async () => {
    try {
      const r = await p.evaluate(() => ({activa: document.querySelector('.capa-niebla')?.classList.contains('activa'), chips: document.querySelector('.condiciones-lados')?.textContent || '', log: [...document.querySelectorAll('.registro-lineas > *')].slice(-6).map(x => x.textContent).join(' ')}));
      if (r.activa && /Niebla Espejo/.test(r.log)) vioEspejo = true;
      if (/Neblina/.test(r.chips)) { if (r.activa) vioNiebla = true; else malos.push('Neblina sin capa'); }
    } catch {}
  }, 120);
  for (let i = 0; i < 8; i++) {
    const btn = await p.waitForSelector('.controles button.btn-movimiento:not([disabled])', {timeout: 20000}).catch(() => null);
    if (!btn) break;
    await p.click('.controles button.btn-movimiento:has-text("Niebla Espejo")').catch(() => btn.click());
    await p.waitForTimeout(2500);
    if (vioNiebla && vioEspejo) break;
  }
  clearInterval(obs);
  await p.screenshot({path: SHOTS + 'niebla.png'});
  ok('la capa de niebla sale con Niebla Espejo', vioEspejo);
  ok('la capa de niebla sale mientras Neblina está activa (si la IA la usó)', vioNiebla || !malos.length);
  ok('nunca hay Neblina sin capa: ' + malos.slice(0, 2), !malos.length);
  ok('sin errores', !errs.length); if (errs.length) console.log(errs);
  await b.close(); console.log(fallos.length ? 'FALLOS: ' + fallos.length : 'Todo OK'); process.exit(fallos.length ? 1 : 0);
})();
