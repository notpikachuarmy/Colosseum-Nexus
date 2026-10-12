// Pokédex personalizada: Pokémon, movimientos, habilidades, objetos y exportación a PBS.
import {tr, EN} from './idioma';
import {toID} from 'pkmn-sim';
import {INFO} from './mod';
import {h, dex, tipoBadge, spriteImg, iconImg, itemIcon, nombreVisible, STATS_CORTO, CATEGORIA_ES, TIPOS_ES, TIPO_COLOR,
  nomMov, descMov, nomHab, descHab, nomObj, descObj, storage, toast} from './util';
import {colorStat, modalTexto} from './constructor';
import {movimientosDe} from './equipos';
import {app, cambiarPantalla, nav} from './nucleo';
import {ARCHIVOS_PBS, descargar} from './pbs';
import {bloqueCreditos} from './creditos';

type Pestana = 'pokemon' | 'movimientos' | 'habilidades' | 'objetos' | 'pbs';
const W: any = window;
const ICONO_CAT: {[k: string]: string} = {Physical: '⚔', Special: '✦', Status: '◎'};

export function pokedex() {
  let pestana = storage.get<Pestana>('arena.pestanaDex', 'pokemon');
  app.innerHTML = '';
  const cont = h('div', {class: 'dex-contenido'});
  const tabs = h('div', {class: 'tabs'});
  const pintar = () => {
    storage.set('arena.pestanaDex', pestana);
    tabs.innerHTML = '';
    const nombres: [Pestana, string][] = [['pokemon', tr('Pokémon', 'Pokémon')], ['movimientos', tr('Movimientos', 'Moves')], ['habilidades', tr('Habilidades', 'Abilities')], ['objetos', tr('Objetos', 'Items')], ['pbs', tr('Exportar a PBS', 'Export to PBS')]];
    for (const [id, txt] of nombres) tabs.append(h('button', {class: 'tab' + (id === pestana ? ' activo' : ''), onclick: () => { pestana = id; pintar(); }}, txt));
    cont.innerHTML = '';
    ({pokemon: seccionPokemon, movimientos: seccionMovimientos, habilidades: seccionHabilidades, objetos: seccionObjetos, pbs: seccionPBS})[pestana](cont);
  };
  app.append(h('header', {class: 'barra'}, h('button', {class: 'btn btn-sec', onclick: () => cambiarPantalla(nav.inicio)}, tr('← Inicio', '← Home')), h('h2', {}, tr('Pokédex personalizada', 'Custom Pokédex'))),
    tabs, cont);
  pintar();
}

/** Quién aprende cada movimiento (solo Pokémon personalizados o editados) */
function aprendices(): Map<string, string[]> {
  const d = dex();
  const mapa = new Map<string, string[]>();
  const ids = [...INFO.custom, ...INFO.editados].filter(id => !d.species.get(id).battleOnly);
  for (const id of ids) {
    const sp = d.species.get(id);
    for (const m of movimientosDe(sp.name)) {
      if (!mapa.has(m)) mapa.set(m, []);
      mapa.get(m)!.push(sp.name);
    }
  }
  return mapa;
}

function iconosPokemon(lista: string[], max = 24) {
  const vistos = [...new Set(lista)];
  return h('div', {class: 'dex-aprenden'}, ...vistos.slice(0, max).map(n => {
    const el = iconImg(n);
    el.title = nombreVisible(n);
    return el;
  }), vistos.length > max ? h('span', {class: 'tenue'}, `+${vistos.length - max}`) : null);
}

