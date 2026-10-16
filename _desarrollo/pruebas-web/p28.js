// Fase 8: fondo, sin plataformas, y capas de tinte/peligros/clima que coinciden con el estado real del combate
const {chromium, devices} = require('playwright');
const {SHOTS, nuevaPagina, preparar} = require('./comun');
const fallos = []; const ok = (n, c) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + n); if (!c) fallos.push(n); };
const poner = (p, k, v) => p.evaluate(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [k, v]);
const S = (species, moves, item = 'Leftovers') => ({name: '', species, item, ability: '', moves, nature: 'Hardy', evs: {hp: 252, atk: 0, def: 128, spa: 0, spd: 128, spe: 0}, ivs: {hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31}, level: 100, gender: '', shiny: false, teraType: 'Normal'});
const EQ = [
  {id: 'pel', nombre: 'Peligros', formato: 'singles', sets: [S('Forretress', ['Stealth Rock', 'Spikes', 'Toxic Spikes', 'Rain Dance']), S('Pincurchin', ['Electric Terrain', 'Spikes', 'Recover', 'Thunderbolt'])]},
  {id: 'riv', nombre: 'Rival', formato: 'singles', sets: [S('Skarmory', ['Spikes', 'Stealth Rock', 'Roost', 'Sunny Day']), S('Indeedee', ['Psychic Terrain', 'Protect', 'Psychic', 'Calm Mind'])]},
];
const MARCA = {spikes: '📌', stealthrock: '🪨', toxicspikes: '☠', stickyweb: '🕸', trampamental: '🌀 Trampa'};
(async () => {
  const b = await chromium.launch();
  for (const [nombre, opts] of [['pc', {viewport: {width: 1280, height: 860}}], ['movil', devices['Pixel 7']]]) {
    const ctx = await b.newContext(opts); const errs = [];
    const p = await nuevaPagina(ctx, errs, nombre); p.on('dialog', d => d.accept());
    await preparar(p);
    await poner(p, 'cnx.equipos.v1', EQ); await poner(p, 'cnx.modoPractica', 'mio-vs-mio'); await poner(p, 'cnx.ultimoEquipo', 'pel');
    await p.evaluate(() => localStorage.removeItem('cnx.fondos.v1'));
    await p.reload(); await p.waitForSelector('.mp-fila');
    await p.click('.mp-tarjeta[data-id=practica]'); await p.waitForSelector('.btn-grande');
    const selects = await p.$$('select');
    for (const s of selects) { const ops = await s.$$eval('option', o => o.map(x => x.value)); if (ops.includes('riv') && ops.includes('pel')) { /* el último que tenga los dos es el de la IA */ } }
    const conAmbos = []; for (const s of selects) if ((await s.$$eval('option', o => o.map(x => x.value))).includes('riv')) conAmbos.push(s);
    await conAmbos[0].selectOption('pel'); await conAmbos[conAmbos.length - 1].selectOption('riv');
    await p.click('.btn-grande'); await p.waitForSelector('.controles button:not([disabled])'); await (await p.$('.controles button:not([disabled])')).click(); await p.waitForSelector('.campo-batalla .sprite-wrap');
    const fondo = await p.$eval('.campo-batalla', e => e.style.backgroundImage + '|' + e.dataset.fondo);
    ok(`${nombre}: fondo del bosque por defecto (${fondo})`, /bosque\.png/.test(fondo));
    ok(`${nombre}: sin plataformas`, !(await p.$('.plataforma')));
    const orden = await p.$$eval('.campo-batalla > *', e => e.map(x => x.className.split(' ')[0]));
    ok(`${nombre}: orden de capas ${orden.join(' > ')}`, orden[0] === 'capa-tinte' && orden[1] === 'capa-peligros' && orden[2] === 'capa-peligros' && orden[orden.length - 1] === 'capa-clima');
    const z = await p.$$eval('.capa-tinte, .capa-peligros, .lado, .capa-clima', e => e.map(x => getComputedStyle(x).zIndex));
    ok(`${nombre}: z-index tinte<peligros<pokémon<clima (${z})`, +z[0] < +z[1] && +z[2] < +z[3] && +z[3] < +z[z.length - 1]);
    // Jugar comprobando en cada paso que lo dibujado coincide con lo que dice el combate
    let visto = {clima: false, campo: false, peligroR: false, peligroY: false}, malos = [], shot = false;
    for (let paso = 0; paso < 40; paso++) {
      if (await p.$('.fin-combate')) break;
      const btns = await p.$$('.controles button.btn-movimiento:not([disabled]), .controles button.btn-cambio:not([disabled])');
      if (btns.length) { await btns[Math.floor(Math.random() * btns.length)].click(); }
      await p.waitForTimeout(700);
      const r = await p.evaluate((MARCA) => {
        const chips = [...document.querySelectorAll('.campo-chips .chip-campo')].map(x => x.textContent).join(' ');
        const clima = document.querySelector('.capa-clima').dataset.clima;
        const campo = document.querySelector('.capa-tinte').dataset.campo || '';
        const filas = {rival: document.querySelector('.fila-lado.rival')?.textContent || '', mio: document.querySelector('.fila-lado.mio')?.textContent || ''};
        const imgs = l => [...document.querySelectorAll(`.peligros-${l} .peligro`)].map(x => x.dataset.peligro);
        return {chips, clima, campo, filas, rival: imgs('rival'), yo: imgs('yo')};
      }, MARCA);
      const climaChip = /Lluvia|Sol intenso|Sol abrasador|Diluvio|Tormenta de arena|Granizo|Nieve/.test(r.chips);
      if (!!r.clima !== climaChip) malos.push(`clima ${r.clima} vs chips "${r.chips}"`);
      const campoChip = /Campo (eléctrico|de hierba|de niebla|psíquico)/.test(r.chips);
      if (!!r.campo !== campoChip) malos.push(`campo ${r.campo} vs chips "${r.chips}"`);
      for (const [l, fila] of [['rival', r.filas.rival], ['yo', r.filas.mio]]) {
        for (const [k, m] of Object.entries(MARCA)) {
          const enTexto = fila.includes(m), enImg = r[l].includes(k);
          if (enTexto !== enImg) malos.push(`${l}: ${k} texto=${enTexto} imagen=${enImg}`);
        }
        const capasPuas = r[l].filter(x => x === 'spikes').length; const m = /📌 Púas(?: ×(\d))?/.exec(fila);
        if (m && capasPuas !== +(m[1] || 1)) malos.push(`${l}: púas x${m[1] || 1} pero ${capasPuas} imágenes`);
      }
      visto.clima ||= !!r.clima; visto.campo ||= !!r.campo; visto.peligroR ||= r.rival.length > 0; visto.peligroY ||= r.yo.length > 0;
      if (!shot && r.rival.length && r.clima) { await p.screenshot({path: SHOTS + `campo-${nombre}.png`}); shot = true; }
    }
    if (!shot) await p.screenshot({path: SHOTS + `campo-${nombre}.png`});
    ok(`${nombre}: lo dibujado coincide siempre con el combate ${malos.slice(0, 3).join(' | ')}`, !malos.length);
    console.log(nombre, 'visto', JSON.stringify(visto));
    ok(`${nombre}: se han llegado a ver clima, campo y peligros`, visto.clima && visto.campo && (visto.peligroR || visto.peligroY));
    ok(`${nombre}: sin errores`, !errs.length); if (errs.length) console.log(errs);
    await ctx.close();
  }
  // Perfil: elegir fondo (no se puede uno bloqueado) y aleatorio
  const ctx = await b.newContext({viewport: {width: 1280, height: 900}}); const errs = [];
  const p = await nuevaPagina(ctx, errs, 'perfil'); await preparar(p);
  await p.click('.mp-perfil'); await p.waitForSelector('.fondos-lista');
  ok('cine y gimnasio bloqueados', await p.locator('.fondo-carta[data-fondo=cine]').isDisabled() && await p.locator('.fondo-carta[data-fondo=gimnasio]').isDisabled());
  await p.click('.fondo-carta[data-fondo=azar]');
  ok('aleatorio elegido', (await p.evaluate(() => JSON.parse(localStorage.getItem('cnx.fondos.v1')).elegido)) === 'azar');
  await poner(p, 'cnx.fondos.v1', {desbloqueados: ['cine'], elegido: 'gimnasio'});
  await p.reload(); await p.waitForSelector('.mp-fila'); await p.click('.mp-perfil'); await p.waitForSelector('.fondos-lista');
  ok('un fondo bloqueado guardado a mano no se usa (vuelve al bosque)', (await p.getAttribute('.fondo-carta.elegido', 'data-fondo')) === 'bosque');
  await p.click('.fondo-carta[data-fondo=cine]');
  await p.click('text=← Inicio'); await p.click('.mp-tarjeta[data-id=practica]'); await p.waitForSelector('.btn-grande'); await p.click('.btn-grande');
  await p.waitForSelector('.campo-batalla');
  ok('el combate usa el fondo elegido (cine)', (await p.$eval('.campo-batalla', e => e.dataset.fondo)) === 'cine');
  await p.waitForTimeout(1500); await p.screenshot({path: SHOTS + 'campo-cine.png'});
  await p.screenshot({path: SHOTS + 'perfil-fondos.png'});
  ok('sin errores', !errs.length); if (errs.length) console.log(errs);
  await b.close();
  console.log(fallos.length ? 'FALLOS: ' + fallos.length : 'Todo OK');
  process.exit(fallos.length ? 1 : 0);
})();
