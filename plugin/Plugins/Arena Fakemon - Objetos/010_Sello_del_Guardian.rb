#===============================================================================
# Objeto: Sello del Guardián (WARDSEAL)
#-------------------------------------------------------------------------------
# Este archivo funciona solo. Si no quieres esta parte, bórralo (y quita también
# su entrada del PBS). Si solo instalas este archivo, esta es su entrada de PBS:
#
#   [WARDSEAL]
#   Name = Ward Seal
#   NamePlural = Ward Seals
#   Pocket = 1
#   Price = 4000
#   Flags = Fling_30
#   Description = Prevents foes from lowering the holder's stats.
#
# Icono: Graphics/Items/WARDSEAL.png
#===============================================================================

class Battle::Battler
  #-----------------------------------------------------------------------------
  # SELLO DEL GUARDIÁN: el rival no puede bajarle las características.
  #-----------------------------------------------------------------------------
  alias __chi_wardseal_pbCanLowerStatStage? pbCanLowerStatStage?
  def pbCanLowerStatStage?(stat, user = nil, move = nil, showFailMsg = false, *args)
    if (!user || user.index != @index) && hasActiveItem?(:WARDSEAL) && !fainted?
      if showFailMsg
        @battle.pbDisplay(_INTL("¡El {1} de {2} impide que bajen sus características!", itemName, pbThis(true)))
      end
      return false
    end
    return __chi_wardseal_pbCanLowerStatStage?(stat, user, move, showFailMsg, *args)
  end
end
