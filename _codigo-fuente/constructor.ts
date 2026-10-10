// Constructor de equipos.
import {toID} from 'pkmn-sim';
import {INFO} from './mod';
import {
  dex, h, esc, tipoBadge, spriteImg, iconImg, itemIcon, nombreVisible, calcStat, toast,
  NATURALEZAS, STATS_CORTO, TIPOS_ES, CATEGORIA_ES, TIPO_COLOR,
  nomMov, descMov, nomHab, descHab, nomObj, descObj, idBusqueda,
} from './util';
import {
  Equipo, SetPkm, cargarEquipos, guardarEquipos, nuevoId, nuevoSet, movimientosDe,
  exportarEquipo, importarTexto, validarEquipo,
} from './equipos';

const STATS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];

// ------------------------------------------------------------------ selector --
interface Opcion { id: string; nombre: string; buscar: string; render: () => HTMLElement; grupo?: string }

export function abrirSelector(titulo: string, opciones: Opcion[], onPick: (id: string) => void, filtros?: {[k: string]: (o: Opcion) => boolean}) {
  const fondo = h('div', {class: 'modal-fondo'});
  const input = h('input', {class: 'buscador', placeholder: 'Buscar…', autocomplete: 'off', spellcheck: 'false'});
  const lista = h('div', {class: 'selector-lista'});
  let filtroActivo = '';
  const chips = filtros ? h('div', {class: 'chips'}, ...Object.keys(filtros).map(k => {
    const c = h('button', {class: 'chip', onclick: () => {
      filtroActivo = filtroActivo === k ? '' : k;
      chips!.querySelectorAll('.chip').forEach(x => x.classList.toggle('activo', x === c && filtroActivo === k));
      pintar();
    }}, k);
    return c;
  })) : null;
  const cerrar = () => { fondo.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') cerrar();
    if (e.key === 'Enter') { const first = lista.querySelector<HTMLElement>('.opcion'); first?.click(); }
  };
  document.addEventListener('keydown', onKey);
  function pintar() {
    const q = idBusqueda(input.value);
    lista.innerHTML = '';
    let n = 0;
    for (const o of opciones) {
      if (q && !o.buscar.includes(q)) continue;
      if (filtroActivo && filtros && !filtros[filtroActivo](o)) continue;
      if (n++ > 250) { lista.append(h('div', {class: 'mas'}, 'Escribe para filtrar más…')); break; }
      const row = h('button', {class: 'opcion', onclick: () => { cerrar(); onPick(o.id); }}, o.render());
      lista.append(row);
    }
    if (!n) lista.append(h('div', {class: 'mas'}, 'Sin resultados'));
  }
  input.addEventListener('input', pintar);
  fondo.addEventListener('click', e => { if (e.target === fondo) cerrar(); });
  fondo.append(h('div', {class: 'modal selector'},
    h('div', {class: 'modal-cab'}, h('h3', {}, titulo), h('button', {class: 'btn-x', onclick: cerrar, 'aria-label': 'Cerrar'}, '×')),
    input, chips, lista));
  document.body.append(fondo);
  pintar();
  setTimeout(() => input.focus(), 30);
}

let opcionesEspecieCache: Opcion[] | null = null;
function opcionesEspecie(): Opcion[] {
  if (opcionesEspecieCache) return opcionesEspecieCache;
  const d = dex();
  const out: Opcion[] = [];
  const malos = new Set(['CAP', 'LGPE', 'Custom', 'Future', 'Gigantamax']);
  for (const sp of d.species.all()) {
    if (!sp.exists || sp.battleOnly || (sp.isNonstandard && malos.has(sp.isNonstandard)) || sp.name.endsWith('-Totem')) continue;
    if (sp.name.includes('-Gmax')) continue;
    const custom = INFO.custom.has(sp.id);
    const bst = Object.values(sp.baseStats).reduce((a, b) => a + b, 0);
    out.push({
      id: sp.name, nombre: sp.name, buscar: sp.id + toID(nombreVisible(sp.name)), grupo: custom ? 'custom' : '',
      render: () => h('div', {class: 'fila-especie'}, iconImg(sp.name),
        h('span', {class: 'nombre'}, custom ? h('b', {class: 'estrella', title: 'Personalizado'}, '★ ') : null, nombreVisible(sp.name)),
        h('span', {class: 'tipos'}, ...sp.types.map(t => tipoBadge(t, true))),
        h('span', {class: 'stats-mini'}, ...STATS.map(s => h('span', {}, h('small', {}, STATS_CORTO[s]), ' ', (sp.baseStats as any)[s]))),
        h('span', {class: 'bst'}, String(bst))),
    });
  }
  out.sort((a, b) => (a.grupo === 'custom' ? 0 : 1) - (b.grupo === 'custom' ? 0 : 1) ||
    d.species.get(a.id).num - d.species.get(b.id).num);
  opcionesEspecieCache = out;
  return out;
}

