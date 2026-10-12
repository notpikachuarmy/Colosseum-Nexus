#===============================================================================
# Movimiento: Golpe de Ventisca (GALESTRIKE)
#-------------------------------------------------------------------------------
# Este archivo funciona solo. Si no quieres esta parte, bórralo (y quita también
# su entrada del PBS). Si solo instalas este archivo, esta es su entrada de PBS:
#
#   [GALESTRIKE]
#   Name = Gale Strike
#   Type = FLYING
#   Category = Physical
#   Power = 50
#   Accuracy = 100
#   TotalPP = 15
#   Target = NearOther
#   Priority = 1
#   FunctionCode = IncreasePowerInRainOrSun
#   Flags = Contact,CanProtect,CanMirrorMove
#   Description = +1 priority. Power rises to 75 in rain or harsh sunlight.
#===============================================================================

#===============================================================================
# Golpe de Ventisca (Gale Strike)
# Potencia x1,5 (75) con lluvia o sol.
#===============================================================================
class Battle::Move::IncreasePowerInRainOrSun < Battle::Move
  def pbBaseDamage(baseDmg, user, target)
    if [:Sun, :HarshSun, :Rain, :HeavyRain].include?(user.effectiveWeather)
      baseDmg = (baseDmg * 1.5).round
    end
    return baseDmg
  end
end
