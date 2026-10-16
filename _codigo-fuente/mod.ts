// Construye el "mod" de Showdown a partir de los archivos de /datos.
import {Dex, Battle, toID} from 'pkmn-sim';

export const MOD_ID = 'gen9arena';
/** Poderes especiales que se pueden desactivar en una sala online */
export type Poder = 'dynamax' | 'tera' | 'mega' | 'z';
export const PODERES: Poder[] = ['dynamax', 'tera', 'mega', 'z'];

export const FORMATOS = {
  singles: '[Gen 9] Arena Individual',
  doubles: '[Gen 9] Arena Dobles',
};

type AnyObj = {[k: string]: any};
const W: AnyObj = (globalThis as any).window || globalThis;

const STAT_KEYS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];

export interface InfoCustom {
  /** ids de condiciones de lado que son trampas propias (Trampa Mental...) */
  trampasExtra?: string[];
  /** id de especie -> nombre de archivo de sprite */
  sprites: {[id: string]: string};
  /** ids de especies nuevas o modificadas */
  custom: Set<string>;
  /** advertencias al cargar los datos */
  avisos: string[];
  /** nombre de forma visible (Hoopa-Lampara -> Genio Místico de la Lámpara) */
  nombresForma: {[id: string]: string};
  /** Ids de tus versiones de Pokémon oficiales (Lapras-Custom...) */
  versiones: Set<string>;
  /** Ids que se muestran como «Especie Jagara» (tus versiones y las formas con regional: true) */
  regionales: Set<string>;
  /** ids de objetos personalizados */
  objetos: Set<string>;
  /** id de objeto -> archivo de sprite */
  spritesObjeto: {[id: string]: string};
  /** Pokémon oficiales a los que se han añadido movimientos o habilidades */
  editados: Set<string>;
  /** id -> tipos de movimientos heredados que se le quitan */
  quitarTipos: {[id: string]: string[]};
}

export const INFO: InfoCustom = {sprites: {}, custom: new Set(), avisos: [], nombresForma: {}, versiones: new Set(), regionales: new Set(), objetos: new Set(), spritesObjeto: {}, editados: new Set(), quitarTipos: {}};

let cached: any = null;

const BASES_FORMATO: {[k: string]: AnyObj} = {};
const variantes = new Set<string>();
const NOMBRE_PODER: {[p in Poder]: [string, string]} = {
  dynamax: ['Dinamax', 'Dynamax'], tera: ['Teracristal', 'Terastal'], mega: ['Megaevolución', 'Mega Evolution'], z: ['Movimientos Z', 'Z-Moves'],
};
const MSG_PODERES = (no: string[]) => {
  const es = no.map(p => NOMBRE_PODER[p as Poder]?.[0] || p).join(', '), en = no.map(p => NOMBRE_PODER[p as Poder]?.[1] || p).join(', ');
  return `Desactivado en esta sala: ${es} ‖ Disabled in this room: ${en}`;
};

/**
 * Formato de combate con algunos poderes desactivados (Dinamax, Teracristal, Mega, Z).
 * Crea la variante la primera vez que se pide; sin nada desactivado devuelve el formato normal.
 */
export function formatoCon(formato: 'singles' | 'doubles', prohibidos: Poder[] = []): string {
  buildMod();
  const no = PODERES.filter(p => prohibidos.includes(p));
  if (!no.length) return FORMATOS[formato];
  const nombre = `${FORMATOS[formato]} (sin ${no.join('-')})`;
  if (!variantes.has(nombre)) {
    Dex.formats.extend([{...BASES_FORMATO[formato], name: nombre, prohibidos: no}] as any);
    variantes.add(nombre);
  }
  return nombre;
}

