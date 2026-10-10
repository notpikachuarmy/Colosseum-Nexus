// Punto de entrada: pantalla de inicio y navegación.
import {tr, IDIOMA, cambiarIdioma} from './idioma';
import {buildMod, INFO} from './mod';
import {h, spriteImg, storage} from './util';
import {pantallaEquipos} from './constructor';
import {cargarEquipos} from './equipos';
import {app, cambiarPantalla, nav, nombreJugador} from './nucleo';
import {practica} from './practica';
import {online} from './online';
import {pokedex} from './pokedex';

function inicio() {
  app.innerHTML = '';
  const nombre = h('input', {class: 'input', value: nombreJugador(), placeholder: tr('Tu nombre de entrenador', 'Your trainer name'), maxlength: '18'});
  nombre.addEventListener('change', () => storage.set('arena.nombre', nombre.value.trim()));
  const nEquipos = cargarEquipos().length;
  const idioma = h('div', {class: 'selector-idioma', title: tr('Idioma', 'Language')},
    ...([['es', 'Español'], ['en', 'English']] as const).map(([id, txt]) =>
      h('button', {class: 'idioma-btn' + (IDIOMA === id ? ' activo' : ''), onclick: () => { if (IDIOMA !== id) cambiarIdioma(id); }}, txt)));
  app.append(h('div', {class: 'inicio'}, idioma,
    h('div', {class: 'logo'},
      h('div', {class: 'logo-sprites'}, ...['Somnistera', 'Railspike', 'Hazmadger'].map(s => spriteImg(s))),
      h('h1', {}, 'Arena Fakemon'),
      h('p', {class: 'subtitulo'}, tr('Combates Pokémon con tus criaturas, objetos y habilidades personalizadas', 'Pokémon battles with your own creatures, items and abilities'))),
    h('label', {class: 'campo campo-nombre'}, h('span', {class: 'etq'}, tr('Tu nombre', 'Your name')), nombre),
    h('div', {class: 'menu'},
      boton('⚔', tr('Combatir online', 'Battle online'), tr('Crea una sala y pasa el código a un amigo', 'Create a room and send the code to a friend'), () => cambiarPantalla(nav.online)),
      boton('🤖', tr('Practicar contra la IA', 'Practice against the AI'), tr('Combates sueltos, al mejor de 3 o draft', 'Single battles, best of 3 or draft'), () => cambiarPantalla(nav.practica)),
      boton('🧩', tr('Mis equipos', 'My teams'), nEquipos ? tr(`${nEquipos} equipo${nEquipos > 1 ? 's' : ''} guardado${nEquipos > 1 ? 's' : ''}`, `${nEquipos} saved team${nEquipos > 1 ? 's' : ''}`) : tr('Crea tu primer equipo', 'Create your first team'), () => cambiarPantalla(nav.equipos)),
      boton('📖', tr('Pokédex personalizada', 'Custom Pokédex'), tr('Fakemon, movimientos, habilidades, objetos y exportar a PBS', 'Fakemon, moves, abilities, items and PBS export'), () => cambiarPantalla(nav.pokedex))),
    INFO.avisos.length ? h('div', {class: 'avisos'}, h('b', {}, tr('Avisos al cargar los datos:', 'Warnings while loading the data:')), ...INFO.avisos.map(a => h('div', {}, '⚠ ' + a))) : null,
    h('footer', {class: 'pie'}, tr('Hecho con el simulador de Pokémon Showdown (licencia MIT). Pokémon es propiedad de Nintendo, Game Freak y Creatures.', 'Made with the Pokémon Showdown simulator (MIT license). Pokémon is property of Nintendo, Game Freak and Creatures.'))));
}

function boton(icono: string, titulo: string, sub: string, onclick: () => void) {
  return h('button', {class: 'menu-btn', onclick}, h('span', {class: 'menu-icono'}, icono),
    h('span', {class: 'menu-texto'}, h('b', {}, titulo), h('small', {}, sub)));
}

nav.inicio = inicio;
nav.online = online;
nav.practica = practica;
nav.pokedex = pokedex;
nav.equipos = () => pantallaEquipos(app, () => cambiarPantalla(inicio));

document.documentElement.lang = IDIOMA;
try {
  buildMod();
  inicio();
} catch (e: any) {
  console.error(e);
  app.innerHTML = '';
  app.append(h('div', {class: 'avisos'}, tr('Error al cargar los datos personalizados: ', 'Error loading the custom data: ') + (e?.message || e),
    h('p', {}, tr('Revisa el último cambio que hiciste en la carpeta datos/.', 'Check the last change you made in the datos/ folder.'))));
}
