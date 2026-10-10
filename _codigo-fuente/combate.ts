// Pantalla de combate: dibuja el campo, anima el protocolo y recoge las elecciones.
import {toID} from 'pkmn-sim';
import {Estado, LadoId, Pkm} from './estado';
import {
  dex, h, tipoBadge, spriteImg, iconImg, itemIcon, nombreVisible, sleep, storage,
  TIPOS_ES, TIPO_COLOR, CATEGORIA_ES, ESTADOS_ES, ESTADO_COLOR, STATS_CORTO,
  nomMov, descMov, nomHab, nomObj,
} from './util';

export interface OpcionesCombate {
  yo: LadoId;
  elegir: (eleccion: string) => void;
  rendirse: () => void;
  enviarChat?: (texto: string) => void;
  alTerminar?: () => HTMLElement[];   // botones a mostrar al terminar
  titulo?: string;
}

const BOOST_CORTO: {[k: string]: string} = {...STATS_CORTO, accuracy: 'Pre', evasion: 'Eva'};
const VOLATILES_ES: {[k: string]: string} = {
  substitute: 'Sustituto', confusion: 'Confuso', leechseed: 'Drenadoras', taunt: 'Mofa', encore: 'Otra vez',
  attract: 'Enamorado', yawn: 'Somnoliento', curse: 'Maldición', nightmare: 'Pesadilla', focusenergy: 'Foco energía',
  perish3: 'Canto mortal 3', perish2: 'Canto mortal 2', perish1: 'Canto mortal 1', disable: 'Anulación',
  protosynthesis: 'Paleosíntesis', quarkdrive: 'Carga Cuark', slowstart: 'Inicio lento', typechange: 'Cambio de tipo',
  aquaring: 'Acua aro', ingrain: 'Arraigo', magnetrise: 'Levitón', smackdown: 'Derribado', saltcure: 'Sal curativa',
};
const CLIMA_ES: {[k: string]: string} = {
  RainDance: '🌧 Lluvia', SunnyDay: '☀ Sol intenso', Sandstorm: '🌪 Tormenta de arena', Hail: '🧊 Granizo',
  Snowscape: '❄ Nieve', Snow: '❄ Nieve', DesolateLand: '🔥 Sol abrasador', PrimordialSea: '🌊 Diluvio', DeltaStream: '🌀 Turbulencias',
};
const CAMPO_ES: {[k: string]: string} = {
  electricterrain: '⚡ Campo eléctrico', grassyterrain: '🌿 Campo de hierba', mistyterrain: '🌫 Campo de niebla',
  psychicterrain: '🔮 Campo psíquico', trickroom: '🔄 Espacio raro', gravity: '⬇ Gravedad', magicroom: 'Zona mágica', wonderroom: 'Zona extraña',
};
const LADO_ES: {[k: string]: string} = {
  spikes: 'Púas', stealthrock: 'Trampa rocas', toxicspikes: 'Púas tóxicas', stickyweb: 'Red viscosa', reflect: 'Reflejo',
  lightscreen: 'Pantalla de luz', auroraveil: 'Velo aurora', tailwind: 'Viento afín', safeguard: 'Velo sagrado', mist: 'Neblina',
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
    this.controlesEl = h('div', {class: 'controles'}, h('div', {class: 'esperando'}, 'Preparando el combate…'));
    const chatIn = h('input', {class: 'input chat-input', placeholder: 'Escribe un mensaje…', maxlength: '200'});
    chatIn.addEventListener('keydown', e => {
      if (e.key === 'Enter' && chatIn.value.trim()) { this.op.enviarChat?.(chatIn.value.trim()); this.chat('Tú', chatIn.value.trim()); chatIn.value = ''; }
    });
    const rapidoBtn = h('label', {class: 'toggle'}, (() => {
      const c = h('input', {type: 'checkbox', checked: this.rapido});
      c.addEventListener('change', () => { this.rapido = c.checked; storage.set('arena.rapido', this.rapido); });
      return c;
    })(), ' Animaciones rápidas');
    this.raiz.append(h('div', {class: 'combate'},
      h('div', {class: 'columna-campo'},
        h('div', {class: 'escenario'}, this.campoEl, this.infoCampoEl),
        this.controlesEl),
      h('aside', {class: 'registro'},
        h('div', {class: 'registro-cab'}, h('b', {}, this.op.titulo || 'Combate'), rapidoBtn,
          h('button', {class: 'btn btn-peligro btn-sm', onclick: () => {
            if (this.estado.terminado) return;
            if (confirm('¿Seguro que quieres rendirte?')) this.op.rendirse();
          }}, 'Rendirse')),
        this.registroEl,
        this.op.enviarChat ? chatIn : null)));
    this.dibujarCampo();
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
        this.log(line.slice(7).replace('[Invalid choice]', 'Elección no válida:').replace('[Unavailable choice]', 'No disponible:'), 'error');
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
        else if (res.texto && res.clase !== 'turno' && res.clase !== 'dano-num') await sleep(this.rapido ? 60 : 220);
      }
    } finally {
      this.procesando = false;
    }
  }

  ms(n: number) { return this.rapido ? n / 3 : n; }

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
          const wrap = h('div', {class: 'sprite-wrap' + (mon.fainted ? ' anim-debilitado' : '')}, h('div', {class: 'sombra'}), spr);
          this.spriteEls.set(`${ladoId}-${i}`, wrap);
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
        mon.tera ? h('span', {class: 'tera-tag', style: {background: TIPO_COLOR[mon.tera]}, title: 'Teracristalizado'}, '◆ ' + (TIPOS_ES[mon.tera] || mon.tera)) : null,
        h('span', {class: 'hud-nivel'}, 'Nv. ' + mon.level)),
      h('div', {class: 'barra-ps'}, h('div', {class: 'relleno ' + color, style: {width: (pct * 100).toFixed(1) + '%'}})),
      h('div', {class: 'hud-fila hud-sub'},
        mon.status ? h('span', {class: 'estado-tag', style: {background: ESTADO_COLOR[mon.status]}}, ESTADOS_ES[mon.status] || mon.status) : null,
        h('span', {class: 'hud-ps'}, esYo && mon.maxhp !== 100 ? `${mon.hp}/${mon.maxhp}` : `${Math.round(pct * 100)}%`)),
      boosts.length || vols.length ? h('div', {class: 'hud-extras'},
        ...boosts.map(([k, v]) => h('span', {class: 'boost ' + (v > 0 ? 'pos' : 'neg')}, `${BOOST_CORTO[k] || k} ${v > 0 ? '+' : ''}${v}`)),
        ...vols.map(v => h('span', {class: 'vol'}, v))) : null);
    hud.title = this.tooltip(mon, esYo);
    return hud;
  }

  tooltip(mon: Pkm, esYo: boolean) {
    const sp = dex().species.get(mon.species);
    const lines = [`${nombreVisible(mon.species)} — ${(mon.types || sp.types).map(t => TIPOS_ES[t]).join('/')}`];
    if (mon.ability) lines.push('Habilidad: ' + nomHab(mon.ability));
    else if (!esYo) lines.push('Habilidades posibles: ' + [...new Set(Object.values(sp.abilities) as string[])].map(nomHab).join(', '));
    if (mon.item) lines.push('Objeto: ' + nomObj(mon.item));
    const st = (mon as any).stats;
    if (esYo && st) lines.push(`Atq ${st.atk} · Def ${st.def} · AtE ${st.spa} · DfE ${st.spd} · Vel ${st.spe}`);
    else lines.push('Stats base: ' + Object.entries(sp.baseStats).map(([k, v]) => `${STATS_CORTO[k]} ${v}`).join(' · '));
    return lines.join('\n');
  }

  actualizarHud(ident: string) {
    const p = this.estado.parseIdent(ident);
    if (!p) return;
    const clave = `${p.lado.id}-${p.pos}`;
    const viejo = this.campoEl.querySelector(`.hud[data-clave="${clave}"]`);
    const mon = p.lado.activos[p.pos];
    if (viejo && mon) viejo.replaceWith(this.hud(mon, p.lado.id === this.estado.yo, clave));
  }

  dibujarInfoCampo() {
    const e = this.estado;
    this.infoCampoEl.innerHTML = '';
    const chips: HTMLElement[] = [];
    if (e.clima) chips.push(h('span', {class: 'chip-campo'}, CLIMA_ES[e.clima] || e.clima));
    for (const k of e.campo.keys()) chips.push(h('span', {class: 'chip-campo'}, CAMPO_ES[k] || k));
    this.infoCampoEl.append(h('div', {class: 'campo-chips'}, ...chips));
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
      this.infoCampoEl.append(h('div', {class: 'equipo-iconos ' + (ladoId === e.yo ? 'mio' : 'rival')},
        h('span', {class: 'jugador'}, lado.nombre), ...iconos, ...conds));
    }
  }

  // ------------------------------------------------------------ controles --
  mostrarControles() {
    const c = this.controlesEl;
    if (this.estado.terminado) {
      c.innerHTML = '';
      const yoGano = this.estado.ganador === this.estado.lados[this.estado.yo].nombre;
      c.append(h('div', {class: 'fin-combate ' + (yoGano ? 'victoria' : 'derrota')},
        h('div', {class: 'fin-titulo'}, this.estado.ganador ? (yoGano ? '¡Has ganado!' : 'Has perdido…') : 'Empate'),
        h('div', {class: 'fin-botones'}, ...(this.op.alTerminar?.() || []))));
      return;
    }
    const req = this.req;
    if (!req) {
      if (this.reqMostrada) return; // ya se están mostrando los controles
      c.innerHTML = '';
      c.append(h('div', {class: 'esperando'}, 'Esperando…'));
      return;
    }
    c.innerHTML = '';
    this.estado.sincronizar(req);
    this.dibujarInfoCampo();
    if (req.wait) { this.reqMostrada = null; this.req = null; c.append(h('div', {class: 'esperando'}, 'Esperando al rival…')); return; }
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
    this.controlesEl.append(h('div', {class: 'esperando'}, 'Esperando al rival…'));
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
          h('div', {class: 'preview-titulo'}, `Equipo rival`),
          h('div', {class: 'preview-rival'}, ...rival.map(m => h('div', {class: 'preview-poke'}, spriteImg(m.species, 'front', m.shiny, 'mini'),
            h('span', {}, nombreVisible(m.species)), h('span', {class: 'tipos'}, ...dex().species.get(m.species).types.map(t => tipoBadge(t, true)))))),
          h('div', {class: 'preview-titulo'}, nLideres > 1 ? `Elige tus 2 Pokémon iniciales (${orden.length}/2)` : 'Elige tu Pokémon inicial'),
          h('div', {class: 'botones-cambio'}, ...pokes.map((p: any, i: number) => {
            const sp = p.details.split(',')[0];
            const idx = orden.indexOf(i);
            return h('button', {class: 'btn-cambio' + (idx >= 0 ? ' elegido' : ''), onclick: () => {
              if (idx >= 0) orden.splice(idx, 1); else orden.push(i);
              if (orden.length >= nLideres) {
                const resto = pokes.map((_: any, j: number) => j).filter((j: number) => !orden.includes(j));
                this.enviar('team ' + [...orden, ...resto].map(j => j + 1).join(''));
                return;
              }
              pintar();
            }}, iconImg(sp), h('span', {}, p.ident.replace(/^p[12]: /, '')), idx >= 0 ? h('b', {class: 'orden'}, String(idx + 1)) : null,
            p.item ? h('small', {class: 'tenue'}, nomObj(p.item)) : null);
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

  pintarMovimientos(req: any, slot: number) {
    const c = this.controlesEl;
    c.innerHTML = '';
    const act = req.active[slot];
    const mon = req.side.pokemon[slot];
    const d = dex();
    const dobles = req.active.length > 1;
    let mega = false, tera = false;
    const nombre = mon.ident.replace(/^p[12]: /, '');
    const cab = h('div', {class: 'controles-cab'},
      h('span', {}, dobles ? `¿Qué hará ${nombre}? (${slot + 1}/${req.active.length})` : `¿Qué hará ${nombre}?`),
      slot > 0 ? h('button', {class: 'btn btn-sec btn-sm', onclick: () => { this.elecciones.pop(); this.siguienteSlot(req); }}, '← Atrás') : null);
    const extras = h('div', {class: 'extras-mov'});
    if (act.canMegaEvo && !this.elecciones.some(e => e.includes('mega'))) {
      const cb = h('input', {type: 'checkbox'});
      cb.addEventListener('change', () => { mega = cb.checked; });
      extras.append(h('label', {class: 'toggle toggle-mega'}, cb, ' Megaevolucionar'));
    }
    if (act.canTerastallize && !this.elecciones.some(e => e.includes('terastallize'))) {
      const cb = h('input', {type: 'checkbox'});
      cb.addEventListener('change', () => { tera = cb.checked; });
      extras.append(h('label', {class: 'toggle toggle-tera', style: {'--tera': TIPO_COLOR[act.canTerastallize]}},
        cb, ' Teracristalizar (', TIPOS_ES[act.canTerastallize] || act.canTerastallize, ')'));
    }
    const rivales = this.estado.lados[this.estado.rival].activos;
    const movs = h('div', {class: 'botones-mov'}, ...act.moves.map((m: any, i: number) => {
      const mv = d.moves.get(m.id);
      const tipo = mv.exists ? mv.type : 'Normal';
      const deshabilitado = m.disabled || m.pp === 0;
      let efi: HTMLElement | null = null;
      const rival = rivales.find(r => r && !r.fainted);
      if (rival && mv.exists && mv.category !== 'Status' && !dobles) {
        const tipos = rival.tera ? [rival.tera] : (rival.types || d.species.get(rival.species).types);
        const inm = !d.getImmunity(tipo, tipos);
        const ef = inm ? 0 : Math.pow(2, d.getEffectiveness(tipo, tipos));
        const txt = inm ? 'Sin efecto' : ef >= 4 ? '×4' : ef >= 2 ? '×2' : ef <= 0.25 ? '×¼' : ef < 1 ? '×½' : '';
        if (txt) efi = h('span', {class: 'efic ' + (ef >= 2 ? 'buena' : 'mala')}, txt);
      }
      const titulo = mv.exists ? `${nomMov(mv.name)} — ${TIPOS_ES[tipo]} · ${CATEGORIA_ES[mv.category]}` +
        `${mv.basePower ? ' · Potencia ' + mv.basePower : ''}${mv.accuracy !== true ? ' · Precisión ' + mv.accuracy + '%' : ''}\n${descMov(mv.name)}` : nomMov(m.move);
      return h('button', {class: 'btn-movimiento', disabled: deshabilitado, title: titulo, style: {'--tipo': TIPO_COLOR[tipo]},
        onclick: () => {
          let e = `move ${i + 1}`;
          const tgt = m.target;
          const finalizar = (sufijo = '') => {
            e += sufijo;
            if (mega) e += ' mega';
            else if (tera) e += ' terastallize';
            this.elecciones.push(e);
            this.siguienteSlot(req);
          };
          if (dobles && tgt && ['normal', 'any', 'adjacentFoe', 'adjacentAlly', 'adjacentAllyOrSelf'].includes(tgt)) {
            this.pintarObjetivo(req, slot, tgt, sufijo => finalizar(sufijo));
          } else finalizar();
        }},
      h('span', {class: 'mov-nombre'}, nomMov(m.move)),
      h('span', {class: 'mov-sub'}, h('span', {class: 'mov-tipo'}, TIPOS_ES[tipo] || tipo),
        m.maxpp ? h('span', {class: 'mov-pp'}, `${m.pp}/${m.maxpp}`) : null, efi));
    }));
    c.append(cab, movs, extras, this.botonesCambio(req, slot, !!(act.trapped)));
  }

  pintarObjetivo(req: any, slot: number, tgt: string, ok: (sufijo: string) => void) {
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
        iconImg(m.species), m.name, h('small', {}, i === slot ? ' (sí mismo)' : ' (aliado)')));
    });
    c.append(h('div', {class: 'controles-cab'}, h('span', {}, '¿A quién?'),
      h('button', {class: 'btn btn-sec btn-sm', onclick: () => this.pintarMovimientos(req, slot)}, '← Atrás')),
    h('div', {class: 'botones-objetivo'}, ...botones));
  }

  botonesCambio(req: any, slot: number, atrapado: boolean) {
    const disp = new Set(this.cambiosDisponibles(req));
    return h('div', {class: 'cambios'},
      h('div', {class: 'cambios-titulo'}, atrapado ? 'No puedes cambiar (atrapado)' : 'Cambiar a:'),
      h('div', {class: 'botones-cambio'}, ...req.side.pokemon.map((p: any, i: number) => {
        const [hp, max] = p.condition.split(' ')[0].split('/').map(Number);
        const fnt = p.condition.endsWith(' fnt');
        const pct = fnt ? 0 : (hp / max) * 100;
        const st = p.condition.split(' ')[1];
        return h('button', {class: 'btn-cambio' + (p.active ? ' activo' : '') + (fnt ? ' fnt' : ''), disabled: atrapado || !disp.has(i),
          title: `${p.details.split(',')[0]}\n${fnt ? 'Debilitado' : `${hp}/${max} PS`}${p.item ? '\nObjeto: ' + nomObj(p.item) : ''}\n${p.moves.map((m: string) => nomMov(m)).join(' · ')}`,
          onclick: () => { this.elecciones.push(`switch ${i + 1}`); this.siguienteSlot(req); }},
        iconImg(p.details.split(',')[0]),
        h('span', {class: 'cambio-nombre'}, p.ident.replace(/^p[12]: /, '')),
        h('span', {class: 'mini-ps'}, h('span', {style: {width: pct + '%'}, class: pct > 50 ? 'verde' : pct > 20 ? 'amarillo' : 'rojo'})),
        st && st !== 'fnt' ? h('span', {class: 'estado-tag', style: {background: ESTADO_COLOR[st]}}, ESTADOS_ES[st]) : null);
      })));
  }

  pintarCambio(req: any, slot: number, forzado: boolean) {
    const c = this.controlesEl;
    c.innerHTML = '';
    c.append(h('div', {class: 'controles-cab'}, h('span', {}, forzado ? '¡Elige qué Pokémon sacar!' : 'Cambiar'),
      slot > 0 && this.elecciones.length ? h('button', {class: 'btn btn-sec btn-sm', onclick: () => { this.elecciones.pop(); this.siguienteSlot(req); }}, '← Atrás') : null),
    this.botonesCambio(req, slot, false));
  }

  destruir() { this.destruido = true; }
}

export {itemIcon, toID};
