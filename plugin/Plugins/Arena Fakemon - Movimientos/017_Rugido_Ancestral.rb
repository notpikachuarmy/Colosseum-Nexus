#===============================================================================
# Movimiento: Rugido Ancestral (PRIMEVALROAR)
#-------------------------------------------------------------------------------
# Este archivo funciona solo. Si no quieres esta parte, bórralo (y quita también
# su entrada del PBS). Si solo instalas este archivo, esta es su entrada de PBS:
#
#   [PRIMEVALROAR]
#   Name = Primeval Roar
#   Type = DRAGON
#   Category = Special
#   Power = 85
#   Accuracy = 100
#   TotalPP = 10
#   Target = NearOther
#   FunctionCode = SuperEffectiveAgainstPoison
#   Flags = CanProtect,CanMirrorMove,Sound
#   Description = A roar Pitalant's line used to drive poisonous pests from the orchards. Super effective against Poison types and bypasses substitutes.
#===============================================================================

#===============================================================================
# Rugido Ancestral (Primeval Roar)
# Supereficaz contra el tipo Veneno (como Liofilización contra el tipo Agua).
# Al ser de sonido (Flags = Sound), atraviesa los sustitutos.
#===============================================================================
class Battle::Move::SuperEffectiveAgainstPoison < Battle::Move
  def pbCalcTypeModSingle(moveType, defType, user, target)
    return Effectiveness::SUPER_EFFECTIVE_MULTIPLIER if defType == :POISON
    return super
  end
end
