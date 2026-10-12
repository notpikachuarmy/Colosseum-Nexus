#===============================================================================
# Habilidad: Corazón de Dragón (DRAGONHEART)
#-------------------------------------------------------------------------------
# Este archivo funciona solo. Si no quieres esta parte, bórralo (y quita también
# su entrada del PBS). Si solo instalas este archivo, esta es su entrada de PBS:
#
#   [DRAGONHEART]
#   Name = Dragon Heart
#   Description = Powers up Dragon-type moves by 50% when the Pokémon's HP is at one third or less.
#===============================================================================

#-------------------------------------------------------------------------------
# Corazón de Dragón: movimientos de tipo Dragón x1.5 con 1/3 de PS o menos.
#-------------------------------------------------------------------------------
Battle::AbilityEffects::DamageCalcFromUser.add(:DRAGONHEART,
  proc { |ability, user, target, move, mults, power, type|
    if user.hp <= user.totalhp / 3 && type == :DRAGON
      mults[:attack_multiplier] *= 1.5
    end
  }
)
