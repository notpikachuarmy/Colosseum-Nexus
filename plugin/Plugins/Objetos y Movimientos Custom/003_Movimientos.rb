#===============================================================================
# Objetos y Movimientos Custom - Códigos de función de los movimientos
#===============================================================================

#===============================================================================
# Proyección Maldita (Curse Reel)
# 30%: baja 1 la Precisión o confunde (al azar). Si el objetivo cambia de
# Pokémon antes de que acabe el turno siguiente, recibe un 25% del daño que le
# hizo el movimiento.
#===============================================================================
class Battle::Move::LowerTargetAccuracyOrConfuseHurtOnSwitch < Battle::Move
  def pbEffectAgainstTarget(user, target)
    return if target.fainted? || target.damageState.substitute
    return if target.damageState.hpLost <= 0
    target.effects[PBEffects::CurseReel]       = 2
    target.effects[PBEffects::CurseReelDamage] = [target.damageState.hpLost / 4, 1].max
    @battle.pbDisplay(_INTL("¡{1} quedó atrapado en una escena de pesadilla!", target.pbThis))
  end

  def pbAdditionalEffect(user, target)
    return if target.fainted? || target.damageState.substitute
    options = []
    options.push(:CONFUSION) if target.pbCanConfuse?(user, false, self)
    options.push(:ACCURACY) if target.pbCanLowerStatStage?(:ACCURACY, user, self)
    return if options.empty?
    if options[@battle.pbRandom(options.length)] == :CONFUSION
      target.pbConfuse
    else
      target.pbLowerStatStage(:ACCURACY, 1, user)
    end
  end
end

#===============================================================================
# Gas de Paranoia (Phobia Gas)
# Baja 2 la Velocidad e inflige Paranoia: confusión de 2-3 turnos; si se hiere a
# sí mismo, se le cae el objeto (y el usuario lo recoge con Prestidigitador o
# Hurto si no lleva nada).
#===============================================================================
class Battle::Move::LowerTargetSpeed2InflictParanoia < Battle::Move
  def pbEffectAgainstTarget(user, target)
    return if target.fainted? || target.damageState.substitute
    if target.pbCanLowerStatStage?(:SPEED, user, self)
      target.pbLowerStatStage(:SPEED, 2, user)
    end
    return if !target.pbCanConfuse?(user, false, self)
    target.effects[PBEffects::Paranoia]       = user.index
    target.effects[PBEffects::ParanoiaSource] = user.pokemon
    target.pbConfuse(_INTL("¡{1} revive sus peores pesadillas y cae en la paranoia!", target.pbThis))
    # 2-3 turnos de confusión (salvo que una baya la haya curado al instante)
    if target.effects[PBEffects::Confusion] > 0
      target.effects[PBEffects::Confusion] = 3 + @battle.pbRandom(2)
    end
  end
end

#===============================================================================
# Supernova Gemela (Twin Supernova)
# Baja 1 nivel la Defensa o la Defensa Especial del objetivo (al azar).
#===============================================================================
class Battle::Move::LowerTargetDefOrSpDef1Random < Battle::Move
  def pbAdditionalEffect(user, target)
    return if target.fainted? || target.damageState.substitute
    stats = [:DEFENSE, :SPECIAL_DEFENSE].select { |s| target.pbCanLowerStatStage?(s, user, self) }
    return if stats.empty?
    target.pbLowerStatStage(stats[@battle.pbRandom(stats.length)], 1, user)
  end
end

#===============================================================================
# Impacto Sísmico (Fault Strike)
# Ignora las subidas de Defensa del objetivo y rompe Reflejo, Pantalla de Luz y
# Velo Aurora.
#===============================================================================
class Battle::Move::IgnoreTargetDefRaisesRemoveScreens < Battle::Move::RemoveScreens
  def pbGetDefenseStats(user, target)
    ret1, ret2 = super
    return ret1, [ret2, Battle::Battler::STAT_STAGE_MAXIMUM].min
  end
end

