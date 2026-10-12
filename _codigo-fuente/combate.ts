// Pantalla de combate: dibuja el campo, anima el protocolo y recoge las elecciones.
import {tr} from './idioma';
import {toID} from 'pkmn-sim';
import {Estado, LadoId, Pkm} from './estado';
import {cambiarPantalla, nav} from './nucleo';
import {avatarImg, datosAvatar} from './avatares';
import {insignia, TipoNivel} from './nivel';
import {adjuntarInfo, fichaPokemon, fichaMovimiento, tiposEfectivos, ocultarInfo, esTactil, setModoInfo, getModoInfo} from './ficha';
import {
  dex, h, toast, tipoBadge, spriteImg, iconImg, itemIcon, nombreVisible, sleep, storage,
  TIPOS_ES, TIPO_COLOR, CATEGORIA_ES, ESTADOS_ES, ESTADO_COLOR, STATS_CORTO,
  nomMov, descMov, nomHab, nomObj,
} from './util';

export interface OpcionesCombate {
  yo: LadoId;
  elegir: (eleccion: string) => void;
  rendirse: () => void;
  /** Salir a la pantalla principal (por defecto, ir al inicio) */
  salir?: () => void;
  enviarChat?: (texto: string) => void;
  alTerminar?: () => HTMLElement[];   // botones a mostrar al terminar
  titulo?: string;
  /** Avatar de cada jugador (id de datos/avatares.js) */
  avatares?: {p1?: string, p2?: string};
  /** Nivel de cada jugador: ['ia' | 'online', nivel] */
  niveles?: {p1?: [TipoNivel, number], p2?: [TipoNivel, number]};
}

const BOOST_CORTO: {[k: string]: string} = {...STATS_CORTO, accuracy: tr('Pre', 'Acc'), evasion: tr('Eva', 'Eva')};
const VOLATILES_ES: {[k: string]: string} = {
  dynamax: tr('Dinamax', 'Dynamax'),
  substitute: tr('Sustituto', 'Substitute'), confusion: tr('Confuso', 'Confused'), leechseed: tr('Drenadoras', 'Leech Seed'), taunt: tr('Mofa', 'Taunt'), encore: tr('Otra vez', 'Encore'),
  attract: tr('Enamorado', 'Attracted'), yawn: tr('Somnoliento', 'Drowsy'), curse: tr('Maldición', 'Curse'), nightmare: tr('Pesadilla', 'Nightmare'), focusenergy: tr('Foco energía', 'Focus Energy'),
  perish3: tr('Canto mortal 3', 'Perish 3'), perish2: tr('Canto mortal 2', 'Perish 2'), perish1: tr('Canto mortal 1', 'Perish 1'), disable: tr('Anulación', 'Disable'),
  protosynthesis: tr('Paleosíntesis', 'Protosynthesis'), quarkdrive: tr('Carga Cuark', 'Quark Drive'), slowstart: tr('Inicio lento', 'Slow Start'), typechange: tr('Cambio de tipo', 'Type change'),
  aquaring: tr('Acua aro', 'Aqua Ring'), ingrain: tr('Arraigo', 'Ingrain'), magnetrise: tr('Levitón', 'Magnet Rise'), smackdown: tr('Derribado', 'Smacked Down'), saltcure: tr('Sal curativa', 'Salt Cure'),
};
const CLIMA_ES: {[k: string]: string} = {
  RainDance: tr('🌧 Lluvia', '🌧 Rain'), SunnyDay: tr('☀ Sol intenso', '☀ Harsh sunlight'), Sandstorm: tr('🌪 Tormenta de arena', '🌪 Sandstorm'), Hail: tr('🧊 Granizo', '🧊 Hail'),
  Snowscape: tr('❄ Nieve', '❄ Snow'), Snow: tr('❄ Nieve', '❄ Snow'), DesolateLand: tr('🔥 Sol abrasador', '🔥 Extremely harsh sunlight'), PrimordialSea: tr('🌊 Diluvio', '🌊 Heavy rain'), DeltaStream: tr('🌀 Turbulencias', '🌀 Strong winds'),
};
const CAMPO_ES: {[k: string]: string} = {
  electricterrain: tr('⚡ Campo eléctrico', '⚡ Electric Terrain'), grassyterrain: tr('🌿 Campo de hierba', '🌿 Grassy Terrain'), mistyterrain: tr('🌫 Campo de niebla', '🌫 Misty Terrain'),
  psychicterrain: tr('🔮 Campo psíquico', '🔮 Psychic Terrain'), trickroom: tr('🔄 Espacio raro', '🔄 Trick Room'), gravity: tr('⬇ Gravedad', '⬇ Gravity'), magicroom: tr('Zona mágica', 'Magic Room'), wonderroom: tr('Zona extraña', 'Wonder Room'), mudsport: tr('Chapoteo lodo', 'Mud Sport'), watersport: tr('Hidrochorro', 'Water Sport'), fairylock: tr('Cerrojo feérico', 'Fairy Lock'), iondeluge: tr('Electrificación', 'Ion Deluge'),
};
const LADO_ES: {[k: string]: string} = {
  spikes: tr('📌 Púas', '📌 Spikes'), stealthrock: tr('🪨 Trampa rocas', '🪨 Stealth Rock'), toxicspikes: tr('☠ Púas tóxicas', '☠ Toxic Spikes'), stickyweb: tr('🕸 Red viscosa', '🕸 Sticky Web'), trampamental: tr('🌀 Trampa mental', '🌀 Mind Snare'), cenizasofocante: tr('🌫 Ceniza', '🌫 Choking Ash'), reflect: tr('🛡 Reflejo', '🛡 Reflect'),
  lightscreen: tr('🛡 Pantalla de luz', '🛡 Light Screen'), auroraveil: tr('🛡 Velo aurora', '🛡 Aurora Veil'), tailwind: tr('💨 Viento afín', '💨 Tailwind'), safeguard: tr('Velo sagrado', 'Safeguard'), mist: tr('Neblina', 'Mist'),
  gmaxsteelsurge: tr('⚙ Acero afilado', '⚙ Steelsurge'), firepledge: tr('🔥 Mar de llamas', '🔥 Sea of Fire'), grasspledge: tr('🌾 Ciénaga', '🌾 Swamp'),
  waterpledge: tr('🌈 Arcoíris', '🌈 Rainbow'), luckychant: tr('Conjuro', 'Lucky Chant'), gmaxvinelash: tr('Azote de lianas', 'Vine Lash'),
  gmaxwildfire: tr('Fuego infernal', 'Wildfire'), gmaxcannonade: tr('Cañonazo', 'Cannonade'), gmaxvolcalith: tr('Pedrusco', 'Volcalith'),
};

