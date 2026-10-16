# Colosseum Nexus

Combates Pokémon online entre amigos con Fakemon, movimientos, habilidades y objetos personalizados.
Funciona con GitHub Pages: no hace falta servidor ni pagar nada.

Colosseum Nexus es y será gratis: sin anuncios, sin compras externas (con dinero real) y sin ventajas de pago.

Web: https://notpikachuarmy.github.io/Colosseum-Nexus/

## Cómo publicarlo

1. Sube **todo el contenido de esta carpeta** al repositorio de GitHub (`Colosseum-Nexus`).
2. En el repositorio: *Settings → Pages → Branch: main / (root) → Save*.
3. En un par de minutos estará en `https://notpikachuarmy.github.io/Colosseum-Nexus/`.

Si cambias algo en `_codigo-fuente/`, hay que volver a generar `app.js`: los pasos están en `_desarrollo/LEEME.md`. Los cambios en `datos/` no necesitan nada más.

## Cómo jugar con un amigo

1. Los dos entráis en la página y creáis un equipo en **Equipos**.
2. Uno pulsa **Combate online → Crear sala** y le pasa el código de 5 letras al otro.
3. El otro pulsa **Unirse**, escribe el código y el anfitrión elige el tipo de partida y pulsa **¡Empezar!**

En la sala, el anfitrión puede desactivar poderes con **Poderes permitidos** (Megaevolución, Movimiento Z, Dinamax, Teracristal). Lo que quite no se podrá usar en esa partida, y el invitado lo ve antes de empezar.

El combate se calcula en el navegador del anfitrión, así que debe tener la pestaña abierta durante la partida.

**Si cuesta conectar:**
- Si se corta, el invitado se reconecta solo y el combate sigue donde estaba (el anfitrión espera 2 minutos antes de darlo por abandonado).
- Algunas redes (empresa, instituto, ciertos routers) bloquean las conexiones directas. La página usa servidores de rebote gratuitos para esos casos, pero si aun así falla, probad uno con los datos del móvil.
- Usad Chrome, Edge o Firefox actualizados y sin extensiones de VPN/anti-WebRTC.
- El servidor de rebote propio (cuenta gratuita de Metered) se configura en `datos/conexion.js`. Si algún día deja de ir, crea otra credencial en Metered y copia ahí el usuario y la contraseña.

## Novedades

