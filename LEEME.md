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
3. El otro pulsa **Unirse**, escribe el código y el anfitrión pulsa **¡Empezar combate!**

El combate se calcula en el navegador del anfitrión, así que debe tener la pestaña abierta durante la partida.

## Novedades

- **Poderes:** en combate puedes elegir Megaevolución, Movimiento Z, Dinamax/Gigamax o Teracristal. Solo uno por combate y jugador. Si el Pokémon lleva una megapiedra o un cristal Z, ese es su poder.
- **Fichas de información:** pasa el ratón por encima de un Pokémon, de un movimiento o de un botón de cambio (en el móvil, mantén pulsado). Del rival se ve lo que se ha descubierto: habilidad, objeto y movimientos usados.
- **Equipos aleatorios parejos:** en "Practicar" y en las salas online. Los Pokémon se reparten por parejas de poder parecido, uno para cada jugador.

## Cómo cambiar los datos

Todo lo personalizado está en la carpeta `datos/` y se edita con cualquier editor de texto:

| Archivo | Qué contiene |
|---|---|
| `datos/pokemon.js` | Pokémon: tipos, stats, habilidades, movimientos que aprenden, sprites |
| `datos/habilidades.js` | Habilidades nuevas (Sueño confortante, Terror nocturno) |
| `datos/movimientos.js` | Movimientos nuevos (Sueño dulce) |
| `datos/objetos.js` | Los 17 objetos equipables y sus valores de balance |

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