function seccionPokemon(cont: HTMLElement) {
  const d = dex();
  const lista = [...INFO.custom].map(id => d.species.get(id)).filter(s => s.exists);
  const buscar = h('input', {class: 'input buscador', placeholder: tr('Buscar Pokémon, tipo o habilidad…', 'Search Pokémon, type or ability…')});
  const grid = h('div', {class: 'dex-grid'});
  const pintar = () => {
    const q = buscar.value.toLowerCase();
    grid.innerHTML = '';
    for (const sp of lista) {
      const habs = [...new Set(Object.values(sp.abilities) as string[])];
      const texto = [sp.name, ...sp.types, ...sp.types.map(t => TIPOS_ES[t]), ...habs, ...habs.map(nomHab)].join(' ').toLowerCase();
      if (q && !texto.includes(q)) continue;
      const bst = Object.values(sp.baseStats).reduce((a, b) => a + b, 0);
      grid.append(h('div', {class: 'dex-tarjeta', style: {'--c1': TIPO_COLOR[sp.types[0]], '--c2': TIPO_COLOR[sp.types[1] || sp.types[0]]}},
        h('div', {class: 'dex-cab'}, spriteImg(sp.name),
          h('div', {}, h('div', {class: 'dex-nombre'}, nombreVisible(sp.name)), h('div', {}, ...sp.types.map(t => tipoBadge(t, true))),
            sp.prevo ? h('small', {class: 'tenue'}, tr('Evoluciona de ', 'Evolves from ') + nombreVisible(sp.prevo)) : null)),
        h('div', {class: 'dex-stats'}, ...Object.entries(sp.baseStats).map(([k, v]) => h('div', {class: 'fila-stat-mini'},
          h('span', {}, STATS_CORTO[k]), h('b', {}, String(v)), h('span', {class: 'barra-stat'}, h('span', {style: {width: Math.min(100, v / 1.8) + '%', background: colorStat(v)}})))),
          h('div', {class: 'fila-stat-mini total'}, h('span', {}, 'Total'), h('b', {}, String(bst)))),
        h('div', {class: 'dex-habs'}, ...habs.map(a => {
          const ab = d.abilities.get(a);
          return h('div', {}, h('b', {}, nomHab(a) + (sp.abilities.H === a ? tr(' (oculta)', ' (hidden)') : '')), ': ', ab.exists ? descHab(a) : '');
        })),
        bloqueCreditos(sp.name),
        sp.battleOnly ? null : h('button', {class: 'btn btn-sec btn-sm', onclick: () => verMovimientos(sp.name)}, tr(`Ver movimientos (${movimientosDe(sp.name).length})`, `See moves (${movimientosDe(sp.name).length})`))));
    }
  };
  buscar.addEventListener('input', pintar);
  cont.append(h('p', {class: 'tenue centro'}, tr('Los datos marcados como PROVISIONAL en datos/pokemon.js se pueden cambiar cuando quieras.', 'Data marked PROVISIONAL in datos/pokemon.js can be changed whenever you want.')), buscar, grid);
  if (INFO.editados.size) {
    cont.append(h('div', {class: 'dex-nota'}, h('b', {}, tr('Pokémon oficiales con añadidos personalizados: ', 'Official Pokémon with custom additions: ')),
      iconosPokemon([...INFO.editados].map(id => d.species.get(id).name), 60)));
  }
  pintar();
}

function seccionMovimientos(cont: HTMLElement) {
  const d = dex();
  const quien = aprendices();
  const grid = h('div', {class: 'tarjetas-info'});
  for (const [nombre, m] of Object.entries<any>(W.DATOS_MOVIMIENTOS || {})) {
    const mv = d.moves.get(nombre);
    const color = TIPO_COLOR[m.type] || '#888';
    grid.append(h('div', {class: 'tarjeta-info', style: {'--color': color}},
      h('div', {class: 'ti-cab'},
        h('span', {class: 'ti-icono', title: CATEGORIA_ES[m.category]}, ICONO_CAT[m.category]),
        h('div', {}, h('div', {class: 'ti-nombre'}, nomMov(nombre)), h('div', {class: 'ti-badges'}, tipoBadge(m.type, true),
          h('span', {class: 'cat cat-' + m.category.toLowerCase()}, CATEGORIA_ES[m.category])))),
      h('div', {class: 'ti-datos'},
        dato(tr('Potencia', 'Power'), m.basePower ? String(m.basePower) : '—'),
        dato(tr('Precisión', 'Accuracy'), m.accuracy === true ? '—' : m.accuracy + '%'),
        dato('PP', String(m.pp)),
        dato(tr('Prioridad', 'Priority'), m.priority ? (m.priority > 0 ? '+' : '') + m.priority : '0')),
      h('p', {class: 'ti-desc'}, descMov(nombre)),
      mv.flags?.['contact'] ? h('span', {class: 'ti-etiqueta'}, tr('Contacto', 'Contact')) : null,
      h('div', {class: 'ti-pie'}, h('small', {class: 'tenue'}, tr('Lo aprenden:', 'Learned by:')), iconosPokemon(quien.get(mv.id) || []))));
  }
  cont.append(h('p', {class: 'tenue centro'}, tr('Movimientos de datos/movimientos.js. Pasa el ratón por los iconos para ver quién los aprende.', 'Moves from datos/movimientos.js. Hover over the icons to see who learns them.')), grid);
}

