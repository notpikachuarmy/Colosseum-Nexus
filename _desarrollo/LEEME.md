# _desarrollo — herramientas para generar y probar Colosseum Nexus

Esta carpeta NO hace falta para jugar ni para publicar: GitHub Pages solo usa
`index.html`, `app.js`, `estilos.css`, `datos/`, `sprites/` e `img/`.
Sirve para volver a generar `app.js` cuando se cambia algo en `_codigo-fuente/`
y para pasar las pruebas automáticas. Todo es gratuito.

## Qué hay aquí

| Carpeta | Qué es |
| --- | --- |
| `vjs/` | El simulador de Pokémon Showdown (@pkmn/sim, licencia MIT) ya convertido a JavaScript. Es lo que se mete dentro de `app.js`. |
| `simulador-fuente.zip` | El mismo simulador en su código original (TypeScript, licencia MIT), comprimido. Solo hace falta si algún día hay que regenerar `vjs/`. |
| `pruebas-motor/` | Pruebas de las mecánicas (habilidades, objetos, trampas, cláusulas, sueño, anulación…). |
| `pruebas-web/` | Pruebas en navegador con Playwright (menú, Pokédex, combates, online, móvil, gacha…). |
| `tsconfig.json` | Le dice al compilador dónde está el simulador. No hace falta tocarlo. |

## Generar app.js

1. Instala Bun (gratis): https://bun.sh
2. En una terminal, dentro de esta carpeta (`_desarrollo`):

   ```
   bun run compilar
   ```

   Eso crea `../app.js` a partir de `../_codigo-fuente/app.ts`.

## Pasar las pruebas

- Mecánicas: `bun run pruebas` (resume cuántas pasan).
- Navegador: hace falta Node y Playwright (`npm install` aquí dentro y `npx playwright install chromium`).
  Con la web servida en `http://127.0.0.1:8080` (por ejemplo `bun run servidor` en otra terminal),
  ejecuta `node pruebas-web/p13.js` o `bun run pruebas-web`. Las capturas quedan en `pruebas-web/capturas/`.