export function buildMod() {
  if (cached) return cached;
  const base = Dex;
  const Pokedex: AnyObj = {};
  const Learnsets: AnyObj = {};
  const Abilities: AnyObj = {};
  const Moves: AnyObj = {};
  const Items: AnyObj = {};
  const FormatsData: AnyObj = {};
  const aviso = (m: string) => { INFO.avisos.push(m); console.warn('[datos]', m); };

  // ---------------------------------------------------------------- habilidades
  let num = 5001;
  for (const [name, data] of Object.entries<AnyObj>(W.DATOS_HABILIDADES || {})) {
    const {desc, ...handlers} = data;
    Abilities[toID(name)] = {
      name, num: num++, rating: data.rating ?? 2, flags: {}, desc, shortDesc: desc, ...handlers,
    };
  }
  // ---------------------------------------------------------------- movimientos
  num = 5001;
  for (const [name, data] of Object.entries<AnyObj>(W.DATOS_MOVIMIENTOS || {})) {
    const {desc, ...rest} = data;
    Moves[toID(name)] = {
      name, num: num++, priority: 0, flags: {}, secondary: null, target: 'normal',
      desc, shortDesc: desc, ...rest,
    };
  }
  // Banda Kamikaze: los movimientos de sacrificio ignoran pantallas.
  for (const [moveid, cat] of [['reflect', 'Physical'], ['lightscreen', 'Special'], ['auroraveil', null]] as const) {
    const orig = base.data.Moves[moveid].condition.onAnyModifyDamage;
    Moves[moveid] = {
      inherit: true,
      condition: {
        inherit: true,
        onAnyModifyDamage(this: any, damage: number, source: any, target: any, move: any) {
          if (move && move.ignoraPantallas) return;
          return orig.call(this, damage, source, target, move);
        },
      },
    };
    void cat;
  }
  // Protección y similares no impiden que Hacha Pétrea y Tajo Metralla dejen su trampa:
  // solo paran el daño al rival (la trampa va al campo, no al Pokémon).
  const TRAMPA_DE_ATAQUE: {[m: string]: string} = {stoneaxe: 'stealthrock', ceaselessedge: 'spikes'};
  for (const pid of ['protect', 'detect', 'kingsshield', 'spikyshield', 'banefulbunker', 'obstruct', 'silktrap', 'burningbulwark', 'maxguard']) {
    const cond = base.data.Moves[pid]?.condition;
    if (!cond?.onTryHit) continue;
    const orig = cond.onTryHit;
    Moves[pid] = {
      ...(Moves[pid] || {}), inherit: true,
      condition: {
        inherit: true,
        onTryHit(this: any, target: any, source: any, move: any) {
          const t = TRAMPA_DE_ATAQUE[move?.id];
          if (t && move.flags?.protect && !move.hasSheerForce && source?.hp && source !== target) {
            for (const side of source.side.foeSidesWithConditions()) side.addSideCondition(t);
          }
          return orig.call(this, target, source, move);
        },
      },
    };
  }
  // Trampas propias (movimientos con "trampa: true"): Giro Rápido, Giro Mortal, Limpieza General,
  // Despejar y Cambio de Cancha las tratan igual que a Púas, Trampa Rocas, etc.
  const TRAMPAS_EXTRA: string[] = Object.entries<AnyObj>(W.DATOS_MOVIMIENTOS || {})
    .filter(([, m]) => m.trampa).map(([n, m]) => m.sideCondition || toID(n));
  INFO.trampasExtra = TRAMPAS_EXTRA;
  if (TRAMPAS_EXTRA.length) {
    const quitar = (battle: any, side: any, fuente?: any, desde?: string) => {
      let q = false;
      for (const t of TRAMPAS_EXTRA) {
        if (side.removeSideCondition(t)) {
          q = true;
          battle.add('-sideend', side, battle.dex.conditions.get(t).name, ...(desde ? [`[from] move: ${desde}`, `[of] ${fuente}`] : []));
        }
      }
      return q;
    };
    for (const id of ['rapidspin', 'mortalspin']) {
      const o = base.data.Moves[id];
      Moves[id] = {
        inherit: true,
        onAfterHit(this: any, target: any, pokemon: any, move: any) {
          o.onAfterHit.call(this, target, pokemon, move);
          if (!move.hasSheerForce) quitar(this, pokemon.side, pokemon, o.name);
        },
        onAfterSubDamage(this: any, damage: number, target: any, pokemon: any, move: any) {
          o.onAfterSubDamage.call(this, damage, target, pokemon, move);
          if (!move.hasSheerForce && pokemon.hp) quitar(this, pokemon.side, pokemon, o.name);
        },
      };
    }
    const tidy = base.data.Moves.tidyup;
    Moves.tidyup = {
      inherit: true,
      onHit(this: any, pokemon: any) {
        let extra = false;
        for (const side of [pokemon.side, ...pokemon.side.foeSidesWithConditions()]) extra = quitar(this, side) || extra;
        const r = tidy.onHit.call(this, pokemon);
        return r || extra;
      },
    };
    const defog = base.data.Moves.defog;
    Moves.defog = {
      inherit: true,
      onHit(this: any, target: any, source: any, move: any) {
        const r = defog.onHit.call(this, target, source, move);
        let extra = false;
        for (const side of new Set([target.side, source.side])) extra = quitar(this, side, source, 'Defog') || extra;
        return r || extra;
      },
    };
    const court = base.data.Moves.courtchange;
    Moves.courtchange = {
      inherit: true,
      onHitField(this: any, target: any, source: any) {
        // Intercambia primero las trampas propias; luego el resto como siempre
        const a = source.side.sideConditions, b = source.side.foe.sideConditions;
        let extra = false;
        for (const t of TRAMPAS_EXTRA) {
          const ea = a[t], eb = b[t];
          if (!ea && !eb) continue;
          extra = true;
          delete a[t]; delete b[t];
          if (ea) { b[t] = ea; ea.target = source.side.foe; }
          if (eb) { a[t] = eb; eb.target = source.side; }
        }
        const r = court.onHitField.call(this, target, source);
        if (r === false && extra) {
          this.add('-swapsideconditions');
          this.add('-activate', source, 'move: Court Change');
          return;
        }
        return r;
      },
    };
  }

  // --------------------------------------------------------------------- objetos
  num = 5001;
  for (const [name, data] of Object.entries<AnyObj>(W.DATOS_OBJETOS || {})) {
    const {desc, sprite, ...handlers} = data;
    const id = toID(name);
    Items[id] = {name, num: num++, gen: 9, desc, shortDesc: desc, ...handlers};
    if (sprite) INFO.spritesObjeto[id] = sprite;
    INFO.objetos.add(id);
  }

  // -------------------------------------------------------------------- pokémon
  const lista: AnyObj[] = W.DATOS_POKEMON || [];
  const getSp = (id: string) => Pokedex[id] && !Pokedex[id].inherit ? Pokedex[id] : null;
  const ensureEntry = (id: string) => {
    if (Pokedex[id]) return Pokedex[id];
    const orig = base.data.Pokedex[id];
    if (!orig) return null;
    Pokedex[id] = {inherit: true};
    return Pokedex[id];
  };
  const fieldOf = (id: string, key: string) => {
    const e = Pokedex[id];
    if (e && e[key] !== undefined) return e[key];
    return base.data.Pokedex[id]?.[key];
  };
  const learnsetOf = (id: string): AnyObj => {
    const l = base.data.Learnsets[id]?.learnset;
    return l ? {...l} : {};
  };
  const addMoves = (ls: AnyObj, moves: string[], who: string) => {
    for (const m of moves || []) {
      const mid = toID(m);
      const exists = Moves[mid] || base.data.Moves[mid];
      if (!exists) { aviso(`${who}: el movimiento "${m}" no existe`); continue; }
      if (!ls[mid]) ls[mid] = ['9L1'];
    }
  };
  const checkAbility = (a: string, who: string) => {
    if (!a) return;
    if (!Abilities[toID(a)] && !base.data.Abilities[toID(a)]) aviso(`${who}: la habilidad "${a}" no existe`);
  };

  // Las versiones de Pokémon existentes (base = mismo nombre) se crean como una FORMA NUEVA
  // (p. ej. "Lapras-Custom") y el original sigue disponible.
  const FORMA: string = String(W.FORMA_PERSONALIZADA || 'Custom').replace(/[^A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ ]/g, '').trim() || 'Custom';
  const versiones = new Map<string, string>(); // id original -> nombre de la forma nueva
  for (const p of lista) {
    if (p.base && toID(p.base) === toID(p.nombre) && base.data.Pokedex[toID(p.base)] && !p.editar) {
      versiones.set(toID(p.base), `${base.data.Pokedex[toID(p.base)].name}-${FORMA}`);
    }
  }
  const resolver = (n: string) => versiones.get(toID(n)) || n;
  const enlaces: [string, string][] = []; // [hijo, padre]

  num = 3001;
  for (const p of lista) {
    const baseId = p.base ? toID(p.base) : '';
    if (p.base && !base.data.Pokedex[baseId]) { aviso(`${p.nombre}: el Pokémon base "${p.base}" no existe`); continue; }
    const esVersion = !p.editar && versiones.has(baseId) && baseId === toID(p.nombre);
    const name: string = esVersion ? versiones.get(baseId)! : p.nombre;
    const id = toID(name);
    if (p.quitarTipos) INFO.quitarTipos[id] = p.quitarTipos;
    if (p.editar) {
      // Añadir cosas a un Pokémon oficial sin crear una forma nueva
      if (!base.data.Pokedex[id]) { aviso(`${p.nombre}: no existe para editarlo`); continue; }
      INFO.editados.add(id);
      const e = ensureEntry(id)!;
      // Las habilidades nuevas se AÑADEN: el Pokémon conserva todas las que ya tenía
      const nuevas = [...(p.habilidades || []), ...(p.oculta ? [p.oculta] : []), ...(p.habilidadesExtra || [])];
      if (nuevas.length) {
        const habs = {...(e.abilities || base.data.Pokedex[id].abilities)};
        let n = 1;
        for (const a of nuevas) {
          checkAbility(a, p.nombre);
          if (Object.values(habs).some(x => toID(x as string) === toID(a))) continue;
          let k = 'S';
          while (habs[k]) k = 'C' + n++;
          habs[k] = a;
        }
        e.abilities = habs;
      }
      if (p.tipos) e.types = p.tipos;
      if (p.stats) e.baseStats = Object.fromEntries(STAT_KEYS.map((k, i) => [k, p.stats[i] ?? 50]));
      const ls = Learnsets[id]?.learnset || learnsetOf(id);
      addMoves(ls, p.movimientos, p.nombre);
      Learnsets[id] = {learnset: ls};
      continue;
    }
    INFO.custom.add(id);
    if (p.sprite) INFO.sprites[id] = p.sprite;

    let entry: AnyObj;
    let learnset: AnyObj;
    if (baseId) {
      // Copia de un Pokémon existente (versión nueva, Secgyem, Metagross-Mega-X, Hoopa-Lampara...)
      const src = base.data.Pokedex[baseId];
      entry = JSON.parse(JSON.stringify(src));
      delete entry.otherFormes; delete entry.formeOrder; delete entry.evos; delete entry.prevo; delete entry.evoLevel;
      delete entry.evoType; delete entry.evoItem; delete entry.evoCondition; delete entry.evoMove;
      delete entry.cosmeticFormes; delete entry.canGigantamax; delete entry.tags; delete entry.changesFrom;
      entry.name = name;
      learnset = learnsetOf(src.battleOnly ? '' : baseId);
      Pokedex[id] = entry;
      if (esVersion) {
        const bsp = src.baseSpecies || src.name;
        entry.baseSpecies = bsp;
        entry.forme = (src.forme ? src.forme + '-' : '') + FORMA;
        delete entry.baseForme;
        entry.gen = 9;
        const be = ensureEntry(toID(bsp))!;
        const others = [...(be.otherFormes || fieldOf(toID(bsp), 'otherFormes') || [])];
        if (!others.includes(name)) others.push(name);
        be.otherFormes = others;
        be.formeOrder = [...(fieldOf(toID(bsp), 'formeOrder') || [bsp]).filter((x: string) => x !== name), name];
        INFO.nombresForma[id] = FORMA;
        INFO.versiones.add(id);
        INFO.regionales.add(id);
        // Preevolución: la versión personalizada de su preevolución original (si existe)
        if (!p.preevo && src.prevo && versiones.has(toID(src.prevo))) enlaces.push([name, versiones.get(toID(src.prevo))!]);
      } else if (!p.forma && !p.megaPiedra) {
        entry.num = num++; delete entry.baseSpecies; delete entry.forme; delete entry.baseForme;
      }
    } else {
      entry = {num: num++, name, types: ['Normal'], baseStats: {hp: 50, atk: 50, def: 50, spa: 50, spd: 50, spe: 50},
        abilities: {0: 'No Ability'}, heightm: 1, weightkg: p.peso || 20, color: 'Gray', eggGroups: ['Undiscovered']};
      Pokedex[id] = entry;
      learnset = {};
    }

    if (p.tipos) entry.types = p.tipos;
    if (p.stats) {
      if (p.stats.length !== 6) aviso(`${name}: "stats" debe tener 6 números`);
      entry.baseStats = Object.fromEntries(STAT_KEYS.map((k, i) => [k, p.stats[i] ?? 50]));
    }
    if (p.habilidades) {
      entry.abilities = {0: p.habilidades[0]};
      if (p.habilidades[1]) entry.abilities[1] = p.habilidades[1];
      for (const a of p.habilidades) checkAbility(a, name);
    }
    if (p.oculta !== undefined) {
      if (!entry.abilities) entry.abilities = {};
      if (p.oculta) { entry.abilities.H = p.oculta; checkAbility(p.oculta, name); } else delete entry.abilities.H;
    }
    if (p.habilidadesExtra) {
      // Habilidades añadidas además de las normales (no quitan ninguna)
      let n = 1;
      for (const a of p.habilidadesExtra) {
        checkAbility(a, name);
        if (Object.values(entry.abilities || {}).some(x => toID(x as string) === toID(a))) continue;
        let k = 'S';
        while (entry.abilities[k]) k = 'C' + n++;
        entry.abilities[k] = a;
      }
    }
    if (p.peso) entry.weightkg = p.peso;

    // Formas
    if (p.megaPiedra) {
      const bsp = base.data.Pokedex[baseId].baseSpecies || base.data.Pokedex[baseId].name;
      const quien = resolver(bsp); // megaevoluciona desde tu versión (Metagross-Custom)
      entry.baseSpecies = bsp;
      entry.forme = name.slice(bsp.length + 1);
      entry.requiredItem = p.megaPiedra;
      entry.battleOnly = quien;
      entry.gen = 9;
      entry.num = base.data.Pokedex[toID(bsp)].num;
      const be = ensureEntry(toID(bsp))!;
      const others = [...(be.otherFormes || fieldOf(toID(bsp), 'otherFormes') || [])];
      if (!others.includes(name)) others.push(name);
      be.otherFormes = others;
      Items[toID(p.megaPiedra)] = {
        name: p.megaPiedra, num: 5900, gen: 9, megaStone: {[quien]: name}, itemUser: [quien],
        onTakeItem(item: any, source: any) { return !item.megaStone?.[source.baseSpecies.name]; },
        desc: `Permite megaevolucionar a ${quien} en combate.`, shortDesc: `Megaevoluciona a ${quien}.`,
      };
      INFO.objetos.add(toID(p.megaPiedra));
      if (p.spritePiedra) INFO.spritesObjeto[toID(p.megaPiedra)] = p.spritePiedra;
      learnset = {};
    } else if (p.forma) {
      const dash = name.indexOf('-');
      if (dash < 0) {
        entry.baseForme = p.forma;
      } else {
        const bsp = name.slice(0, dash);
        const bid = toID(bsp);
        entry.baseSpecies = bsp;
        entry.forme = p.forma;
        entry.num = getSp(bid)?.num ?? base.data.Pokedex[bid]?.num ?? entry.num;
        const be = getSp(bid) || ensureEntry(bid);
        if (be) {
          const others = [...(be.otherFormes || fieldOf(bid, 'otherFormes') || [])];
          if (!others.includes(name)) others.push(name);
          be.otherFormes = others;
          be.formeOrder = [bsp, ...others];
        }
        if (p.nombreForma) INFO.nombresForma[id] = p.nombreForma;
        if (p.regional) INFO.regionales.add(id);
      }
    }

    if (p.preevo) enlaces.push([name, resolver(p.preevo)]);
    addMoves(learnset, p.movimientos, name);
    if (!entry.battleOnly) Learnsets[id] = {learnset};
    FormatsData[id] = {tier: 'OU', natDexTier: 'OU'};
  }

  // Evoluciones (segunda pasada, cuando ya existen todos)
  for (const [hijo, padre] of enlaces) {
    const pid = toID(padre);
    const pe = getSp(pid) || ensureEntry(pid);
    if (!pe) { aviso(`${hijo}: la preevolución "${padre}" no existe`); continue; }
    const he = Pokedex[toID(hijo)];
    he.prevo = pe.name || base.data.Pokedex[pid].name;
    const evos = [...(pe.evos || fieldOf(pid, 'evos') || [])];
    if (!evos.includes(hijo)) evos.push(hijo);
    pe.evos = evos;
  }

  // ---------------------------------------------------------------- scripts
  const Scripts: AnyObj = {
    inherit: 'gen9',
    gen: 9,
    // Dinamax permitido en Gen 9 (una vez por combate, como en la 8.ª gen)
    side: {
      canDynamaxNow(this: any) { return !this.dynamaxUsed; },
    },
    // Solo UN poder especial por combate y jugador: Mega, Movimiento Z, Dinamax o Teracristal
    pokemon: {
      getMoveRequestData(this: any) {
        const data = Object.getPrototypeOf(this).getMoveRequestData.call(this);
        const side = this.side;
        // Poderes desactivados en la sala (formatoCon)
        const no: string[] = this.battle.format.prohibidos || [];
        if (no.includes('mega')) { delete data.canMegaEvo; delete data.canMegaEvoX; delete data.canMegaEvoY; delete data.canUltraBurst; }
        if (no.includes('z')) delete data.canZMove;
        if (no.includes('tera')) delete data.canTerastallize;
        if (no.includes('dynamax') && !this.volatiles['dynamax']) { delete data.canDynamax; delete data.maxMoves; }
        if (side.poderUsado || side.zMoveUsed || side.dynamaxUsed) {
          delete data.canMegaEvo; delete data.canMegaEvoX; delete data.canMegaEvoY; delete data.canUltraBurst;
          delete data.canZMove; delete data.canTerastallize;
          if (!this.volatiles['dynamax']) { delete data.canDynamax; delete data.maxMoves; }
          delete data.canDynamax;
        }
        return data;
      },
    },
    actions: {
      runMegaEvo(this: any, pokemon: any) {
        const r = Object.getPrototypeOf(this).runMegaEvo.call(this, pokemon);
        if (r) pokemon.side.poderUsado = true;
        return r;
      },
      terastallize(this: any, pokemon: any) {
        pokemon.side.poderUsado = true;
        return Object.getPrototypeOf(this).terastallize.call(this, pokemon);
      },
    },
    start(this: any) {
      const no: string[] = this.format.prohibidos || [];
      for (const side of this.sides) if (side) side.dynamaxUsed = no.includes('dynamax');
      if (no.length) this.add('-message', MSG_PODERES(no));
      return (Battle.prototype as any).start.call(this);
    },
    // Banda de Relevo: al cambiar manualmente, el que entra recibe las subidas.
    runAction(this: any, action: any) {
      let guardado: AnyObj | null = null;
      let side: any = null;
      let pos = 0;
      if (action.choice === 'switch' && action.pokemon?.isActive && !action.pokemon.fainted &&
          action.pokemon.hasItem('bandaderelevo')) {
        guardado = {};
        for (const [k, v] of Object.entries<number>(action.pokemon.boosts)) if (v > 0) guardado[k] = v;
        if (!Object.keys(guardado).length) guardado = null;
        side = action.pokemon.side;
        pos = action.pokemon.position;
      }
      const ret = (Battle.prototype as any).runAction.call(this, action);
      if (guardado && side) {
        const nuevo = side.active[pos];
        if (nuevo && nuevo !== action.pokemon && !nuevo.fainted) {
          this.add('-message', `¡${nuevo.name} recibió las mejoras gracias a la Banda de Relevo!`);
          for (const [k, v] of Object.entries<number>(guardado)) {
            nuevo.boosts[k] = v;
            this.add('-setboost', nuevo, k, v, '[silent]');
          }
        }
      }
      return ret;
    },
  };

  const reglas = ['Team Preview', 'Species Clause', 'Nickname Clause', 'OHKO Clause', 'Evasion Moves Clause',
    'Endless Battle Clause', 'HP Percentage Mod', 'Cancel Mod', 'Sleep Clause Mod'];
  const Formats = [
    {name: FORMATOS.singles, mod: MOD_ID, gameType: 'singles', ruleset: reglas},
    {name: FORMATOS.doubles, mod: MOD_ID, gameType: 'doubles', ruleset: reglas.filter(r => r !== 'Sleep Clause Mod')},
  ];
  BASES_FORMATO.singles = Formats[0];
  BASES_FORMATO.doubles = Formats[1];
  variantes.clear();

  const Conditions: AnyObj = {};
  for (const [id, data] of Object.entries<AnyObj>(W.DATOS_CONDICIONES || {})) Conditions[toID(id)] = {...data};
  const dex = Dex.mod(MOD_ID, {Scripts, Pokedex, Learnsets, Abilities, Moves, Items, FormatsData, Conditions} as any);
  Dex.formats.extend(Formats as any);
  cached = dex;
  return dex;
}
