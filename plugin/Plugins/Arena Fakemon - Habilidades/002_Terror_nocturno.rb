#===============================================================================
# Habilidad: Terror nocturno (NIGHTTERROR)
#-------------------------------------------------------------------------------
# Este archivo funciona solo. Si no quieres esta parte, bórralo (y quita también
# su entrada del PBS). Si solo instalas este archivo, esta es su entrada de PBS:
#
#   [NIGHTTERROR]
#   Name = Night Terror
#   Description = Boosts damage dealt to sleeping targets by 30%.
#===============================================================================

#-------------------------------------------------------------------------------
# Terror nocturno: +30% de daño contra objetivos dormidos (o con Comatose).
#-------------------------------------------------------------------------------
Battle::AbilityEffects::DamageCalcFromUser.add(:NIGHTTERROR,
  proc { |ability, user, target, move, mults, power, type|
    if target.asleep? || target.hasActiveAbility?(:COMATOSE)
      mults[:final_damage_multiplier] *= 1.3
    end
  }
)
