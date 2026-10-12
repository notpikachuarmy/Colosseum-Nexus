#===============================================================================
# Movimiento: Sobrecarga Neural (PSYCHICOVERLOAD)
#-------------------------------------------------------------------------------
# Este archivo funciona solo. Si no quieres esta parte, bórralo (y quita también
# su entrada del PBS). Si solo instalas este archivo, esta es su entrada de PBS:
#
#   [PSYCHICOVERLOAD]
#   Name = Psychic Overload
#   Type = PSYCHIC
#   Category = Special
#   Power = 75
#   Accuracy = 100
#   TotalPP = 10
#   Target = NearOther
#   FunctionCode = MovesBeforePriorityFoeDoublePower
#   Flags = CanProtect,CanMirrorMove
#   Description = If a foe is about to use a priority move, the user moves first and deals double damage.
#===============================================================================

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