- **Menú principal nuevo:** tarjetas al estilo consola (Combate online, Combate de práctica, Equipos, Historia, Pokédex, Gacha y Créditos). Se puede usar con el ratón, tocando o con las flechas del teclado. Arriba a la derecha está tu perfil (avatar, nombre y niveles) y el botón de **Ajustes**.
- **Ajustes:** nombre de entrenador, idioma, volumen de la música, silenciar y animaciones rápidas. Se guardan en el navegador.
- **Música:** una pista en los menús (`audio/menu.mp3`) y otra en los combates (`audio/combate.mp3`). Al cambiar, una se apaga poco a poco y entra la otra. Los navegadores no dejan sonar nada hasta el primer clic o toque, así que empieza entonces. Para cambiarla, sustituye esos archivos manteniendo el nombre. Música creada con Suno.
- **Perfil:** se abre tocando tu avatar en el menú. Enseña tu avatar en grande, tu nombre, y por separado las estadísticas online y contra la IA (nivel, experiencia, victorias, derrotas, racha máxima de victorias seguidas y % de victorias). Debajo está tu colección: solo los entrenadores que tienes, con buscador, filtros y el contador «Colección: X/Y». Toca uno para usarlo como avatar, o «Aleatorio» para llevar uno distinto de los tuyos en cada combate.
- **Combate de práctica:** ahora siempre te enfrentas a un **holoentrenador** al azar, controlado por la IA.
- **Poderes:** en combate puedes elegir Megaevolución, Movimiento Z, Dinamax/Gigamax o Teracristal. Solo uno por combate y jugador. Si el Pokémon lleva una megapiedra o un cristal Z, ese es su poder.
- **Fichas de información:** pasa el ratón por encima de un Pokémon, de un movimiento o de un botón de cambio (en el móvil, mantén pulsado). Del rival se ve lo que se ha descubierto: habilidad, objeto y movimientos usados.
- **Equipos aleatorios parejos:** en "Combate de práctica" y en las salas online. Los Pokémon se reparten por parejas de poder parecido, uno para cada jugador, con objetos que encajan con sus movimientos.
- **Al mejor de 3 y draft:** en el draft cada uno lleva una plantilla de 7 a 12 Pokémon (en "Equipos" → "Plantilla draft") y antes de cada combate elige 6, viendo la plantilla del rival.
- **Cancelar tu elección:** mientras el rival no haya elegido, puedes pulsar "↩ Cambiar mi elección".
- **Pokédex renovada:** pestañas de Pokémon, movimientos, habilidades y objetos con iconos y tipos a color.
- **Exportar a PBS (Pokémon Essentials v21):** está oculto. Se abre con **Ctrl + Alt + Ñ** (en Windows también AltGr + Ñ) desde cualquier pantalla que no sea un campo de texto, o añadiendo `#pbs` al final de la dirección de la web. Desde ahí descargas `pokemon`, `pokemon_forms`, `moves`, `abilities` e `items` para Essentials 21.1, todo en inglés. Los movimientos oficiales salen a su nivel real; los de tus Fakemon nuevos se reparten por niveles automáticamente, así que revísalos. Al final de `pokemon_custom.txt` hay una lista de cambios a mano para Pokémon oficiales (evoluciones nuevas de Eevee, movimientos añadidos a Darkrai…).
- **En el móvil:** toca un Pokémon o su barra de vida para ver su ficha. Para ver la info de un ataque o de un Pokémon del banquillo, mantén pulsado o activa el botón **ℹ** del campo (mientras está activo, tocar no elige: enseña los datos).
- **Salir siempre:** en el combate hay un botón **⌂ Salir** que funciona aunque se haya cortado la conexión (si el combate no ha terminado, cuenta como rendirse).
- **Paquete para Essentials 21.1:** en la carpeta `plugin/` del repositorio están todas las habilidades, movimientos y objetos personalizados listos para Pokémon Essentials (plugins, PBS e iconos, con un LEEME con los pasos para instalarlo).
- **Trampa Mental:** trampa de entrada de tipo Psíquico que confunde al rival al entrar (los de tipo Siniestro son inmunes). Se quita como las demás con Giro Rápido, Despejar, etc.
- **Puntos Victoria (PV), tienda y gacha:** cada combate de 3 turnos o más da PV (más si ganas, y más online que contra la IA; ganar una serie al mejor de 3 da un extra). Con los PV compras en **Gacha → Tienda**: tickets de gacha (sueltos o en pack de 10), entrenadores exclusivos de la tienda (el precio depende de su rareza) y pases. Cada ticket del gacha da un entrenador que **no** tengas: nunca salen repetidos (si ya los tienes todos, no te deja gastar el ticket). Las compras piden confirmar con un segundo clic y nunca cobran dos veces. Todos los premios y precios están en `datos/economia.js`.
- **Pases:** en **Gacha → Pases**. No caducan. Se compran con PV y puedes tener varios, pero solo el **activo** gana experiencia de pase (en cada combate, más si ganas y más online). Al llegar a cada nivel, su recompensa se entrega sola una única vez: entrenadores, tickets, títulos y Fakemon. El primero es el **Pase Kaiba Corp** (20 niveles). Si una recompensa es un entrenador que ya tenías, te da su valor en PV. Todo se configura en `datos/pases.js`.
- **Títulos:** 35 títulos con logros (online, colección, estilo de equipo como «Orgullo de Kanto» o «Monotipo», series, pase e historia). Se consiguen una sola vez, algunos dan PV, y en el **Perfil** eliges cuál se enseña en el VS (o ninguno). Solo cuentan los combates de 3 turnos o más, y cada combate cuenta una vez. Nombres, textos y PV en `datos/titulos.js`.
- **Campo de combate:** ya no hay plataformas: los Pokémon están sobre un **fondo** (el Bosque desde el principio; el Gimnasio y el Cine se consiguen en el modo historia). En el **Perfil** eliges tu fondo o «Aleatorio» entre los que tienes; cada jugador ve el suyo. Encima del fondo se ven, según lo que pasa de verdad en el combate: el **tinte** del campo (verde hierba, amarillo eléctrico, rosa niebla, morado psíquico), los **peligros** de entrada en el suelo de cada lado (púas por capas, púas tóxicas, trampa rocas, red viscosa y Trampa Mental) y el **clima** por encima de todo (lluvia/diluvio, sol/sol abrasador, tormenta de arena, granizo y nieve). También sale **niebla** encima de todo mientras Neblina está activa y en el turno en que se usa Niebla Espejo. Viento fuerte, Acero afilado y Ceniza sofocante no tienen imagen. Todo se configura en `datos/fondos.js` (imágenes en `img/fondos`, `img/clima` e `img/hazards`; la fuerza del tinte, con `opacidad`).
- **Lugia Oscuro:** nuevo Fakemon (Psíquico/Volador, Presión/Multiescamas, todos los movimientos de Lugia más 4 movimientos oscuros: Soplo Oscuro, Muda Oscura, Ocaso Oscuro y Tifón Oscuro). Los movimientos oscuros no usan la tabla de tipos: hacen ×1,3 a todos (×0,5 a otros Pokémon oscuros) y no se copian con Esquema. Se compra en **Gacha → Tienda → Fakemon** (PV 1000, precio en `datos/economia.js`). Diseño de Nintendo (Pokémon XD), sprites de Shadowgate31 y shiny de Arga.
- **Modo historia:** en el menú, **Historia**. Cada historia es un mapa con una ruta de entrenadores: al ganar uno se abre el siguiente (con diálogos antes y después, y su fondo propio). Se combate siempre con un equipo tuyo (no hay equipo aleatorio). Las recompensas (PV, avatares, fondos, Fakemon y títulos) se entregan una sola vez. Hay dos historias: **Medalla Linternita** (gimnasio de Randes) y **El cine maldito** (con Handsome; ahí todos los rivales son Pokémon fantasma y siniestro, no entrenadores). El jefe del cine, **Aracamara**, es un **jefe de incursión**: 1 contra tus 6, PS ×4 y resto ×1,3, barra partida en 3 tramos; al pasar cada tramo baja el **Telón** (ese turno y el siguiente recibe la mitad de daño, y borra tus mejoras). No hay límite de turnos y el jefe no usa Dinamax, Teracristal, Mega ni Z. Esos números se cambian en `incursion` dentro de `datos/historia.js`. Todo se escribe en `datos/historia.js` (para añadir una historia nueva basta con copiar un bloque).
- **Fakemon bloqueados:** los Fakemon de un pase o del modo historia (lista en `datos/pases.js`) no se pueden usar en **tus** equipos hasta que los consigues; la IA y los demás jugadores sí pueden usarlos. En el editor de equipos salen con un candado y dónde se consiguen.
- **Entrenadores:** cada jugador tiene un avatar (al empezar, **Sombra**). En `datos/avatares.js`, `nombre` es lo que se enseña (solo nombre y apellido, sin «2», «sygna suit», «M/F»...) y `origen` dice dónde se consigue: gacha (si no pone nada), tienda, pase o historia. Tu colección está en el **Perfil**; el catálogo del gacha, en la pantalla Gacha. Los avatares se ven en el combate y en la sala online.
- **Niveles de jugador:** hay dos niveles, uno contra la IA y otro online, cada uno con sus propias estadísticas. Ganar da más experiencia que perder y ganar una serie da un extra. El nivel online se ve en la sala y en el combate, con un rango (Novato, Entrenador, Veterano, As, Maestro, Campeón y Tryhard). La experiencia de cada resultado se cambia al final de `datos/avatares.js`.
- **Créditos:** en la ficha de cada Fakemon de la Pokédex salen sus autores (idea, diseño final y sprites), y hay una pantalla de **Créditos** con todos los autores de los Fakemon, de los sprites de entrenador y del motor.
- **Habilidades nuevas (v3):** Cimientos (no le afectan las trampas de entrada), Botín de Guerra (si debilita a un rival sin llevar objeto, se queda el suyo) y Sonámbulo (ataca aunque esté dormido, con un 25% menos de daño).
- **Idioma:** en **Ajustes** puedes elegir Español o English. Los textos de tus datos personalizados (descripciones de tus objetos, movimientos…) salen tal y como los escribas.