function seccionHabilidades(cont: HTMLElement) {
  const d = dex();
  const grid = h('div', {class: 'tarjetas-info'});
  const ids = [...INFO.custom, ...INFO.editados].map(id => d.species.get(id)).filter(s => s.exists);
  for (const [nombre, a] of Object.entries<any>(W.DATOS_HABILIDADES || {})) {
    const tienen = ids.filter(sp => Object.values(sp.abilities).some(x => toID(x as string) === toID(nombre))).map(sp => sp.name);
    grid.append(h('div', {class: 'tarjeta-info', style: {'--color': '#c7b6ff'}},
      h('div', {class: 'ti-cab'}, h('span', {class: 'ti-icono'}, '✧'), h('div', {class: 'ti-nombre'}, nomHab(nombre))),
      h('p', {class: 'ti-desc'}, descHab(nombre)),
      h('div', {class: 'ti-pie'}, h('small', {class: 'tenue'}, tr('La tienen:', 'Pokémon with it:')), iconosPokemon(tienen))));
  }
  cont.append(grid);
}

function seccionObjetos(cont: HTMLElement) {
  const d = dex();
  const grid = h('div', {class: 'tarjetas-info objetos'});
  for (const id of INFO.objetos) {
    const it = d.items.get(id);
    const icono = itemIcon(it.name);
    if (icono) icono.classList.add('ti-sprite');
    grid.append(h('div', {class: 'tarjeta-info', style: {'--color': '#ffcb3d'}},
      h('div', {class: 'ti-cab'}, h('span', {class: 'ti-objeto'}, icono), h('div', {class: 'ti-nombre'}, nomObj(it.name))),
      h('p', {class: 'ti-desc'}, descObj(it.name))));
  }
  // Objetos de evolución (solo Pokédex y PBS)
  for (const [id, o] of Object.entries<any>(W.OBJETOS_EVOLUCION || {})) {
    const img = h('img', {class: 'item-icono ti-sprite', src: `sprites/custom/items/${String(o.sprite || id).toLowerCase().replace(/[^a-z0-9]/g, '')}.png`, alt: ''});
    grid.append(h('div', {class: 'tarjeta-info', style: {'--color': '#7fd1ff'}},
      h('div', {class: 'ti-cab'}, h('span', {class: 'ti-objeto'}, img),
        h('div', {}, h('div', {class: 'ti-nombre'}, EN ? o.nombreEN || o.nombre : o.nombre), h('small', {class: 'tenue'}, tr('Objeto de evolución', 'Evolution item') + ' · ' + id))),
      h('p', {class: 'ti-desc'}, EN ? o.descEN || o.desc : o.desc)));
  }
  cont.append(h('p', {class: 'tenue centro'}, tr('Objetos de datos/objetos.js (los valores de balance están al principio del archivo).', 'Items from datos/objetos.js (balance values are at the top of the file).')), grid);
}

