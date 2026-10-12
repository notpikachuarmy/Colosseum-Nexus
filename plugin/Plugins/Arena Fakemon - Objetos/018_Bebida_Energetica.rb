#===============================================================================
# Objeto: Bebida Energética (ENERGYDRINK)
#-------------------------------------------------------------------------------
# Este archivo funciona solo. Si no quieres esta parte, bórralo (y quita también
# su entrada del PBS). Si solo instalas este archivo, esta es su entrada de PBS:
#
#   [ENERGYDRINK]
#   Name = Energy Drink
#   NamePlural = Energy Drinks
#   Pocket = 1
#   Price = 4000
#   Flags = Fling_30
#   Description = Gives +1 priority to the holder's next move. Consumed when used.
#
# Icono: Graphics/Items/ENERGYDRINK.png
#===============================================================================

#-------------------------------------------------------------------------------
# Bebida Energética: +1 de prioridad al siguiente movimiento. Se consume.
#-------------------------------------------------------------------------------
class Battle::Move
  alias __af_drink_pbPriority pbPriority unless method_defined?(:__af_drink_pbPriority)

  def pbPriority(user)
    ret = __af_drink_pbPriority(user)
    ret += 1 if user.hasActiveItem?(:ENERGYDRINK)
    return ret
  end
end

class Battle::Battler
  alias __af_drink_pbUseMove pbUseMove unless method_defined?(:__af_drink_pbUseMove)

  def pbUseMove(choice, specialUsage = false)
    if !specialUsage && choice[0] == :UseMove && choice[2] &&
       hasActiveItem?(:ENERGYDRINK) && !usingMultiTurnAttack?
      @battle.pbCommonAnimation("UseItem", self)
      @battle.pbDisplay(_INTL("¡{1} se bebió su {2} y actuó más rápido!", pbThis, itemName))
      pbConsumeItem
    end
    __af_drink_pbUseMove(choice, specialUsage)
  end
end
