#===============================================================================
# Movimiento: Impacto Sísmico (FAULTSTRIKE)
#-------------------------------------------------------------------------------
# Este archivo funciona solo. Si no quieres esta parte, bórralo (y quita también
# su entrada del PBS). Si solo instalas este archivo, esta es su entrada de PBS:
#
#   [FAULTSTRIKE]
#   Name = Fault Strike
#   Type = GROUND
#   Category = Physical
#   Power = 60
#   Accuracy = 100
#   TotalPP = 20
#   Target = NearOther
#   FunctionCode = IgnoreTargetDefRaisesRemoveScreens
#   Flags = Contact,CanProtect,CanMirrorMove
#   Description = Ignores the target's Defense boosts and breaks Reflect, Light Screen and Aurora Veil.
#===============================================================================

#===============================================================================
# Impacto Sísmico (Fault Strike)
# Ignora las subidas de Defensa del objetivo y rompe Reflejo, Pantalla de Luz y
# Velo Aurora.
#===============================================================================
class Battle::Move::IgnoreTargetDefRaisesRemoveScreens < Battle::Move::RemoveScreens
  def pbGetDefenseStats(user, target)
    ret1, ret2 = super
    return ret1, [ret2, Battle::Battler::STAT_STAGE_MAXIMUM].min
  end
end
