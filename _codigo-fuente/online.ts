// Combates online: salas por código, reconexión automática, series al mejor de 3 y draft.
import {tr} from './idioma';
import {h, toast, storage, spriteImg} from './util';
import {cargarEquipos, validarEquipo, empaquetar, Equipo, SetPkm} from './equipos';
import {equiposParejos, Reserva, RESERVAS} from './aleatorio';
import {PantallaCombate} from './combate';
import {Motor} from './motor';
import {PODERES, Poder} from './mod';
import {crearSala, unirseSala, Canal, Sala} from './red';
import {avatarImg, avatarActual, avatarValido, recompensaCombate, darPV, ECO} from './avatares';
import {nivelDe, insignia, bonusSerie} from './nivel';
import {experienciaPase, EXP} from './pases';
import {titulosSerie, tituloEquipado, tituloDe} from './titulos';
import {app, cambiarPantalla, setLimpiar, nav, nombreJugador, selectorEquipo, selectorReserva, selectorSerie, campo,
  VERSION_DATOS, TipoSerie, SERIES} from './nucleo';
import {Serie, empaquetarSets, desempaquetar, pantallaSeleccion} from './serie';

const ESPERA_RECONEXION_S = 120;

export function online() {
  app.innerHTML = '';
  const codigoIn = h('input', {class: 'input input-codigo', placeholder: 'CÓDIGO', maxlength: '5', autocomplete: 'off', spellcheck: 'false'});
  codigoIn.addEventListener('input', () => { codigoIn.value = codigoIn.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });
  codigoIn.addEventListener('keydown', e => { if (e.key === 'Enter') unirse(); });
  const unirse = () => {
    if (codigoIn.value.length < 4) { toast(tr('Escribe el código de la sala', 'Type the room code')); return; }
    cambiarPantalla(() => salaInvitado(codigoIn.value));
  };
  const nEquipos = cargarEquipos().length;
  app.append(h('header', {class: 'barra'}, h('button', {class: 'btn btn-sec', onclick: () => cambiarPantalla(nav.inicio)}, tr('← Inicio', '← Home')), h('h2', {}, tr('Combatir online', 'Battle online'))),
    h('div', {class: 'online-grid'},
      h('div', {class: 'tarjeta'},
        h('p', {}, nEquipos ? tr('En la sala elegiréis cómo jugar: con vuestros equipos, con equipos aleatorios parejos, al mejor de 3 o en modo draft.', 'In the room you choose how to play: with your own teams, with balanced random teams, best of 3 or draft mode.')
          : [tr('Aún no tienes equipos: podréis jugar con ', "You don't have teams yet: you can play with "), h('b', {}, tr('equipos aleatorios parejos', 'balanced random teams')), tr(' o crear uno en "Mis equipos".', ' or create one in "My teams".')])),
      h('div', {class: 'tarjeta'},
        h('h3', {}, tr('Crear sala', 'Create room')),
        h('p', {}, tr('Recibirás un código para pasárselo a tu amigo.', "You'll get a code to send to your friend.")),
        h('button', {class: 'btn btn-grande', onclick: () => cambiarPantalla(salaAnfitrion)}, tr('Crear sala', 'Create room'))),
      h('div', {class: 'tarjeta'},
        h('h3', {}, tr('Unirse a una sala', 'Join a room')),
        h('p', {}, tr('Escribe el código que te ha pasado tu amigo.', 'Type the code your friend sent you.')),
        codigoIn,
        h('button', {class: 'btn btn-grande', onclick: unirse}, tr('Unirse', 'Join')))),
    h('details', {class: 'tarjeta ayuda-conexion'},
      h('summary', {}, tr('¿Problemas para conectar?', 'Trouble connecting?')),
      h('ul', {},
        h('li', {}, tr('El que crea la sala debe dejar la pestaña abierta (y el ordenador sin suspender) durante todo el combate.', 'Whoever creates the room must keep the tab open (and the computer awake) for the whole battle.')),
        h('li', {}, tr('Si se corta, la partida no se pierde: el invitado se reconecta solo en unos segundos.', "If it drops, the game isn't lost: the guest reconnects automatically in a few seconds.")),
        h('li', {}, tr('Algunas redes de empresa, instituto o ciertos routers bloquean las conexiones directas. Si no hay manera, probad uno de los dos con los datos del móvil.', "Some work or school networks and certain routers block direct connections. If nothing works, have one of you try mobile data.")),
        h('li', {}, tr('Usad Chrome, Edge o Firefox actualizados. Las extensiones tipo VPN o "anti-WebRTC" pueden impedir la conexión.', 'Use an up-to-date Chrome, Edge or Firefox. VPN or "anti-WebRTC" extensions can block the connection.')))));
}

