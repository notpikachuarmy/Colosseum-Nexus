#===============================================================================
# Objeto: Brazal Inversor (INVERSIONBAND)
#-------------------------------------------------------------------------------
# Este archivo funciona solo. Si no quieres esta parte, bórralo (y quita también
# su entrada del PBS). Si solo instalas este archivo, esta es su entrada de PBS:
#
#   [INVERSIONBAND]
#   Name = Inversion Band
#   NamePlural = Inversion Bands
#   Pocket = 1
#   Price = 4000
#   Flags = Fling_30
#   Description = Inverts the holder's type weaknesses and resistances.
#
# Icono: Graphics/Items/INVERSIONBAND.png
#===============================================================================

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