export class PantallaCombate {
  estado: Estado;
  raiz: HTMLElement;
  campoEl!: HTMLElement;
  registroEl!: HTMLElement;
  controlesEl!: HTMLElement;
  infoCampoEl!: HTMLElement;
  cola: string[] = [];
  procesando = false;
  req: any = null;
  reqMostrada: any = null;
  ultimaPeticion: any = null;
  rapido = storage.get('arena.rapido', false);
  elecciones: string[] = [];
  spriteEls = new Map<string, HTMLElement>();
  destruido = false;

  constructor(raiz: HTMLElement, public op: OpcionesCombate) {
    this.raiz = raiz;
    this.estado = new Estado(op.yo);
    this.montar();
  }

  montar() {
    this.raiz.innerHTML = '';
    this.campoEl = h('div', {class: 'campo-batalla'});
    this.infoCampoEl = h('div', {class: 'info-campo'});
    this.registroEl = h('div', {class: 'registro-lineas', 'aria-live': 'polite'});
    this.controlesEl = h('div', {class: 'controles'}, h('div', {class: 'esperando'}, tr('Preparando el combate…', 'Preparing the battle…')));
    const chatIn = h('input', {class: 'input chat-input', placeholder: tr('Escribe un mensaje…', 'Type a message…'), maxlength: '200'});
    chatIn.addEventListener('keydown', e => {
      if (e.key === 'Enter' && chatIn.value.trim()) { this.op.enviarChat?.(chatIn.value.trim()); this.chat(tr('Tú', 'You'), chatIn.value.trim()); chatIn.value = ''; }
    });
    const rapidoBtn = h('label', {class: 'toggle'}, (() => {
      const c = h('input', {type: 'checkbox', checked: this.rapido});
      c.addEventListener('change', () => { this.rapido = c.checked; storage.set('arena.rapido', this.rapido); });
      return c;
    })(), tr(' Animaciones rápidas', ' Fast animations'));
    // Móvil: botón para activar el "modo info" (tocar = ver datos en vez de elegir)
    let botonInfo: HTMLElement | null = null;
    if (esTactil()) {
      botonInfo = h('button', {class: 'btn-info-movil', 'aria-pressed': 'false'}, 'ℹ');
      const pintarInfo = () => {
        const on = getModoInfo();
        botonInfo!.classList.toggle('activo', on);
        botonInfo!.setAttribute('aria-pressed', String(on));
        botonInfo!.textContent = on ? tr('ℹ Info activada', 'ℹ Info on') : 'ℹ';
        this.raiz.querySelector('.combate')?.classList.toggle('modo-info', on);
      };
      botonInfo.addEventListener('click', () => {
        setModoInfo(!getModoInfo());
        pintarInfo();
        if (getModoInfo()) toast(tr('Toca un ataque o un Pokémon para ver sus datos. Vuelve a pulsar ℹ para combatir.', 'Tap a move or a Pokémon to see its info. Tap ℹ again to battle.'), 3500);
        else ocultarInfo();
      });
      setTimeout(pintarInfo);
    }
    this.raiz.append(h('div', {class: 'combate'},
      h('div', {class: 'columna-campo'},
        h('div', {class: 'escenario'}, this.campoEl, this.infoCampoEl, botonInfo),
        this.controlesEl),
      h('aside', {class: 'registro'},
        h('div', {class: 'registro-cab'}, h('b', {}, this.op.titulo || tr('Combate', 'Battle')), rapidoBtn,
          h('button', {class: 'btn btn-peligro btn-sm', onclick: () => {
            if (this.estado.terminado) return;
            if (confirm(tr('¿Seguro que quieres rendirte?', 'Are you sure you want to forfeit?'))) this.op.rendirse();
          }}, tr('Rendirse', 'Forfeit')),
          h('button', {class: 'btn btn-sec btn-sm', title: tr('Volver a la pantalla principal', 'Back to the main screen'), onclick: () => this.salirAlInicio()}, tr('⌂ Salir', '⌂ Leave'))),
        this.registroEl,
        this.op.enviarChat ? chatIn : null)));
    this.dibujarCampo();
    this.presentacion();
  }

  insigniaDe(l: 'p1' | 'p2', conRango = false) {
    const n = this.op.niveles?.[l];
    return n ? insignia(n[0], n[1], conRango) : null;
  }

