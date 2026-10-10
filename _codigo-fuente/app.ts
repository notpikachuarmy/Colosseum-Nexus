// Punto de entrada: pantallas de inicio, práctica, online y Pokédex.
import {buildMod, INFO, FORMATOS} from './mod';
import {h, toast, dex, tipoBadge, spriteImg, nombreVisible, STATS_CORTO, storage, CATEGORIA_ES, TIPOS_ES, nomMov, nomHab, descHab} from './util';
import {pantallaEquipos, colorStat, modalTexto} from './constructor';
import {cargarEquipos, validarEquipo, empaquetar, Equipo, movimientosDe} from './equipos';
import {PantallaCombate} from './combate';
import {Motor, IA} from './motor';
import {crearSala, unirseSala, Canal, Sala} from './red';

const VERSION_DATOS = (() => {
  const w = window as any;
  const txt = JSON.stringify([w.DATOS_POKEMON, Object.keys(w.DATOS_HABILIDADES || {}), Object.keys(w.DATOS_MOVIMIENTOS || {}), Object.keys(w.DATOS_OBJETOS || {})]);
  let hsh = 0;
  for (let i = 0; i < txt.length; i++) hsh = (hsh * 31 + txt.charCodeAt(i)) | 0;
  return (hsh >>> 0).toString(36);
})();

const app = document.getElementById('app')!;
let limpiar: (() => void) | null = null;
const cambiarPantalla = (f: () => void) => { limpiar?.(); limpiar = null; window.scrollTo(0, 0); f(); };

function nombreJugador(): string { return storage.get('arena.nombre', ''); }

// --------------------------------------------------------------------- inicio --
function inicio() {
  app.innerHTML = '';
  const nombre = h('input', {class: 'input', value: nombreJugador(), placeholder: 'Tu nombre de entrenador', maxlength: '18'});
  nombre.addEventListener('change', () => storage.set('arena.nombre', nombre.value.trim()));
  const nEquipos = cargarEquipos().length;
  app.append(h('div', {class: 'inicio'},
    h('div', {class: 'logo'},
      h('div', {class: 'logo-sprites'}, ...['Somnistera', 'Railspike', 'Hazmadger'].map(s => spriteImg(s))),
      h('h1', {}, 'Arena Fakemon'),
      h('p', {class: 'subtitulo'}, 'Combates Pokémon con tus criaturas, objetos y habilidades personalizadas')),
    h('label', {class: 'campo campo-nombre'}, h('span', {class: 'etq'}, 'Tu nombre'), nombre),
    h('div', {class: 'menu'},
      boton('⚔', 'Combatir online', 'Crea una sala y pasa el código a un amigo', () => cambiarPantalla(online)),
      boton('🤖', 'Practicar contra la IA', 'Prueba tus equipos sin esperar a nadie', () => cambiarPantalla(practica)),
      boton('🧩', 'Mis equipos', nEquipos ? `${nEquipos} equipo${nEquipos > 1 ? 's' : ''} guardado${nEquipos > 1 ? 's' : ''}` : 'Crea tu primer equipo', () => cambiarPantalla(() => pantallaEquipos(app, () => cambiarPantalla(inicio)))),
      boton('📖', 'Pokédex personalizada', 'Stats, habilidades y movimientos de los fakemon', () => cambiarPantalla(pokedex))),
    INFO.avisos.length ? h('div', {class: 'avisos'}, h('b', {}, 'Avisos al cargar los datos:'), ...INFO.avisos.map(a => h('div', {}, '⚠ ' + a))) : null,
    h('footer', {class: 'pie'}, 'Hecho con el simulador de Pokémon Showdown (licencia MIT). Pokémon es propiedad de Nintendo, Game Freak y Creatures.')));
}

function boton(icono: string, titulo: string, sub: string, onclick: () => void) {
  return h('button', {class: 'menu-btn', onclick}, h('span', {class: 'menu-icono'}, icono),
    h('span', {class: 'menu-texto'}, h('b', {}, titulo), h('small', {}, sub)));
}