#===============================================================================
# Niebla Espejo (Reflective Frost)
# Este turno: recibe la mitad de daño de ataques especiales y devuelve las
# bajadas de características.
#===============================================================================
class Battle::Move::HalveSpecialDamageReflectStatDropsThisRound < Battle::Move
  def canSnatch?; return true; end

  def pbMoveFailed?(user, targets)
    if user.effects[PBEffects::ReflectiveFrost]
      @battle.pbDisplay(_INTL("But it failed!"))
      return true
    end
    return false
  end

  def pbEffectGeneral(user)
    user.effects[PBEffects::ReflectiveFrost] = true
    @battle.pbDisplay(_INTL("¡{1} se cubrió con un escudo de escarcha deslumbrante!", user.pbThis))
  end
end

#===============================================================================
# Corte Fotosintético (Sunlight Blade)
# Índice de crítico alto (flag en el PBS). Potencia x1,5 (105) con sol.
#===============================================================================
class Battle::Move::IncreasePowerInSun < Battle::Move
  def pbBaseDamage(baseDmg, user, target)
    baseDmg = (baseDmg * 1.5).round if [:Sun, :HarshSun].include?(user.effectiveWeather)
    return baseDmg
  end
end

#===============================================================================
# Desvío de Impacto (Parry Strike)
# Crítico garantizado si el objetivo ya usó un movimiento de contacto este turno.
#===============================================================================
class Battle::Move::AlwaysCriticalIfTargetUsedContactMove < Battle::Move
  def pbCritialOverride(user, target)
    return 0 if !target.movedThisRound? || !target.lastMoveUsed
    move_data = GameData::Move.try_get(target.lastMoveUsed)
    return 1 if move_data && move_data.has_flag?("Contact")
    return 0
  end
end

#===============================================================================
# Destello Cegador (Blinding Flash)
# Baja 1 el Ataque y el At. Esp. del objetivo si ataca este mismo turno.
#===============================================================================
class Battle::Move::LowerTargetAtkSpAtk1IfTargetAttacks < Battle::Move
  def pbEffectAgainstTarget(user, target)
    return if target.fainted? || target.damageState.substitute
    choice = @battle.choices[target.index]
    return if !choice || choice[0] != :UseMove || !choice[2] || choice[2].statusMove?
    showAnim = true
    [:ATTACK, :SPECIAL_ATTACK].each do |stat|
      next if !target.pbCanLowerStatStage?(stat, user, self)
      showAnim = false if target.pbLowerStatStage(stat, 1, user, showAnim)
    end
  end
end

#===============================================================================
# Ceniza Sofocante (Choking Ash)
# Durante 3 turnos, los rivales que no sean Fuego, Acero o Roca tienen un 30% de
# fallar sus movimientos físicos. Precisión propia del movimiento: 90%.
#===============================================================================
class Battle::Move::StartChokingAshOnFoeSide < Battle::Move
  def pbMoveFailed?(user, targets)
    if user.pbOpposingSide.effects[PBEffects::ChokingAsh] > 0
      @battle.pbDisplay(_INTL("But it failed!"))
      return true
    end
    if @accuracy > 0 && @battle.pbRandom(100) >= @accuracy
      @battle.pbDisplay(_INTL("¡Pero la ceniza se dispersó sin efecto!"))
      return true
    end
    return false
  end

  def pbEffectGeneral(user)
    user.pbOpposingSide.effects[PBEffects::ChokingAsh] = 3
    if user.idxOwnSide == 0
      @battle.pbDisplay(_INTL("¡Una nube de ceniza ardiente cubrió al equipo rival!"))
    else
      @battle.pbDisplay(_INTL("¡Una nube de ceniza ardiente cubrió a tu equipo!"))
    end
  end
end

#===============================================================================
# Corte Glacial (Frost Edge)
# Ignora los cambios de Defensa/Def. Esp. (y Evasión) del objetivo, como Espada
# Santa. 10% de congelar.
#===============================================================================
class Battle::Move::IgnoreTargetDefSpDefEvaStatStagesFreezeTarget < Battle::Move::IgnoreTargetDefSpDefEvaStatStages
  def pbAdditionalEffect(user, target)
    return if target.damageState.substitute
    target.pbFreeze if target.pbCanFreeze?(user, false, self)
  end