  /** Presentación de los entrenadores al empezar (como en Showdown) */
  presentacion() {
    const av = this.op.avatares;
    if (!av) return;
    const esc = this.raiz.querySelector('.escenario');
    if (!esc) return;
    const yo = this.op.yo, rival = yo === 'p1' ? 'p2' : 'p1';
    const nombre = (l: 'p1' | 'p2') => this.estado.lados[l].nombre || (l === yo ? tr('Tú', 'You') : tr('Rival', 'Opponent'));
    const tarjeta = (l: 'p1' | 'p2', cls: string) => h('div', {class: 'vs-entrenador ' + cls}, avatarImg(av[l] || ''), h('b', {class: 'vs-nombre'}, nombre(l)), this.insigniaDe(l, true));
    const capa = h('div', {class: 'vs-capa'}, tarjeta(yo, 'vs-yo'), h('div', {class: 'vs-texto'}, 'VS'), tarjeta(rival, 'vs-rival'));
    esc.append(capa);
    // los nombres llegan con el primer mensaje del combate
    setTimeout(() => capa.querySelectorAll<HTMLElement>('.vs-nombre').forEach((b, i) => { b.textContent = nombre(i === 0 ? yo : rival); }), 120);
    setTimeout(() => capa.classList.add('fuera'), this.rapido ? 1300 : 2100);
    setTimeout(() => capa.remove(), this.rapido ? 1800 : 2700);
  }

  // --------------------------------------------------------------- entrada --
  recibir(chunk: string) {
    if (this.destruido) return;
    let soloPeticion = true;
    for (const line of chunk.split('\n')) {
      if (line && !line.startsWith('|request|')) soloPeticion = false;
      if (!line) continue;
      if (line.startsWith('|request|')) {
        const json = line.slice(9);
        if (json) { this.req = JSON.parse(json); }
        continue;
      }
      if (line.startsWith('|error|')) {
        this.log(line.slice(7).replace('[Invalid choice]', tr('Elección no válida:', 'Invalid choice:')).replace('[Unavailable choice]', tr('No disponible:', 'Unavailable:')), 'error');
        if (!this.req && this.ultimaPeticion) { this.req = this.ultimaPeticion; }
        this.cola.push('|__mostrar__');
        continue;
      }
      this.cola.push(line);
    }
    if (soloPeticion) {
      // La petición llega antes que el registro del turno: espera un poco a que llegue
      setTimeout(() => { this.cola.push('|__mostrar__'); void this.procesar(); }, 250);
      return;
    }
    this.cola.push('|__mostrar__');
    void this.procesar();
  }

  chat(quien: string, texto: string) {
    this.registroEl.append(h('div', {class: 'linea chat'}, h('b', {}, quien + ': '), texto));
    this.registroEl.scrollTop = this.registroEl.scrollHeight;
  }

  log(texto: string, clase = '') {
    if (!texto) return;
    texto = texto.replace(/\b([Dd])e el /g, '$1el ').replace(/\b([Aa]) el /g, '$1l ');
    const el = h('div', {class: 'linea ' + clase}, texto);
    this.registroEl.append(el);
    this.registroEl.scrollTop = this.registroEl.scrollHeight;
  }

  async procesar() {
    if (this.procesando) return;
    this.procesando = true;
    try {
      while (this.cola.length && !this.destruido) {
        const line = this.cola.shift()!;
        if (line === '|__mostrar__') {
          if (!this.cola.some(l => l !== '|__mostrar__')) this.mostrarControles();
          continue;
        }
        let res: any = {};
        try { res = this.estado.aplicar(line); } catch (e) { console.error('Error en línea', line, e); }
        if (res.texto) this.log(res.texto, res.clase || '');
        if (res.anim) await this.animar(res.anim);
        else if (res.texto && res.clase !== 'turno' && res.clase !== 'dano-num') await sleep(this.ms(220));
      }
    } finally {
      this.procesando = false;
    }
  }

  /** Repetición instantánea (al reconectarse) */
  instantaneo = false;
  ms(n: number) { return this.instantaneo ? 0 : this.rapido ? n / 3 : n; }

  async animar(a: any) {
    switch (a.tipo) {
    case 'switch': case 'forma': {
      this.dibujarCampo();
      const el = this.spriteEls.get(this.clave(a.ident));
      if (el) { el.classList.add(a.tipo === 'forma' ? 'anim-forma' : 'anim-entra'); }
      await sleep(this.ms(a.tipo === 'forma' ? 700 : 550));
      el?.classList.remove('anim-entra', 'anim-forma');
      break;
    }
    case 'move': {
      const el = this.spriteEls.get(this.clave(a.ident));
      if (el && !a.still) {
        const mv = dex().moves.get(a.move);
        el.classList.add(mv.category === 'Status' ? 'anim-estado' : 'anim-ataque');
        el.style.setProperty('--color-mov', TIPO_COLOR[mv.type] || '#fff');
        await sleep(this.ms(420));
        el.classList.remove('anim-ataque', 'anim-estado');
      } else await sleep(this.ms(200));
      break;
    }
    case 'damage': case 'heal': {
      this.actualizarHud(a.ident);
      const el = this.spriteEls.get(this.clave(a.ident));
      if (el && a.tipo === 'damage') { el.classList.add('anim-golpe'); await sleep(this.ms(420)); el.classList.remove('anim-golpe'); }
      else await sleep(this.ms(380));
      break;
    }
    case 'faint': {
      const el = this.spriteEls.get(this.clave(a.ident));
      if (el) el.classList.add('anim-debilitado');
      this.actualizarHud(a.ident);
      await sleep(this.ms(700));
      break;
    }
    case 'mega': {
      const el = this.spriteEls.get(this.clave(a.ident));
      el?.classList.add('anim-mega');
      await sleep(this.ms(900));
      el?.classList.remove('anim-mega');
      this.dibujarCampo();
      break;
    }
    case 'habilidad': case 'objeto': {
      this.mostrarBocadillo(a.ident, a.texto, a.tipo);
      await sleep(this.ms(500));
      break;
    }
    default:
      if (a.ident) this.actualizarHud(a.ident); else this.dibujarInfoCampo();
      await sleep(this.ms(250));
    }
    this.dibujarInfoCampo();
  }

