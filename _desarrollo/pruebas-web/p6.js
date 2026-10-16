const {chromium} = require('playwright');
const {SHOTS, nuevaPagina, preparar} = require('./comun');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({viewport: {width: 1280, height: 800}});
  const errs = [];
  const host = await nuevaPagina(ctx, errs, 'HOST');
  host.on('console', m => console.log('c:', m.text().slice(0,200)));
  await preparar(host, 'http://127.0.0.1:8080/index.html?local=1', 'Ana');
  await host.click('.mp-tarjeta[data-id=online]');
  await host.click('text=Crear sala');
  await host.waitForTimeout(1500);
  console.log(await host.$eval('#app', e => e.innerText.slice(0, 400)), host.url());
  console.log(errs);
  await browser.close();
})();
