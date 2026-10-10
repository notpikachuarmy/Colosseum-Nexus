#===============================================================================
# Objetos que modifican el cálculo de daño
#===============================================================================

#-------------------------------------------------------------------------------
# SHUKO: +20% a movimientos de garra e ignora las subidas de Defensa del rival.
#-------------------------------------------------------------------------------
Battle::ItemEffects::DamageCalcFromUser.add(:SHUKO,
  proc { |item, user, target, move, mults, power, type|
    next if !CustomHeldItems.claw?(move)
    mults[:power_multiplier] *= CustomHeldItems::SHUKO_POWER_MULT
    next if !move.physicalMove?(type)
    next if target.damageState.critical        # Los críticos ya las ignoran
    next if user.hasActiveAbility?(:UNAWARE)   # Ignorante ya las ignora
    stage = target.stages[:DEFENSE] || 0
    next if stage <= 0
    # Deshace el multiplicador de etapa positiva: (2 + etapa) / 2
    mults[:defense_multiplier] /= (2 + stage) / 2.0
  }
)

#-------------------------------------------------------------------------------
# CHALECO ANTIDISTURBIOS: +50% Defensa, no puede elegir movimientos de estado.
#-------------------------------------------------------------------------------
Battle::ItemEffects::DamageCalcFromTarget.add(:RIOTVEST,
  proc { |item, user, target, move, mults, power, type|
    mults[:defense_multiplier] *= CustomHeldItems::RIOTVEST_DEF_MULT if move.physicalMove?(type)
  }
)

class Battle::Battler
  alias __chi_riotvest_pbCanChooseMove? pbCanChooseMove?
  def pbCanChooseMove?(move, commandPhase, showMessages = true, specialUsage = false)
    if commandPhase && move.statusMove? && hasActiveItem?(:RIOTVEST)
      if showMessages
        @battle.pbDisplayPaused(_INTL("¡El {1} impide usar movimientos de estado!", itemName))
      end
      return false
    end
    return __chi_riotvest_pbCanChooseMove?(move, commandPhase, showMessages, specialUsage)
  end
end

#-------------------------------------------------------------------------------
# PARARRAYOS PORTÁTIL: atrae ataques Eléctricos de un solo objetivo y los
# recibe a la mitad de daño.
#-------------------------------------------------------------------------------
Battle::ItemEffects::DamageCalcFromTarget.add(:PORTABLEROD,
  proc { |item, user, target, move, mults, power, type|
    mults[:final_damage_multiplier] *= CustomHeldItems::PORTABLEROD_DMG_MULT if type == :ELECTRIC
  }
)

class Battle::Battler
  alias __chi_portablerod_pbChangeTargets pbChangeTargets
  def pbChangeTargets(move, user, targets)
    targets = __chi_portablerod_pbChangeTargets(move, user, targets)
    return targets if @battle.switching
    return targets if targets.length != 1 || move.calcType != :ELECTRIC
    return targets if move.cannotRedirect? || move.targetsPosition?
    target_data = move.pbTarget(user)
    return targets if !target_data.can_target_one_foe?
    return targets if user.hasActiveAbility?([:STALWART, :PROPELLERTAIL])
    return targets if targets[0].hasActiveItem?(:PORTABLEROD) ||
                      targets[0].hasActiveAbility?(:LIGHTNINGROD)
    nearOnly = !target_data.can_choose_distant_target?
    @battle.pbPriority(true).each do |b|
      next if b.index == user.index || b.index == targets[0].index
      next if !b.hasActiveItem?(:PORTABLEROD)
      next if nearOnly && !b.near?(user)
      @battle.pbDisplay(_INTL("¡{1} atrajo el ataque con su {2}!", b.pbThis, b.itemName))
      return [b]
    end
    return targets
  end
end

#-------------------------------------------------------------------------------
# BANDA KAMIKAZE: +50% a movimientos de sacrificio e ignora pantallas.
#-------------------------------------------------------------------------------
Battle::ItemEffects::DamageCalcFromUser.add(:HAZARDBAND,
  proc { |item, user, target, move, mults, power, type|
    mults[:power_multiplier] *= CustomHeldItems::HAZARDBAND_POWER_MULT if CustomHeldItems.sacrifice?(move)
  }
)

class Battle::Move
  alias __chi_hazardband_pbCalcDamageMultipliers pbCalcDamageMultipliers
  def pbCalcDamageMultipliers(user, target, numTargets, type, baseDmg, multipliers)
    @chi_ignore_screens = user.hasActiveItem?(:HAZARDBAND) && CustomHeldItems.sacrifice?(self)
    __chi_hazardband_pbCalcDamageMultipliers(user, target, numTargets, type, baseDmg, multipliers)
  ensure
    @chi_ignore_screens = false
  end

  alias __chi_hazardband_ignoresReflect? ignoresReflect?
  def ignoresReflect?
    return true if @chi_ignore_screens
    return __chi_hazardband_ignoresReflect?
  end
end

#-------------------------------------------------------------------------------
# BRAZAL INVERSOR: invierte debilidades y resistencias del portador.
#-------------------------------------------------------------------------------
class Battle::Move
  alias __chi_inversion_pbCalcTypeModSingle pbCalcTypeModSingle
  def pbCalcTypeModSingle(moveType, defType, user, target)
    ret = __chi_inversion_pbCalcTypeModSingle(moveType, defType, user, target)
    return ret if !target || !target.hasActiveItem?(:INVERSIONBAND)
    normal = Effectiveness::NORMAL_EFFECTIVE_MULTIPLIER
    if ret == 0
      return (CustomHeldItems::INVERSION_IMMUNITY == :super) ? normal * 2 : normal
    end
    return normal * normal / ret.to_f   # x2 -> x0.5, x0.5 -> x2, x1 -> x1
  end
end