function selectorEquipo(formato: 'singles' | 'doubles' | null, onCambio?: () => void) {
  const equipos = cargarEquipos();
  const sel = h('select', {class: 'select'}, ...equipos.map(e => h('option', {value: e.id},
    `${e.nombre} (${e.formato === 'doubles' ? 'Dobles' : 'Individual'}, ${e.sets.length} Pokémon)`)));
  const ultimo = storage.get('arena.ultimoEquipo', '');
  if (equipos.some(e => e.id === ultimo)) sel.value = ultimo;
  else if (formato) { const f = equipos.find(e => e.formato === formato); if (f) sel.value = f.id; }
  sel.addEventListener('change', () => { storage.set('arena.ultimoEquipo', sel.value); onCambio?.(); });
  return {el: sel, equipo: (): Equipo | undefined => cargarEquipos().find(e => e.id === sel.value), vacio: !equipos.length};
}

function sinEquipos() {
  return h('div', {class: 'aviso-grande'}, 'Primero necesitas crear un equipo. ',
    h('button', {class: 'btn', onclick: () => cambiarPantalla(() => pantallaEquipos(app, () => cambiarPantalla(inicio)))}, 'Ir a Mis equipos'));
}

// ------------------------------------------------------------------- práctica --
function practica() {
  app.innerHTML = '';
  const sel = selectorEquipo(null);
  const rival = selectorEquipo(null);
  const formato = h('select', {class: 'select'}, h('option', {value: 'singles'}, 'Individual'), h('option', {value: 'doubles'}, 'Dobles'));
  const rivalAleatorio = h('input', {type: 'checkbox', checked: true});
  app.append(h('header', {class: 'barra'}, h('button', {class: 'btn btn-sec', onclick: () => cambiarPantalla(inicio)}, '← Inicio'), h('h2', {}, 'Practicar contra la IA')),
    sel.vacio ? sinEquipos() : h('div', {class: 'tarjeta formulario'},
      h('label', {class: 'campo'}, h('span', {class: 'etq'}, 'Tu equipo'), sel.el),
      h('label', {class: 'campo'}, h('span', {class: 'etq'}, 'Formato'), formato),
      h('label', {class: 'campo campo-check'}, rivalAleatorio, ' La IA usa un equipo aleatorio de Pokémon personalizados'),
      h('label', {class: 'campo'}, h('span', {class: 'etq'}, 'Equipo de la IA (si no es aleatorio)'), rival.el),
      h('button', {class: 'btn btn-grande', onclick: () => {
        const eq = sel.equipo();
        if (!eq) return;
        const errs = validarEquipo({...eq, formato: formato.value as any});
        if (errs.length) { toast(errs[0], 5000); return; }
        const eqIA = rivalAleatorio.checked ? equipoAleatorio(formato.value === 'doubles' ? 6 : 6) : rival.equipo()!;
        const f = formato.value as 'singles' | 'doubles';
        cambiarPantalla(() => combateLocal(eq, eqIA, f));
      }}, '¡A combatir!')));
}

