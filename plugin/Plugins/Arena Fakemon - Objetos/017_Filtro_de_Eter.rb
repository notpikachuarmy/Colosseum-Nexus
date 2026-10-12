#===============================================================================
# Objeto: Filtro de Éter (ETHERFILTER)
#-------------------------------------------------------------------------------
# Este archivo funciona solo. Si no quieres esta parte, bórralo (y quita también
# su entrada del PBS). Si solo instalas este archivo, esta es su entrada de PBS:
#
#   [ETHERFILTER]
#   Name = Ether Filter
#   NamePlural = Ether Filters
#   Pocket = 1
#   Price = 4000
#   Flags = Fling_10
#   Description = Nullifies the foe's draining moves and inflicts half of what it would have healed.
#
# Icono: Graphics/Items/ETHERFILTER.png
#===============================================================================

#-------------------------------------------------------------------------------
# FILTRO DE ÉTER: anula la curación por drenaje del rival y le inflige el 50%
# de lo que iba a curar (Absorber, Gigadrenado, Puño Drenaje, Drenadoras...).
#-------------------------------------------------------------------------------
class Battle::Battler
  alias __chi_ether_pbRecoverHPFromDrain pbRecoverHPFromDrain
  def pbRecoverHPFromDrain(amt, target, msg = nil)
    if amt > 0 && target && target.hasActiveItem?(:ETHERFILTER) &&
       !target.hasActiveAbility?(:LIQUIDOOZE, true)
      dmg = [(amt * CustomHeldItems::ETHERFILTER_RATIO).round, 1].max
      pbReduceHP(dmg)
      @battle.pbDisplay(_INTL("¡El {1} de {2} convirtió el drenaje en daño!", target.itemName, target.pbThis(true)))
      pbItemHPHealCheck
      return
    end
    __chi_ether_pbRecoverHPFromDrain(amt, target, msg)
  end
end
