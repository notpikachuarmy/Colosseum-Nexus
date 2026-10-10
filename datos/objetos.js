/* =============================================================================
 *  OBJETOS PERSONALIZADOS
 *  sprite: nombre del archivo en sprites/custom/items/ (sin .png).
 *  idPBS / nombreEN / descEN: ID, nombre y descripción en inglés (modo English y exportación PBS).
 *  Traducción del plugin "Objetos Equipables Personalizados" (Essentials 21.1)
 *  al formato de Pokémon Showdown. Los valores de balance están arriba para
 *  poder retocarlos fácilmente.
 * ========================================================================== */
/** Mensajes de combate en los dos idiomas: MSG('texto en español', 'English text') */
window.MSG = window.MSG || function (es, en) { return es + ' ‖ ' + en; };
(function () {
  const AJUSTES = {
    SHUKO_POTENCIA: 1.2,          // Shuko: +20% poder a movimientos de garra
    CHALECO_DEFENSA: 1.5,         // Chaleco Antidisturbios: +50% Defensa
    PARARRAYOS_DANO: 0.5,         // Pararrayos Portátil: daño Eléctrico recibido
    KAMIKAZE_POTENCIA: 1.5,       // Banda Kamikaze: +50% poder
    FILTRO_ABSORBENTE_CURA: 0.15, // Filtro Absorbente: % del daño causado
    ANILLO_DANO: 0.05,            // Anillo Espinado: % PS máx. del rival
    ANILLO_COSTE: 0.03,           // Anillo Espinado: % PS máx. del portador
    ETER_PROPORCION: 0.5,         // Filtro de Éter: % de la curación que se devuelve
    ABROJO_CAPAS_MAX: 3,          // Abrojo Trampa: capas máximas de Púas
    // Brazal Inversor: 'neutral' -> las inmunidades pasan a daño normal
    //                  'super'   -> pasan a ser supereficaces
    INVERSOR_INMUNIDAD: 'neutral',
  };

  // Listas de movimientos por categoría (ids de Showdown: minúsculas sin espacios)
  const GARRA = ['crushclaw', 'shadowclaw', 'dragonclaw', 'slash', 'metalclaw', 'honeclaws', 'crosspoison'];
  const RELEVO = ['uturn', 'voltswitch', 'flipturn', 'batonpass', 'partingshot'];
  const SACRIFICIO = ['explosion', 'selfdestruct', 'memento', 'finalgambit', 'mistyexplosion'];

  // Líneas fósiles para el Fragmento Meteorito (añade aquí las tuyas)
  const FOSILES = ['omanyte', 'omastar', 'kabuto', 'kabutops', 'aerodactyl', 'lileep', 'cradily', 'anorith', 'armaldo',
    'cranidos', 'rampardos', 'shieldon', 'bastiodon', 'tirtouga', 'carracosta', 'archen', 'archeops', 'tyrunt',
    'tyrantrum', 'amaura', 'aurorus', 'dracozolt', 'arctozolt', 'dracovish', 'arctovish'];
  function esFosil(battle, species) {
    let sp = species;
    for (let i = 0; sp && sp.exists && i < 4; i++) {
      if (FOSILES.includes(sp.id) || FOSILES.includes(battle.toID(sp.baseSpecies))) return true;
      if (!sp.prevo) break;
      sp = battle.dex.species.get(sp.prevo);
    }
    return false;
  }

  window.AJUSTES_OBJETOS = AJUSTES;
  window.LISTAS_OBJETOS = { GARRA, RELEVO, SACRIFICIO };

  window.DATOS_OBJETOS = {

    // ---------------------------------------------------------------- DAÑO --
    'Shuko': {
      sprite: 'SHUKO',
      desc: 'Aumenta un 20% el poder de los ataques de garra e ignora las subidas de Defensa del rival.',
      idPBS: 'SHUKO', nombreEN: 'Shuko', descEN: 'Boosts claw moves by 20% and ignores the target\'s Defense boosts.',
      fling: { basePower: 30 },
      onBasePowerPriority: 15,
      onBasePower(basePower, user, target, move) {
        if (GARRA.includes(move.id)) return this.chainModify(AJUSTES.SHUKO_POTENCIA);
      },
      onAnyModifyBoost(boosts, pokemon) {
        const holder = this.effectState.target;
        const move = this.activeMove;
        if (holder === this.activePokemon && pokemon === this.activeTarget && move &&
            GARRA.includes(move.id) && move.category === 'Physical' && boosts.def > 0) {
          boosts.def = 0;
        }
      },
    },

    'Chaleco Antidisturbios': {
      sprite: 'RIOTVEST',
      desc: 'Aumenta la Defensa un 50%, pero impide usar movimientos de estado.',
      idPBS: 'RIOTVEST', nombreEN: 'Riot Vest', descEN: 'Boosts Defense by 50%, but prevents the use of status moves.',
      fling: { basePower: 80 },
      onModifyDefPriority: 1,
      onModifyDef(def) {
        return this.chainModify(AJUSTES.CHALECO_DEFENSA);
      },
      onDisableMove(pokemon) {
        for (const moveSlot of pokemon.moveSlots) {
          const move = this.dex.moves.get(moveSlot.id);
          if (move.category === 'Status' && move.id !== 'mefirst') pokemon.disableMove(moveSlot.id);
        }
      },
    },

    'Pararrayos Portátil': {
      sprite: 'PORTABLEROD',
      desc: 'Atrae los ataques Eléctricos hacia el portador y reduce su daño a la mitad.',
      idPBS: 'PORTABLEROD', nombreEN: 'Portable Rod', descEN: 'Draws Electric-type moves to the holder and halves their damage.',
      fling: { basePower: 60 },
      onAnyRedirectTarget(target, source, source2, move) {
        if (move.type !== 'Electric' || move.flags['pledgecombo']) return;
        const holder = this.effectState.target;
        if (source.hasAbility(['stalwart', 'propellertail'])) return;
        const redirectTarget = ['randomNormal', 'adjacentFoe'].includes(move.target) ? 'normal' : move.target;
        if (this.validTarget(holder, source, redirectTarget)) {
          if (move.smartTarget) move.smartTarget = false;
          if (holder !== target) this.add('-activate', holder, 'item: Pararrayos Portátil');
          return holder;
        }
      },
      onSourceModifyDamage(damage, source, target, move) {
        if (move.type === 'Electric') return this.chainModify(AJUSTES.PARARRAYOS_DANO);
      },
    },

    'Banda Kamikaze': {
      sprite: 'HAZARDBAND',
      desc: 'Aumenta un 50% el daño de los movimientos de sacrificio, que además ignoran las pantallas.',
      idPBS: 'HAZARDBAND', nombreEN: 'Hazard Band', descEN: 'Boosts self-sacrificing moves by 50%, and they ignore screens.',
      fling: { basePower: 10 },
      onBasePowerPriority: 15,
      onBasePower(basePower, user, target, move) {
        if (SACRIFICIO.includes(move.id)) return this.chainModify(AJUSTES.KAMIKAZE_POTENCIA);
      },
      onModifyMove(move) {
        if (SACRIFICIO.includes(move.id)) move.ignoraPantallas = true;
      },
    },

    'Brazal Inversor': {
      sprite: 'INVERSIONBAND',
      desc: 'Invierte las debilidades y resistencias de tipo del portador.',
      idPBS: 'INVERSIONBAND', nombreEN: 'Inversion Band', descEN: 'Inverts the holder\'s type weaknesses and resistances.',
      fling: { basePower: 30 },
      onNegateImmunity: false,
      onEffectiveness(typeMod, target, type, move) {
        if (!move || move.category === 'Status' && move.id !== 'thunderwave') return;
        if (!this.dex.getImmunity(move, type)) {
          return AJUSTES.INVERSOR_INMUNIDAD === 'super' ? 1 : 0;
        }
        return -typeMod;
      },
    },

    // ---------------------------------------------------------- PROTECCIÓN --
    'Casco de Pruebas': {
      sprite: 'IMPACTHELMET',
      desc: 'Evita una vez el daño de retroceso o el daño por confusión. Se consume tras usarse.',
      idPBS: 'IMPACTHELMET', nombreEN: 'Impact Helmet', descEN: 'Prevents recoil or confusion damage once. Consumed after use.',
      fling: { basePower: 30 },
      onDamagePriority: 2,
      onDamage(damage, target, source, effect) {
        if (!effect) return;
        if (effect.id === 'recoil' || effect.id === 'confused') {
          if (effect.id === 'recoil' && this.activeMove && this.activeMove.id === 'struggle') return;
          if (target.useItem()) {
            this.add('-message', effect.id === 'recoil'
              ? MSG(`¡El Casco de Pruebas amortiguó el retroceso!`, `The Impact Helmet absorbed the recoil!`)
              : MSG(`¡El Casco de Pruebas evitó que se hiriera en su confusión!`, `The Impact Helmet kept it from hurting itself in confusion!`));
            return null;
          }
        }
      },
    },

    'Falso Sustituto': {
      sprite: 'FAKESUB',
      desc: 'Anula por completo el daño del primer ataque recibido. Se consume al romperse.',
      idPBS: 'FAKESUB', nombreEN: 'Fake Sub', descEN: 'Completely blocks the damage of the first attack received. Consumed when it breaks.',
      fling: { basePower: 10 },
      onDamagePriority: 1,
      onDamage(damage, target, source, effect) {
        if (effect && effect.effectType === 'Move' && source && source !== target && damage > 0) {
          if (target.useItem()) {
            this.add('-message', MSG(`¡El Falso Sustituto recibió el golpe en su lugar!`, `The Fake Sub took the hit instead!`));
            return 0;
          }
        }
      },
    },

    'Ancla': {
      sprite: 'AEROANCHOR',
      desc: 'Evita que el portador sea forzado a cambiarse por ataques u objetos del rival.',
      idPBS: 'AEROANCHOR', nombreEN: 'Aero Anchor', descEN: 'Prevents the holder from being forced out by the foe\'s moves or items.',
      fling: { basePower: 100 },
      onDragOutPriority: 1,
      onDragOut(pokemon) {
        this.add('-activate', pokemon, 'item: Ancla');
        return null;
      },
    },

    'Capa Térmica': {
      sprite: 'THERMALCLOAK',
      desc: 'Protege del daño del granizo y evita las quemaduras.',
      idPBS: 'THERMALCLOAK', nombreEN: 'Thermal Cloak', descEN: 'Protects from hail damage and prevents burns.',
      fling: { basePower: 10 },
      onImmunity(type) {
        if (type === 'hail') return false;
      },
      onSetStatus(status, target, source, effect) {
        if (status.id !== 'brn') return;
        if (effect && effect.status) this.add('-immune', target, '[from] item: Capa Térmica');
        return false;
      },
      onUpdate(pokemon) {
        if (pokemon.status === 'brn') {
          this.add('-activate', pokemon, 'item: Capa Térmica');
          pokemon.cureStatus();
        }
      },
    },

    'Sello del Guardián': {
      sprite: 'WARDSEAL',
      desc: 'Impide que el rival reduzca las características del portador.',
      idPBS: 'WARDSEAL', nombreEN: 'Ward Seal', descEN: 'Prevents foes from lowering the holder\'s stats.',
      fling: { basePower: 30 },
      onTryBoostPriority: 2,
      onTryBoost(boost, target, source, effect) {
        if (!source || target === source) return;
        let showMsg = false;
        for (const i in boost) {
          if (boost[i] < 0) { delete boost[i]; showMsg = true; }
        }
        if (showMsg && !(effect && effect.secondaries)) {
          this.add('-fail', target, 'unboost', '[from] item: Sello del Guardián', `[of] ${target}`);
        }
      },
    },

    // ----------------------------------------------- BAJADAS DE CARACTERÍSTICAS --
    'Piedra Espejo': {
      sprite: 'REFLECTMIRROR',
      desc: 'Devuelve al rival la primera bajada de características que provoque. Se consume.',
      idPBS: 'REFLECTMIRROR', nombreEN: 'Reflect Mirror', descEN: 'Reflects the first stat drop a foe causes back at it. Consumed.',
      fling: { basePower: 30 },
      onTryBoostPriority: 1,
      onTryBoost(boost, target, source, effect) {
        if (!source || target === source || !boost || effect?.id === 'piedraespejo') return;
        if (target.hasAbility(['contrary', 'mirrorarmor'])) return;
        const negativo = {};
        let hay = false;
        for (const b in boost) {
          if (boost[b] < 0 && target.boosts[b] > -6) { negativo[b] = boost[b]; delete boost[b]; hay = true; }
        }
        if (!hay) return;
        if (!target.useItem()) { Object.assign(boost, negativo); return; }
        this.add('-message', MSG(`¡La Piedra Espejo devolvió la bajada de características!`, `The Reflect Mirror bounced the stat drop back!`));
        if (source.hp) this.boost(negativo, source, target, this.dex.items.get('Piedra Espejo'), true);
      },
    },

    'Piedra del Caos': {
      sprite: 'CHAOSSTONE',
      desc: 'Sube al azar una característica cuando el rival baja las del portador.',
      idPBS: 'CHAOSSTONE', nombreEN: 'Chaos Stone', descEN: 'Randomly raises a stat when a foe lowers the holder\'s stats.',
      fling: { basePower: 30 },
      onAfterEachBoost(boost, target, source, effect) {
        if (!source || target.isAlly(source) || target.hasAbility('contrary')) return;
        let bajada = false;
        for (const i in boost) if (boost[i] < 0) bajada = true;
        if (!bajada) return;
        const opciones = ['atk', 'def', 'spa', 'spd', 'spe'].filter(s => target.boosts[s] < 6);
        if (!opciones.length) return;
        const stat = this.sample(opciones);
        this.add('-activate', target, 'item: Piedra del Caos');
        this.boost({ [stat]: 1 }, target, target, null, false, true);
      },
    },

    // ------------------------------------------------------------- CAMBIOS --
    'Abrojo Trampa': {
      sprite: 'CALTROPS',
      desc: 'Pone una capa de Púas en el campo rival si el portador se retira con un movimiento de relevo.',
      idPBS: 'CALTROPS', nombreEN: 'Caltrops', descEN: 'Sets a layer of Spikes on the foe\'s side if the holder switches out with a pivot move.',
      fling: { basePower: 30 },
      onAfterMove(pokemon, target, move) {
        if (!RELEVO.includes(move.id) || !pokemon.switchFlag || !this.canSwitch(pokemon.side)) return;
        for (const foeSide of [pokemon.side.foe]) {
          const spikes = foeSide.sideConditions['spikes'];
          if (spikes && spikes.layers >= AJUSTES.ABROJO_CAPAS_MAX) continue;
          this.add('-activate', pokemon, 'item: Abrojo Trampa');
          foeSide.addSideCondition('spikes', pokemon);
        }
      },
    },

    // La Banda de Relevo se gestiona en el motor (ver 'relayband' en mod.js):
    // al cambiar manualmente, el Pokémon que entra recibe las mejoras.
    'Banda de Relevo': {
      sprite: 'RELAYBAND',
      desc: 'Al cambiar de Pokémon manualmente, el que entra recibe las mejoras de características.',
      idPBS: 'RELAYBAND', nombreEN: 'Relay Band', descEN: 'When switching manually, the incoming Pokémon receives the stat boosts.',
      fling: { basePower: 10 },
    },

    // ------------------------------------------------------ TRAS GOLPEAR --
    'Filtro Absorbente': {
      sprite: 'ABSORBFILTER',
      desc: 'Cura al portador un 15% del daño que causa con movimientos de tipo Agua.',
      idPBS: 'ABSORBFILTER', nombreEN: 'Absorb Filter', descEN: 'Heals the holder by 15% of the damage dealt with Water-type moves.',
      fling: { basePower: 10 },
      onAfterMoveSecondarySelfPriority: -1,
      onAfterMoveSecondarySelf(pokemon, target, move) {
        if (move.type === 'Water' && move.totalDamage && !pokemon.forceSwitchFlag) {
          this.heal(move.totalDamage * AJUSTES.FILTRO_ABSORBENTE_CURA, pokemon);
        }
      },
    },

    'Anillo Espinado': {
      sprite: 'THORNRING',
      desc: 'Los ataques de contacto quitan un 5% extra al rival, pero cuestan un 3% de los PS del portador.',
      idPBS: 'THORNRING', nombreEN: 'Thorn Ring', descEN: 'Contact moves deal an extra 5% to the foe, but cost the holder 3% of its HP.',
      fling: { basePower: 30 },
      onSourceDamagingHit(damage, target, source, move) {
        if (!this.checkMoveMakesContact(move, source, target)) return;
        if (!move.anilloObjetivos) move.anilloObjetivos = [];
        if (!move.anilloObjetivos.includes(target)) move.anilloObjetivos.push(target);
      },
      onAfterMoveSecondarySelf(source, target, move) {
        const objetivos = move.anilloObjetivos;
        if (!objetivos || !objetivos.length) return;
        move.anilloObjetivos = null;
        let golpe = false;
        for (const t of objetivos) {
          if (!t.hp || !t.isActive) continue;
          this.add('-activate', source, 'item: Anillo Espinado');
          this.damage(Math.max(1, Math.floor(t.baseMaxhp * AJUSTES.ANILLO_DANO)), t, source,
            this.dex.items.get('Anillo Espinado'));
          golpe = true;
        }
        if (golpe && source.hp) {
          this.damage(Math.max(1, Math.floor(source.baseMaxhp * AJUSTES.ANILLO_COSTE)), source, source,
            this.dex.items.get('Anillo Espinado'));
        }
      },
    },

    'Filtro de Éter': {
      sprite: 'ETHERFILTER',
      desc: 'Anula los drenajes del rival y le inflige la mitad de lo que iba a curarse.',
      idPBS: 'ETHERFILTER', nombreEN: 'Ether Filter', descEN: 'Nullifies the foe\'s draining moves and inflicts half of what it would have healed.',
      fling: { basePower: 10 },
      onSourceTryHeal(damage, target, source, effect) {
        const drenajes = ['drain', 'leechseed', 'strengthsap'];
        if (!effect || !drenajes.includes(effect.id)) return;
        if (this.effectState.target.hasAbility('liquidooze')) return;
        this.add('-activate', this.effectState.target, 'item: Filtro de Éter');
        this.damage(Math.max(1, Math.round(damage * AJUSTES.ETER_PROPORCION)), target,
          this.effectState.target, this.dex.items.get('Filtro de Éter'));
        return 0;
      },
    },

    // ===================== Pack "Objetos y Movimientos Custom" (v21) =====================
    'Bebida Energética': {
      sprite: 'BEBIDAENERGICA',
      desc: 'Da +1 de prioridad al siguiente movimiento del portador. Se consume al usarlo.',
      idPBS: 'ENERGYDRINK', nombreEN: 'Energy Drink', descEN: 'Gives +1 priority to the holder\'s next move. Consumed when used.',
      fling: { basePower: 30 },
      onModifyPriority(priority, pokemon, target, move) {
        if (move && move.category !== undefined) return priority + 1;
      },
      onBeforeMovePriority: 1,
      onBeforeMove(pokemon) {
        if (pokemon.useItem()) this.add('-message', MSG(`¡${pokemon.name} se bebió su Bebida Energética y actuó más rápido!`, `${pokemon.name} drank its Energy Drink and moved faster!`));
      },
    },

    'Bomba de Humo': {
      sprite: 'BOMBAHUMO',
      desc: 'Si el portador recibe un ataque físico, estalla y baja la Precisión del atacante. Se consume.',
      idPBS: 'SMOKEBOMB', nombreEN: 'Smoke Bomb', descEN: 'If the holder is hit by a physical move, it bursts and lowers the attacker\'s accuracy. Consumed.',
      fling: { basePower: 30 },
      onDamagingHit(damage, target, source, move) {
        if (move.category !== 'Physical' || !source || source === target || !source.hp) return;
        if (source.boosts.accuracy <= -6) return;
        if (target.useItem()) {
          this.add('-message', MSG(`¡La Bomba de Humo de ${target.name} estalló y llenó todo de humo!`, `${target.name}'s Smoke Bomb burst and filled the field with smoke!`));
          this.boost({ accuracy: -1 }, source, target);
        }
      },
    },

    'Pluma Vendaval': {
      sprite: 'PLUMAVENDAVAL',
      desc: 'Potencia un 30% los movimientos con prioridad, o un 10% si el portador ya era más rápido.',
      idPBS: 'GALEFEATHER', nombreEN: 'Gale Feather', descEN: 'Boosts priority moves by 30%, or by 10% if the holder was already faster.',
      fling: { basePower: 10 },
      onBasePowerPriority: 15,
      onBasePower(basePower, user, target, move) {
        if (!(move.priority > 0) || !target) return;
        const espacioRaro = !!this.field.getPseudoWeather('trickroom');
        const masRapido = espacioRaro ? user.getStat('spe') < target.getStat('spe') : user.getStat('spe') > target.getStat('spe');
        return this.chainModify(masRapido ? 1.1 : 1.3);
      },
    },

    'Farol Revelador': {
      sprite: 'FAROLREVELADOR',
      desc: 'Ignora las subidas de Evasión del objetivo y las bajadas de Precisión del portador.',
      idPBS: 'REVEALINGLANTERN', nombreEN: 'Revealing Lantern', descEN: 'Ignores the target\'s evasion boosts and the holder\'s accuracy drops.',
      fling: { basePower: 30 },
      onAnyModifyBoost(boosts, pokemon) {
        const portador = this.effectState.target;
        if (pokemon === portador && boosts.accuracy < 0) boosts.accuracy = 0;
        if (portador === this.activePokemon && pokemon === this.activeTarget && boosts.evasion > 0) boosts.evasion = 0;
      },
    },

    'Fragmento Meteorito': {
      sprite: 'FRAGMENTOMETEORITO',
      desc: 'Sube un 15% la Defensa de los Pokémon de tipo Roca o de una línea evolutiva fósil.',
      idPBS: 'METEORFRAGMENT', nombreEN: 'Meteor Fragment', descEN: 'Boosts the Defense of Rock-type or fossil Pokémon by 15%.',
      fling: { basePower: 60 },
      onModifyDefPriority: 2,
      onModifyDef(def, pokemon) {
        if (pokemon.hasType('Rock') || esFosil(this, pokemon.species)) return this.chainModify(1.15);
      },
    },

    'Lana Suave': {
      sprite: 'LANASUAVE',
      desc: 'Reduce un 15% el daño de los movimientos físicos de contacto que recibe el portador.',
      idPBS: 'SOFTWOOL', nombreEN: 'Soft Wool', descEN: 'Reduces damage from physical contact moves by 15%.',
      fling: { basePower: 10 },
      onSourceModifyDamage(damage, source, target, move) {
        if (move.category === 'Physical' && this.checkMoveMakesContact(move, source, target)) return this.chainModify(0.85);
      },
    },

    'Medalla de Mérito': {
      sprite: 'MEDALLAMERITO',
      desc: 'Potencia un 10% los movimientos del portador contra Pokémon de mayor nivel.',
      idPBS: 'MERITMEDAL', nombreEN: 'Merit Medal', descEN: 'Boosts the holder\'s moves by 10% against higher-level Pokémon.',
      fling: { basePower: 30 },
      onBasePowerPriority: 15,
      onBasePower(basePower, user, target) {
        if (target && target.level > user.level) return this.chainModify(1.1);
      },
    },
  };
})();

