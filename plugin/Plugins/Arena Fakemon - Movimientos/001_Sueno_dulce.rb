#===============================================================================
# Movimiento: Sueño dulce (SWEETDREAM)
#-------------------------------------------------------------------------------
# Este archivo funciona solo. Si no quieres esta parte, bórralo (y quita también
# su entrada del PBS). Si solo instalas este archivo, esta es su entrada de PBS:
#
#   [SWEETDREAM]
#   Name = Sweet Dream
#   Type = FAIRY
#   Category = Status
#   Accuracy = 75
#   TotalPP = 10
#   Target = NearOther
#   FunctionCode = SleepTargetHealUser
#   Flags = CanProtect,CanMagicCoat,CanMirrorMove
#   Description = Puts the target to sleep and restores 1/8 of the user's max HP.
#===============================================================================

#===============================================================================
# Sueño dulce (Sweet Dream)
# Duerme al objetivo y, si lo consigue, el usuario recupera 1/8 de sus PS máximos.
#===============================================================================
class Battle::Move::SleepTargetHealUser < Battle::Move::SleepTarget
  def pbEffectAgainstTarget(user, target)
    return if damagingMove?
    target.pbSleep
    return if !target.asleep? || !user.canHeal?
    user.pbRecoverHP(user.totalhp / 8)
    @battle.pbDisplay(_INTL("{1}'s HP was restored.", user.pbThis))
  end
end