function seccionPBS(cont: HTMLElement) {
  const vista = h('textarea', {class: 'texto-equipo pbs-vista', readonly: true});
  let actual = ARCHIVOS_PBS[0];
  const mostrar = (a: typeof actual) => { actual = a; vista.value = a[2](); };
  cont.append(
    h('div', {class: 'tarjeta'},
      h('h3', {}, tr('Exportar a Pokémon Essentials (v21)', 'Export to Pokémon Essentials (v21)')),
      h('p', {}, tr('Descarga tus Pokémon, movimientos, habilidades y objetos en formato PBS para pegarlos en tu fangame. ', 'Download your Pokémon, moves, abilities and items in PBS format to paste them into your fangame. '),
        tr('Incluye tipos, stats, habilidades, movimientos (los oficiales con su nivel y los tuyos repartidos por niveles) y evoluciones.', 'Includes types, stats, abilities, moves (official ones at their level and yours spread across levels) and evolutions.')),
      h('ul', {class: 'tenue'},
        h('li', {}, tr('Todo sale en inglés (IDs, nombres y descripciones), listo para Essentials 21.1: guárdalos en PBS/ con esos nombres (Essentials lee solos los archivos _custom) o pega los bloques en los tuyos.',
          'Everything is in English (IDs, names and descriptions), ready for Essentials 21.1: save them in PBS/ with these names (Essentials loads _custom files automatically) or paste the blocks into yours.')),
        h('li', {}, tr('Incluye stats, tipos, habilidades, movimientos por nivel (los oficiales a su nivel real; en tus Fakemon se reparten solos), movimientos huevo y tutor, evoluciones y objetos de evolución.',
          'Includes stats, types, abilities, level-up moves (official ones at their real level; for your Fakemon they are spread automatically), egg and tutor moves, evolutions and evolution items.')),
        h('li', {}, tr('Tus versiones de Pokémon existentes (Lapras, Metagross…) salen con el ID original para sustituirlos. Lo que cambia en Pokémon oficiales sin versión propia (evoluciones nuevas de Eevee, movimientos añadidos a Darkrai…) aparece al final de pokemon_custom.txt como lista de cambios a mano.',
          'Your versions of existing Pokémon (Lapras, Metagross…) use the original ID so they replace them. Changes to official Pokémon without their own version (new Eevee evolutions, moves added to Darkrai…) are listed at the end of pokemon_custom.txt as manual changes.')),
        h('li', {}, tr('Los gráficos de los objetos van en Graphics/Items con el ID como nombre (ENERGYDRINK.png…). Los efectos los pone el plugin de Ruby de cada movimiento, habilidad u objeto (FunctionCode).',
          'Item graphics go in Graphics/Items named after the ID (ENERGYDRINK.png…). Effects come from each move, ability or item\'s Ruby plugin (FunctionCode).'))),
      h('div', {class: 'pbs-botones'}, ...ARCHIVOS_PBS.map(a => h('div', {class: 'pbs-archivo'},
        h('div', {}, h('b', {}, a[0]), h('small', {class: 'tenue'}, a[1])),
        h('div', {class: 'pbs-acciones'},
          h('button', {class: 'btn btn-sm', onclick: () => descargar(a[0], a[2]())}, tr('Descargar', 'Download')),
          h('button', {class: 'btn btn-sec btn-sm', onclick: () => mostrar(a)}, tr('Ver', 'View'))))))),
    h('div', {class: 'tarjeta'},
      h('div', {class: 'pbs-cab'}, h('b', {}, tr('Vista previa', 'Preview')),
        h('button', {class: 'btn btn-sec btn-sm', onclick: () => { navigator.clipboard?.writeText(vista.value); toast(tr('Copiado', 'Copied')); }}, tr('Copiar', 'Copy'))),
      vista));
  mostrar(actual);
}

function dato(etq: string, valor: string) {
  return h('div', {class: 'ti-dato'}, h('small', {}, etq), h('b', {}, valor));
}

function verMovimientos(species: string) {
  const d = dex();
  const movs = movimientosDe(species).map(m => d.moves.get(m)).sort((a, b) => a.type.localeCompare(b.type) || nomMov(a.name).localeCompare(nomMov(b.name), 'es'));
  const cont = h('div', {class: 'lista-movs'}, ...movs.map(mv => h('div', {class: 'fila-mov'},
    h('span', {class: 'nombre'}, nomMov(mv.name)), tipoBadge(mv.type, true), h('span', {class: 'cat cat-' + mv.category.toLowerCase()}, CATEGORIA_ES[mv.category]),
    h('span', {class: 'num'}, mv.basePower ? String(mv.basePower) : '—'), h('span', {class: 'num'}, mv.accuracy === true ? '—' : mv.accuracy + '%'))));
  modalTexto(tr(`Movimientos de ${nombreVisible(species)}`, `${nombreVisible(species)}'s moves`), cont, []);
}