function equipoAleatorio(n: number): Equipo {
  const d = dex();
  const ids = [...INFO.custom].filter(id => !d.species.get(id).battleOnly && !d.species.get(id).nfe);
  const usados = new Set<string>();
  const sets: any[] = [];
  const objetos = [...INFO.objetos].filter(i => i !== 'metagrossitax');
  while (sets.length < n && usados.size < ids.length) {
    const sp = d.species.get(ids[Math.floor(Math.random() * ids.length)]);
    if (usados.has(sp.baseSpecies)) continue;
    usados.add(sp.baseSpecies);
    const legales = movimientosDe(sp.name).map(m => d.moves.get(m));
    const atk = sp.baseStats.atk >= sp.baseStats.spa ? 'Physical' : 'Special';
    const ataques = legales.filter(m => m.category === atk && m.basePower >= 60 && !m.flags['charge'] && !m.selfdestruct)
      .sort(() => Math.random() - 0.5);
    const stab = ataques.filter(m => sp.types.includes(m.type));
    const cobertura = ataques.filter(m => !sp.types.includes(m.type));
    const estado = legales.filter(m => m.category === 'Status').sort(() => Math.random() - 0.5);
    const moves = [...new Set([...stab.slice(0, 2), ...cobertura.slice(0, 1), ...(estado.length ? [estado[0]] : cobertura.slice(1, 2))]
      .map(m => m.name))].slice(0, 4);
    const ev = atk === 'Physical' ? {hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252} : {hp: 4, atk: 0, def: 0, spa: 252, spd: 0, spe: 252};
    sets.push({name: '', species: sp.name, item: d.items.get('Metagrossita X').itemUser?.includes(sp.name) ? 'Metagrossita X' : (Math.random() < 0.6 ? d.items.get(objetos[Math.floor(Math.random() * objetos.length)]).name : 'Leftovers'),
      ability: Object.values(sp.abilities)[0], moves, nature: atk === 'Physical' ? 'Jolly' : 'Timid', evs: ev,
      ivs: {hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31}, level: 100, gender: '', shiny: Math.random() < 0.05, teraType: sp.types[0]});
  }
  return {id: 'ia', nombre: 'IA', formato: 'singles', sets};
}

function combateLocal(eq: Equipo, eqIA: Equipo, formato: 'singles' | 'doubles') {
  app.innerHTML = '';
  const yo = nombreJugador() || 'Tú';
  const motor = new Motor(formato, {nombre: yo, equipo: empaquetar(eq)}, {nombre: 'IA', equipo: empaquetar(eqIA)});
  new IA(motor, 'p2');
  const raiz = h('div', {});
  app.append(raiz);
  const pantalla = new PantallaCombate(raiz, {
    yo: 'p1',
    titulo: formato === 'doubles' ? 'Práctica · Dobles' : 'Práctica · Individual',
    elegir: e => motor.elegir('p1', e),
    rendirse: () => motor.rendirse('p1'),
    alTerminar: () => [
      h('button', {class: 'btn', onclick: () => cambiarPantalla(() => combateLocal(eq, eqIA.id === 'ia' ? equipoAleatorio(6) : eqIA, formato))}, 'Otra vez'),
      h('button', {class: 'btn btn-sec', onclick: () => cambiarPantalla(practica)}, 'Volver'),
    ],
  });
  motor.escuchar('p1', c => pantalla.recibir(c));
  limpiar = () => { pantalla.destruir(); motor.destruir(); };
}

// --------------------------------------------------------------------- online --
function online() {
  app.innerHTML = '';
  const sel = selectorEquipo(null);
  const codigoIn = h('input', {class: 'input input-codigo', placeholder: 'CÓDIGO', maxlength: '5', autocomplete: 'off', spellcheck: 'false'});
  codigoIn.addEventListener('input', () => { codigoIn.value = codigoIn.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });
  app.append(h('header', {class: 'barra'}, h('button', {class: 'btn btn-sec', onclick: () => cambiarPantalla(inicio)}, '← Inicio'), h('h2', {}, 'Combatir online')),
    sel.vacio ? sinEquipos() : h('div', {class: 'online-grid'},
      h('div', {class: 'tarjeta formulario'},
        h('label', {class: 'campo'}, h('span', {class: 'etq'}, 'Tu equipo'), sel.el),
        h('p', {class: 'tenue'}, 'Podrás cambiar de equipo en la sala antes de empezar.')),
      h('div', {class: 'tarjeta'},
        h('h3', {}, 'Crear sala'),
        h('p', {}, 'Recibirás un código para pasárselo a tu amigo.'),
        h('button', {class: 'btn btn-grande', onclick: () => {
          const eq = sel.equipo(); if (!eq) return;
          cambiarPantalla(() => salaAnfitrion());
        }}, 'Crear sala')),
      h('div', {class: 'tarjeta'},
        h('h3', {}, 'Unirse a una sala'),
        h('p', {}, 'Escribe el código que te ha pasado tu amigo.'),
        codigoIn,
        h('button', {class: 'btn btn-grande', onclick: () => {
          if (codigoIn.value.length < 4) { toast('Escribe el código de la sala'); return; }
          const eq = sel.equipo(); if (!eq) return;
          cambiarPantalla(() => salaInvitado(codigoIn.value));
        }}, 'Unirse'))));
}

