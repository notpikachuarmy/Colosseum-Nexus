#===============================================================================
# Objeto: Chaleco Antidisturbios (RIOTVEST)
#-------------------------------------------------------------------------------
# Este archivo funciona solo. Si no quieres esta parte, bórralo (y quita también
# su entrada del PBS). Si solo instalas este archivo, esta es su entrada de PBS:
#
#   [RIOTVEST]
#   Name = Riot Vest
#   NamePlural = Riot Vests
#   Pocket = 1
#   Price = 4000
#   Flags = Fling_80
#   Description = Boosts Defense by 50%, but prevents the use of status moves.
#
# Icono: Graphics/Items/RIOTVEST.png
#===============================================================================

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
