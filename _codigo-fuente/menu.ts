// Menú principal de Colosseum Nexus (inspirado en los menús de consola).
import {tr} from './idioma';
import {INFO} from './mod';
import {h, dex, spriteImg, toast} from './util';
import {app, cambiarPantalla, nav, nombreJugador} from './nucleo';
import {avatarImg, coleccion, alCambiarColeccion} from './avatares';
import {insignia, nivelDe} from './nivel';
import {abrirAjustes} from './ajustes';

interface Opcion { id: string; img: string; titulo: string; texto: string; ir?: () => void; pronto?: boolean }

/** Los 3 Pokémon del fondo: se eligen una vez por visita a la web y se mantienen mientras juegas */
let fondoMenu: string[] | null = null;
function pokemonFondo(): string[] {
  if (fondoMenu) return fondoMenu;
  const d = dex();
  const custom = [...INFO.custom].map(id => d.species.get(id)).filter(s => s.exists && !s.battleOnly);
  const oficiales = d.species.all().filter(s => s.exists && !s.battleOnly && !s.isNonstandard && s.num > 0 && !INFO.custom.has(s.id) && s.forme === '');
  const elegidos: string[] = [];
  const usados = new Set<string>();
  // Al menos uno personalizado; el resto, de todo el juego
  const pools = [custom, Math.random() < 0.5 ? custom : oficiales, oficiales];
  for (const pool of pools) {
    for (let i = 0; i < 30; i++) {
      const s = pool[Math.floor(Math.random() * pool.length)];
      if (s && !usados.has(s.baseSpecies)) { usados.add(s.baseSpecies); elegidos.push(s.name); break; }
    }
  }
  fondoMenu = elegidos.sort(() => Math.random() - 0.5);
  return fondoMenu;
}

let ultimaElegida = 0;

