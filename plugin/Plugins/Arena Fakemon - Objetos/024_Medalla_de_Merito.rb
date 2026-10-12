#===============================================================================
# Objeto: Medalla de Mérito (MERITMEDAL)
#-------------------------------------------------------------------------------
# Este archivo funciona solo. Si no quieres esta parte, bórralo (y quita también
# su entrada del PBS). Si solo instalas este archivo, esta es su entrada de PBS:
#
#   [MERITMEDAL]
#   Name = Merit Medal
#   NamePlural = Merit Medals
#   Pocket = 1
#   Price = 4000
#   Flags = Fling_30
#   Description = Boosts the holder's moves by 10% against higher-level Pokémon.
#
# Icono: Graphics/Items/MERITMEDAL.png
#===============================================================================

#-------------------------------------------------------------------------------
# Medalla de Mérito: +10% de potencia contra Pokémon de mayor nivel.
#-------------------------------------------------------------------------------
Battle::ItemEffects::DamageCalcFromUser.add(:MERITMEDAL,
  proc { |item, user, target, move, mults, power, type|
    mults[:power_multiplier] *= 1.1 if target.level > user.level
  }
)