interface InfoRival { nombre: string; equipo: string; resumen: string[]; version: string }

function resumenEquipo(eq: Equipo) { return eq.sets.map(s => s.species); }

/** Sala del anfitrión: ejecuta el motor y retransmite al invitado. */
function salaAnfitrion() {
  let canal: Canal | null = null;
  let rival: InfoRival | null = null;
  let motor: Motor | null = null;
  let pantalla: PantallaCombate | null = null;
  let sala: Sala | null = null;
  let codigo = '';
  let formato: 'singles' | 'doubles' = storage.get('arena.formatoOnline', 'singles');
  let sel = selectorEquipo(null, () => pintarLobby());

  const fin = () => { pantalla?.destruir(); motor?.destruir(); canal?.cerrar(); sala?.cancelar(); };
  limpiar = fin;

  function pintarLobby(estado = '') {
    pantalla?.destruir(); pantalla = null;
    app.innerHTML = '';
    sel = selectorEquipo(null, () => pintarLobby());
    const fSel = h('select', {class: 'select'}, h('option', {value: 'singles', selected: formato === 'singles'}, 'Individual'),
      h('option', {value: 'doubles', selected: formato === 'doubles'}, 'Dobles'));
    fSel.addEventListener('change', () => { formato = fSel.value as any; storage.set('arena.formatoOnline', formato); canal?.enviar({t: 'formato', formato}); });
    app.append(h('header', {class: 'barra'}, h('button', {class: 'btn btn-sec', onclick: () => cambiarPantalla(online)}, '← Salir'), h('h2', {}, 'Tu sala')),
      h('div', {class: 'lobby'},
        h('div', {class: 'tarjeta codigo-tarjeta'},
          h('div', {class: 'tenue'}, 'Código de la sala'),
          h('div', {class: 'codigo-grande'}, codigo || '…'),
          codigo ? h('button', {class: 'btn btn-sec btn-sm', onclick: () => { navigator.clipboard?.writeText(codigo); toast('Código copiado'); }}, 'Copiar código') : null,
          h('p', {class: 'tenue'}, codigo ? 'Pásale este código a tu amigo. Mantén esta pestaña abierta.' : 'Creando la sala…')),
        h('div', {class: 'tarjeta formulario'},
          h('label', {class: 'campo'}, h('span', {class: 'etq'}, 'Tu equipo'), sel.el),
          h('label', {class: 'campo'}, h('span', {class: 'etq'}, 'Formato del combate'), fSel),
          h('div', {class: 'rival-info'}, rival ? [h('b', {}, `${rival.nombre} está en la sala`), h('div', {class: 'eq-iconos'}, ...rival.resumen.map(s => spriteImg(s, 'front', false, 'mini')))]
            : h('span', {class: 'tenue pulso'}, 'Esperando a que se una alguien…')),
          estado ? h('div', {class: 'avisos'}, estado) : null,
          h('button', {class: 'btn btn-grande', disabled: !rival, onclick: empezar}, '¡Empezar combate!'))));
  }

  function empezar() {
    if (!rival || !canal) return;
    const eq = sel.equipo();
    if (!eq) return;
    const errs = validarEquipo({...eq, formato});
    if (errs.length) { toast('Tu equipo: ' + errs[0], 5000); return; }
    if (formato === 'doubles' && rival.resumen.length < 2) { toast('El equipo de tu rival necesita al menos 2 Pokémon para dobles'); return; }
    const yo = nombreJugador() || 'Anfitrión';
    let nombreRival = rival.nombre || 'Invitado';
    if (nombreRival === yo) nombreRival += ' (2)';
    motor?.destruir();
    motor = new Motor(formato, {nombre: yo, equipo: empaquetar(eq)}, {nombre: nombreRival, equipo: rival.equipo});
    canal.enviar({t: 'inicio', formato, nombres: [yo, nombreRival]});
    const m = motor;
    m.escuchar('p2', c => canal?.enviar({t: 'p', d: c}));
    app.innerHTML = '';
    const raiz = h('div', {});
    app.append(raiz);
    pantalla = new PantallaCombate(raiz, {
      yo: 'p1', titulo: `${yo} vs ${nombreRival}`,
      elegir: e => m.elegir('p1', e),
      rendirse: () => m.rendirse('p1'),
      enviarChat: t => canal?.enviar({t: 'chat', texto: t}),
      alTerminar: () => [h('button', {class: 'btn', onclick: () => { canal?.enviar({t: 'lobby'}); pintarLobby(); }}, 'Volver a la sala (revancha)'),
        h('button', {class: 'btn btn-sec', onclick: () => cambiarPantalla(inicio)}, 'Salir')],
    });
    const p = pantalla;
    m.escuchar('p1', c => p.recibir(c));
  }

  function conectar(c: Canal) {
    if (canal) { c.enviar({t: 'llena'}); setTimeout(() => c.cerrar(), 500); return; }
    canal = c;
    c.enviar({t: 'formato', formato});
    c.onMensaje(msg => {
      switch (msg.t) {
      case 'hola':
        rival = {nombre: String(msg.nombre || 'Invitado').slice(0, 18), equipo: msg.equipo, resumen: msg.resumen || [], version: msg.version};
        if (msg.version !== VERSION_DATOS) toast('⚠ Tu amigo tiene otra versión de los datos. Recargad los dos la página.', 7000);
        if (!pantalla) pintarLobby();
        break;
      case 'elegir': motor?.elegir('p2', String(msg.d)); break;
      case 'rendirse': motor?.rendirse('p2'); break;
      case 'chat': pantalla?.chat(rival?.nombre || 'Rival', String(msg.texto).slice(0, 200)); break;
      }
    });
    c.onCerrar(() => {
      canal = null; rival = null;
      if (pantalla && !pantalla.estado.terminado) { pantalla.log('Tu rival se ha desconectado.', 'error'); motor?.rendirse('p2'); }
      else pintarLobby('Tu rival se ha desconectado.');
    });
  }

  pintarLobby();
  sala = crearSala(cod => { codigo = cod; if (!pantalla) pintarLobby(); }, conectar, err => pintarLobby(err));
}