  clave(ident: string) {
    const p = this.estado.parseIdent(ident);
    return p ? `${p.lado.id}-${p.pos}` : ident;
  }

  mostrarBocadillo(ident: string, texto: string, tipo: string) {
    const el = this.spriteEls.get(this.clave(ident));
    if (!el) return;
    const b = h('div', {class: 'bocadillo ' + tipo}, texto);
    el.parentElement?.append(b);
    setTimeout(() => b.remove(), this.ms(1400));
  }

  // ------------------------------------------------------------- dibujado --
  dibujarCampo() {
    this.campoEl.innerHTML = '';
    this.spriteEls.clear();
    const e = this.estado;
    const nPos = e.gametype === 'doubles' ? 2 : 1;
    for (const ladoId of [e.rival, e.yo] as LadoId[]) {
      const lado = e.lados[ladoId];
      const esYo = ladoId === e.yo;
      const ladoEl = h('div', {class: 'lado ' + (esYo ? 'lado-yo' : 'lado-rival') + (nPos > 1 ? ' dobles' : '')});
      for (let i = 0; i < nPos; i++) {
        const mon = lado.activos[i];
        const pos = h('div', {class: `posicion pos-${i}`});
        if (mon) {
          const spr = spriteImg(mon.species, esYo ? 'back' : 'front', mon.shiny, mon.fainted ? 'debilitado' : '');
          const wrap = h('div', {class: 'sprite-wrap' + (mon.fainted ? ' anim-debilitado' : '') + (mon.volatiles.has('dynamax') ? ' dinamax' : '')}, h('div', {class: 'sombra'}), spr);
          this.spriteEls.set(`${ladoId}-${i}`, wrap);
          adjuntarInfo(wrap, () => fichaPokemon(mon, esYo));
          pos.append(this.hud(mon, esYo, `${ladoId}-${i}`), wrap);
        }
        ladoEl.append(pos);
      }
      ladoEl.append(h('div', {class: 'plataforma'}));
      this.campoEl.append(ladoEl);
    }
    this.dibujarInfoCampo();
  }

  hud(mon: Pkm, esYo: boolean, clave: string) {
    const pct = mon.maxhp ? Math.max(0, mon.hp / mon.maxhp) : 0;
    const color = pct > 0.5 ? 'verde' : pct > 0.2 ? 'amarillo' : 'rojo';
    const boosts = Object.entries(mon.boosts).filter(([, v]) => v);
    const vols = [...mon.volatiles].map(v => VOLATILES_ES[v]).filter(Boolean);
    const hud = h('div', {class: 'hud' + (mon.fainted ? ' hud-fnt' : ''), 'data-clave': clave},
      h('div', {class: 'hud-fila'},
        h('span', {class: 'hud-nombre'}, mon.name),
        mon.tera ? h('span', {class: 'tera-tag', style: {background: TIPO_COLOR[mon.tera]}, title: tr('Teracristalizado', 'Terastallized')}, '◆ ' + (TIPOS_ES[mon.tera] || mon.tera)) : null,
        h('span', {class: 'hud-nivel'}, tr('Nv. ', 'Lv. ') + mon.level)),
      h('div', {class: 'hud-tipos'}, ...tiposEfectivos(mon).map(t => tipoBadge(t, true))),
      h('div', {class: 'barra-ps'}, h('div', {class: 'relleno ' + color, style: {width: (pct * 100).toFixed(1) + '%'}})),
      h('div', {class: 'hud-fila hud-sub'},
        mon.status ? h('span', {class: 'estado-tag', style: {background: ESTADO_COLOR[mon.status]}}, ESTADOS_ES[mon.status] || mon.status) : null,
        h('span', {class: 'hud-ps'}, esYo && mon.maxhp !== 100 ? `${mon.hp}/${mon.maxhp}` : `${Math.round(pct * 100)}%`)),
      boosts.length || vols.length ? h('div', {class: 'hud-extras'},
        ...boosts.map(([k, v]) => h('span', {class: 'boost ' + (v > 0 ? 'pos' : 'neg')}, `${BOOST_CORTO[k] || k} ${v > 0 ? '+' : ''}${v}`)),
        ...vols.map(v => h('span', {class: 'vol'}, v))) : null);
    adjuntarInfo(hud, () => fichaPokemon(mon, esYo));
    return hud;
  }

