// Modo inglés: recorre pantallas y busca texto en español que se haya escapado
const {chromium} = require('playwright');
const {SHOTS, nuevaPagina, preparar, jugar} = require('./comun');
const ES = /\b(el|la|los|las|del|de la|está|ha|tu|sus|equipo|combate|movimiento|objeto|habilidad|elige|esperando|sin|aún|ningún|recuperó|usó|debilitó)\b|[áéíóúñ¿¡]/i;
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({viewport: {width: 1280, height: 900}});
  const errs = []; const p = await nuevaPagina(ctx, errs, 'A'); await preparar(p);
  await p.click('.mp-ajustes'); await p.click('.idioma-btn:has-text("English")'); await p.waitForSelector('.mp-fila');
  const sospechosos = new Set();
  const revisar = async (nombre) => {
    await p.screenshot({path: SHOTS + 'en-' + nombre + '.png'});
    const txt = await p.evaluate(() => document.body.innerText);
    for (const l of txt.split('\n')) if (/[a-z]/i.test(l) && /\b(el|la|los|las|del|está|tu|sus|equipo|combate|elige|esperando|sin|aún|usó|se)\b|[¿¡]/i.test(l)) sospechosos.add(nombre + ': ' + l.slice(0, 140));
  };
  await revisar('inicio');
  await p.click('.mp-tarjeta[data-id=equipos]'); await p.waitForTimeout(500); await revisar('equipos');
  await p.click('.slot, .tarjeta-equipo, .equipo-item >> nth=0').catch(() => {}); await p.waitForTimeout(500); await revisar('editor');
  await p.goto('http://127.0.0.1:8080/index.html'); await p.waitForSelector('.mp-fila');
  await p.click('.mp-tarjeta[data-id=online]'); await p.waitForTimeout(400); await revisar('online');
  await p.goto('http://127.0.0.1:8080/index.html'); await p.waitForSelector('.mp-fila');
  await p.click('.mp-tarjeta[data-id=practica]'); await p.waitForTimeout(400); await revisar('practica');
  await p.click('button.btn-grande'); await p.waitForTimeout(1500);
  await jugar(p, 120, 4, 'en-combate');
  await revisar('combate-fin');
  const log = await p.evaluate(() => [...document.querySelectorAll('.log .linea, .registro div')].map(d => d.textContent).join('\n'));
  for (const l of log.split('\n')) if (ES.test(l) && !/^[A-ZÁ][\wéá]+ (used|is|was)/.test(l)) sospechosos.add('LOG: ' + l);
  console.log([...sospechosos].join('\n'));
  console.log('ERRORES', errs); await b.close();
})();