/** Sala del invitado: solo dibuja y manda sus elecciones. */
function salaInvitado(codigo: string) {
  let canal: Canal | null = null;
  let pantalla: PantallaCombate | null = null;
  let formato = 'singles';
  let sel = selectorEquipo(null, () => { enviarEquipo(); pintar(); });
  const sala = unirseSala(codigo, c => { canal = c; configurar(c); pintar(); }, err => pintar(err));
  limpiar = () => { pantalla?.destruir(); canal?.cerrar(); sala.cancelar(); };

  function enviarEquipo() {
    const eq = sel.equipo();
    if (!eq || !canal) return;
    canal.enviar({t: 'hola', nombre: nombreJugador() || 'Invitado', equipo: empaquetar(eq), resumen: resumenEquipo(eq), version: VERSION_DATOS});
  }

  function pintar(error = '') {
    pantalla?.destruir(); pantalla = null;
    app.innerHTML = '';
    sel = selectorEquipo(null, () => { enviarEquipo(); pintar(); });
    const eq = sel.equipo();
    const errs = eq ? validarEquipo({...eq, formato: formato as any}) : [];
    app.append(h('header', {class: 'barra'}, h('button', {class: 'btn btn-sec', onclick: () => cambiarPantalla(online)}, '← Salir'), h('h2', {}, `Sala ${codigo}`)),
      h('div', {class: 'lobby'},
        h('div', {class: 'tarjeta formulario'},
          h('div', {class: 'rival-info'}, error ? h('div', {class: 'avisos'}, error) :
            canal ? h('b', {}, '✓ Conectado. Esperando a que el anfitrión empiece…') : h('span', {class: 'tenue pulso'}, 'Conectando…')),
          h('label', {class: 'campo'}, h('span', {class: 'etq'}, 'Tu equipo'), sel.el),
          h('div', {}, 'Formato elegido por el anfitrión: ', h('b', {}, formato === 'doubles' ? 'Dobles' : 'Individual')),
          errs.length ? h('div', {class: 'avisos'}, '⚠ ' + errs[0]) : null,
          error ? h('button', {class: 'btn', onclick: () => cambiarPantalla(() => salaInvitado(codigo))}, 'Reintentar') : null)));
  }

  function configurar(c: Canal) {
    enviarEquipo();
    c.onMensaje(msg => {
      switch (msg.t) {
      case 'formato': formato = msg.formato; if (!pantalla) pintar(); break;
      case 'llena': pintar('Esa sala ya tiene dos jugadores.'); break;
      case 'inicio': {
        app.innerHTML = '';
        const raiz = h('div', {});
        app.append(raiz);
        pantalla = new PantallaCombate(raiz, {
          yo: 'p2', titulo: `${msg.nombres?.[0]} vs ${msg.nombres?.[1]}`,
          elegir: e => c.enviar({t: 'elegir', d: e}),
          rendirse: () => c.enviar({t: 'rendirse'}),
          enviarChat: t => c.enviar({t: 'chat', texto: t}),
          alTerminar: () => [h('span', {class: 'tenue'}, 'El anfitrión puede volver a la sala para la revancha.'),
            h('button', {class: 'btn btn-sec', onclick: () => pintar()}, 'Volver a la sala')],
        });
        break;
      }
      case 'p': pantalla?.recibir(String(msg.d)); break;
      case 'chat': pantalla?.chat('Rival', String(msg.texto).slice(0, 200)); break;
      case 'lobby': if (pantalla?.estado.terminado) pintar(); break;
      }
    });
    c.onCerrar(() => {
      canal = null;
      if (pantalla && !pantalla.estado.terminado) pantalla.log('Se ha perdido la conexión con el anfitrión.', 'error');
      else pintar('Se ha perdido la conexión con el anfitrión.');
    });
  }

  pintar();
}