  tooltip(mon: Pkm, esYo: boolean) {
    const sp = dex().species.get(mon.species);
    const lines = [`${nombreVisible(mon.species)} — ${(mon.types || sp.types).map(t => TIPOS_ES[t]).join('/')}`];
    if (mon.ability) lines.push(tr('Habilidad: ', 'Ability: ') + nomHab(mon.ability));
    else if (!esYo) lines.push(tr('Habilidades posibles: ', 'Possible abilities: ') + [...new Set(Object.values(sp.abilities) as string[])].map(nomHab).join(', '));
    if (mon.item) lines.push(tr('Objeto: ', 'Item: ') + nomObj(mon.item));
    const st = (mon as any).stats;
    if (esYo && st) lines.push(tr(`Atq ${st.atk} · Def ${st.def} · AtE ${st.spa} · DfE ${st.spd} · Vel ${st.spe}`, `Atk ${st.atk} · Def ${st.def} · SpA ${st.spa} · SpD ${st.spd} · Spe ${st.spe}`));
    else lines.push(tr('Stats base: ', 'Base stats: ') + Object.entries(sp.baseStats).map(([k, v]) => `${STATS_CORTO[k]} ${v}`).join(' · '));
    return lines.join('\n');
  }

  actualizarHud(ident: string) {
    const p = this.estado.parseIdent(ident);
    if (!p) return;
    const clave = `${p.lado.id}-${p.pos}`;
    const viejo = this.campoEl.querySelector(`.hud[data-clave="${clave}"]`);
    const mon = p.lado.activos[p.pos];
    if (viejo && mon) viejo.replaceWith(this.hud(mon, p.lado.id === this.estado.yo, clave));
    const spr = this.spriteEls.get(clave);
    if (spr && mon) spr.classList.toggle('dinamax', mon.volatiles.has('dynamax'));
  }

  dibujarInfoCampo() {
    const e = this.estado;
    this.infoCampoEl.innerHTML = '';
    const chips: HTMLElement[] = [];
    if (e.turno) chips.push(h('span', {class: 'chip-campo chip-turno'}, tr(`Turno ${e.turno}`, `Turn ${e.turno}`)));
    if (e.clima) chips.push(h('span', {class: 'chip-campo'}, CLIMA_ES[e.clima] || e.clima));
    for (const k of e.campo.keys()) chips.push(h('span', {class: 'chip-campo'}, CAMPO_ES[k] || k));
    this.infoCampoEl.append(h('div', {class: 'campo-chips'}, ...chips));
    const filasLado: HTMLElement[] = [];
    for (const ladoId of [e.rival, e.yo] as LadoId[]) {
      const lado = e.lados[ladoId];
      const conds = [...lado.condiciones.entries()].map(([k, v]) => h('span', {class: 'chip-lado'}, (LADO_ES[k] || k) + (v > 1 ? ` ×${v}` : '')));
      const iconos = [];
      for (let i = 0; i < Math.max(lado.tamano, lado.equipo.length); i++) {
        const m = lado.equipo[i];
        if (!m) { iconos.push(h('span', {class: 'pokeball'})); continue; }
        const ic = iconImg(m.species, m.fainted ? 'gris' : '');
        if (m.status && !m.fainted) ic.classList.add('con-estado');
        iconos.push(ic);
      }
      const av = this.op.avatares?.[ladoId as 'p1' | 'p2'];
      const busto = av ? avatarImg(av, 'en-combate', 'busto') : null;
      if (busto) busto.title = `${lado.nombre} · ${datosAvatar(av!).nombre}`;
      this.infoCampoEl.append(h('div', {class: 'equipo-iconos ' + (ladoId === e.yo ? 'mio' : 'rival') + (busto ? ' con-avatar' : '')},
        busto, h('div', {class: 'eq-cuerpo'}, h('span', {class: 'jugador'}, lado.nombre, this.insigniaDe(ladoId as 'p1' | 'p2')), h('div', {class: 'eq-iconos-fila'}, ...iconos))));
      if (conds.length) filasLado.push(h('div', {class: 'fila-lado ' + (ladoId === e.yo ? 'mio' : 'rival')},
        h('span', {class: 'quien'}, ladoId === e.yo ? tr('Tu lado', 'Your side') : tr('Rival', 'Foe')), ...conds));
    }
    // Trampas y protecciones de cada lado (Púas, Púas tóxicas, Trampa Rocas, Reflejo...): todas a la vez
    if (filasLado.length) this.infoCampoEl.append(h('div', {class: 'condiciones-lados'}, ...filasLado));
  }

  // ------------------------------------------------------------ controles --
  mostrarControles() {
    const c = this.controlesEl;
    if (this.estado.terminado) {
      c.innerHTML = '';
      const yoGano = this.estado.ganador === this.estado.lados[this.estado.yo].nombre;
      c.append(h('div', {class: 'fin-combate ' + (yoGano ? 'victoria' : 'derrota')},
        h('div', {class: 'fin-titulo'}, this.estado.ganador ? (yoGano ? tr('¡Has ganado!', 'You won!') : tr('Has perdido…', 'You lost…')) : tr('Empate', 'Tie')),
        h('div', {class: 'fin-botones'}, ...(this.op.alTerminar?.() || []))));
      return;
    }
    const req = this.req;
    if (!req) {
      if (this.reqMostrada) return; // ya se están mostrando los controles
      c.innerHTML = '';
      c.append(h('div', {class: 'esperando'}, tr('Esperando…', 'Waiting…')));
      return;
    }
    c.innerHTML = '';
    this.estado.sincronizar(req);
    this.dibujarInfoCampo();
    if (req.wait) { this.reqMostrada = null; this.req = null; c.append(h('div', {class: 'esperando'}, tr('Esperando al rival…', 'Waiting for the opponent…'))); return; }
    this.reqMostrada = req;
    this.req = null;
    this.elecciones = [];
    if (req.teamPreview) return this.controlesPreview(req);
    this.siguienteSlot(req);
  }

