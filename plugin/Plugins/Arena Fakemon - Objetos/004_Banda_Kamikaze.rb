#===============================================================================
# Objeto: Banda Kamikaze (HAZARDBAND)
#-------------------------------------------------------------------------------
# Este archivo funciona solo. Si no quieres esta parte, bórralo (y quita también
# su entrada del PBS). Si solo instalas este archivo, esta es su entrada de PBS:
#
#   [HAZARDBAND]
#   Name = Hazard Band
#   NamePlural = Hazard Bands
#   Pocket = 1
#   Price = 4000
#   Flags = Fling_10
#   Description = Boosts self-sacrificing moves by 50%, and they ignore screens.
#
# Icono: Graphics/Items/HAZARDBAND.png
#===============================================================================

#-------------------------------------------------------------------------------
# BANDA KAMIKAZE: +50% a movimientos de sacrificio e ignora pantallas.
#-------------------------------------------------------------------------------
Battle::ItemEffects::DamageCalcFromUser.add(:HAZARDBAND,
  proc { |item, user, target, move, mults, power, type|
    mults[:power_multiplier] *= CustomHeldItems::HAZARDBAND_POWER_MULT if CustomHeldItems.sacrifice?(move)
  }
)

class Battle::Move
  alias __chi_hazardband_pbCalcDamageMultipliers pbCalcDamageMultipliers
  def pbCalcDamageMultipliers(user, target, numTargets, type, baseDmg, multipliers)
    @chi_ignore_screens = user.hasActiveItem?(:HAZARDBAND) && CustomHeldItems.sacrifice?(self)
    __chi_hazardband_pbCalcDamageMultipliers(user, target, numTargets, type, baseDmg, multipliers)
  ensure
    @chi_ignore_screens = false
  end

  alias __chi_hazardband_ignoresReflect? ignoresReflect?
  def ignoresReflect?
    return true if @chi_ignore_screens
    return __chi_hazardband_ignoresReflect?
  end
end
