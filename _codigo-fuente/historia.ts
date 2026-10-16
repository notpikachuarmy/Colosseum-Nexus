// Modo historia: capítulos con un mapa de ruta, diálogos, combates contra NPC y recompensas.
// Los datos de cada capítulo están en datos/historia.js; aquí solo está el funcionamiento.
import {tr} from './idioma';
import {h, storage, toast, dex, iconImg, spriteImg, nombreVisible} from './util';
import {app, cambiarPantalla, setLimpiar, nav, nombreJugador, selectorEquipo} from './nucleo';
import {validarEquipo, SetPkm} from './equipos';
import {equiposParejos} from './aleatorio';
import {PantallaCombate} from './combate';
import {Motor, IA} from './motor';
import {empaquetarSets} from './serie';
import {avatarActual, avatarImg, datosAvatar, cambiarColeccion, recompensaCombate, AVATARES} from './avatares';
import {desbloquear} from './pases';
import {desbloquearFondo, FONDOS} from './fondos';
import {darTitulo, tituloDe, tituloEquipado} from './titulos';
import {nivelDe} from './nivel';
import {formatoJefe, ConfigJefe, JEFE_POR_DEFECTO} from './mod';

// ------------------------------------------------------------------- datos --
export interface Linea {quien: string; nombre?: string; texto: string}
export interface Recompensa {tipo: 'avatar' | 'fondo' | 'pokemon' | 'titulo' | 'pv'; id?: string; especies?: string[]; n?: number}
export interface SetNPC {species: string; nickname?: string; item?: string; ability?: string; moves?: string[]; nature?: string; evs?: {[k: string]: number}; teraType?: string; level?: number}
export interface Nodo {id: string; nombre: string; avatar: string; x: number; y: number; requiere: string[]; jefe?: boolean; pendiente?: string;
  antes?: Linea[]; despues?: Linea[]; equipo?: SetNPC[]; recompensas?: Recompensa[];
  /** El rival es un Pokémon (sale su sprite en vez de un entrenador) */ pokemon?: string;
  /** Jefe de incursión (1 contra 6) */ incursion?: Partial<ConfigJefe>}
export interface Capitulo {id: string; titulo: string; resumen: string; color?: string; fondo?: string; nodos: Nodo[]}
const W: any = window;
export const CAPITULOS: Capitulo[] = ((W.HISTORIA || []) as any[]).filter(c => c && c.id && Array.isArray(c.nodos));

// ---------------------------------------------------------------- guardado --
/** ganados: nodos ganados ("capítulo:nodo") · entregados: nodos cuya recompensa ya se dio */
const CLAVE = 'cnx.historia.v1';
function leer(): {ganados: string[], entregados: string[]} {
  const g = storage.get<any>(CLAVE, {});
  const lista = (x: any) => Array.isArray(x) ? x.filter((y: any) => typeof y === 'string') : [];
  return {ganados: lista(g.ganados), entregados: lista(g.entregados)};
}
const clave = (c: Capitulo, n: Nodo) => `${c.id}:${n.id}`;
export const nodoGanado = (c: Capitulo, n: Nodo) => leer().ganados.includes(clave(c, n));
export const nodoDisponible = (c: Capitulo, n: Nodo) => n.requiere.every(r => leer().ganados.includes(`${c.id}:${r}`));
export const progresoCapitulo = (c: Capitulo) => ({ganados: c.nodos.filter(n => nodoGanado(c, n)).length, total: c.nodos.length});

/** El equipo del NPC con todo lo que el simulador necesita (los huecos se rellenan con valores neutros) */
export function equipoNPC(n: Nodo): SetPkm[] {
  return (n.equipo || []).map(s => {
    const sp = dex().species.get(s.species);
    return {
      name: s.nickname || '', species: s.species, item: s.item || '', ability: s.ability || '', moves: s.moves || [],
      nature: s.nature || 'Hardy', evs: s.evs || {hp: 84, atk: 84, def: 84, spa: 84, spd: 84, spe: 84},
      ivs: {hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31}, level: s.level || 100, gender: '', shiny: false,
      teraType: s.teraType || sp.types?.[0] || 'Normal',
    };
  });
}
/** Un nodo se puede jugar si no está pendiente y su equipo tiene movimientos */
export const nodoJugable = (n: Nodo) => !n.pendiente && !!n.equipo?.length && n.equipo.every(s => s.moves?.length);

