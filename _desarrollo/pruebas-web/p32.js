// Detalles: sin candados (bloqueados más oscuros), «Aleatorio» de fondo dentro del marco,
// avatar aleatorio (cambia tras cada combate, icono dentro del marco) y pases sin descuento
const {chromium, devices} = require('playwright');
const {SHOTS, nuevaPagina, preparar, jugar} = require('./comun');
const fallos = []; const ok = (n, c) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + n); if (!c) fallos.push(n); };
const dentro = (p, hijo, padre) => p.evaluate(([a, b]) => { const x = document.querySelector(a), y = x?.closest(b); if (!x || !y) return false;
  const r = x.getBoundingClientRect(), q = y.getBoundingClientRect(); return r.left >= q.left - 0.5 && r.right <= q.right + 0.5 && r.top >= q.top - 0.5 && r.bottom <= q.bottom + 0.5; }, [hijo, padre]);
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const [nombre, opc] of [['pc', {viewport: {width: 1280, height: 900}}], ['movil', devices['Pixel 7']]]) {
    const p = await nuevaPagina(await b.newContext(opc), errs, nombre);
    await preparar(p);
    await p.evaluate(() => localStorage.setItem('cnx.coleccion.v1', JSON.stringify({pv: 2000, fichas: 0, tengo: {sombra: 1, brock: 1, misty: 1, red: 1}, avatar: 'brock'})));
    await p.reload(); await p.waitForSelector('.mp-fila');
    await p.click('.mp-perfil');
    await p.waitForSelector('.pf-cab', {timeout: 5000});
    ok(`${nombre}: sin emoji de candado en el perfil`, !(await p.textContent('body')).includes('🔒'));
    ok(`${nombre}: «Aleatorio» de fondo dentro de su tarjeta`, await dentro(p, '.fondo-carta[data-fondo=azar] .fondo-azar', '.fondo-carta'));
    ok(`${nombre}: carta «Aleatorio» en la colección, dentro del marco`, await dentro(p, '.carta-azar .avatar-azar', '.avatar-carta'));
    await p.click('.carta-azar');
    await p.waitForTimeout(200);
    ok(`${nombre}: aleatorio marcado y el perfil lo dice`, !!(await p.$('.carta-azar.elegido')) && !(await p.$('.avatar-carta.elegido:not(.carta-azar)')) && (await p.textContent('.pf-cab')).includes('aleatorio'));
    ok(`${nombre}: icono grande del perfil dentro del marco`, await dentro(p, '.pf-avatar .avatar-azar', '.pf-avatar'));
    await p.screenshot({path: SHOTS + `perfil-azar-${nombre}.png`, fullPage: true});
    // Combates de práctica: el avatar del jugador va cambiando entre los que tiene
    const vistos = new Set();
    for (let i = 0; i < 4; i++) {
      await p.goto('http://127.0.0.1:8080/index.html'); await p.waitForSelector('.mp-fila');
      await p.click('.mp-tarjeta[data-id=practica]'); await p.click('text=¡A combatir!');
      await p.waitForSelector('.combate');
      const av = await p.$eval('.equipo-iconos.mio .avatar-busto', e => e.style.backgroundImage);
      vistos.add(av);
      await p.click('text=Rendirse'); await p.waitForSelector('.fin-combate', {timeout: 10000}).catch(() => {});
      await p.click('.fin-botones >> text=Volver').catch(() => {});
    }
    ok(`${nombre}: el avatar cambia entre combates (${vistos.size} distintos) y solo de los que tienes`, vistos.size >= 2 && [...vistos].every(v => /(sombra|brock|misty|red)\.png/.test(v)));
    // Tienda: sin texto de pases anteriores más baratos
    await p.goto('http://127.0.0.1:8080/index.html'); await p.waitForSelector('.mp-fila');
    await p.click('.mp-tarjeta[data-id=gacha]'); await p.click('text=Tienda').catch(() => {});
    await p.waitForTimeout(300);
    ok(`${nombre}: la tienda no dice que los pases anteriores cuesten menos`, !(await p.textContent('body')).includes('anteriores cuestan menos'));
    ok(`${nombre}: sin candados en gacha/tienda`, !(await p.textContent('body')).includes('🔒'));
    // Editor de equipos: Fakemon bloqueados más oscuros y sin candado
    await p.goto('http://127.0.0.1:8080/index.html'); await p.waitForSelector('.mp-fila');
    await p.click('.mp-tarjeta[data-id=historia]'); await p.click('.hist-cap[data-capitulo=cine]'); await p.waitForSelector('.hist-mapa');
    ok(`${nombre}: mapa sin candados, nodos bloqueados oscuros`, !(await p.textContent('.hist-mapa')).includes('🔒') && await p.$eval('.hist-nodo.bloqueado', e => +getComputedStyle(e).opacity < 1));
  }
  ok('sin errores', !errs.length); if (errs.length) console.log(errs);
  await b.close(); console.log(fallos.length ? 'FALLOS: ' + fallos.length : 'Todo OK'); process.exit(fallos.length ? 1 : 0);
})();