  enviar(eleccion: string) {
    this.ultimaPeticion = this.reqMostrada;
    this.reqMostrada = null;
    this.controlesEl.innerHTML = '';
    const peticion = this.ultimaPeticion;
    this.controlesEl.append(h('div', {class: 'esperando-caja'},
      h('div', {class: 'esperando'}, tr('Esperando al rival…', 'Waiting for the opponent…')),
      peticion && !peticion.teamPreview ? h('button', {class: 'btn btn-sec btn-sm', onclick: () => {
        // Deshacer la elección mientras el rival no haya elegido
        this.op.elegir('undo');
        this.req = peticion;
        this.ultimaPeticion = null;
        this.mostrarControles();
      }}, tr('↩ Cambiar mi elección', '↩ Change my choice')) : null));
    this.op.elegir(eleccion);
  }

  controlesPreview(req: any) {
    const c = this.controlesEl;
    const pokes = req.side.pokemon;
    const nLideres = this.estado.gametype === 'doubles' ? 2 : 1;
    const orden: number[] = [];
    const rival = this.estado.lados[this.estado.rival].equipo;
    const pintar = () => {
      c.innerHTML = '';
      c.append(
        h('div', {class: 'preview'},
          h('div', {class: 'preview-titulo'}, tr(`Equipo rival`, `Opposing team`)),
          h('div', {class: 'preview-rival'}, ...rival.map(m => {
            const el = h('div', {class: 'preview-poke'}, spriteImg(m.species, 'front', m.shiny, 'mini'),
              h('span', {}, nombreVisible(m.species)), h('span', {class: 'tipos'}, ...dex().species.get(m.species).types.map(t => tipoBadge(t, true))));
            adjuntarInfo(el, () => fichaPokemon(m, false));
            return el;
          })),
          h('div', {class: 'preview-titulo'}, nLideres > 1 ? tr(`Elige tus 2 Pokémon iniciales (${orden.length}/2)`, `Choose your 2 leads (${orden.length}/2)`) : tr('Elige tu Pokémon inicial', 'Choose your lead Pokémon')),
          h('div', {class: 'botones-cambio'}, ...pokes.map((p: any, i: number) => {
            const sp = p.details.split(',')[0];
            const idx = orden.indexOf(i);
            const nombreP = p.ident.replace(/^p[12]: /, '');
            const btn = h('button', {class: 'btn-cambio' + (idx >= 0 ? ' elegido' : ''), onclick: () => {
              ocultarInfo();
              if (idx >= 0) orden.splice(idx, 1); else orden.push(i);
              if (orden.length >= nLideres) {
                const resto = pokes.map((_: any, j: number) => j).filter((j: number) => !orden.includes(j));
                this.enviar('team ' + [...orden, ...resto].map(j => j + 1).join(''));
                return;
              }
              pintar();
            }}, iconImg(sp), h('span', {}, p.ident.replace(/^p[12]: /, '')), idx >= 0 ? h('b', {class: 'orden'}, String(idx + 1)) : null,
            p.item ? h('small', {class: 'tenue'}, nomObj(p.item)) : null);
            adjuntarInfo(btn, () => {
              const mon = this.estado.lados[this.estado.yo].equipo.find(x => x.name === nombreP);
              return mon ? fichaPokemon(mon, true) : null;
            });
            return btn;
          }))));
    };
    pintar();
  }

  /** Recorre los huecos activos que necesitan elección (en dobles hay 2) */
  siguienteSlot(req: any) {
    const slot = this.elecciones.length;
    const total = req.forceSwitch ? req.forceSwitch.length : req.active.length;
    if (slot >= total) { this.enviar(this.elecciones.join(', ')); return; }
    const mon = req.side.pokemon[slot];
    if (req.forceSwitch) {
      if (!req.forceSwitch[slot]) { this.elecciones.push('pass'); return this.siguienteSlot(req); }
      // ¿quedan Pokémon para cambiar que no hayan sido elegidos?
      const disponibles = this.cambiosDisponibles(req);
      if (!disponibles.length) { this.elecciones.push('pass'); return this.siguienteSlot(req); }
      return this.pintarCambio(req, slot, true);
    }
    if (!req.active[slot] || !mon || mon.condition.endsWith(' fnt') || mon.commanding) {
      this.elecciones.push('pass'); return this.siguienteSlot(req);
    }
    this.pintarMovimientos(req, slot);
  }

  cambiosDisponibles(req: any): number[] {
    const yaElegidos = this.elecciones.filter(e => e.startsWith('switch')).map(e => +e.split(' ')[1] - 1);
    const nActivos = req.side.pokemon.filter((p: any) => p.active).length;
    return req.side.pokemon.map((p: any, i: number) => i).filter((i: number) => {
      const p = req.side.pokemon[i];
      return i >= nActivos && !p.condition.endsWith(' fnt') && !yaElegidos.includes(i) && !p.active;
    });
  }

