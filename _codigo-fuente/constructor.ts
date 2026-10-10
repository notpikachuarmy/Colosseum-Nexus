// Constructor de equipos.
import {tr} from './idioma';
import {toID} from 'pkmn-sim';
import {INFO} from './mod';
import {
  dex, h, esc, tipoBadge, spriteImg, iconImg, itemIcon, nombreVisible, calcStat, toast,
  NATURALEZAS, STATS_CORTO, TIPOS_ES, CATEGORIA_ES, TIPO_COLOR,
  nomMov, descMov, nomHab, descHab, nomObj, descObj, idBusqueda,
} from './util';
import {
  Equipo, SetPkm, cargarEquipos, guardarEquipos, nuevoId, nuevoSet, movimientosDe,
  exportarEquipo, importarTexto, validarEquipo, formaPorObjeto, objetosRequeridos, maxPokemon,
} from './equipos';

const STATS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];

// ------------------------------------------------------------------ selector --
interface Opcion { id: string; nombre: string; buscar: string; render: () => HTMLElement; grupo?: string }

export function abrirSelector(titulo: string, opciones: Opcion[], onPick: (id: string) => void, filtros?: {[k: string]: (o: Opcion) => boolean}) {
  const fondo = h('div', {class: 'modal-fondo'});
  const input = h('input', {class: 'buscador', placeholder: tr('Buscar…', 'Search…'), autocomplete: 'off', spellcheck: 'false'});
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
      if (n++ > 250) { lista.append(h('div', {class: 'mas'}, tr('Escribe para filtrar más…', 'Type to filter more…'))); break; }
      const row = h('button', {class: 'opcion', onclick: () => { cerrar(); onPick(o.id); }}, o.render());
      lista.append(row);
    }
    if (!n) lista.append(h('div', {class: 'mas'}, tr('Sin resultados', 'No results')));
  }
  input.addEventListener('input', pintar);
  fondo.addEventListener('click', e => { if (e.target === fondo) cerrar(); });
  fondo.append(h('div', {class: 'modal selector'},
    h('div', {class: 'modal-cab'}, h('h3', {}, titulo), h('button', {class: 'btn-x', onclick: cerrar, 'aria-label': tr('Cerrar', 'Close')}, '×')),
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
        h('span', {class: 'nombre'}, custom ? h('b', {class: 'estrella', title: tr('Personalizado', 'Custom')}, '★ ') : null, nombreVisible(sp.name)),
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
  const out: Opcion[] = [{id: '', nombre: '(ninguno)', buscar: 'ninguno', render: () => h('div', {class: 'fila-obj'}, h('span', {class: 'nombre'}, tr('(Sin objeto)', '(No item)')))}];
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
      h('button', {class: 'btn btn-sec', onclick: volver}, tr('← Inicio', '← Home')),
      h('h2', {}, tr('Mis equipos', 'My teams')));
    const lado = h('aside', {class: 'lista-equipos'},
      h('div', {class: 'acciones'},
        h('button', {class: 'btn', onclick: () => {
          const eq: Equipo = {id: nuevoId(), nombre: tr('Equipo ', 'Team ') + (equipos.length + 1), formato: 'singles', sets: []};
          equipos.push(eq); actual = eq; slot = -1; guardar(); render();
        }}, tr('+ Nuevo equipo', '+ New team')),
        h('button', {class: 'btn btn-sec', onclick: dialogoImportar}, tr('Importar', 'Import'))),
      ...equipos.map(eq => h('button', {class: 'item-equipo' + (eq === actual ? ' activo' : ''), onclick: () => { actual = eq; slot = -1; render(); }},
        h('div', {class: 'eq-nombre'}, eq.nombre, h('span', {class: 'formato-tag'}, eq.formato === 'doubles' ? tr('Dobles', 'Doubles') : eq.formato === 'draft' ? `Draft · ${eq.sets.length}` : tr('Individual', 'Singles'))),
        h('div', {class: 'eq-iconos'}, ...eq.sets.map(s => iconImg(s.species))))),
      !equipos.length ? h('p', {class: 'vacio'}, tr('Aún no tienes equipos. Crea uno nuevo o importa uno en formato Showdown.', "You don't have any teams yet. Create a new one or import one in Showdown format.")) : null);
    const main = h('main', {class: 'editor-equipo'});
    if (actual) pintarEditor(main, actual);
    raiz.append(cab, h('div', {class: 'equipos-layout'}, lado, main));
  }

  function dialogoImportar() {
    const ta = h('textarea', {class: 'texto-equipo', placeholder: tr('Pega aquí un equipo en formato Showdown…', 'Paste a team in Showdown format here…')});
    modalTexto(tr('Importar equipo', 'Import team'), ta, [
      [tr('Importar', 'Import'), () => {
        try {
          const sets = importarTexto(ta.value);
          if (!sets.length) { toast(tr('No se encontró ningún Pokémon en el texto', 'No Pokémon found in the text')); return false; }
          const eq: Equipo = {id: nuevoId(), nombre: tr('Importado ', 'Imported ') + (equipos.length + 1), sets: sets.slice(0, 12), formato: sets.length > 6 ? 'draft' : 'singles'};
          equipos.push(eq); actual = eq; slot = -1; guardar(); render();
          const errs = validarEquipo(eq);
          if (errs.length) toast(tr('Importado con avisos: ', 'Imported with warnings: ') + errs[0], 5000);
        } catch (e) { toast(tr('No se pudo leer el texto', "Couldn't read the text")); return false; }
        return true;
      }],
    ]);
  }

  function pintarEditor(main: HTMLElement, eq: Equipo) {
    const nombre = h('input', {class: 'input-nombre', value: eq.nombre, maxlength: '40'});
    nombre.addEventListener('change', () => { eq.nombre = nombre.value.trim() || tr('Sin nombre', 'Unnamed'); guardar(); render(); });
    const formato = h('select', {class: 'select'},
      h('option', {value: 'singles', selected: eq.formato === 'singles'}, tr('Individual', 'Singles')),
      h('option', {value: 'doubles', selected: eq.formato === 'doubles'}, tr('Dobles', 'Doubles')),
      h('option', {value: 'draft', selected: eq.formato === 'draft'}, tr('Plantilla draft (hasta 12)', 'Draft roster (up to 12)')));
    formato.addEventListener('change', () => { eq.formato = formato.value as any; guardar(); render(); });
    const errs = validarEquipo(eq);
    main.append(
      h('div', {class: 'editor-cab'}, nombre, formato,
        h('button', {class: 'btn btn-sec', onclick: () => {
          const ta = h('textarea', {class: 'texto-equipo', readonly: true}, exportarEquipo(eq));
          modalTexto(tr('Exportar equipo', 'Export team'), ta, [[tr('Copiar', 'Copy'), () => { navigator.clipboard?.writeText(ta.value); toast(tr('Copiado', 'Copied')); return true; }]]);
          setTimeout(() => ta.select(), 50);
        }}, tr('Exportar', 'Export')),
        h('button', {class: 'btn btn-peligro', onclick: () => {
          if (!confirm(tr(`¿Borrar el equipo "${eq.nombre}"?`, `Delete the team "${eq.nombre}"?`))) return;
          equipos = equipos.filter(e => e !== eq); actual = equipos[0] || null; slot = -1; guardar(); render();
        }}, tr('Borrar', 'Delete'))),
      h('div', {class: 'slots'},
        ...eq.sets.map((s, i) => h('button', {class: 'slot' + (i === slot ? ' activo' : ''), onclick: () => { slot = i; render(); }},
          spriteImg(s.species, 'front', s.shiny, 'slot-sprite'),
          h('div', {class: 'slot-nombre'}, s.name || nombreVisible(s.species)),
          h('div', {class: 'slot-item'}, s.item ? itemIcon(s.item) : null, s.item ? nomObj(s.item) : '—'))),
        eq.sets.length < maxPokemon(eq) ? h('button', {class: 'slot slot-nuevo', onclick: () => {
          abrirSelector(tr('Elige un Pokémon', 'Choose a Pokémon'), opcionesEspecie(), id => {
            eq.sets.push(nuevoSet(id)); slot = eq.sets.length - 1; guardar(); render();
          }, {'★ Solo personalizados': o => o.grupo === 'custom'});
        }}, h('span', {class: 'mas-grande'}, '+'), tr('Añadir', 'Add')) : null),
      errs.length && eq.sets.length ? h('div', {class: 'avisos'}, ...errs.map(e => h('div', {}, '⚠ ' + e))) :
        eq.sets.length ? h('div', {class: 'ok'}, tr('✓ Equipo listo para combatir', '✓ Team ready to battle')) : null,
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
      h('button', {class: 'set-sprite', title: tr('Cambiar Pokémon', 'Change Pokémon'), onclick: () => abrirSelector(tr('Elige un Pokémon', 'Choose a Pokémon'), opcionesEspecie(), id => {
        const n = nuevoSet(id);
        eq.sets[i] = {...n, name: '', item: n.item || s.item, nature: s.nature, evs: s.evs, ivs: s.ivs, level: s.level, shiny: s.shiny,
          moves: s.moves.filter(m => movimientosDe(id).includes(toID(m)))};
        cambiar();
      }, {'★ Solo personalizados': o => o.grupo === 'custom'})}, spriteImg(s.species, 'front', s.shiny)),
      h('div', {class: 'set-info'},
        h('div', {class: 'set-nombre'}, nombreVisible(s.species), INFO.custom.has(sp.id) ? h('span', {class: 'estrella'}, ' ★') : null),
        h('div', {}, ...sp.types.map(t => tipoBadge(t))),
        campo(tr('Mote', 'Nickname'), (() => {
          const inp = h('input', {class: 'input', value: s.name, placeholder: sp.baseSpecies, maxlength: '18'});
          inp.addEventListener('change', () => { s.name = inp.value.trim(); cambiar(); });
          return inp;
        })()),
        h('div', {class: 'fila-campos'},
          campo(tr('Nivel', 'Level'), (() => {
            const inp = h('input', {class: 'input input-num', type: 'number', min: '1', max: '100', value: String(s.level)});
            inp.addEventListener('change', () => { s.level = Math.max(1, Math.min(100, +inp.value || 100)); cambiar(); });
            return inp;
          })()),
          campo('Shiny', (() => {
            const inp = h('input', {type: 'checkbox', checked: s.shiny});
            inp.addEventListener('change', () => { s.shiny = inp.checked; cambiar(); });
            return inp;
          })()),
          sp.canGigantamax ? campo(tr('Gigamax', 'Gigantamax'), (() => {
            const inp = h('input', {type: 'checkbox', checked: !!s.gigantamax});
            inp.addEventListener('change', () => { s.gigantamax = inp.checked; cambiar(); });
            return inp;
          })()) : null,
          campo(tr('Teratipo', 'Tera Type'), (() => {
            const sel = h('select', {class: 'select'}, ...Object.keys(TIPOS_ES).filter(t => t !== '???').map(t =>
              h('option', {value: t, selected: s.teraType === t}, TIPOS_ES[t])));
            sel.addEventListener('change', () => { s.teraType = sel.value; cambiar(); });
            return sel;
          })()))),
      h('div', {class: 'set-acciones'},
        h('button', {class: 'btn btn-sec btn-sm', disabled: i === 0, onclick: () => { [eq.sets[i - 1], eq.sets[i]] = [eq.sets[i], eq.sets[i - 1]]; slot = i - 1; cambiar(); }}, '↑'),
        h('button', {class: 'btn btn-sec btn-sm', disabled: i === eq.sets.length - 1, onclick: () => { [eq.sets[i + 1], eq.sets[i]] = [eq.sets[i], eq.sets[i + 1]]; slot = i + 1; cambiar(); }}, '↓'),
        h('button', {class: 'btn btn-peligro btn-sm', onclick: () => { eq.sets.splice(i, 1); slot = -1; cambiar(); }}, tr('Quitar', 'Remove'))));

    // Objeto y habilidad
    const habilidades = [...new Set(Object.values(sp.abilities) as string[])];
    const habSel = h('select', {class: 'select'}, ...habilidades.map(a => h('option', {value: a, selected: toID(a) === toID(s.ability)},
      nomHab(a) + (sp.abilities.H === a ? tr(' (oculta)', ' (hidden)') : Object.entries(sp.abilities).some(([k, v]) => v === a && /^(S|C\d+)$/.test(k)) ? ' ★' : ''))));
    habSel.addEventListener('change', () => { s.ability = habSel.value; cambiar(); });
    const ab = d.abilities.get(s.ability);
    const it = s.item ? d.items.get(s.item) : null;
    const objHab = h('div', {class: 'fila-campos'},
      campo(tr('Objeto', 'Item'), h('button', {class: 'btn-campo', onclick: () => abrirSelector(tr('Elige un objeto', 'Choose an item'), opcionesObjeto(), id => {
        s.item = id;
        // Arceus, Silvally, Genesect, Ogerpon...: la forma depende del objeto
        const actual = d.species.get(s.species);
        const nueva = formaPorObjeto(s.species, id);
        if (nueva !== s.species) s.species = nueva;
        else if (objetosRequeridos(actual).length && !objetosRequeridos(actual).map(toID).includes(toID(id))) {
          s.species = d.species.get(actual.changesFrom || actual.baseSpecies).name;
        }
        cambiar();
      },
        {'★ Solo personalizados': o => o.grupo === 'custom'})},
        s.item ? itemIcon(s.item) : null, s.item ? nomObj(s.item) : '(ninguno)'), it ? descObj(it.name) : ''),
      campo(tr('Habilidad', 'Ability'), habSel, ab.exists ? descHab(ab.name) : ''));

    // Movimientos
    const legales = movimientosDe(s.species).sort((a, b) => nomMov(a).localeCompare(nomMov(b), 'es'));
    const movs = h('div', {class: 'movs'}, ...[0, 1, 2, 3].map(k => {
      const m = s.moves[k];
      const mv = m ? d.moves.get(m) : null;
      return h('button', {class: 'btn-mov', style: mv ? {borderColor: TIPO_COLOR[mv.type]} : {}, onclick: () => {
        const ops: Opcion[] = [{id: '', nombre: '', buscar: 'ninguno', render: () => h('div', {class: 'fila-mov'}, h('span', {class: 'nombre'}, tr('(Vacío)', '(Empty)')))},
          ...legales.filter(x => !s.moves.map(toID).includes(x) || toID(m || '') === x).map(x => ({
            id: d.moves.get(x).name, nombre: nomMov(x), buscar: x + idBusqueda(nomMov(x)) + toID(d.moves.get(x).type) + idBusqueda(TIPOS_ES[d.moves.get(x).type] || ''),
            grupo: d.moves.get(x).type, render: () => filaMovimiento(x)}))];
        abrirSelector(tr(`Movimiento ${k + 1}`, `Move ${k + 1}`), ops, id => {
          const arr = [...s.moves]; arr[k] = id; s.moves = arr.filter(Boolean); cambiar();
        }, {'Físicos': o => !!o.id && d.moves.get(o.id).category === 'Physical', 'Especiales': o => !!o.id && d.moves.get(o.id).category === 'Special',
          'Estado': o => !!o.id && d.moves.get(o.id).category === 'Status', 'De su tipo': o => !!o.id && sp.types.includes(d.moves.get(o.id).type)});
      }}, mv ? [tipoBadge(mv.type, true), ' ', nomMov(mv.name)] : h('span', {class: 'tenue'}, tr('— vacío —', '— empty —')));
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
      restantes.textContent = tr(`EVs restantes: ${510 - totalEv()}`, `EVs left: ${510 - totalEv()}`);
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
      [tr('Atacante físico', 'Physical attacker'), {hp: 4, atk: 252, spe: 252}, 'Adamant'],
      [tr('Atacante especial', 'Special attacker'), {hp: 4, spa: 252, spe: 252}, 'Modest'],
      [tr('Tanque físico', 'Physical tank'), {hp: 252, def: 252, spd: 4}, 'Impish'],
      [tr('Tanque especial', 'Special tank'), {hp: 252, spd: 252, def: 4}, 'Calm'],
      [tr('Equilibrado', 'Balanced'), {hp: 84, atk: 84, def: 84, spa: 84, spd: 84, spe: 84}, ''],
    ];
    const presetsEl = h('div', {class: 'presets'}, h('span', {class: 'tenue'}, tr('Repartos rápidos: ', 'Quick spreads: ')),
      ...presets.map(([n, ev, nat]) => h('button', {class: 'chip', onclick: () => {
        s.evs = Object.fromEntries(STATS.map(k => [k, ev[k] || 0]));
        if (nat) s.nature = nat;
        cambiar();
      }}, n)));

    panel.append(cabecera, objHab,
      h('h4', {}, tr('Movimientos', 'Moves')), movs,
      h('h4', {}, tr('Estadísticas ', 'Stats '), restantes),
      h('div', {class: 'fila-campos'}, campo(tr('Naturaleza', 'Nature'), natSel)), presetsEl,
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
      h('button', {class: 'btn btn-sec', onclick: cerrar}, tr('Cerrar', 'Close')))));
  document.body.append(fondo);
}

export {esc};
