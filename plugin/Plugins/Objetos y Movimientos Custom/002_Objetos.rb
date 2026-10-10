#===============================================================================
# Objetos y Movimientos Custom - Objetos
#===============================================================================

#-------------------------------------------------------------------------------
# Bebida Energética: +1 de prioridad al siguiente movimiento. Se consume.
#-------------------------------------------------------------------------------
class Battle::Move
  alias __custom_pbPriority pbPriority unless method_defined?(:__custom_pbPriority)

  def pbPriority(user)
    ret = __custom_pbPriority(user)
    ret += 1 if user.hasActiveItem?(:ENERGYDRINK)
    return ret
  end
end

class Battle::Battler
  alias __custom_pbUseMove pbUseMove unless method_defined?(:__custom_pbUseMove)

  def pbUseMove(choice, specialUsage = false)
    if !specialUsage && choice[0] == :UseMove && choice[2] &&
       hasActiveItem?(:ENERGYDRINK) && !usingMultiTurnAttack?
      @battle.pbCommonAnimation("UseItem", self)
      @battle.pbDisplay(_INTL("¡{1} se bebió su {2} y actuó más rápido!", pbThis, itemName))
      pbConsumeItem
    end
    __custom_pbUseMove(choice, specialUsage)
  end
end

#-------------------------------------------------------------------------------
# Bomba de Humo: si recibe un ataque físico, se consume y baja 1 nivel la
# Precisión del atacante.
#-------------------------------------------------------------------------------
Battle::ItemEffects::OnBeingHit.add(:SMOKEBOMB,
  proc { |item, user, target, move, battle|
    next if !move.physicalMove?
    next if user.fainted? || user.index == target.index
    next if !user.pbCanLowerStatStage?(:ACCURACY, target)
    battle.pbCommonAnimation("UseItem", target)
    battle.pbDisplay(_INTL("¡La {1} de {2} estalló y llenó todo de humo!", target.itemName, target.pbThis(true)))
    user.pbLowerStatStage(:ACCURACY, 1, target)
    target.pbHeldItemTriggered(item)
  }
)

#-------------------------------------------------------------------------------
# Pluma Vendaval: movimientos con prioridad +30% de potencia, o solo +10% si
# el portador ya habría atacado primero por Velocidad.
#-------------------------------------------------------------------------------
Battle::ItemEffects::DamageCalcFromUser.add(:GALEFEATHER,
  proc { |item, user, target, move, mults, power, type|
    next if CustomMovesItems.move_priority(user, move) <= 0
    battle = user.battle
    faster = if battle.field.effects[PBEffects::TrickRoom] > 0
               user.pbSpeed < target.pbSpeed
             else
               user.pbSpeed > target.pbSpeed
             end
    mults[:power_multiplier] *= (faster) ? 1.1 : 1.3
  }
)

#-------------------------------------------------------------------------------
# Farol Revelador: ignora las subidas de Evasión del objetivo y las bajadas de
# Precisión del portador.
#-------------------------------------------------------------------------------
Battle::ItemEffects::AccuracyCalcFromUser.add(:REVEALINGLANTERN,
  proc { |item, mods, user, target, move, type|
    mods[:evasion_stage]  = 0 if mods[:evasion_stage] > 0
    mods[:accuracy_stage] = 0 if mods[:accuracy_stage] < 0
  }
)

#-------------------------------------------------------------------------------
# Fragmento Meteorito: +15% de Defensa a tipos Roca y líneas fósiles.
#-------------------------------------------------------------------------------
Battle::ItemEffects::DamageCalcFromTarget.add(:METEORFRAGMENT,
  proc { |item, user, target, move, mults, power, type|
    next if !move.physicalMove?(type) && move.function_code != "UseTargetDefenseInsteadOfTargetSpDef"
    next if !target.pbHasType?(:ROCK) && !CustomMovesItems.fossil_line?(target)
    mults[:defense_multiplier] *= 1.15
  }
)

#-------------------------------------------------------------------------------
# Lana Suave: -15% de daño de movimientos físicos de contacto.
#-------------------------------------------------------------------------------
Battle::ItemEffects::DamageCalcFromTarget.add(:SOFTWOOL,
  proc { |item, user, target, move, mults, power, type|
    next if !move.physicalMove?(type) || !move.pbContactMove?(user)
    mults[:final_damage_multiplier] *= 0.85
  }
)

#-------------------------------------------------------------------------------
# Medalla de Mérito: +10% de potencia contra Pokémon de mayor nivel.
#-------------------------------------------------------------------------------
Battle::ItemEffects::DamageCalcFromUser.add(:MERITMEDAL,
  proc { |item, user, target, move, mults, power, type|
    mults[:power_multiplier] *= 1.1 if target.level > user.level
  }
)