  pintarMovimientos(req: any, slot: number, poderInicial = '') {
    const c = this.controlesEl;
    c.innerHTML = '';
    ocultarInfo();
    const act = req.active[slot];
    const mon = req.side.pokemon[slot];
    const d = dex();
    const dobles = req.active.length > 1;
    const nombre = mon.ident.replace(/^p[12]: /, '');
    const yaDinamax = !!act.maxMoves && !act.canDynamax;
    const usados = this.elecciones.join(' ');
    // Poderes disponibles (solo uno por Pokémon y turno)
    const poderes: [string, string, string][] = [];
    if (act.canMegaEvo && !usados.includes('mega')) poderes.push(['mega', tr('Megaevolución', 'Mega Evolution'), '#c86bff']);
    if (act.canMegaEvoX && !usados.includes('mega')) poderes.push(['megax', tr('Megaevolución X', 'Mega Evolution X'), '#c86bff']);
    if (act.canMegaEvoY && !usados.includes('mega')) poderes.push(['megay', tr('Megaevolución Y', 'Mega Evolution Y'), '#c86bff']);
    if (act.canUltraBurst && !usados.includes('ultra')) poderes.push(['ultra', tr('Ultraexplosión', 'Ultra Burst'), '#ffd34d']);
    if (act.canZMove && !usados.includes('zmove')) poderes.push(['zmove', tr('Movimiento Z', 'Z-Move'), '#ffcf3a']);
    if (act.canDynamax && !usados.includes('dynamax')) poderes.push(['dynamax', act.maxMoves?.gigantamax ? tr('Gigamax', 'Gigantamax') : tr('Dinamax', 'Dynamax'), '#ff4d6d']);
    if (act.canTerastallize && !usados.includes('terastallize')) poderes.push(['terastallize', tr(`Teracristal (${TIPOS_ES[act.canTerastallize] || act.canTerastallize})`, `Terastallize (${TIPOS_ES[act.canTerastallize] || act.canTerastallize})`), TIPO_COLOR[act.canTerastallize] || '#5bd']);
    let poder = poderes.some(p => p[0] === poderInicial) ? poderInicial : '';

    const cab = h('div', {class: 'controles-cab'},
      h('span', {}, dobles ? tr(`¿Qué hará ${nombre}? (${slot + 1}/${req.active.length})`, `What will ${nombre} do? (${slot + 1}/${req.active.length})`) : tr(`¿Qué hará ${nombre}?`, `What will ${nombre} do?`)),
      slot > 0 ? h('button', {class: 'btn btn-sec btn-sm', onclick: () => { this.elecciones.pop(); this.siguienteSlot(req); }}, tr('← Atrás', '← Back')) : null);
    const extras = h('div', {class: 'extras-mov'});
    if (poderes.length) {
      extras.append(h('span', {class: 'tenue'}, tr('Poder: ', 'Power: ')));
      for (const [id, txt, color] of poderes) {
        const b = h('button', {class: 'btn-poder' + (poder === id ? ' activo' : ''), style: {'--poder': color}, onclick: () => {
          this.pintarMovimientos(req, slot, poder === id ? '' : id);
        }}, txt);
        extras.append(b);
      }
      extras.append(h('small', {class: 'tenue'}, tr('Solo puedes usar un poder por combate.', 'You can only use one power per battle.')));
    }
    const rivales = this.estado.lados[this.estado.rival].activos;
    const movs = h('div', {class: 'botones-mov'}, ...act.moves.map((m: any, i: number) => {
      const mv = d.moves.get(m.id);
      // Movimiento que se usará realmente (Z o Max)
      let usar = m.move, objetivo = m.target, disabled = m.disabled || m.pp === 0, potencia: number | undefined;
      let idReal = m.id;
      if (poder === 'zmove') {
        const z = act.canZMove?.[i];
        if (!z) disabled = true; else { usar = z.move; objetivo = z.target; idReal = toID(z.move.replace(/^Z-/, '')); }
        if (z && !z.move.startsWith('Z-')) { potencia = mv.zMove?.basePower; }
      } else if (poder === 'dynamax' || yaDinamax) {
        const mx = act.maxMoves?.maxMoves?.[i];
        if (mx) { usar = d.moves.get(mx.move).name; objetivo = mx.target; if (mx.disabled) disabled = true; idReal = mx.move; potencia = mv.maxMove?.basePower; }
      }
      const mvReal = d.moves.get(idReal);
      const tipo = mvReal.exists && mvReal.type !== '???' ? mvReal.type : (mv.exists ? mv.type : 'Normal');
      let efi: HTMLElement | null = null;
      const rival = rivales.find(r => r && !r.fainted);
      const cat = mvReal.exists ? mvReal.category : mv.category;
      if (rival && mv.exists && cat !== 'Status' && !dobles) {
        const tipos = tiposEfectivos(rival);
        const inm = !d.getImmunity(tipo, tipos);
        const ef = inm ? 0 : Math.pow(2, d.getEffectiveness(tipo, tipos));
        const txt = inm ? tr('Sin efecto', 'No effect') : ef >= 4 ? '×4' : ef >= 2 ? '×2' : ef <= 0.25 ? '×¼' : ef < 1 ? '×½' : '';
        if (txt) efi = h('span', {class: 'efic ' + (ef >= 2 ? 'buena' : 'mala')}, txt);
      }
      const boton = h('button', {class: 'btn-movimiento' + (poder ? ' con-poder' : ''), disabled, style: {'--tipo': TIPO_COLOR[tipo]},
        onclick: () => {
          ocultarInfo();
          let e = `move ${i + 1}`;
          const finalizar = (sufijo = '') => {
            e += sufijo;
            if (poder) e += ' ' + poder;
            this.elecciones.push(e);
            this.siguienteSlot(req);
          };
          if (dobles && objetivo && ['normal', 'any', 'adjacentFoe', 'adjacentAlly', 'adjacentAllyOrSelf'].includes(objetivo)) {
            this.pintarObjetivo(req, slot, objetivo, sufijo => finalizar(sufijo), poder);
          } else finalizar();
        }},
      h('span', {class: 'mov-nombre'}, nomMov(usar)),
      h('span', {class: 'mov-sub'}, h('span', {class: 'mov-tipo'}, TIPOS_ES[tipo] || tipo),
        m.maxpp ? h('span', {class: 'mov-pp'}, `${m.pp}/${m.maxpp}`) : null, efi));
      adjuntarInfo(boton, () => {
        if (idReal !== m.id && mvReal.exists) return fichaMovimiento(idReal, {pp: m.pp, maxpp: m.maxpp, nombre: nomMov(usar), potencia});
        return fichaMovimiento(m.id, {pp: m.pp, maxpp: m.maxpp});
      });
      return boton;
    }));
    c.append(cab, movs, extras, this.botonesCambio(req, slot, !!(act.trapped)));
  }