/** Texto de una recompensa */
export function textoRecompensa(r: Recompensa): string {
  if (r.tipo === 'avatar') return tr('Avatar: ', 'Avatar: ') + (AVATARES.find(a => a.id === r.id)?.nombre || r.id);
  if (r.tipo === 'fondo') return tr('Fondo: ', 'Background: ') + (FONDOS.find(f => f.id === r.id)?.nombre || r.id);
  if (r.tipo === 'pokemon') return tr('Fakemon: ', 'Fakemon: ') + (r.especies || []).map(nombreVisible).join(', ');
  if (r.tipo === 'titulo') return tr('Título: ', 'Title: ') + (tituloDe(r.id)?.nombre || r.id);
  return `+${r.n} PV`;
}

/** Marca el nodo como ganado y entrega sus recompensas UNA sola vez */
export function ganarNodo(c: Capitulo, n: Nodo): string[] {
  const e = leer();
  const k = clave(c, n);
  if (!e.ganados.includes(k)) e.ganados.push(k);
  if (e.entregados.includes(k)) { storage.set(CLAVE, e); return []; }
  e.entregados.push(k);              // se apunta ANTES de entregar: nunca se repite
  storage.set(CLAVE, e);
  const dados: string[] = [];
  for (const r of n.recompensas || []) {
    if (r.tipo === 'avatar' && r.id) cambiarColeccion(col => { col.tengo[r.id!] = Math.max(1, col.tengo[r.id!] || 0); });
    else if (r.tipo === 'fondo' && r.id) desbloquearFondo(r.id);
    else if (r.tipo === 'pokemon') desbloquear(r.especies || []);
    else if (r.tipo === 'titulo' && r.id) darTitulo(r.id);
    else if (r.tipo === 'pv' && r.n) cambiarColeccion(col => { col.pv += Math.max(0, r.n!); });
    dados.push(textoRecompensa(r));
  }
  return dados;
}

/** Explicación sencilla de las reglas del jefe de incursión */
function textoIncursion(cfg: Partial<ConfigJefe>) {
  const c = {...JEFE_POR_DEFECTO, ...cfg};
  return tr(`Jefe de incursión: tus 6 Pokémon contra él solo. Tiene ${c.hp} veces más PS y sus demás estadísticas ×${c.stats}. Cada vez que le quitas un tramo de vida (${c.tramos} tramos) levanta el Telón: durante ${c.escudo} turnos recibe la mitad de daño y borra tus mejoras de estadísticas. Inmune a los ataques de golpe directo y de porcentaje. Si no lo vences en ${c.turnos} turnos, pierdes.`,
    `Raid boss: your 6 Pokémon against it alone. It has ${c.hp}× HP and its other stats ×${c.stats}. Each time you take away a section of its HP (${c.tramos} sections) it raises the Curtain: for ${c.escudo} turns it takes half damage and clears your stat boosts. Immune to OHKO and percentage moves. If you don't beat it in ${c.turnos} turns, you lose.`);
}

/** En los diálogos, cada NPC se llama como su nodo («Técnico Volta», no solo «Técnico») */
const nombresCapitulo = (c: Capitulo) => Object.fromEntries(c.nodos.filter(n => !n.pokemon).map(n => [n.avatar, n.nombre]));