export function menuPrincipal() {
  app.innerHTML = '';
  const opciones: Opcion[] = [
    {id: 'online', img: 'online', titulo: tr('Combate online', 'Online battle'), texto: tr('Crea una sala y pasa el código a un amigo', 'Create a room and send the code to a friend'), ir: () => cambiarPantalla(nav.online)},
    {id: 'practica', img: 'practica', titulo: tr('Combate de práctica', 'Practice battle'), texto: tr('Combate contra holoentrenadores controlados por la IA', 'Battle hologram trainers controlled by the AI'), ir: () => cambiarPantalla(nav.practica)},
    {id: 'equipos', img: 'equipos', titulo: tr('Equipos', 'Teams'), texto: tr('Crea y edita tus equipos y plantillas de draft', 'Build and edit your teams and draft rosters'), ir: () => cambiarPantalla(nav.equipos)},
    {id: 'historia', img: 'historia', titulo: tr('Historia', 'Story'), texto: tr('Recorre las rutas, vence a sus jefes y consigue recompensas', 'Travel the routes, beat their bosses and earn rewards'), ir: () => cambiarPantalla(nav.historia)},
    {id: 'pokedex', img: 'pokedex', titulo: tr('Pokédex', 'Pokédex'), texto: tr('Fakemon, movimientos, habilidades y objetos', 'Fakemon, moves, abilities and items'), ir: () => cambiarPantalla(nav.pokedex)},
    {id: 'gacha', img: 'gacha', titulo: tr('Gacha', 'Gacha'), texto: tr('Abre tickets y compra en la tienda con tus PV', 'Open tickets and spend your PV in the shop'), ir: () => cambiarPantalla(nav.avatares)},
    {id: 'creditos', img: 'creditos', titulo: tr('Créditos', 'Credits'), texto: tr('Quién ha hecho Colosseum Nexus', 'Who made Colosseum Nexus'), ir: () => cambiarPantalla(nav.creditos)},
  ];

  // --- Cabecera: logo centrado, perfil y ajustes a la derecha
  const perfil = h('button', {class: 'mp-perfil', title: tr('Ver perfil', 'View profile'), onclick: () => cambiarPantalla(nav.perfil)});
  const pintarPerfil = () => {
    perfil.innerHTML = '';
    perfil.append(avatarImg(coleccion().avatar, '', 'busto'),
      h('span', {class: 'mp-perfil-texto'}, h('b', {}, nombreJugador() || tr('Entrenador', 'Trainer')),
        h('span', {class: 'mp-niveles'}, insignia('online', nivelDe('online')), insignia('ia', nivelDe('ia')))));
  };
  pintarPerfil();
  const ajustesBtn = h('button', {class: 'mp-ajustes', title: tr('Ajustes', 'Settings'), 'aria-label': tr('Ajustes', 'Settings'),
    onclick: () => abrirAjustes(() => { pintarPerfil(); })}, h('img', {src: 'img/menu/ajustes.png', alt: ''}));

  // --- Tarjetas
  const descripcion = h('div', {class: 'mp-descripcion', 'aria-live': 'polite'});
  const fichas = coleccion().fichas;
  const tarjetas = opciones.map((o, i) => {
    const b = h('button', {class: 'mp-tarjeta' + (o.pronto ? ' pronto' : ''), 'data-id': o.id, 'aria-label': o.titulo + (o.pronto ? ' — ' + o.texto : ''),
      onclick: () => {
        ultimaElegida = i;
        if (o.pronto || !o.ir) { toast(tr(`${o.titulo}: próximamente`, `${o.titulo}: coming soon`)); return; }
        o.ir();
      }},
      h('span', {class: 'mp-arte'}, h('img', {src: `img/menu/${o.img}.png`, alt: '', draggable: 'false'}),
        h('img', {class: 'mp-marco', src: 'img/menu/seleccion.png', alt: '', draggable: 'false'}),
        o.pronto ? h('span', {class: 'mp-cinta'}, tr('Próximamente', 'Coming soon')) : null,
        o.id === 'gacha' && fichas ? h('span', {class: 'mp-contador', title: tr('Tickets sin abrir', 'Unopened tickets')}, String(fichas)) : null),
      h('span', {class: 'mp-titulo'}, o.titulo));
    const marcar = () => { descripcion.textContent = o.texto; };
    b.addEventListener('mouseenter', () => { b.focus({preventScroll: true}); });
    b.addEventListener('focus', marcar);
    return b;
  });
  const fila = h('nav', {class: 'mp-fila', 'aria-label': tr('Menú principal', 'Main menu')}, ...tarjetas);
  // Flechas del teclado (o mando) para moverse entre opciones
  fila.addEventListener('keydown', e => {
    const i = tarjetas.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) return;
    let j = i;
    if (e.key === 'ArrowRight') j = Math.min(tarjetas.length - 1, i + 1);
    else if (e.key === 'ArrowLeft') j = Math.max(0, i - 1);
    else if (e.key === 'Home') j = 0;
    else if (e.key === 'End') j = tarjetas.length - 1;
    else return;
    e.preventDefault();
    tarjetas[j].focus();
  });

  const fondo = h('div', {class: 'mp-fondo', 'aria-hidden': 'true'}, ...pokemonFondo().map((s, i) => h('div', {class: 'mp-poke mp-poke-' + i}, spriteImg(s))));

  const raiz = h('div', {class: 'menu-principal'},
    fondo,
    h('header', {class: 'mp-cabecera'},
      h('div', {class: 'mp-hueco'}),
      h('h1', {class: 'mp-logo'}, h('img', {src: 'img/logo.png', alt: 'Colosseum Nexus'})),
      h('div', {class: 'mp-usuario'}, perfil, ajustesBtn)),
    h('main', {class: 'mp-centro'}, fila, descripcion),
    INFO.avisos.length ? h('div', {class: 'avisos'}, h('b', {}, tr('Avisos al cargar los datos:', 'Warnings while loading the data:')), ...INFO.avisos.map(a => h('div', {}, '⚠ ' + a))) : null,
    h('footer', {class: 'pie'}, tr('Hecho con el simulador de Pokémon Showdown (licencia MIT). Pokémon es propiedad de Nintendo, Game Freak y Creatures.', 'Made with the Pokémon Showdown simulator (MIT license). Pokémon is property of Nintendo, Game Freak and Creatures.')));
  app.append(raiz);
  alCambiarColeccion(raiz, pintarPerfil);
  // Recuerda la última opción elegida al volver al menú
  const inicial = tarjetas[ultimaElegida] || tarjetas[0];
  descripcion.textContent = opciones[tarjetas.indexOf(inicial)].texto;
  if (!matchMedia('(hover: none)').matches) inicial.focus({preventScroll: true});
}
