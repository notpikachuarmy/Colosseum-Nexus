#===============================================================================
# Movimiento: Corte Fotosintético (SUNLIGHTBLADE)
#-------------------------------------------------------------------------------
# Este archivo funciona solo. Si no quieres esta parte, bórralo (y quita también
# su entrada del PBS). Si solo instalas este archivo, esta es su entrada de PBS:
#
#   [SUNLIGHTBLADE]
#   Name = Sunlight Blade
#   Type = GRASS
#   Category = Physical
#   Power = 70
#   Accuracy = 100
#   TotalPP = 15
#   Target = NearOther
#   FunctionCode = IncreasePowerInSun
#   Flags = Contact,CanProtect,CanMirrorMove,Slicing,HighCriticalHitRate
#   Description = A solar-powered slash with a high critical-hit ratio. Power rises to 105 in harsh sunlight.
#===============================================================================

#===============================================================================
# Corte Fotosintético (Sunlight Blade)
# Índice de crítico alto (flag en el PBS). Potencia x1,5 (105) con sol.
#===============================================================================
class Battle::Move::IncreasePowerInSun < Battle::Move
  def pbBaseDamage(baseDmg, user, target)
    baseDmg = (baseDmg * 1.5).round if [:Sun, :HarshSun].include?(user.effectiveWeather)
    return baseDmg
  end
end