// ----------------------------------------------------------------- diálogos --
/** Muestra un diálogo línea a línea (clic, Intro o espacio para seguir; «Saltar» para acabar) */
export function dialogo(lineas: Linea[], alFin: () => void, nombres: {[avatar: string]: string} = {}) {
  if (!lineas.length) { alFin(); return; }
  let i = 0;
  const caja = h('div', {class: 'dialogo', role: 'dialog', 'aria-live': 'polite'});
  const fondo = h('div', {class: 'dialogo-fondo'}, caja);
  const terminar = () => { document.removeEventListener('keydown', tecla); fondo.remove(); alFin(); };
  const pintar = () => {
    const l = lineas[i];
    const pk = l.quien.startsWith('pk:') ? l.quien.slice(3) : '';
    const id = l.quien === 'jugador' ? avatarActual() : l.quien;
    const nombre = l.nombre || (pk ? nombreVisible(pk) : l.quien === 'jugador' ? (nombreJugador() || tr('Tú', 'You')) : nombres[l.quien] || datosAvatar(id).nombre);
    caja.innerHTML = '';
    caja.append(
      h('div', {class: 'dialogo-avatar' + (l.quien === 'jugador' ? ' jugador' : '') + (pk ? ' pokemon' : '')}, pk ? spriteImg(pk, 'front', false, 'dialogo-sprite') : avatarImg(id)),
      h('div', {class: 'dialogo-cuerpo'}, h('b', {class: 'dialogo-nombre'}, nombre), h('p', {class: 'dialogo-texto'}, l.texto),
        h('div', {class: 'dialogo-botones'},
          h('button', {class: 'btn btn-sec btn-sm', onclick: (ev: Event) => { ev.stopPropagation(); terminar(); }}, tr('Saltar', 'Skip')),
          h('button', {class: 'btn btn-sm dialogo-sig', onclick: (ev: Event) => { ev.stopPropagation(); avanzar(); }}, i < lineas.length - 1 ? tr('Siguiente ▶', 'Next ▶') : tr('Continuar ▶', 'Continue ▶')))));
  };
  const avanzar = () => { i++; if (i >= lineas.length) terminar(); else pintar(); };
  const tecla = (ev: KeyboardEvent) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); avanzar(); } else if (ev.key === 'Escape') terminar(); };
  fondo.addEventListener('click', avanzar);
  document.addEventListener('keydown', tecla);
  document.body.append(fondo);
  pintar();
}

// ------------------------------------------------------------------ pantallas --
export function pantallaHistoria() {
  app.innerHTML = '';
  app.append(
    h('header', {class: 'barra'}, h('button', {class: 'btn btn-sec', onclick: () => cambiarPantalla(nav.inicio)}, tr('← Inicio', '← Home')), h('h2', {}, tr('Historia', 'Story'))),
    h('div', {class: 'hist-capitulos'}, ...CAPITULOS.map((c, i) => {
      const p = progresoCapitulo(c);
      const fondo = FONDOS.find(f => f.id === c.fondo);
      return h('button', {class: 'hist-cap' + (p.ganados === p.total ? ' completo' : ''), 'data-capitulo': c.id, style: {'--cc': c.color || '#5b8cff', backgroundImage: fondo ? `linear-gradient(180deg, rgba(10,12,24,.25), rgba(10,12,24,.92)), url("${fondo.imagen}")` : ''},
        onclick: () => cambiarPantalla(() => pantallaCapitulo(c))},
        h('small', {class: 'hist-num'}, tr(`Historia ${i + 1}`, `Story ${i + 1}`)),
        h('b', {class: 'hist-titulo'}, c.titulo),
        h('span', {class: 'hist-resumen'}, c.resumen),
        h('span', {class: 'hist-prog'}, p.ganados === p.total ? tr('✓ Completada', '✓ Completed') : tr(`${p.ganados}/${p.total} combates`, `${p.ganados}/${p.total} battles`)));
    })));
}