/* =============================================================================
 *  OBJETOS DE EVOLUCIÓN (no se usan en combate; se exportan a PBS y salen en la Pokédex)
 *  La clave es el ID de Essentials, que es el que se pone en metodoPBS de pokemon.js
 *  (por ejemplo metodoPBS: 'Item,ANCIENTLETTER').
 *  tipo: 'piedra' (se usa sobre el Pokémon) o 'equipable' (evoluciona al subir de nivel llevándolo).
 * ========================================================================== */
window.OBJETOS_EVOLUCION = {
  COMIC: { nombre: 'Cómic', nombreEN: 'Comic', sprite: 'COMIC', tipo: 'equipable',
    desc: 'Un cómic de superhéroes. Hace evolucionar a cierto Pokémon si sube de nivel llevándolo.',
    descEN: 'A superhero comic. Makes a certain Pokémon evolve if it levels up while holding it.' },
  JOUSTINGLANCE: { nombre: 'Roquete', nombreEN: 'Jousting Lance', sprite: 'ROQUETE', tipo: 'piedra',
    desc: 'Una lanza de justa. Hace evolucionar a cierto Pokémon.',
    descEN: 'A jousting lance. Makes a certain Pokémon evolve.' },
  ANCIENTLETTER: { nombre: 'Carta Antigua', nombreEN: 'Ancient Letter', sprite: 'CARTAANTIGUA', tipo: 'piedra',
    desc: 'Una carta escrita hace siglos. Hace evolucionar a ciertos Pokémon.',
    descEN: 'A letter written centuries ago. Makes certain Pokémon evolve.' },
  GOLDENARMOR: { nombre: 'Armadura Dorada', nombreEN: 'Golden Armor', sprite: 'ARMADURADORADA', tipo: 'piedra',
    desc: 'Una armadura diminuta y reluciente. Hace evolucionar a cierto Pokémon.',
    descEN: 'A tiny, shining suit of armor. Makes a certain Pokémon evolve.' },
};
