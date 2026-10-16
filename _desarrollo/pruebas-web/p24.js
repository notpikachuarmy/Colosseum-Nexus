// Fase 4: perfil, estadísticas online/IA separadas, racha máxima, colección solo con lo que tienes
const {chromium, devices} = require('playwright');
const {SHOTS, nuevaPagina, preparar, jugar} = require('./comun');
const fallos = []; const ok = (n, c) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + n); if (!c) fallos.push(n); };
const datos = sel => p => p.$$eval(sel + ' .pf-dato', e => e.map(x => x.querySelector('b').textContent));
(async () => {
  const b = await chromium.launch();
  for (const [nombre, opts] of [['pc', {viewport: {width: 1280, height: 900}}], ['movil', devices['Pixel 7']]]) {
    const ctx = await b.newContext(opts); const errs = [];
    const p = await nuevaPagina(ctx, errs, nombre);
    p.on('dialog', d => d.accept());
    await preparar(p);
    // Datos de partida: online 7V 3D (racha actual 1, máxima 5); IA 2V 2D; 3 avatares
    await p.evaluate(() => {
      localStorage.setItem('cnx.niveles.v1', JSON.stringify({online: {xp: 420, v: 7, d: 3, racha: 1, rachaMax: 5}, ia: {xp: 80, v: 2, d: 2}}));
      localStorage.setItem('cnx.coleccion.v1', JSON.stringify({fichas: 0, tengo: {sombra: 1, brock: 1, misty: 2}, avatar: 'misty', tiradas: 3}));
    });
    await p.reload(); await p.waitForSelector('.mp-fila');
    const insignias = await p.textContent('.mp-perfil');
    ok(`${nombre}: niveles sin emojis en el menú: ${insignias}`, !/[\u{1F300}-\u{1FAFF}]/u.test(insignias) && /Online Nv\. \d/.test(insignias) && /IA Nv\. \d/.test(insignias));
    await p.click('.mp-perfil'); await p.waitForSelector('.perfil');
    await p.waitForTimeout(300);
    await p.screenshot({path: SHOTS + `perfil-${nombre}.png`, fullPage: true});
    ok(`${nombre}: nick`, (await p.textContent('.pf-nick')) === 'Ana');
    ok(`${nombre}: avatar actual grande`, !!(await p.$('.pf-avatar img[src*="misty"]')));
    const on = await datos('.pf-stats.online')(p), ia = await datos('.pf-stats.ia')(p);
    ok(`${nombre}: online V/D/racha/% = ${on}`, on.join() === '7,3,5,70%');
    ok(`${nombre}: IA V/D/racha/% = ${ia}`, ia.join() === '2,2,0,50%');
    ok(`${nombre}: online antes que IA`, (await p.$$eval('.pf-stats', e => e.map(x => x.dataset.modo))).join() === 'online,ia');
    const cartas = await p.$$eval('.avatares-grid .avatar-carta', e => e.map(x => x.dataset.id));
    ok(`${nombre}: colección solo con los que tienes: ${cartas}`, cartas.length === 3 && !(await p.$('.avatares-grid .bloqueado')));
    const cont = await p.textContent('.pf-contador');
    ok(`${nombre}: contador ${cont}`, /^Colección: 3\/\d+$/.test(cont) && +cont.split('/')[1] > 50);
    await p.fill('.perfil .buscador', 'brock'); await p.waitForTimeout(150);
    ok(`${nombre}: la búsqueda filtra tu colección`, (await p.$$eval('.avatares-grid .avatar-carta', e => e.map(x => x.dataset.id))).join() === 'brock');
    await p.click('.avatar-carta[data-id=brock]'); await p.waitForTimeout(200);
    ok(`${nombre}: tocar equipa el avatar`, !!(await p.$('.pf-avatar img[src*="brock"]')));
    await p.fill('.perfil .buscador', 'oak'); await p.waitForTimeout(150);
    ok(`${nombre}: buscar uno que no tienes no lo enseña`, !(await p.$('.avatares-grid .avatar-carta')));
    // Gacha: separado, con el catálogo completo
    await p.click('text=← Inicio'); await p.click('.mp-tarjeta[data-id=gacha]'); await p.waitForSelector('.gacha-maquina');
    const total = await p.$$eval('.avatares-grid .avatar-carta', e => e.length), bloq = await p.$$eval('.avatares-grid .avatar-carta.bloqueado', e => e.length);
    ok(`${nombre}: gacha enseña todo (${total}) con ${bloq} bloqueados`, total > 50 && bloq === total - 3);
    ok(`${nombre}: el gacha ya no tiene el perfil dentro`, !(await p.$('.gacha-actual')) && !(await p.$('.pf-stats')));
    await p.screenshot({path: SHOTS + `gacha-${nombre}.png`});
    if (nombre === 'pc') {
      // Un combate de práctica solo toca las estadísticas de la IA
      await p.click('text=← Inicio'); await p.click('.mp-tarjeta[data-id=practica]'); await p.waitForSelector('.btn-grande');
      await p.click('.btn-grande');
      const fin = await jugar(p, 500, 999);
      ok('pc: combate de práctica terminado', fin);
      const n = await p.evaluate(() => JSON.parse(localStorage.getItem('cnx.niveles.v1')));
      ok('pc: online sin tocar: ' + JSON.stringify(n.online), n.online.v === 7 && n.online.d === 3 && n.online.rachaMax === 5);
      ok('pc: IA suma 1 combate: ' + JSON.stringify(n.ia), n.ia.v + n.ia.d === 5 && (n.ia.v === 3 ? n.ia.racha === 1 && n.ia.rachaMax === 1 : n.ia.racha === 0));
      const txtFin = await p.textContent('.fin-combate');
      ok('pc: fin de combate sin emojis de nivel: ' + txtFin.slice(0, 60), !/🤖|🌐/.test(txtFin));
    }
    ok(`${nombre}: sin errores`, !errs.length); if (errs.length) console.log(errs);
    await ctx.close();
  }
  await b.close();
  console.log(fallos.length ? 'FALLOS: ' + fallos.length : 'Todo OK');
  process.exit(fallos.length ? 1 : 0);
})();