## Online: qué servicios usa y sus límites

Todo es gratis y no hay ninguna tarjeta asociada. El combate va directo de navegador a navegador (WebRTC); la web no tiene servidor propio.

| Servicio | Para qué | Si falla o se acaba |
|---|---|---|
| **PeerJS Cloud** (gratis, sin límites publicados) | Encontrar la sala con el código de 5 letras | No se pueden crear ni unir salas. Todo lo demás (IA, historia, equipos, tienda...) sigue funcionando. |
| **STUN** de Google, Cloudflare y Metered (gratis, sin cuota) | Que cada navegador sepa su dirección para conectarse directo | Hay tres; con uno que funcione basta. |
| **TURN de Metered** (plan gratuito: 500 MB al mes) | Rebotar la partida cuando la conexión directa no es posible (redes estrictas, algunos datos móviles) | Se usa el plan B gratuito (freestun.net). Si también falla, solo los jugadores de redes estrictas no pueden conectar. |

Un combate online mueve unos 70–150 KB. Con el rebote eso cuenta dos veces (entra y sale), así que los 500 MB dan para más de mil combates rebotados al mes; la mayoría de las partidas van directas y no gastan nada.

La credencial del TURN está en `datos/conexion.js` y es visible para cualquiera (no hay forma de esconderla sin un servidor). No es la contraseña de tu cuenta: lo peor es que alguien gaste la cuota gratuita. Para cambiarla: en el panel de Metered crea una credencial nueva, cópiala en `datos/conexion.js`, publica y **borra la antigua**. No añadas nunca una tarjeta en Metered.

