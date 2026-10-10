/* =============================================================================
 *  OBJETOS PERSONALIZADOS
 *  sprite: nombre del archivo en sprites/custom/items/ (sin .png).
 *  Traducción del plugin "Objetos Equipables Personalizados" (Essentials 21.1)
 *  al formato de Pokémon Showdown. Los valores de balance están arriba para
 *  poder retocarlos fácilmente.
 * ========================================================================== */
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

  window.AJUSTES_OBJETOS = AJUSTES;
  window.LISTAS_OBJETOS = { GARRA, RELEVO, SACRIFICIO };

  window.DATOS_OBJETOS = {

    // ---------------------------------------------------------------- DAÑO --
    'Shuko': {
      sprite: 'SHUKO',
      desc: 'Aumenta un 20% el poder de los ataques de garra e ignora las subidas de Defensa del rival.',
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
      fling: { basePower: 30 },
      onDamagePriority: 2,
      onDamage(damage, target, source, effect) {
        if (!effect) return;
        if (effect.id === 'recoil' || effect.id === 'confused') {
          if (effect.id === 'recoil' && this.activeMove && this.activeMove.id === 'struggle') return;
          if (target.useItem()) {
            this.add('-message', effect.id === 'recoil'
              ? `¡El Casco de Pruebas amortiguó el retroceso!`
              : `¡El Casco de Pruebas evitó que se hiriera en su confusión!`);
            return null;
          }
        }
      },
    },

    'Falso Sustituto': {
      sprite: 'FAKESUB',
      desc: 'Anula por completo el daño del primer ataque recibido. Se consume al romperse.',
      fling: { basePower: 10 },
      onDamagePriority: 1,
      onDamage(damage, target, source, effect) {
        if (effect && effect.effectType === 'Move' && source && source !== target && damage > 0) {
          if (target.useItem()) {
            this.add('-message', `¡El Falso Sustituto recibió el golpe en su lugar!`);
            return 0;
          }
        }
      },
    },

    'Ancla': {
      sprite: 'AEROANCHOR',
      desc: 'Evita que el portador sea forzado a cambiarse por ataques u objetos del rival.',
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
        this.add('-message', `¡La Piedra Espejo devolvió la bajada de características!`);
        if (source.hp) this.boost(negativo, source, target, this.dex.items.get('Piedra Espejo'), true);
      },
    },

    'Piedra del Caos': {
      sprite: 'CHAOSSTONE',
      desc: 'Sube al azar una característica cuando el rival baja las del portador.',
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
      fling: { basePower: 10 },
    },

    // ------------------------------------------------------ TRAS GOLPEAR --
    'Filtro Absorbente': {
      sprite: 'ABSORBFILTER',
      desc: 'Cura al portador un 15% del daño que causa con movimientos de tipo Agua.',
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
  };
})();