function pantallaCapitulo(c: Capitulo) {
  app.innerHTML = '';
  let elegido: Nodo = c.nodos.find(n => nodoDisponible(c, n) && !nodoGanado(c, n)) || c.nodos[0];
  const mapa = h('div', {class: 'hist-mapa', style: {'--cc': c.color || '#5b8cff'}});
  const panel = h('div', {class: 'hist-panel'});
  const fondo = FONDOS.find(f => f.id === c.fondo);
  if (fondo) mapa.style.backgroundImage = `linear-gradient(180deg, rgba(10,12,24,.55), rgba(10,12,24,.75)), url("${fondo.imagen}")`;

  const pintarMapa = () => {
    mapa.innerHTML = '';
    // Caminos entre nodos
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 100 100'); svg.setAttribute('preserveAspectRatio', 'none'); svg.setAttribute('class', 'hist-caminos');
    for (const n of c.nodos) for (const r of n.requiere) {
      const a = c.nodos.find(x => x.id === r); if (!a) continue;
      const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      l.setAttribute('x1', String(a.x)); l.setAttribute('y1', String(a.y)); l.setAttribute('x2', String(n.x)); l.setAttribute('y2', String(n.y));
      l.setAttribute('class', nodoGanado(c, a) ? 'abierto' : 'cerrado');
      svg.append(l);
    }
    mapa.append(svg);
    for (const n of c.nodos) {
      const ganado = nodoGanado(c, n), disp = nodoDisponible(c, n);
      const estado = ganado ? 'ganado' : disp ? 'disponible' : 'bloqueado';
      const cara = n.pokemon ? spriteImg(n.pokemon, 'front', false, 'hist-jefe-sprite') : avatarImg(n.avatar, '', 'busto');
      mapa.append(h('button', {class: `hist-nodo ${estado}` + (n.jefe ? ' jefe' : '') + (n === elegido ? ' elegido' : ''), 'data-nodo': n.id,
        style: {left: n.x + '%', top: n.y + '%'}, 'aria-label': n.nombre,
        onclick: () => { elegido = n; pintarMapa(); pintarPanel(); }},
        h('span', {class: 'hn-cara'}, cara), ganado ? h('span', {class: 'hn-check'}, '✓') : !disp ? h('span', {class: 'hn-candado'}, '🔒') : null,
        h('span', {class: 'hn-nombre'}, n.nombre)));
    }
  };

  const pintarPanel = () => {
    const n = elegido;
    const ganado = nodoGanado(c, n), disp = nodoDisponible(c, n), jugable = nodoJugable(n);
    panel.innerHTML = '';
    const sel = selectorEquipo('normal');
    const modo = h('select', {class: 'select'}, h('option', {value: 'mio'}, tr('Mi equipo', 'My team')), h('option', {value: 'aleatorio'}, tr('Equipo aleatorio', 'Random team')));
    modo.value = storage.get('cnx.modoHistoria', sel.vacio ? 'aleatorio' : 'mio');
    const filaEquipo = h('label', {class: 'campo'}, h('span', {class: 'etq'}, tr('Tu equipo', 'Your team')), sel.el);
    const actualizarModo = () => { filaEquipo.style.display = modo.value === 'mio' ? '' : 'none'; storage.set('cnx.modoHistoria', modo.value); };
    modo.addEventListener('change', actualizarModo);
    const requisitos = n.requiere.map(r => c.nodos.find(x => x.id === r)?.nombre).filter(Boolean).join(', ');
    panel.append(...[
      h('div', {class: 'hp-cab'},
        n.pokemon ? spriteImg(n.pokemon, 'front', false, 'hp-sprite') : avatarImg(n.avatar, 'hp-avatar'),
        h('div', {},
          h('small', {class: 'tenue'}, n.incursion ? tr('Jefe de incursión', 'Raid boss') : n.jefe ? tr('Jefe del capítulo', 'Chapter boss') : n.pokemon ? tr('Pokémon salvajes', 'Wild Pokémon') : tr('Entrenador', 'Trainer')),
          h('h3', {}, n.nombre),
          ganado ? h('span', {class: 'hp-estado ok'}, tr('✓ Ganado', '✓ Won')) : !disp ? h('span', {class: 'hp-estado'}, tr(`🔒 Gana antes a: ${requisitos}`, `🔒 First beat: ${requisitos}`)) : null)),
      n.equipo?.length ? h('div', {class: 'hp-equipo'}, h('small', {class: 'tenue'}, tr('Su equipo', 'Their team')),
        h('div', {class: 'hp-iconos'}, ...n.equipo.map(s => h('span', {class: 'hp-poke', title: (s.nickname ? s.nickname + ' · ' : '') + nombreVisible(s.species)}, iconImg(s.species), s.nickname ? h('small', {}, s.nickname) : null)))) : null,
      n.incursion ? h('div', {class: 'avisos hp-incursion'}, textoIncursion(n.incursion)) : null,
      n.recompensas?.length ? h('div', {class: 'hp-recompensas'}, h('small', {class: 'tenue'}, ganado ? tr('Recompensas (conseguidas)', 'Rewards (claimed)') : tr('Recompensas', 'Rewards')),
        h('ul', {}, ...n.recompensas.map(r => h('li', {class: ganado ? 'hecha' : ''}, textoRecompensa(r))))) : null,
      n.pendiente ? h('div', {class: 'avisos'}, '⏳ ' + n.pendiente) : null,
      disp && jugable ? h('div', {class: 'hp-combatir'},
        h('label', {class: 'campo'}, h('span', {class: 'etq'}, tr('Equipo', 'Team')), modo), filaEquipo,
        h('button', {class: 'btn btn-grande', onclick: () => empezar(n, modo.value === 'mio' ? sel.equipo()?.sets : null)},
          ganado ? tr('Repetir combate', 'Rematch') : tr('¡Combatir!', 'Battle!'))) : null,
    ].filter(Boolean) as HTMLElement[]);
    actualizarModo();
  };

  const empezar = (n: Nodo, sets: SetPkm[] | null | undefined) => {
    if (sets === undefined) { toast(tr('Elige uno de tus equipos o usa uno aleatorio', 'Pick one of your teams or use a random one')); return; }
    if (sets) {
      const errs = validarEquipo({id: 'h', nombre: 'h', formato: 'singles', sets});
      if (errs.length) { toast(errs[0], 5000); return; }
    }
    const mio = (sets || equiposParejos('mezcla', 6)[0].sets).slice(0, 6);
    dialogo(n.antes || [], () => cambiarPantalla(() => combateHistoria(c, n, mio)), nombresCapitulo(c));
  };

  app.append(
    h('header', {class: 'barra'}, h('button', {class: 'btn btn-sec', onclick: () => cambiarPantalla(pantallaHistoria)}, tr('← Historias', '← Stories')), h('h2', {}, c.titulo)),
    h('p', {class: 'tenue hist-sub'}, c.resumen),
    h('div', {class: 'hist-layout'}, mapa, panel));
  pintarMapa(); pintarPanel();
}