## Cómo cambiar los datos

Todo lo personalizado está en la carpeta `datos/` y se edita con cualquier editor de texto:

| Archivo | Qué contiene |
|---|---|
| `datos/pokemon.js` | Pokémon: tipos, stats, habilidades, movimientos que aprenden, sprites |
| `datos/habilidades.js` | Habilidades nuevas (Sueño confortante, Terror nocturno, Corazón de Dragón, Contraveneno, Rocío Matinal, Corriente Fría, Mal de Ojo, Cimientos, Botín de Guerra, Sonámbulo) |
| `datos/movimientos.js` | Movimientos nuevos (Sueño dulce, Rugido Ancestral y los 15 de la v21) |
| `datos/objetos.js` | Los 24 objetos equipables y sus valores de balance |
| `datos/avatares.js` | Avatares de jugador: nombre, autor del sprite, etiquetas (filtros), rareza y origen; al final, las probabilidades del gacha |
| `datos/economia.js` | PV que se ganan por combate y precios de la tienda (tickets, avatares por rareza y pases) |
| `datos/historia.js` | Historias: mapa, entrenadores, diálogos, equipos y recompensas |
| `datos/fondos.js` | Fondos de combate (y cómo se consiguen), imágenes de clima y peligros, y colores e intensidad del tinte de los campos |
| `datos/titulos.js` | Títulos: nombre, texto y PV de premio (la condición va por el id) |
| `datos/pases.js` | Pases y sus recompensas por nivel, experiencia de pase y Fakemon del modo historia |
| `datos/creditos.js` | Autores de los Fakemon (por defecto y excepciones) y otros créditos |

Campos útiles de `datos/pokemon.js`:
- `editar: true` → en vez de crear un Pokémon, añade movimientos o habilidad oculta a uno oficial (por ejemplo, Darkrai con tus movimientos).
- `habilidadesExtra: ['Contraveneno']` → habilidades que se añaden sin quitar ninguna de las que ya tenía (pueden ser 4, 5 o más). En los Pokémon con `editar: true` las habilidades nuevas siempre se añaden.
- `quitarTipos: ['Poison']` → no hereda de su preevolución los movimientos de esos tipos (como Wishbaggon).
- `metodoPBS: 'Level,20'` → cómo evoluciona al exportarlo a Essentials (con IDs en inglés: `Item,ANCIENTLETTER`).
- `categoria` y `entradaPokedex` (en inglés) → categoría y texto de la Pokédex al exportar a Essentials.
- En movimientos, habilidades y objetos: `idPBS`, `nombreEN` y `descEN` son el ID, el nombre y la descripción en inglés (se usan en el modo English y al exportar a PBS).
- Los objetos de evolución propios (Cómic, Carta Antigua…) están al final de `datos/objetos.js`, en `OBJETOS_EVOLUCION`.
- Los mensajes de combate de tus movimientos y objetos se escriben en los dos idiomas: `MSG('¡Texto en español!', 'English text!')`.

Tus versiones de Pokémon que ya existen (Lapras, Metagross, Pikachu…) son formas de la región **Jagara**: en el juego se ven como «Lapras Jagara», aunque por dentro se llaman `Lapras-Custom`, y conviven con el original. El nombre que se enseña se cambia con `NOMBRE_REGION` en `datos/pokemon.js`. El nombre interno (`FORMA_PERSONALIZADA`) mejor no cambiarlo: se perderían los equipos guardados con esas formas.

Los nombres de movimientos, habilidades y objetos oficiales salen en español gracias a `traduccion-es.js`.

Los sprites están en `sprites/custom/` (front, back, front-shiny, back-shiny, icons). Los de entrenador, en `sprites/avatares/` (para añadir uno, copia el PNG ahí y añade su línea en `datos/avatares.js`).
Si algo de los datos está mal escrito (un movimiento que no existe, por ejemplo), aparecerá un aviso en el menú principal.

**Importante:** los dos jugadores tienen que tener la misma versión de los datos (si cambias algo, recargad los dos la página).

## Probar sin internet entre dos pestañas

Abre `index.html?local=1` en dos pestañas del mismo navegador: la conexión usa la propia pestaña en lugar de internet.

---
Hecho con el simulador de Pokémon Showdown (licencia MIT). Las conexiones usan PeerJS.
Pokémon es propiedad de Nintendo, Game Freak y Creatures.
