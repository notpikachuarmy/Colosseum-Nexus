#===============================================================================
# Objeto: Fragmento Meteorito (METEORFRAGMENT)
#-------------------------------------------------------------------------------
# Este archivo funciona solo. Si no quieres esta parte, bórralo (y quita también
# su entrada del PBS). Si solo instalas este archivo, esta es su entrada de PBS:
#
#   [METEORFRAGMENT]
#   Name = Meteor Fragment
#   NamePlural = Meteor Fragments
#   Pocket = 1
#   Price = 4000
#   Flags = Fling_60
#   Description = Boosts the Defense of Rock-type or fossil Pokémon by 15%.
#
# Icono: Graphics/Items/METEORFRAGMENT.png
#===============================================================================

#-------------------------------------------------------------------------------
# Fragmento Meteorito: +15% de Defensa a tipos Roca y líneas fósiles.
#-------------------------------------------------------------------------------
Battle::ItemEffects::DamageCalcFromTarget.add(:METEORFRAGMENT,
  proc { |item, user, target, move, mults, power, type|
    next if !move.physicalMove?(type) && move.function_code != "UseTargetDefenseInsteadOfTargetSpDef"
    next if !target.pbHasType?(:ROCK) && !CustomMovesItems.fossil_line?(target)
    mults[:defense_multiplier] *= 1.15
  }
)
