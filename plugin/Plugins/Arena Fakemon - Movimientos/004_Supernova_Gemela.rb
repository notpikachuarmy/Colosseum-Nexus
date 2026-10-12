#===============================================================================
# Movimiento: Supernova Gemela (TWINSUPERNOVA)
#-------------------------------------------------------------------------------
# Este archivo funciona solo. Si no quieres esta parte, bórralo (y quita también
# su entrada del PBS). Si solo instalas este archivo, esta es su entrada de PBS:
#
#   [TWINSUPERNOVA]
#   Name = Twin Supernova
#   Type = PSYCHIC
#   Category = Special
#   Power = 60
#   Accuracy = 100
#   TotalPP = 15
#   Target = NearOther
#   FunctionCode = LowerTargetDefOrSpDef1Random
#   Flags = CanProtect,CanMirrorMove
#   EffectChance = 50
#   Description = Two-dimensional stellar energy. 50% chance to lower the target's Defense or Sp. Def.
#===============================================================================

#===============================================================================
# Supernova Gemela (Twin Supernova)
# Baja 1 nivel la Defensa o la Defensa Especial del objetivo (al azar).
#===============================================================================
class Battle::Move::LowerTargetDefOrSpDef1Random < Battle::Move
  def pbAdditionalEffect(user, target)
    return if target.fainted? || target.damageState.substitute
    stats = [:DEFENSE, :SPECIAL_DEFENSE].select { |s| target.pbCanLowerStatStage?(s, user, self) }
    return if stats.empty?
    target.pbLowerStatStage(stats[@battle.pbRandom(stats.length)], 1, user)
  end
end