/** Un combate de historia contra la IA con el equipo fijo del NPC */
function combateHistoria(c: Capitulo, n: Nodo, mio: SetPkm[]) {
  const yo = nombreJugador() || tr('Tú', 'You');
  let rival = n.nombre;
  if (rival === yo) rival += ' (IA)';
  let activo = true;
  app.innerHTML = '';
  const jefe = n.incursion ? {...JEFE_POR_DEFECTO, ...n.incursion} : null;
  const motor = new Motor('singles', {nombre: yo, equipo: empaquetarSets(mio)}, {nombre: rival, equipo: empaquetarSets(equipoNPC(n))}, [], jefe ? formatoJefe(jefe) : '');
  new IA(motor, 'p2');
  const raiz = h('div', {});
  app.append(raiz);
  let premio: HTMLElement | null = null;
  let nuevas: string[] = [];
  const pantalla = new PantallaCombate(raiz, {
    yo: 'p1', titulo: `${c.titulo} · ${n.nombre}`, avatares: {p1: avatarActual(), p2: n.avatar}, caras: n.pokemon ? {p2: n.pokemon} : undefined,
    jefe: jefe ? {lado: 'p2', tramos: jefe.tramos} : undefined,
    niveles: {p1: ['ia', nivelDe('ia')]}, titulos: {p1: tituloEquipado()}, fondo: c.fondo,
    elegir: e => motor.elegir('p1', e),
    rendirse: () => motor.rendirse('p1'),
    salir: () => cambiarPantalla(() => pantallaCapitulo(c)),
    alTerminar: () => {
      const g = pantalla.estado.ganador;
      const gano = g === yo;
      if (!pantalla.estado.contado) {
        pantalla.estado.contado = true;
        if (g) premio = recompensaCombate('ia', pantalla.estado.turno, gano, false, pantalla.idPremio, pantalla.estado);
        if (gano) nuevas = ganarNodo(c, n);
      }
      const botones: HTMLElement[] = [];
      if (premio) botones.push(premio);
      if (gano) {
        if (nuevas.length) botones.push(h('div', {class: 'hist-premios'}, h('b', {}, tr('¡Recompensas!', 'Rewards!')), ...nuevas.map(t => h('span', {}, t))));
        botones.push(h('button', {class: 'btn', onclick: () => { if (!activo) return; dialogo(n.despues || [], () => cambiarPantalla(() => pantallaCapitulo(c)), nombresCapitulo(c)); }}, tr('Continuar', 'Continue')));
      } else {
        botones.push(h('button', {class: 'btn', onclick: () => cambiarPantalla(() => combateHistoria(c, n, mio))}, tr('Reintentar', 'Retry')));
        botones.push(h('button', {class: 'btn btn-sec', onclick: () => cambiarPantalla(() => pantallaCapitulo(c))}, tr('Volver al mapa', 'Back to the map')));
      }
      return botones;
    },
  });
  motor.escuchar('p1', ch => pantalla.recibir(ch));
  setLimpiar(() => { activo = false; pantalla.destruir(); motor.destruir(); });
}
