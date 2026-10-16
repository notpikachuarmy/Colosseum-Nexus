const SHOTS = process.env.CAPTURAS || (require('path').join(__dirname, 'capturas') + '/'); try { require('fs').mkdirSync(SHOTS, {recursive: true}); } catch {}
// Inyecta equipos en localStorage
const EQUIPOS = [
 {id: 'e1', nombre: 'Custom A', formato: 'singles', sets: [
  {species: 'Somnistera', item: 'Piedra Espejo', ability: 'Sueño confortante', moves: ['Sueño dulce', 'Moonblast', 'Psychic', 'Calm Mind']},
  {species: 'Railspike', item: 'Casco de Pruebas', ability: 'Rock Head', moves: ['Head Smash', 'Poltergeist', 'Stealth Rock', 'Earthquake']},
  {species: 'Metagross-Custom', item: 'Metagrossita X', ability: 'Clear Body', moves: ['Liquidation', 'Stone Edge', 'Aqua Jet', 'Earthquake']},
  {species: 'Hazmadger', item: 'Anillo Espinado', ability: 'Blaze', moves: ['Flare Blitz', 'Close Combat', 'Gunk Shot', 'U-turn']},
  {species: 'Lapras', item: 'Abrojo Trampa', ability: 'Water Absorb', moves: ['Surf', 'Ice Beam', 'Freeze-Dry', 'Thunderbolt']},
  {species: 'Lapras-Custom', item: 'Filtro Absorbente', ability: 'Water Absorb', moves: ['Surf', 'Moonblast', 'Ice Beam', 'Decorate']},
 ]},
 {id: 'e2', nombre: 'Custom B', formato: 'doubles', sets: [
  {species: 'Somnumbra', item: 'Banda de Relevo', ability: 'Terror nocturno', moves: ['Knock Off', 'Psychic Fangs', 'Dark Void', 'Bulk Up']},
  {species: 'Ferroantena', item: 'Pararrayos Portátil', ability: 'Quark Drive', moves: ['Thunderbolt', 'Flash Cannon', 'Volt Switch', 'Electroweb']},
  {species: 'Gemouse', item: 'Falso Sustituto', ability: 'Technician', moves: ['Population Bomb', 'Twin Beam', 'Follow Me', 'Protect']},
  {species: 'Pitaraka', item: 'Chaleco Antidisturbios', ability: 'Overgrow', moves: ['Wood Hammer', 'Dragon Claw', 'Earthquake', 'Head Smash']},
  {species: 'Wickbird', item: 'Shuko', ability: 'Pickpocket', moves: ['Knock Off', 'Leaf Blade', 'Fake Out', 'Brave Bird']},
  {species: 'Sinfobra', item: 'Brazal Inversor', ability: 'Liquid Voice', moves: ['Sparkling Aria', 'Hyper Voice', 'Moonblast', 'Calm Mind']},
 ]},
];
for (const e of EQUIPOS) for (const s of e.sets) Object.assign(s, {name: '', nature: 'Hardy', evs: {hp: 84, atk: 84, def: 84, spa: 84, spd: 84, spe: 84}, ivs: {hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31}, level: 100, gender: '', shiny: false, teraType: 'Normal'});
async function nuevaPagina(ctx, errs, etiqueta) {
  const page = await ctx.newPage();
  page.on('pageerror', e => errs.push(etiqueta + ' PAGEERROR ' + e.message + '\n' + e.stack));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_|net::/.test(m.text())) errs.push(etiqueta + ' CONSOLE ' + m.text()); });
  await page.route(/fonts\.g|jsdelivr|unpkg|pokemonshowdown/, r => r.abort());
  return page;
}
async function preparar(page, url = 'http://127.0.0.1:8080/index.html', nombre = 'Ana') {
  await page.goto(url);
  await page.evaluate(([eq, n]) => { localStorage.setItem('cnx.equipos.v1', JSON.stringify(eq)); localStorage.setItem('cnx.nombre', JSON.stringify(n)); localStorage.setItem('cnx.rapido', 'true'); }, [EQUIPOS, nombre]);
  await page.reload();
  await page.waitForSelector('.mp-fila');
}
/** Juega eligiendo opciones al azar hasta que termine. */
async function jugar(page, maxPasos = 400, shotEn = 6, nombreShot = 'combate') {
  for (let i = 0; i < maxPasos; i++) {
    if (await page.$('.fin-combate')) return true;
    const opciones = await page.$$('.controles button.btn-movimiento:not([disabled]), .controles button.btn-cambio:not([disabled]), .controles button.btn-objetivo:not([disabled])');
    if (opciones.length) {
      if (i === shotEn) await page.screenshot({path: SHOTS + nombreShot + '.png'});
      const movs = await page.$$('.controles button.btn-movimiento:not([disabled])');
      const objs = await page.$$('.controles button.btn-objetivo:not([disabled])');
      const poderes = await page.$$('.controles button.btn-poder:not(.activo)');
      if (poderes.length && Math.random() < 0.3) { await poderes[0].click().catch(() => {}); await page.waitForTimeout(100); continue; }
      const pick = objs.length ? objs[Math.floor(Math.random() * objs.length)] : movs.length && Math.random() < 0.85 ? movs[Math.floor(Math.random() * movs.length)] : opciones[Math.floor(Math.random() * opciones.length)];
      await pick.click().catch(() => {});
    }
    await page.waitForTimeout(150);
  }
  return false;
}
module.exports = {SHOTS, EQUIPOS, nuevaPagina, preparar, jugar};