let opcionesObjetoCache: Opcion[] | null = null;
function opcionesObjeto(): Opcion[] {
  if (opcionesObjetoCache) return opcionesObjetoCache;
  const d = dex();
  const out: Opcion[] = [{id: '', nombre: '(ninguno)', buscar: 'ninguno', render: () => h('div', {class: 'fila-obj'}, h('span', {class: 'nombre'}, '(Sin objeto)'))}];
  for (const it of d.items.all()) {
    if (!it.exists || (it.isNonstandard && !['Past', 'Unobtainable'].includes(it.isNonstandard))) continue;
    if (it.isPokeball || it.id.endsWith('mail')) continue;
    const custom = INFO.objetos.has(it.id);
    out.push({
      id: it.name, nombre: nomObj(it.name), buscar: it.id + idBusqueda(nomObj(it.name)), grupo: custom ? 'custom' : '',
      render: () => h('div', {class: 'fila-obj'}, itemIcon(it.name),
        h('span', {class: 'nombre'}, custom ? h('b', {class: 'estrella'}, '★ ') : null, nomObj(it.name)),
        h('span', {class: 'desc'}, descObj(it.name))),
    });
  }
  out.sort((a, b) => (a.grupo === 'custom' ? 0 : 1) - (b.grupo === 'custom' ? 0 : 1) || a.nombre.localeCompare(b.nombre, 'es'));
  opcionesObjetoCache = out;
  return out;
}

function filaMovimiento(id: string) {
  const mv = dex().moves.get(id);
  const custom = INFO.custom.has(mv.id) || !!(window as any).DATOS_MOVIMIENTOS?.[mv.name];
  return h('div', {class: 'fila-mov'},
    h('span', {class: 'nombre'}, custom ? h('b', {class: 'estrella'}, '★ ') : null, nomMov(mv.name)),
    tipoBadge(mv.type, true),
    h('span', {class: 'cat cat-' + mv.category.toLowerCase()}, CATEGORIA_ES[mv.category]),
    h('span', {class: 'num'}, mv.basePower ? String(mv.basePower) : '—'),
    h('span', {class: 'num'}, mv.accuracy === true ? '—' : mv.accuracy + '%'),
    h('span', {class: 'desc'}, descMov(mv.name)));
}

