#===============================================================================
# Movimiento: Corte Glacial (FROSTEDGE)
#-------------------------------------------------------------------------------
# Este archivo funciona solo. Si no quieres esta parte, bórralo (y quita también
# su entrada del PBS). Si solo instalas este archivo, esta es su entrada de PBS:
#
#   [FROSTEDGE]
#   Name = Frost Edge
#   Type = ICE
#   Category = Physical
#   Power = 70
#   Accuracy = 100
#   TotalPP = 15
#   Target = NearOther
#   FunctionCode = IgnoreTargetDefSpDefEvaStatStagesFreezeTarget
#   Flags = Contact,CanProtect,CanMirrorMove,Slicing
#   EffectChance = 10
#   Description = Slashes with an icy blade. Ignores the target's defensive stat changes and may freeze it (10%).
#===============================================================================

#===============================================================================
# Corte Glacial (Frost Edge)
# Ignora los cambios de Defensa/Def. Esp. (y Evasión) del objetivo, como Espada
# Santa. 10% de congelar.
#===============================================================================
class Battle::Move::IgnoreTargetDefSpDefEvaStatStagesFreezeTarget < Battle::Move::IgnoreTargetDefSpDefEvaStatStages
  def pbAdditionalEffect(user, target)
    return if target.damageState.substitute
    target.pbFreeze if target.pbCanFreeze?(user, false, self)
  end
end