// -------------------------------------------------------------------- pokédex --
function pokedex() {
  app.innerHTML = '';
  const d = dex();
  const lista = [...INFO.custom].map(id => d.species.get(id)).filter(s => s.exists);
  const buscar = h('input', {class: 'input buscador', placeholder: 'Buscar Pokémon, tipo o habilidad…'});
  const cont = h('div', {class: 'dex-grid'});
  const pintar = () => {
    const q = buscar.value.toLowerCase();
    cont.innerHTML = '';
    for (const sp of lista) {
      const habs = [...new Set(Object.values(sp.abilities) as string[])];
      const texto = [sp.name, ...sp.types, ...sp.types.map(t => TIPOS_ES[t]), ...habs, ...habs.map(nomHab)].join(' ').toLowerCase();
      if (q && !texto.includes(q)) continue;
      const bst = Object.values(sp.baseStats).reduce((a, b) => a + b, 0);
      cont.append(h('div', {class: 'dex-tarjeta'},
        h('div', {class: 'dex-cab'}, spriteImg(sp.name),
          h('div', {}, h('div', {class: 'dex-nombre'}, nombreVisible(sp.name)), h('div', {}, ...sp.types.map(t => tipoBadge(t, true))),
            sp.prevo ? h('small', {class: 'tenue'}, 'Evoluciona de ' + sp.prevo) : null)),
        h('div', {class: 'dex-stats'}, ...Object.entries(sp.baseStats).map(([k, v]) => h('div', {class: 'fila-stat-mini'},
          h('span', {}, STATS_CORTO[k]), h('b', {}, String(v)), h('span', {class: 'barra-stat'}, h('span', {style: {width: Math.min(100, v / 1.8) + '%', background: colorStat(v)}})))),
          h('div', {class: 'fila-stat-mini total'}, h('span', {}, 'Total'), h('b', {}, String(bst)))),
        h('div', {class: 'dex-habs'}, ...habs.map(a => {
          const ab = d.abilities.get(a);
          return h('div', {}, h('b', {}, nomHab(a) + (sp.abilities.H === a ? ' (oculta)' : '')), ': ', ab.exists ? descHab(a) : '');
        })),
        h('button', {class: 'btn btn-sec btn-sm', onclick: () => verMovimientos(sp.name)}, `Ver movimientos (${movimientosDe(sp.name).length})`)));
    }
  };
  buscar.addEventListener('input', pintar);
  const w = window as any;
  const objetos = h('div', {class: 'dex-objetos'}, h('h3', {}, 'Objetos personalizados'),
    ...[...INFO.objetos].map(id => d.items.get(id)).map(it => h('div', {class: 'fila-obj'}, h('b', {}, it.name), ' — ', it.desc)),
    h('h3', {}, 'Habilidades personalizadas'),
    ...Object.entries(w.DATOS_HABILIDADES || {}).map(([n, a]: any) => h('div', {}, h('b', {}, n), ' — ', a.desc)),
    h('h3', {}, 'Movimientos personalizados'),
    ...Object.entries(w.DATOS_MOVIMIENTOS || {}).map(([n, m]: any) => h('div', {}, h('b', {}, n), ` — ${TIPOS_ES[m.type]} · ${CATEGORIA_ES[m.category]} · Precisión ${m.accuracy}% · PP ${m.pp}. `, m.desc)));
  app.append(h('header', {class: 'barra'}, h('button', {class: 'btn btn-sec', onclick: () => cambiarPantalla(inicio)}, '← Inicio'), h('h2', {}, 'Pokédex personalizada')),
    h('p', {class: 'tenue centro'}, 'Los datos marcados como PROVISIONAL en datos/pokemon.js se pueden cambiar cuando quieras.'),
    buscar, cont, objetos);
  pintar();
}