// --------------------------------------------------------------- pantalla --
export function pantallaEquipos(raiz: HTMLElement, volver: () => void) {
  let equipos = cargarEquipos();
  let actual: Equipo | null = equipos[0] || null;
  let slot = -1;

  const guardar = () => guardarEquipos(equipos);

  function render() {
    raiz.innerHTML = '';
    const cab = h('header', {class: 'barra'},
      h('button', {class: 'btn btn-sec', onclick: volver}, '← Inicio'),
      h('h2', {}, 'Mis equipos'));
    const lado = h('aside', {class: 'lista-equipos'},
      h('div', {class: 'acciones'},
        h('button', {class: 'btn', onclick: () => {
          const eq: Equipo = {id: nuevoId(), nombre: 'Equipo ' + (equipos.length + 1), formato: 'singles', sets: []};
          equipos.push(eq); actual = eq; slot = -1; guardar(); render();
        }}, '+ Nuevo equipo'),
        h('button', {class: 'btn btn-sec', onclick: dialogoImportar}, 'Importar')),
      ...equipos.map(eq => h('button', {class: 'item-equipo' + (eq === actual ? ' activo' : ''), onclick: () => { actual = eq; slot = -1; render(); }},
        h('div', {class: 'eq-nombre'}, eq.nombre, h('span', {class: 'formato-tag'}, eq.formato === 'doubles' ? 'Dobles' : 'Individual')),
        h('div', {class: 'eq-iconos'}, ...eq.sets.map(s => iconImg(s.species))))),
      !equipos.length ? h('p', {class: 'vacio'}, 'Aún no tienes equipos. Crea uno nuevo o importa uno en formato Showdown.') : null);
    const main = h('main', {class: 'editor-equipo'});
    if (actual) pintarEditor(main, actual);
    raiz.append(cab, h('div', {class: 'equipos-layout'}, lado, main));
  }

  function dialogoImportar() {
    const ta = h('textarea', {class: 'texto-equipo', placeholder: 'Pega aquí un equipo en formato Showdown…'});
    modalTexto('Importar equipo', ta, [
      ['Importar', () => {
        try {
          const sets = importarTexto(ta.value);
          if (!sets.length) { toast('No se encontró ningún Pokémon en el texto'); return false; }
          const eq: Equipo = {id: nuevoId(), nombre: 'Importado ' + (equipos.length + 1), formato: 'singles', sets: sets.slice(0, 6)};
          equipos.push(eq); actual = eq; slot = -1; guardar(); render();
          const errs = validarEquipo(eq);
          if (errs.length) toast('Importado con avisos: ' + errs[0], 5000);
        } catch (e) { toast('No se pudo leer el texto'); return false; }
        return true;
      }],
    ]);
  }

  function pintarEditor(main: HTMLElement, eq: Equipo) {
    const nombre = h('input', {class: 'input-nombre', value: eq.nombre, maxlength: '40'});
    nombre.addEventListener('change', () => { eq.nombre = nombre.value.trim() || 'Sin nombre'; guardar(); render(); });
    const formato = h('select', {class: 'select'},
      h('option', {value: 'singles', selected: eq.formato === 'singles'}, 'Individual'),
      h('option', {value: 'doubles', selected: eq.formato === 'doubles'}, 'Dobles'));
    formato.addEventListener('change', () => { eq.formato = formato.value as any; guardar(); render(); });
    const errs = validarEquipo(eq);
    main.append(
      h('div', {class: 'editor-cab'}, nombre, formato,
        h('button', {class: 'btn btn-sec', onclick: () => {
          const ta = h('textarea', {class: 'texto-equipo', readonly: true}, exportarEquipo(eq));
          modalTexto('Exportar equipo', ta, [['Copiar', () => { navigator.clipboard?.writeText(ta.value); toast('Copiado'); return true; }]]);
          setTimeout(() => ta.select(), 50);
        }}, 'Exportar'),
        h('button', {class: 'btn btn-peligro', onclick: () => {
          if (!confirm(`¿Borrar el equipo "${eq.nombre}"?`)) return;
          equipos = equipos.filter(e => e !== eq); actual = equipos[0] || null; slot = -1; guardar(); render();
        }}, 'Borrar')),
      h('div', {class: 'slots'},
        ...eq.sets.map((s, i) => h('button', {class: 'slot' + (i === slot ? ' activo' : ''), onclick: () => { slot = i; render(); }},
          spriteImg(s.species, 'front', s.shiny, 'slot-sprite'),
          h('div', {class: 'slot-nombre'}, s.name || nombreVisible(s.species)),
          h('div', {class: 'slot-item'}, s.item ? itemIcon(s.item) : null, s.item ? nomObj(s.item) : '—'))),
        eq.sets.length < 6 ? h('button', {class: 'slot slot-nuevo', onclick: () => {
          abrirSelector('Elige un Pokémon', opcionesEspecie(), id => {
            eq.sets.push(nuevoSet(id)); slot = eq.sets.length - 1; guardar(); render();
          }, {'★ Solo personalizados': o => o.grupo === 'custom'});
        }}, h('span', {class: 'mas-grande'}, '+'), 'Añadir') : null),
      errs.length && eq.sets.length ? h('div', {class: 'avisos'}, ...errs.map(e => h('div', {}, '⚠ ' + e))) :
        eq.sets.length ? h('div', {class: 'ok'}, '✓ Equipo listo para combatir') : null,
    );
    if (slot >= 0 && eq.sets[slot]) main.append(editorSet(eq, slot));
  }

  function editorSet(eq: Equipo, i: number) {
    const s = eq.sets[i];
    const d = dex();
    const sp = d.species.get(s.species);
    const cambiar = () => { guardar(); render(); };
    const panel = h('section', {class: 'editor-set'});

    // Especie
    const cabecera = h('div', {class: 'set-cab'},
      h('button', {class: 'set-sprite', title: 'Cambiar Pokémon', onclick: () => abrirSelector('Elige un Pokémon', opcionesEspecie(), id => {
        const n = nuevoSet(id);
        eq.sets[i] = {...n, name: '', item: s.item, nature: s.nature, evs: s.evs, ivs: s.ivs, level: s.level, shiny: s.shiny,
          moves: s.moves.filter(m => movimientosDe(id).includes(toID(m)))};
        cambiar();
      }, {'★ Solo personalizados': o => o.grupo === 'custom'})}, spriteImg(s.species, 'front', s.shiny)),
      h('div', {class: 'set-info'},
        h('div', {class: 'set-nombre'}, nombreVisible(s.species), INFO.custom.has(sp.id) ? h('span', {class: 'estrella'}, ' ★') : null),
        h('div', {}, ...sp.types.map(t => tipoBadge(t))),
        campo('Mote', (() => {
          const inp = h('input', {class: 'input', value: s.name, placeholder: sp.baseSpecies, maxlength: '18'});
          inp.addEventListener('change', () => { s.name = inp.value.trim(); cambiar(); });
          return inp;
        })()),
        h('div', {class: 'fila-campos'},
          campo('Nivel', (() => {
            const inp = h('input', {class: 'input input-num', type: 'number', min: '1', max: '100', value: String(s.level)});
            inp.addEventListener('change', () => { s.level = Math.max(1, Math.min(100, +inp.value || 100)); cambiar(); });
            return inp;
          })()),
          campo('Shiny', (() => {
            const inp = h('input', {type: 'checkbox', checked: s.shiny});
            inp.addEventListener('change', () => { s.shiny = inp.checked; cambiar(); });
            return inp;
          })()),
          sp.canGigantamax ? campo('Gigamax', (() => {
            const inp = h('input', {type: 'checkbox', checked: !!s.gigantamax});
            inp.addEventListener('change', () => { s.gigantamax = inp.checked; cambiar(); });
            return inp;
          })()) : null,
          campo('Teratipo', (() => {
            const sel = h('select', {class: 'select'}, ...Object.keys(TIPOS_ES).filter(t => t !== '???').map(t =>
              h('option', {value: t, selected: s.teraType === t}, TIPOS_ES[t])));
            sel.addEventListener('change', () => { s.teraType = sel.value; cambiar(); });
            return sel;
          })()))),
      h('div', {class: 'set-acciones'},
        h('button', {class: 'btn btn-sec btn-sm', disabled: i === 0, onclick: () => { [eq.sets[i - 1], eq.sets[i]] = [eq.sets[i], eq.sets[i - 1]]; slot = i - 1; cambiar(); }}, '↑'),
        h('button', {class: 'btn btn-sec btn-sm', disabled: i === eq.sets.length - 1, onclick: () => { [eq.sets[i + 1], eq.sets[i]] = [eq.sets[i], eq.sets[i + 1]]; slot = i + 1; cambiar(); }}, '↓'),
        h('button', {class: 'btn btn-peligro btn-sm', onclick: () => { eq.sets.splice(i, 1); slot = -1; cambiar(); }}, 'Quitar')));

    // Objeto y habilidad
    const habilidades = [...new Set(Object.values(sp.abilities) as string[])];
    const habSel = h('select', {class: 'select'}, ...habilidades.map(a => h('option', {value: a, selected: toID(a) === toID(s.ability)},
      nomHab(a) + (sp.abilities.H === a ? ' (oculta)' : ''))));
    habSel.addEventListener('change', () => { s.ability = habSel.value; cambiar(); });
    const ab = d.abilities.get(s.ability);
    const it = s.item ? d.items.get(s.item) : null;
    const objHab = h('div', {class: 'fila-campos'},
      campo('Objeto', h('button', {class: 'btn-campo', onclick: () => abrirSelector('Elige un objeto', opcionesObjeto(), id => { s.item = id; cambiar(); },
        {'★ Solo personalizados': o => o.grupo === 'custom'})},
        s.item ? itemIcon(s.item) : null, s.item ? nomObj(s.item) : '(ninguno)'), it ? descObj(it.name) : ''),
      campo('Habilidad', habSel, ab.exists ? descHab(ab.name) : ''));

    // Movimientos
    const legales = movimientosDe(s.species).sort((a, b) => nomMov(a).localeCompare(nomMov(b), 'es'));
    const movs = h('div', {class: 'movs'}, ...[0, 1, 2, 3].map(k => {
      const m = s.moves[k];
      const mv = m ? d.moves.get(m) : null;
      return h('button', {class: 'btn-mov', style: mv ? {borderColor: TIPO_COLOR[mv.type]} : {}, onclick: () => {
        const ops: Opcion[] = [{id: '', nombre: '', buscar: 'ninguno', render: () => h('div', {class: 'fila-mov'}, h('span', {class: 'nombre'}, '(Vacío)'))},
          ...legales.filter(x => !s.moves.map(toID).includes(x) || toID(m || '') === x).map(x => ({
            id: d.moves.get(x).name, nombre: nomMov(x), buscar: x + idBusqueda(nomMov(x)) + toID(d.moves.get(x).type) + idBusqueda(TIPOS_ES[d.moves.get(x).type] || ''),
            grupo: d.moves.get(x).type, render: () => filaMovimiento(x)}))];
        abrirSelector(`Movimiento ${k + 1}`, ops, id => {
          const arr = [...s.moves]; arr[k] = id; s.moves = arr.filter(Boolean); cambiar();
        }, {'Físicos': o => !!o.id && d.moves.get(o.id).category === 'Physical', 'Especiales': o => !!o.id && d.moves.get(o.id).category === 'Special',
          'Estado': o => !!o.id && d.moves.get(o.id).category === 'Status', 'De su tipo': o => !!o.id && sp.types.includes(d.moves.get(o.id).type)});
      }}, mv ? [tipoBadge(mv.type, true), ' ', nomMov(mv.name)] : h('span', {class: 'tenue'}, '— vacío —'));
    }));

    // Naturaleza y stats
    const natSel = h('select', {class: 'select'}, ...NATURALEZAS.map(([en, es, up, down]) =>
      h('option', {value: en, selected: s.nature === en}, es + (up ? ` (+${STATS_CORTO[up]} −${STATS_CORTO[down]})` : ' (neutra)'))));
    natSel.addEventListener('change', () => { s.nature = natSel.value; cambiar(); });
    const totalEv = () => STATS.reduce((a, k) => a + (s.evs[k] || 0), 0);
    const restantes = h('span', {class: 'ev-rest'});
    const tabla = h('div', {class: 'tabla-stats'});
    const pintarStats = () => {
      tabla.innerHTML = '';
      restantes.textContent = `EVs restantes: ${510 - totalEv()}`;
      restantes.classList.toggle('mal', totalEv() > 510);
      for (const k of STATS) {
        const base = (sp.baseStats as any)[k];
        const val = calcStat(k, base, s.ivs[k] ?? 31, s.evs[k] || 0, s.level, s.nature);
        const nat = NATURALEZAS.find(x => x[0] === s.nature)!;
        const rango = h('input', {type: 'range', min: '0', max: '252', step: '4', value: String(s.evs[k] || 0)});
        const evIn = h('input', {class: 'input input-ev', type: 'number', min: '0', max: '252', step: '4', value: String(s.evs[k] || 0)});
        const iv = h('input', {class: 'input input-ev', type: 'number', min: '0', max: '31', value: String(s.ivs[k] ?? 31), title: 'IV'});
        const setEv = (v: number) => {
          v = Math.max(0, Math.min(252, Math.round(v / 4) * 4));
          const otros = totalEv() - (s.evs[k] || 0);
          v = Math.min(v, Math.max(0, 510 - otros));
          s.evs[k] = v; guardar(); pintarStats();
        };
        rango.addEventListener('input', () => setEv(+rango.value));
        evIn.addEventListener('change', () => setEv(+evIn.value));
        iv.addEventListener('change', () => { s.ivs[k] = Math.max(0, Math.min(31, +iv.value || 0)); guardar(); pintarStats(); });
        const cls = nat[2] === k ? 'sube' : nat[3] === k ? 'baja' : '';
        tabla.append(h('div', {class: 'fila-stat'},
          h('span', {class: 'st-nombre ' + cls}, STATS_CORTO[k], cls === 'sube' ? '+' : cls === 'baja' ? '−' : ''),
          h('span', {class: 'st-base'}, String(base)),
          h('span', {class: 'barra-stat'}, h('span', {style: {width: Math.min(100, base / 2) + '%', background: colorStat(base)}})),
          rango, evIn, iv, h('span', {class: 'st-total'}, String(val))));
      }
    };
    pintarStats();
    const presets: [string, {[k: string]: number}, string][] = [
      ['Atacante físico', {hp: 4, atk: 252, spe: 252}, 'Adamant'],
      ['Atacante especial', {hp: 4, spa: 252, spe: 252}, 'Modest'],
      ['Tanque físico', {hp: 252, def: 252, spd: 4}, 'Impish'],
      ['Tanque especial', {hp: 252, spd: 252, def: 4}, 'Calm'],
      ['Equilibrado', {hp: 84, atk: 84, def: 84, spa: 84, spd: 84, spe: 84}, ''],
    ];
    const presetsEl = h('div', {class: 'presets'}, h('span', {class: 'tenue'}, 'Repartos rápidos: '),
      ...presets.map(([n, ev, nat]) => h('button', {class: 'chip', onclick: () => {
        s.evs = Object.fromEntries(STATS.map(k => [k, ev[k] || 0]));
        if (nat) s.nature = nat;
        cambiar();
      }}, n)));

    panel.append(cabecera, objHab,
      h('h4', {}, 'Movimientos'), movs,
      h('h4', {}, 'Estadísticas ', restantes),
      h('div', {class: 'fila-campos'}, campo('Naturaleza', natSel)), presetsEl,
      h('div', {class: 'stats-cab'}, h('span', {}, ''), h('span', {}, 'Base'), h('span', {}, ''), h('span', {}, 'EVs'), h('span', {}, ''), h('span', {}, 'IV'), h('span', {}, 'Total')),
      tabla);
    return panel;
  }

  render();
}

