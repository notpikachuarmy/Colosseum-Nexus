#===============================================================================
# Objeto: Abrojo Trampa (CALTROPS)
#-------------------------------------------------------------------------------
# Este archivo funciona solo. Si no quieres esta parte, bórralo (y quita también
# su entrada del PBS). Si solo instalas este archivo, esta es su entrada de PBS:
#
#   [CALTROPS]
#   Name = Caltrops
#   NamePlural = Caltropses
#   Pocket = 1
#   Price = 4000
#   Flags = Fling_30
#   Description = Sets a layer of Spikes on the foe's side if the holder switches out with a pivot move.
#
# Icono: Graphics/Items/CALTROPS.png
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
