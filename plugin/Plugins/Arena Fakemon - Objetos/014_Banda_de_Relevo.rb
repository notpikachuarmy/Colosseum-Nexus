#===============================================================================
# Objeto: Banda de Relevo (RELAYBAND)
#-------------------------------------------------------------------------------
# Este archivo funciona solo. Si no quieres esta parte, bórralo (y quita también
# su entrada del PBS). Si solo instalas este archivo, esta es su entrada de PBS:
#
#   [RELAYBAND]
#   Name = Relay Band
#   NamePlural = Relay Bands
#   Pocket = 1
#   Price = 4000
#   Flags = Fling_10
#   Description = When switching manually, the incoming Pokémon receives the stat boosts.
#
# Icono: Graphics/Items/RELAYBAND.png
#===============================================================================

#-------------------------------------------------------------------------------
# BANDA DE RELEVO: al cambiar manualmente, el Pokémon que entra recibe las
# mejoras de características del que sale.
#-------------------------------------------------------------------------------
class Battle
  alias __chi_relay_pbRecallAndReplace pbRecallAndReplace
  def pbRecallAndReplace(idxBattler, idxParty, randomReplacement = false, batonPass = false)
    b = @battlers[idxBattler]
    saved = nil
    item_name = nil
    if !batonPass && !randomReplacement && b && !b.fainted? && b.hasActiveItem?(:RELAYBAND) &&
       @choices[idxBattler] && @choices[idxBattler][0] == :SwitchOut
      saved = {}
      b.stages.each { |stat, val| saved[stat] = val if val > 0 }
      saved = nil if saved.empty?
      item_name = b.itemName
    end
    ret = __chi_relay_pbRecallAndReplace(idxBattler, idxParty, randomReplacement, batonPass)
    if saved
      saved.each { |stat, val| b.stages[stat] = val }
      pbDisplay(_INTL("¡{1} recibió las mejoras gracias a la {2}!", b.pbThis, item_name))
    end
    return ret
  end
end