export function colorStat(v: number) {
  if (v < 50) return '#f34444';
  if (v < 80) return '#ff9a3c';
  if (v < 100) return '#f5d23a';
  if (v < 120) return '#9be244';
  if (v < 150) return '#3ec95f';
  return '#2ec4d6';
}

function campo(etq: string, control: HTMLElement, ayuda?: string) {
  return h('label', {class: 'campo'}, h('span', {class: 'etq'}, etq), control, ayuda ? h('small', {class: 'ayuda'}, ayuda) : null);
}

export function modalTexto(titulo: string, cuerpo: HTMLElement, botones: [string, () => boolean | void][]) {
  const fondo = h('div', {class: 'modal-fondo'});
  const cerrar = () => fondo.remove();
  fondo.addEventListener('click', e => { if (e.target === fondo) cerrar(); });
  fondo.append(h('div', {class: 'modal'},
    h('div', {class: 'modal-cab'}, h('h3', {}, titulo), h('button', {class: 'btn-x', onclick: cerrar}, '×')),
    cuerpo,
    h('div', {class: 'modal-pie'}, ...botones.map(([n, f]) => h('button', {class: 'btn', onclick: () => { if (f() !== false) cerrar(); }}, n)),
      h('button', {class: 'btn btn-sec', onclick: cerrar}, 'Cerrar'))));
  document.body.append(fondo);
}

export {esc};