interface InfoRival { nombre: string; titulo?: string; avatar?: string; nivel?: number; nivelIA?: number; equipo: string | null; resumen: string[]; version: string; draft: boolean }
const nivelSeguro = (n: any) => Math.max(1, Math.min(999, Math.floor(+n) || 1));
type Fase = 'lobby' | 'seleccion' | 'combate' | 'fin';

const nombrePoder = (p: Poder) => ({dynamax: tr('Dinamax', 'Dynamax'), tera: tr('Teracristal', 'Terastal'), mega: tr('Megaevolución', 'Mega Evolution'), z: tr('Movimientos Z', 'Z-Moves')} as {[k in Poder]: string})[p];

/** Sala del anfitrión: ejecuta el motor, decide el modo y retransmite al invitado. */
function salaAnfitrion() {
  let activo = true;
  let canal: Canal | null = null;
  let rival: InfoRival | null = null;
  let rivalConectado = false;
  let motor: Motor | null = null;
  let pantalla: PantallaCombate | null = null;
  let sala: Sala | null = null;
  let codigo = '';
  let avisoConexion = '';
  let formato: 'singles' | 'doubles' = storage.get('cnx.formatoOnline', 'singles');
  let aleatorio: boolean = storage.get('cnx.aleatorioOnline', cargarEquipos().length === 0);
  let reserva: Reserva = storage.get('cnx.reserva', 'mezcla');
  let tipoSerie = storage.get<TipoSerie>('cnx.serieOnline', 'uno');
  // Poderes desactivados por el anfitrión (Dinamax, Teracristal, Mega, Z)
  let sinPoderes: Poder[] = storage.get<Poder[]>('cnx.sinPoderes', []).filter(p => PODERES.includes(p));
  let sel = selectorEquipo(tipoSerie === 'draft' ? 'draft' : 'normal');
  // Estado de la serie en curso
  let fase: Fase = 'lobby';
  let serie: Serie | null = null;
  let rosters: [SetPkm[], SetPkm[]] | null = null;
  let nombres: [string, string] = ['', ''];
  let selHost: number[] | null = null, selGuest: number[] | null = null;
  let previaHost: number[] | undefined;
  let historial: string[] = [];
  let msgInicio: any = null;
  let msgSeleccion: any = null;
  let temporizador: any = null;
  let selUI: {esperando(t: string): void} | null = null;
  let premioHost: HTMLElement | null = null;

  const enviar = (m: any) => canal?.enviar(m);
  const avisarModo = () => enviar({t: 'modo', formato, aleatorio, reserva, serie: tipoSerie, sinPoderes});

  setLimpiar(() => {
    activo = false;
    clearTimeout(temporizador);
    pantalla?.destruir(); motor?.destruir();
    try { canal?.enviar({t: 'cerrada'}); } catch { /* */ }
    const c = canal, s = sala;
    // un momento para que el aviso llegue antes de cortar
    setTimeout(() => { c?.cerrar(); s?.cancelar(); }, 300);
  });

  function pintarLobby(estado = '') {
    if (!activo) return;
    fase = 'lobby';
    pantalla?.destruir(); pantalla = null;
    motor?.destruir(); motor = null;
    app.innerHTML = '';
    sel = selectorEquipo(tipoSerie === 'draft' ? 'draft' : 'normal', () => pintarLobby(estado));
    const fSel = h('select', {class: 'select'}, h('option', {value: 'singles', selected: formato === 'singles'}, tr('Individual', 'Singles')),
      h('option', {value: 'doubles', selected: formato === 'doubles'}, tr('Dobles', 'Doubles')));
    fSel.addEventListener('change', () => { formato = fSel.value as any; storage.set('cnx.formatoOnline', formato); avisarModo(); });
    const mSel = h('select', {class: 'select'},
      h('option', {value: 'propios', selected: !aleatorio}, tipoSerie === 'draft' ? tr('Cada uno con su plantilla', 'Each with their own roster') : tr('Cada uno con su equipo', 'Each with their own team')),
      h('option', {value: 'aleatorio', selected: aleatorio}, tipoSerie === 'draft' ? tr('Plantillas aleatorias parejas (12 cada uno)', 'Balanced random rosters (12 each)') : tr('Equipos aleatorios parejos', 'Balanced random teams')));
    mSel.addEventListener('change', () => { aleatorio = mSel.value === 'aleatorio'; storage.set('cnx.aleatorioOnline', aleatorio); avisarModo(); pintarLobby(estado); });
    const rSel = selectorReserva(() => { reserva = rSel.valor(); avisarModo(); });
    rSel.el.value = reserva;
    const sSel = selectorSerie(tipoSerie, v => { tipoSerie = v; storage.set('cnx.serieOnline', v); avisarModo(); pintarLobby(estado); });
    const draft = tipoSerie === 'draft';
    const poderesEl = h('div', {class: 'poderes-sala'}, ...PODERES.map(p => {
      const c = h('input', {type: 'checkbox', checked: !sinPoderes.includes(p)});
      c.addEventListener('change', () => {
        sinPoderes = c.checked ? sinPoderes.filter(x => x !== p) : [...sinPoderes, p];
        storage.set('cnx.sinPoderes', sinPoderes); avisarModo();
      });
      return h('label', {class: 'toggle poder-chip'}, c, ' ' + nombrePoder(p));
    }));
    let infoRival: any;
    if (!rival) infoRival = h('span', {class: 'tenue pulso'}, codigo ? tr('Esperando a que se una alguien…', 'Waiting for someone to join…') : tr('Creando la sala…', 'Creating the room…'));
    else infoRival = [
      h('div', {class: 'rival-cab'}, avatarImg(rival.avatar || '', '', 'busto'), tituloDe(rival.titulo) ? h('span', {class: 'titulo-jugador'}, tituloDe(rival.titulo)!.nombre) : null, insignia('online', rival.nivel || 1, true), insignia('ia', rival.nivelIA || 1), h('b', {}, rivalConectado ? tr(`✓ ${rival.nombre} está en la sala`, `✓ ${rival.nombre} is in the room`) : tr(`${rival.nombre} se ha desconectado (puede volver con el mismo código)`, `${rival.nombre} disconnected (they can come back with the same code)`))),
      aleatorio ? null : rival.resumen.length ? h('div', {class: 'eq-iconos'}, ...rival.resumen.map(s => spriteImg(s, 'front', false, 'mini')))
        : h('span', {class: 'tenue'}, tr(`Tu amigo no tiene ${draft ? 'plantilla' : 'equipo'}: usad la opción aleatoria.`, `Your friend has no ${draft ? 'roster' : 'team'}: use the random option.`)),
    ];
    app.append(h('header', {class: 'barra'}, h('button', {class: 'btn btn-sec', onclick: () => cambiarPantalla(online)}, tr('← Salir', '← Leave')), h('h2', {}, tr('Tu sala', 'Your room'))),
      h('div', {class: 'lobby'},
        h('div', {class: 'tarjeta codigo-tarjeta'},
          h('div', {class: 'tenue'}, tr('Código de la sala', 'Room code')),
          h('div', {class: 'codigo-grande'}, codigo || '…'),
          codigo ? h('button', {class: 'btn btn-sec btn-sm', onclick: () => { navigator.clipboard?.writeText(codigo); toast(tr('Código copiado', 'Code copied')); }}, tr('Copiar código', 'Copy code')) : null,
          h('p', {class: 'tenue'}, codigo ? tr('Pásale este código a tu amigo. Mantén esta pestaña abierta.', 'Send this code to your friend. Keep this tab open.') : tr('Creando la sala…', 'Creating the room…')),
          avisoConexion ? h('p', {class: 'tenue pulso'}, avisoConexion) : null),
        h('div', {class: 'tarjeta formulario'},
          campo(tr('Tipo de partida', 'Match type'), sSel),
          campo(draft ? tr('Plantillas', 'Rosters') : tr('Equipos', 'Teams'), mSel),
          aleatorio ? campo(tr('Pokémon de los aleatorios', 'Pokémon in random teams'), rSel.el)
            : sel.vacio ? h('div', {class: 'avisos'}, draft ? tr('No tienes plantillas de draft (de 6 a 12 Pokémon): usa la opción aleatoria o crea una en "Mis equipos".', 'You have no draft rosters (6 to 12 Pokémon): use the random option or create one in "My teams".')
              : tr('No tienes equipos guardados: elige la opción aleatoria o crea uno.', 'You have no saved teams: choose the random option or create one.'))
            : campo(draft ? tr('Tu plantilla', 'Your roster') : tr('Tu equipo', 'Your team'), sel.el),
          campo(tr('Formato del combate', 'Battle format'), fSel),
          campo(tr('Poderes permitidos', 'Allowed powers'), poderesEl, tr('Desmarca los que no queráis usar en esta sala.', 'Untick the ones you don\'t want in this room.')),
          h('div', {class: 'rival-info'}, infoRival),
          estado ? h('div', {class: 'avisos'}, estado) : null,
          h('button', {class: 'btn btn-grande', disabled: !rival || !rivalConectado, onclick: empezarSerie}, tipoSerie === 'uno' ? tr('¡Empezar combate!', 'Start battle!') : tr('¡Empezar serie!', 'Start series!')))));
  }

  function empezarSerie() {
    if (!rival || !canal || !rivalConectado) return;
    const draft = tipoSerie === 'draft';
    if (aleatorio) {
      const [a, b] = equiposParejos(reserva, draft ? 12 : 6);
      rosters = [a.sets, b.sets];
    } else {
      const eq = sel.equipo();
      if (!eq) { toast(draft ? tr('Elige una plantilla o usad la opción aleatoria', 'Choose a roster or use the random option') : tr('Elige un equipo o usad la opción aleatoria', 'Choose a team or use the random option')); return; }
      const errs = validarEquipo({...eq, formato: draft ? 'draft' : formato});
      if (errs.length) { toast(tr('Tu equipo: ', 'Your team: ') + errs[0], 5000); return; }
      if (!rival.equipo) { toast(tr('Tu amigo no tiene equipo: elegid la opción aleatoria', 'Your friend has no team: choose the random option'), 5000); return; }
      const suyo = desempaquetar(rival.equipo);
      if (draft && suyo.length < 6) { toast(tr('La plantilla de tu amigo necesita al menos 6 Pokémon para el draft', "Your friend's roster needs at least 6 Pokémon for draft"), 5000); return; }
      if (!draft && suyo.length > 6) { toast(tr('Tu amigo ha elegido una plantilla de draft: que elija un equipo de 6 o jugad en modo draft', 'Your friend picked a draft roster: they should pick a team of 6, or play in draft mode'), 5000); return; }
      if (formato === 'doubles' && suyo.length < 2) { toast(tr('El equipo de tu rival necesita al menos 2 Pokémon para dobles', "Your opponent's team needs at least 2 Pokémon for doubles")); return; }
      rosters = [eq.sets, suyo];
    }
    const yo = nombreJugador() || tr('Anfitrión', 'Host');
    let nr = rival.nombre || tr('Invitado', 'Guest');
    if (nr === yo) nr += ' (2)';
    nombres = [yo, nr];
    serie = new Serie(tipoSerie);
    previaHost = undefined;
    siguienteJuego();
  }

  function siguienteJuego() {
    if (!activo || !serie || !rosters) return;
    selHost = null; selGuest = null;
    if (serie.tipo === 'draft') {
      fase = 'seleccion';
      msgSeleccion = {t: 'seleccion', juego: serie.juego, marcador: serie.texto(nombres),
        rosterTuyo: empaquetarSets(rosters[1]), rosterRival: rosters[0].map(s => ({species: s.species})), nombreRival: nombres[0]};
      enviar(msgSeleccion);
      pantalla?.destruir(); pantalla = null; motor?.destruir(); motor = null;
      app.innerHTML = '';
      const raiz = h('div', {});
      app.append(raiz);
      selUI = pantallaSeleccion(raiz, {
        titulo: tr(`Combate ${serie.juego} · Elige tus 6`, `Battle ${serie.juego} · Pick your 6`), marcador: serie.texto(nombres), roster: rosters[0], previa: previaHost,
        rosterRival: rosters[1].map(s => ({species: s.species})), nombreRival: nombres[1],
        onListo: indices => { selHost = indices; previaHost = indices; selUI?.esperando(tr(`Esperando a que ${nombres[1]} elija…`, `Waiting for ${nombres[1]} to choose…`)); quizaEmpezar(); },
      });
    } else {
      selHost = [...rosters[0].keys()].slice(0, 6);
      selGuest = [...rosters[1].keys()].slice(0, 6);
      quizaEmpezar();
    }
  }

  function quizaEmpezar() {
    if (!selHost || !selGuest || !rosters || !serie) return;
    iniciarJuego(selHost.map(i => rosters![0][i]), selGuest.map(i => rosters![1][i]));
  }

  function iniciarJuego(mio: SetPkm[], suyo: SetPkm[]) {
    if (!activo || !serie) return;
    fase = 'combate';
    motor?.destruir();
    const m = new Motor(formato, {nombre: nombres[0], equipo: empaquetarSets(mio)}, {nombre: nombres[1], equipo: empaquetarSets(suyo)}, sinPoderes);
    motor = m;
    historial = [];
    const titulo = `${nombres[0]} vs ${nombres[1]}` + (serie.alMejorDe3 ? tr(` · Combate ${serie.juego}`, ` · Battle ${serie.juego}`) : '');
    const avatares = {p1: avatarActual(), p2: avatarValido(rival?.avatar)};
    const niveles = {p1: ['online', nivelDe('online')], p2: ['online', rival?.nivel || 1]} as any;
    const titulos = {p1: tituloEquipado(), p2: tituloDe(rival?.titulo)?.id || ''};
    msgInicio = {t: 'inicio', formato, nombres, avatares, niveles, titulos, titulo, marcador: serie.alMejorDe3 ? serie.texto(nombres) : ''};
    enviar(msgInicio);
    m.escuchar('p2', c => { historial.push(c); enviar({t: 'p', d: c}); });
    app.innerHTML = '';
    const raiz = h('div', {});
    app.append(raiz);
    premioHost = null;
    const p = new PantallaCombate(raiz, {
      yo: 'p1', titulo, avatares, niveles, titulos,
      elegir: e => m.elegir('p1', e),
      rendirse: () => m.rendirse('p1'),
      enviarChat: t => enviar({t: 'chat', texto: t}),
      alTerminar: () => finJuego(p),
    });
    pantalla = p;
    m.escuchar('p1', c => p.recibir(c));
  }

  function finJuego(p: PantallaCombate): HTMLElement[] {
    if (!serie) return [];
    if (!p.estado.contado) {
      p.estado.contado = true;
      const g = p.estado.ganador;
      serie.registrar(g === nombres[0] ? 0 : g === nombres[1] ? 1 : -1);
      const serieMia = serie.terminada && serie.alMejorDe3 && serie.marcador[0] > serie.marcador[1];
      if (g) premioHost = recompensaCombate('online', p.estado.turno, g === nombres[0], serieMia, p.idPremio, p.estado);
      if (serieMia) titulosSerie(serie.tipo === 'draft', 'serie-' + p.idPremio);
      fase = 'fin';
      enviar({t: 'marcador', draft: serie.tipo === 'draft', texto: serie.alMejorDe3 ? serie.texto(nombres) : '', terminada: serie.terminada,
        ganadorSerie: serie.terminada && serie.alMejorDe3 ? (serie.marcador[0] > serie.marcador[1] ? nombres[0] : nombres[1]) : ''});
    }
    const botones: HTMLElement[] = [];
    if (premioHost) botones.push(premioHost);
    if (serie.alMejorDe3) botones.push(h('div', {class: 'marcador'}, serie.texto(nombres)));
    if (!serie.terminada) {
      botones.push(h('button', {class: 'btn', disabled: !rivalConectado, onclick: () => siguienteJuego()},
        serie.tipo === 'draft' ? tr('Siguiente combate (elegir equipo)', 'Next battle (pick team)') : tr('Siguiente combate', 'Next battle')));
    } else {
      if (serie.alMejorDe3) botones.push(h('div', {class: 'fin-serie'}, serie.marcador[0] > serie.marcador[1] ? tr('🏆 ¡Has ganado la serie!', '🏆 You won the series!') : tr(`${nombres[1]} gana la serie`, `${nombres[1]} wins the series`)));
      botones.push(h('button', {class: 'btn', onclick: () => { enviar({t: 'lobby'}); pintarLobby(); }}, tr('Volver a la sala (revancha)', 'Back to the room (rematch)')));
    }
    botones.push(h('button', {class: 'btn btn-sec', onclick: () => cambiarPantalla(nav.inicio)}, tr('Salir', 'Leave')));
    return botones;
  }

  function conectar(c: Canal) {
    if (!activo) { c.cerrar(); return; }
    // Hasta que no diga quién es, no sabemos si es el mismo rival que vuelve
    c.onMensaje(msg => {
      if (!activo) return;
      if (msg.t === 'hola') {
        const nombre = String(msg.nombre || tr('Invitado', 'Guest')).slice(0, 18);
        const esElMismo = rival && rival.nombre === nombre;
        if (canal && canal !== c && canal.abierto() && rivalConectado && !esElMismo) {
          c.enviar({t: 'llena'}); setTimeout(() => c.cerrar(), 400); return;
        }
        if (canal && canal !== c) { const viejo = canal; canal = null; viejo.cerrar(); }
        canal = c;
        rivalConectado = true;
        clearTimeout(temporizador);
        rival = {nombre, titulo: tituloDe(String(msg.titulo || ''))?.id, avatar: avatarValido(msg.avatar), nivel: nivelSeguro(msg.nivel), nivelIA: nivelSeguro(msg.nivelIA), equipo: msg.equipo ?? null, resumen: msg.resumen || [], version: msg.version, draft: !!msg.draft};
        if (msg.version !== VERSION_DATOS) toast(tr('⚠ Tu amigo tiene otra versión de los datos. Recargad los dos la página (Ctrl+F5).', '⚠ Your friend has a different version of the data. Both of you reload the page (Ctrl+F5).'), 7000);
        avisarModo();
        // ¿Vuelve a mitad de algo?
        if (esElMismo && fase === 'combate' && msgInicio) {
          c.enviar(msgInicio);
          c.enviar({t: 'reanudar', chunks: historial});
          pantalla?.log(tr(`${nombre} se ha reconectado.`, `${nombre} reconnected.`), 'sistema');
        } else if (esElMismo && fase === 'seleccion' && msgSeleccion) {
          selGuest = null;
          c.enviar(msgSeleccion);
        } else if (fase === 'lobby') pintarLobby();
        return;
      }
      if (c !== canal) return;
      switch (msg.t) {
      case 'equipo':
        if (rival) { rival.equipo = msg.equipo ?? null; rival.resumen = msg.resumen || []; rival.draft = !!msg.draft; }
        if (fase === 'lobby') pintarLobby();
        break;
      case 'elegir': if (fase === 'combate') motor?.elegir('p2', String(msg.d)); break;
      case 'rendirse': if (fase === 'combate') motor?.rendirse('p2'); break;
      case 'chat': pantalla?.chat(rival?.nombre || tr('Rival', 'Opponent'), String(msg.texto).slice(0, 200)); break;
      case 'seleccionado':
        if (fase === 'seleccion' && Array.isArray(msg.indices)) {
          selGuest = msg.indices.map((x: any) => +x).filter((x: number) => rosters && x >= 0 && x < rosters[1].length).slice(0, 6);
          if (!selHost) selUI?.esperando(tr(`${nombres[1]} ya ha elegido.`, `${nombres[1]} has already chosen.`));
          quizaEmpezar();
        }
        break;
      }
    });
    c.onCerrar(() => {
      if (!activo || c !== canal) return;
      rivalConectado = false;
      if (fase === 'combate' && pantalla && !pantalla.estado.terminado) {
        pantalla.log(tr(`Tu rival se ha desconectado. Esperando ${ESPERA_RECONEXION_S} s a que vuelva…`, `Your opponent disconnected. Waiting ${ESPERA_RECONEXION_S} s for them to come back…`), 'error');
        temporizador = setTimeout(() => {
          if (!rivalConectado && fase === 'combate') { pantalla?.log(tr('Tu rival no ha vuelto: ganas por abandono.', "Your opponent didn't come back: you win by forfeit."), 'error'); motor?.rendirse('p2'); }
        }, ESPERA_RECONEXION_S * 1000);
      } else if (fase === 'seleccion') {
        selUI?.esperando(tr('Tu rival se ha desconectado. Esperando a que vuelva…', 'Your opponent disconnected. Waiting for them to come back…'));
      } else if (fase === 'lobby') pintarLobby();
    });
  }

  pintarLobby();
  sala = crearSala(cod => { codigo = cod; avisoConexion = ''; if (fase === 'lobby') pintarLobby(); }, conectar,
    err => { if (fase === 'lobby') pintarLobby(err); else pantalla?.log(err, 'error'); },
    estado => { avisoConexion = estado; if (fase === 'lobby') pintarLobby(); });
}