  pintarObjetivo(req: any, slot: number, tgt: string, ok: (sufijo: string) => void, poder = '') {
    const c = this.controlesEl;
    c.innerHTML = '';
    const e = this.estado;
    const botones: HTMLElement[] = [];
    const rivales = e.lados[e.rival].activos;
    const mios = e.lados[e.yo].activos;
    const permiteRival = ['normal', 'any', 'adjacentFoe'].includes(tgt);
    const permiteAliado = ['normal', 'any', 'adjacentAlly', 'adjacentAllyOrSelf'].includes(tgt);
    if (permiteRival) rivales.forEach((m, i) => {
      if (!m) return;
      botones.push(h('button', {class: 'btn-objetivo rival', disabled: m.fainted, onclick: () => ok(` ${i + 1}`)},
        iconImg(m.species), m.name, h('small', {}, ' (rival)')));
    });
    if (permiteAliado) mios.forEach((m, i) => {
      if (!m) return;
      if (i === slot && tgt !== 'adjacentAllyOrSelf') return;
      botones.push(h('button', {class: 'btn-objetivo aliado', disabled: m.fainted, onclick: () => ok(` -${i + 1}`)},
        iconImg(m.species), m.name, h('small', {}, i === slot ? tr(' (sí mismo)', ' (self)') : ' (aliado)')));
    });
    c.append(h('div', {class: 'controles-cab'}, h('span', {}, tr('¿A quién?', 'Target?')),
      h('button', {class: 'btn btn-sec btn-sm', onclick: () => this.pintarMovimientos(req, slot, poder)}, tr('← Atrás', '← Back'))),
    h('div', {class: 'botones-objetivo'}, ...botones));
  }

  botonesCambio(req: any, slot: number, atrapado: boolean) {
    const disp = new Set(this.cambiosDisponibles(req));
    return h('div', {class: 'cambios'},
      h('div', {class: 'cambios-titulo'}, atrapado ? tr('No puedes cambiar (atrapado)', "You can't switch (trapped)") : tr('Cambiar a:', 'Switch to:')),
      h('div', {class: 'botones-cambio'}, ...req.side.pokemon.map((p: any, i: number) => {
        const [hp, max] = p.condition.split(' ')[0].split('/').map(Number);
        const fnt = p.condition.endsWith(' fnt');
        const pct = fnt ? 0 : (hp / max) * 100;
        const st = p.condition.split(' ')[1];
        const boton = h('button', {class: 'btn-cambio' + (p.active ? ' activo' : '') + (fnt ? ' fnt' : ''), disabled: atrapado || !disp.has(i),
          onclick: () => { ocultarInfo(); this.elecciones.push(`switch ${i + 1}`); this.siguienteSlot(req); }},
        iconImg(p.details.split(',')[0]),
        h('span', {class: 'cambio-nombre'}, p.ident.replace(/^p[12]: /, '')),
        h('span', {class: 'mini-ps'}, h('span', {style: {width: pct + '%'}, class: pct > 50 ? 'verde' : pct > 20 ? 'amarillo' : 'rojo'})),
        st && st !== 'fnt' ? h('span', {class: 'estado-tag', style: {background: ESTADO_COLOR[st]}}, ESTADOS_ES[st]) : null);
        const nombreP = p.ident.replace(/^p[12]: /, '');
        adjuntarInfo(boton, () => {
          const mon = this.estado.lados[this.estado.yo].equipo.find(x => x.name === nombreP);
          return mon ? fichaPokemon(mon, true) : null;
        });
        return boton;
      })));
  }

  pintarCambio(req: any, slot: number, forzado: boolean) {
    const c = this.controlesEl;
    c.innerHTML = '';
    c.append(h('div', {class: 'controles-cab'}, h('span', {}, forzado ? tr('¡Elige qué Pokémon sacar!', 'Choose a Pokémon to send out!') : tr('Cambiar', 'Switch')),
      slot > 0 && this.elecciones.length ? h('button', {class: 'btn btn-sec btn-sm', onclick: () => { this.elecciones.pop(); this.siguienteSlot(req); }}, tr('← Atrás', '← Back')) : null),
    this.botonesCambio(req, slot, false));
  }

  destruir() { this.destruido = true; ocultarInfo(); setModoInfo(false); }

  /** Salir siempre es posible, aunque la conexión se haya cortado */
  salirAlInicio() {
    if (!this.estado.terminado) {
      if (!confirm(tr('Si sales ahora, pierdes el combate. ¿Salir a la pantalla principal?', 'If you leave now, you lose the battle. Go back to the main screen?'))) return;
      try { this.op.rendirse(); } catch (e) { console.error(e); }
    }
    if (this.op.salir) this.op.salir();
    else cambiarPantalla(nav.inicio);
  }
}

export {itemIcon, toID};