function verMovimientos(species: string) {
  const d = dex();
  const movs = movimientosDe(species).map(m => d.moves.get(m)).sort((a, b) => a.type.localeCompare(b.type) || nomMov(a.name).localeCompare(nomMov(b.name), 'es'));
  const cont = h('div', {class: 'lista-movs'}, ...movs.map(mv => h('div', {class: 'fila-mov'},
    h('span', {class: 'nombre'}, nomMov(mv.name)), tipoBadge(mv.type, true), h('span', {class: 'cat cat-' + mv.category.toLowerCase()}, CATEGORIA_ES[mv.category]),
    h('span', {class: 'num'}, mv.basePower ? String(mv.basePower) : '—'), h('span', {class: 'num'}, mv.accuracy === true ? '—' : mv.accuracy + '%'))));
  modalTexto(`Movimientos de ${nombreVisible(species)}`, cont, []);
}

// ---------------------------------------------------------------------- start --
try {
  buildMod();
  void FORMATOS;
  inicio();
} catch (e: any) {
  console.error(e);
  app.innerHTML = '';
  app.append(h('div', {class: 'avisos'}, 'Error al cargar los datos personalizados: ' + (e?.message || e),
    h('p', {}, 'Revisa el último cambio que hiciste en la carpeta datos/.')));
}