/** Sala del invitado: dibuja, manda sus elecciones y se reconecta solo si se corta. */
function salaInvitado(codigo: string) {
  let activo = true;
  let canal: Canal | null = null;
  let sala: Sala | null = null;
  let pantalla: PantallaCombate | null = null;
  let modo = {formato: 'singles', aleatorio: false, reserva: '', serie: 'uno' as TipoSerie, sinPoderes: [] as Poder[]};
  let fase: Fase | 'conectando' = 'conectando';
  let estadoTexto = tr('Conectando…', 'Connecting…');
  let error = '';
  let reintentos = 0;
  let selUI: {esperando(t: string): void} | null = null;
  let sel = selectorEquipo(null);
  let marcadorFin = '';
  let miNombre = '';
  let premioInvitado: HTMLElement | null = null;

  // Al volver a la pestaña (en el móvil se suspende al salir), reconectar enseguida
  const alVolver = () => {
    if (document.visibilityState !== 'visible' || !activo || canal || fase === 'conectando') return;
    reintentos = 0;
    conectar();
  };
  document.addEventListener('visibilitychange', alVolver);
  setLimpiar(() => { activo = false; document.removeEventListener('visibilitychange', alVolver); pantalla?.destruir(); canal?.cerrar(); sala?.cancelar(); });

  const equipoActual = (): Equipo | undefined => sel.equipo();
  function datosEquipo() {
    const eq = equipoActual();
    return {equipo: eq ? empaquetar(eq) : null, resumen: eq ? eq.sets.map(s => s.species) : [], draft: eq?.formato === 'draft'};
  }

  function conectar() {
    if (!activo) return;
    sala?.cancelar();
    sala = unirseSala(codigo, c => {
      if (!activo) { c.cerrar(); return; }
      canal = c; reintentos = 0; error = '';
      configurar(c);
      c.enviar({t: 'hola', nombre: nombreJugador() || tr('Invitado', 'Guest'), avatar: avatarActual(), titulo: tituloEquipado(), nivel: nivelDe('online'), nivelIA: nivelDe('ia'), version: VERSION_DATOS, ...datosEquipo()});
      if (fase === 'conectando') { fase = 'lobby'; pintar(); }
      else pantalla?.log(tr('Reconectado.', 'Reconnected.'), 'sistema');
    }, err => {
      if (!activo) return;
      // Si ya estábamos jugando, seguimos intentando un rato
      if ((fase === 'combate' || fase === 'seleccion' || fase === 'lobby' || fase === 'fin') && reintentos < 15) { programarReconexion(); return; }
      error = err; fase = 'conectando'; pintar();
    }, est => { estadoTexto = est; if (fase === 'conectando') pintar(); });
  }

  function programarReconexion() {
    reintentos++;
    const msg = tr(`Conexión perdida. Reconectando… (intento ${reintentos}/15)`, `Connection lost. Reconnecting… (attempt ${reintentos}/15)`);
    if (pantalla) pantalla.log(msg, 'error'); else { estadoTexto = msg; error = ''; if (fase === 'lobby') pintar(msg); }
    setTimeout(() => { if (activo && !canal) conectar(); }, 3500);
  }

  function pintar(aviso = '') {
    if (!activo) return;
    pantalla?.destruir(); pantalla = null;
    selUI = null;
    app.innerHTML = '';
    const draft = modo.serie === 'draft';
    sel = selectorEquipo(draft ? 'draft' : 'normal', () => { canal?.enviar({t: 'equipo', ...datosEquipo()}); pintar(); });
    const eq = equipoActual();
    const errs = eq && !modo.aleatorio ? validarEquipo({...eq, formato: draft ? 'draft' : modo.formato as any}) : [];
    const cabecera = fase === 'conectando'
      ? (error ? h('div', {class: 'avisos'}, error) : h('span', {class: 'tenue pulso'}, estadoTexto))
      : canal ? h('b', {}, tr('✓ Conectado. Esperando a que el anfitrión empiece…', '✓ Connected. Waiting for the host to start…')) : h('span', {class: 'tenue pulso'}, aviso || tr('Reconectando…', 'Reconnecting…'));
    app.append(h('header', {class: 'barra'}, h('button', {class: 'btn btn-sec', onclick: () => cambiarPantalla(online)}, tr('← Salir', '← Leave')), h('h2', {}, tr(`Sala ${codigo}`, `Room ${codigo}`))),
      h('div', {class: 'lobby'},
        h('div', {class: 'tarjeta formulario'},
          h('div', {class: 'rival-info'}, cabecera),
          marcadorFin ? h('div', {class: 'marcador'}, marcadorFin) : null,
          h('div', {}, tr('Partida: ', 'Match: '), h('b', {}, SERIES[modo.serie] || tr('Un combate', 'Single battle')), tr(' · Formato: ', ' · Format: '), h('b', {}, modo.formato === 'doubles' ? tr('Dobles', 'Doubles') : tr('Individual', 'Singles'))),
          h('div', {}, tr('Poderes: ', 'Powers: '), h('b', {}, PODERES.filter(p => !modo.sinPoderes.includes(p)).map(nombrePoder).join(', ') || tr('ninguno', 'none'))),
          modo.aleatorio ? h('div', {}, draft ? tr('Plantillas: ', 'Rosters: ') : tr('Equipos: ', 'Teams: '), h('b', {}, tr('aleatorios parejos', 'balanced random')), modo.reserva ? ` (${RESERVAS[modo.reserva as Reserva] || ''})` : '')
            : sel.vacio ? h('div', {class: 'avisos'}, draft ? tr('No tienes plantillas de draft: crea una en "Mis equipos" o pide al anfitrión la opción aleatoria.', 'You have no draft rosters: create one in "My teams" or ask the host for the random option.')
              : tr('No tienes equipos: pide al anfitrión que elija la opción aleatoria.', 'You have no teams: ask the host to choose the random option.'))
            : campo(draft ? tr('Tu plantilla', 'Your roster') : tr('Tu equipo', 'Your team'), sel.el),
          errs.length ? h('div', {class: 'avisos'}, '⚠ ' + errs[0]) : null,
          error ? h('button', {class: 'btn', onclick: () => { error = ''; reintentos = 0; estadoTexto = tr('Conectando…', 'Connecting…'); pintar(); conectar(); }}, tr('Reintentar', 'Retry')) : null)));
  }

  function configurar(c: Canal) {
    c.onMensaje(msg => {
      if (!activo || c !== canal) return;
      switch (msg.t) {
      case 'modo':
        modo = {formato: msg.formato, aleatorio: !!msg.aleatorio, reserva: msg.reserva || '', serie: msg.serie || 'uno',
          sinPoderes: Array.isArray(msg.sinPoderes) ? msg.sinPoderes.filter((p: any) => PODERES.includes(p)) : []};
        if (fase === 'lobby' || fase === 'fin' && !pantalla) pintar();
        break;
      case 'cerrada':
        error = tr('El anfitrión ha cerrado la sala.', 'The host closed the room.');
        fase = 'conectando'; canal = null; c.cerrar(); pintar(); break;
      case 'llena': error = tr('Esa sala ya tiene dos jugadores.', 'That room already has two players.'); fase = 'conectando'; canal = null; c.cerrar(); pintar(); break;
      case 'seleccion': {
        fase = 'seleccion';
        pantalla?.destruir(); pantalla = null;
        app.innerHTML = '';
        const raiz = h('div', {});
        app.append(raiz);
        const roster = desempaquetar(msg.rosterTuyo);
        selUI = pantallaSeleccion(raiz, {
          titulo: tr(`Combate ${msg.juego} · Elige tus 6`, `Battle ${msg.juego} · Pick your 6`), marcador: msg.marcador, roster,
          rosterRival: msg.rosterRival || [], nombreRival: msg.nombreRival || tr('tu rival', 'your opponent'),
          previa: storage.get('cnx.previaDraft', undefined),
          onListo: indices => {
            storage.set('cnx.previaDraft', indices);
            canal?.enviar({t: 'seleccionado', indices});
            selUI?.esperando(tr('Esperando a que el anfitrión elija…', 'Waiting for the host to choose…'));
          },
        });
        break;
      }
      case 'inicio': {
        fase = 'combate';
        pantalla?.destruir();
        app.innerHTML = '';
        const raiz = h('div', {});
        app.append(raiz);
        miNombre = String(msg.nombres?.[1] || '');
        premioInvitado = null;
        const pInv: PantallaCombate = pantalla = new PantallaCombate(raiz, {
          yo: 'p2', titulo: msg.titulo || `${msg.nombres?.[0]} vs ${msg.nombres?.[1]}`,
          avatares: msg.avatares ? {p1: avatarValido(msg.avatares.p1), p2: avatarValido(msg.avatares.p2)} : undefined,
          niveles: msg.niveles ? {p1: ['online', nivelSeguro(msg.niveles.p1?.[1])], p2: ['online', nivelDe('online')]} : undefined,
          titulos: {p1: tituloDe(String(msg.titulos?.p1 || ''))?.id, p2: tituloEquipado()},
          elegir: e => canal?.enviar({t: 'elegir', d: e}),
          rendirse: () => canal?.enviar({t: 'rendirse'}),
          enviarChat: t => canal?.enviar({t: 'chat', texto: t}),
          alTerminar: () => {
            if (!pInv.estado.contado) {
              pInv.estado.contado = true;
              if (miNombre && pInv.estado.ganador && !pInv.instantaneo) premioInvitado = recompensaCombate('online', pInv.estado.turno, pInv.estado.ganador === miNombre, false, pInv.idPremio, pInv.estado);
            }
            return [
            premioInvitado,
            marcadorFin ? h('div', {class: 'marcador'}, marcadorFin) : null,
            h('span', {class: 'tenue'}, tr('Esperando al anfitrión…', 'Waiting for the host…')),
            h('button', {class: 'btn btn-sec', onclick: () => cambiarPantalla(nav.inicio)}, tr('Salir', 'Leave')),
          ].filter(Boolean) as HTMLElement[];
          },
        });
        break;
      }
      case 'reanudar': {
        // Reconexión: repetir todo el combate al instante
        if (!pantalla) break;
        pantalla.instantaneo = true;
        for (const ch of msg.chunks || []) pantalla.recibir(String(ch));
        setTimeout(() => { if (pantalla) pantalla.instantaneo = false; }, 1500);
        break;
      }
      case 'p': pantalla?.recibir(String(msg.d)); break;
      case 'chat': pantalla?.chat(tr('Rival', 'Opponent'), String(msg.texto).slice(0, 200)); break;
      case 'marcador':
        marcadorFin = msg.texto || '';
        if (msg.terminada && msg.ganadorSerie) marcadorFin += tr(` · 🏆 ${msg.ganadorSerie} gana la serie`, ` · 🏆 ${msg.ganadorSerie} wins the series`);
        if (msg.terminada && msg.ganadorSerie && msg.ganadorSerie === miNombre && premioInvitado) {
          if (darPV(ECO.pv.serieGanada, 'serie-' + (pantalla?.idPremio || Date.now()))) {
            bonusSerie('online');
            experienciaPase('online', true, false, 'serie-' + (pantalla?.idPremio || Date.now()), EXP.serieGanada);
            titulosSerie(!!msg.draft, 'serie-' + (pantalla?.idPremio || Date.now()));
            toast(tr(`🏆 +${ECO.pv.serieGanada} PV y XP extra por ganar la serie`, `🏆 +${ECO.pv.serieGanada} PV and bonus XP for winning the series`), 3500);
          }
        }
        fase = 'fin';
        if (pantalla?.estado.terminado) pantalla.mostrarControles();
        break;
      case 'lobby': marcadorFin = ''; fase = 'lobby'; pintar(); break;
      }
    });
    c.onCerrar(() => {
      if (!activo || c !== canal) return;
      canal = null;
      if (fase === 'conectando') return;
      programarReconexion();
    });
  }

  pintar();
  conectar();
}