end

#===============================================================================
# Fisura Táctica (Tectonic Pit)
# Elimina las trampas de ambos lados del campo y el objetivo no puede cambiar
# hasta el final del turno siguiente.
#===============================================================================
class Battle::Move::RemoveEntryHazardsTrapTargetOneTurn < Battle::Move
  def pbHazardsOnSide?(side)
    return side.effects[PBEffects::StealthRock] || side.effects[PBEffects::Spikes] > 0 ||
           side.effects[PBEffects::ToxicSpikes] > 0 || side.effects[PBEffects::StickyWeb]
  end

  def pbCanTrap?(target)
    return false if target.effects[PBEffects::TectonicPit] > 0
    return false if Settings::MORE_TYPE_EFFECTS && target.pbHasType?(:GHOST)
    return true
  end

  def pbFailsAgainstTarget?(user, target, show_message)
    return false if pbHazardsOnSide?(user.pbOwnSide) || pbHazardsOnSide?(user.pbOpposingSide)
    return false if pbCanTrap?(target)
    @battle.pbDisplay(_INTL("But it failed!")) if show_message
    return true
  end

  def pbEffectAgainstTarget(user, target)
    [user.pbOwnSide, user.pbOpposingSide].each do |side|
      next if !pbHazardsOnSide?(side)
      side.effects[PBEffects::StealthRock] = false
      side.effects[PBEffects::Spikes]      = 0
      side.effects[PBEffects::ToxicSpikes] = 0
      side.effects[PBEffects::StickyWeb]   = false
      if side == @battle.sides[0]
        @battle.pbDisplay(_INTL("¡La fisura aplastó las trampas del campo de tu equipo!"))
      else
        @battle.pbDisplay(_INTL("¡La fisura aplastó las trampas del campo rival!"))
      end
    end
    return if !pbCanTrap?(target)
    target.effects[PBEffects::TectonicPit] = 2
    @battle.pbDisplay(_INTL("¡{1} quedó atrapado en la zanja y no puede huir!", target.pbThis))
  end
end

#===============================================================================
# Golpe de Ventisca (Gale Strike)
# Potencia x1,5 (75) con lluvia o sol.
#===============================================================================
class Battle::Move::IncreasePowerInRainOrSun < Battle::Move
  def pbBaseDamage(baseDmg, user, target)
    if [:Sun, :HarshSun, :Rain, :HeavyRain].include?(user.effectiveWeather)
      baseDmg = (baseDmg * 1.5).round
    end
    return baseDmg
  end
end

#===============================================================================
# Sobrecarga Neural (Psychic Overload)
# Si un rival va a usar un movimiento con prioridad, este movimiento se adelanta
# a él y, contra ese objetivo, hace el doble de daño.
#===============================================================================
class Battle::Move::MovesBeforePriorityFoeDoublePower < Battle::Move
  def pbFoePriority(user)
    ret = nil
    @battle.allOtherSideBattlers(user.index).each do |b|
      choice = @battle.choices[b.index]
      next if !choice || choice[0] != :UseMove || !choice[2]
      next if choice[2].function_code == @function_code
      pri = choice[2].pbPriority(b)
      pri = Battle::AbilityEffects.triggerPriorityChange(b.ability, b, choice[2], pri) if b.abilityActive?
      ret = pri if pri > 0 && (ret.nil? || pri > ret)
    end
    return ret
  end

  def pbPriority(user)
    ret = super
    foe_pri = pbFoePriority(user)
    ret = [ret, foe_pri + 1].max if foe_pri
    return ret
  end

  def pbBaseDamage(baseDmg, user, target)
    choice = @battle.choices[target.index]
    if choice && choice[0] == :UseMove && choice[2] &&
       choice[2].function_code != @function_code && choice[4].to_i > 0
      baseDmg *= 2
    end
    return baseDmg
  end
end
