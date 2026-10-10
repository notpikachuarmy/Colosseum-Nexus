#===============================================================================
# Objetos relacionados con los cambios de Pokémon
#===============================================================================

#-------------------------------------------------------------------------------
# ABROJO TRAMPA: al salir con un movimiento de relevo (flag Pivot), pone una
# capa de Púas en el campo rival.
#-------------------------------------------------------------------------------
class Battle::Battler
  alias __chi_caltrops_pbUseMove pbUseMove
  def pbUseMove(choice, specialUsage = false)
    move     = choice[2]
    old_pkmn = @pokemon
    caltrops = move.is_a?(Battle::Move) && CustomHeldItems.pivot?(move) && hasActiveItem?(:CALTROPS)
    ret = __chi_caltrops_pbUseMove(choice, specialUsage)
    if caltrops && @pokemon != old_pkmn && old_pkmn.hasItem?(:CALTROPS)
      side = pbOpposingSide
      if side.effects[PBEffects::Spikes] < CustomHeldItems::CALTROPS_MAX_LAYERS
        side.effects[PBEffects::Spikes] += 1
        @battle.pbDisplay(_INTL("¡El {1} de {2} esparció púas en el campo rival!",
                                GameData::Item.get(:CALTROPS).name, old_pkmn.name))
      end
    end
    return ret
  end
end

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
