# Arena Fakemon

Combates Pokémon online entre amigos con Pokémon, movimientos, habilidades y objetos personalizados.
Funciona con GitHub Pages: no hace falta servidor ni pagar nada.

## Cómo publicarlo

1. Sube **todo el contenido de esta carpeta** a un repositorio de GitHub (por ejemplo `arena-fakemon`).
2. En el repositorio: *Settings → Pages → Branch: main / (root) → Save*.
3. En un par de minutos estará en `https://TU-USUARIO.github.io/arena-fakemon/`.

## Cómo jugar con un amigo

1. Los dos entráis en la página y creáis un equipo en **Mis equipos**.
2. Uno pulsa **Combatir online → Crear sala** y le pasa el código de 5 letras al otro.
3. El otro pulsa **Unirse**, escribe el código y el anfitrión elige el tipo de partida y pulsa **¡Empezar!**

El combate se calcula en el navegador del anfitrión, así que debe tener la pestaña abierta durante la partida.

**Si cuesta conectar:**
- Si se corta, el invitado se reconecta solo y el combate sigue donde estaba (el anfitrión espera 2 minutos antes de darlo por abandonado).
- Algunas redes (empresa, instituto, ciertos routers) bloquean las conexiones directas. La página usa servidores de rebote gratuitos para esos casos, pero si aun así falla, probad uno con los datos del móvil.
- Usad Chrome, Edge o Firefox actualizados y sin extensiones de VPN/anti-WebRTC.
- El servidor de rebote propio (cuenta gratuita de Metered) se configura en `datos/conexion.js`. Si algún día deja de ir, crea otra credencial en Metered y copia ahí el usuario y la contraseña.

## Novedades

- **Poderes:** en combate puedes elegir Megaevolución, Movimiento Z, Dinamax/Gigamax o Teracristal. Solo uno por combate y jugador. Si el Pokémon lleva una megapiedra o un cristal Z, ese es su poder.
- **Fichas de información:** pasa el ratón por encima de un Pokémon, de un movimiento o de un botón de cambio (en el móvil, mantén pulsado). Del rival se ve lo que se ha descubierto: habilidad, objeto y movimientos usados.
- **Equipos aleatorios parejos:** en "Practicar" y en las salas online. Los Pokémon se reparten por parejas de poder parecido, uno para cada jugador, con objetos que encajan con sus movimientos.
- **Al mejor de 3 y draft:** en el draft cada uno lleva una plantilla de 7 a 12 Pokémon (en "Mis equipos" → "Plantilla draft") y antes de cada combate elige 6, viendo la plantilla del rival.
- **Cancelar tu elección:** mientras el rival no haya elegido, puedes pulsar "↩ Cambiar mi elección".
- **Pokédex renovada:** pestañas de Pokémon, movimientos, habilidades y objetos con iconos y tipos a color.
- **Exportar a PBS (Pokémon Essentials v21):** en la Pokédex, pestaña "Exportar a PBS", descargas `pokemon`, `pokemon_forms`, `moves`, `abilities` e `items` para Essentials 21.1, todo en inglés. Los movimientos oficiales salen a su nivel real; los de tus Fakemon nuevos se reparten por niveles automáticamente, así que revísalos. Al final de `pokemon_custom.txt` hay una lista de cambios a mano para Pokémon oficiales (evoluciones nuevas de Eevee, movimientos añadidos a Darkrai…).
- **Idioma:** en la pantalla de inicio puedes elegir Español o English. Los textos de tus datos personalizados (descripciones de tus objetos, movimientos…) salen tal y como los escribas.

## Cómo cambiar los datos

Todo lo personalizado está en la carpeta `datos/` y se edita con cualquier editor de texto:

| Archivo | Qué contiene |
|---|---|
| `datos/pokemon.js` | Pokémon: tipos, stats, habilidades, movimientos que aprenden, sprites |
| `datos/habilidades.js` | Habilidades nuevas (Sueño confortante, Terror nocturno) |
| `datos/movimientos.js` | Movimientos nuevos (Sueño dulce y los 15 de la v21) |
| `datos/objetos.js` | Los 24 objetos equipables y sus valores de balance |

Campos útiles de `datos/pokemon.js`:
- `editar: true` → en vez de crear un Pokémon, añade movimientos o habilidad oculta a uno oficial (por ejemplo, Darkrai con tus movimientos).
- `quitarTipos: ['Poison']` → no hereda de su preevolución los movimientos de esos tipos (como Wishbaggon).
- `metodoPBS: 'Level,20'` → cómo evoluciona al exportarlo a Essentials (con IDs en inglés: `Item,ANCIENTLETTER`).
- `categoria` y `entradaPokedex` (en inglés) → categoría y texto de la Pokédex al exportar a Essentials.
- En movimientos, habilidades y objetos: `idPBS`, `nombreEN` y `descEN` son el ID, el nombre y la descripción en inglés (se usan en el modo English y al exportar a PBS).
- Los objetos de evolución propios (Cómic, Carta Antigua…) están al final de `datos/objetos.js`, en `OBJETOS_EVOLUCION`.
- Los mensajes de combate de tus movimientos y objetos se escriben en los dos idiomas: `MSG('¡Texto en español!', 'English text!')`.

Tus versiones de Pokémon que ya existen (Lapras, Metagross, Pikachu…) aparecen como una **forma nueva** (`Lapras-Custom`) y conviven con el original. El nombre de esa forma se cambia en la primera línea de `datos/pokemon.js` (`FORMA_PERSONALIZADA`).

Los nombres de movimientos, habilidades y objetos oficiales salen en español gracias a `traduccion-es.js`.

Los sprites están en `sprites/custom/` (front, back, front-shiny, back-shiny, icons).
Si algo de los datos está mal escrito (un movimiento que no existe, por ejemplo), aparecerá un aviso en la pantalla de inicio.

**Importante:** los dos jugadores tienen que tener la misma versión de los datos (si cambias algo, recargad los dos la página).

## Probar sin internet entre dos pestañas

Abre `index.html?local=1` en dos pestañas del mismo navegador: la conexión usa la propia pestaña en lugar de internet.

---
Hecho con el simulador de Pokémon Showdown (licencia MIT). Las conexiones usan PeerJS.
Pokémon es propiedad de Nintendo, Game Freak y Creatures.
