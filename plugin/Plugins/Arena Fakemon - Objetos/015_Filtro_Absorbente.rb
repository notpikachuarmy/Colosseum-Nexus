#===============================================================================
# Objeto: Filtro Absorbente (ABSORBFILTER)
#-------------------------------------------------------------------------------
# Este archivo funciona solo. Si no quieres esta parte, bórralo (y quita también
# su entrada del PBS). Si solo instalas este archivo, esta es su entrada de PBS:
#
#   [ABSORBFILTER]
#   Name = Absorb Filter
#   NamePlural = Absorb Filters
#   Pocket = 1
#   Price = 4000
#   Flags = Fling_10
#   Description = Heals the holder by 15% of the damage dealt with Water-type moves.
#
# Icono: Graphics/Items/ABSORBFILTER.png
#===============================================================================

#-------------------------------------------------------------------------------
# FILTRO ABSORBENTE: cura un 15% del daño causado con movimientos de Agua.
#-------------------------------------------------------------------------------
Battle::ItemEffects::AfterMoveUseFromUser.add(:ABSORBFILTER,
  proc { |item, user, targets, move, numHits, battle|
    next if !move.damagingMove? || numHits == 0 || move.calcType != :WATER
    next if !user.canHeal?
    total = 0
    targets.each { |b| total += b.damageState.totalHPLost if !b.damageState.unaffected }
    amt = (total * CustomHeldItems::ABSORBFILTER_HEAL).floor
    next if amt <= 0
    user.pbRecoverHP(amt)
    battle.pbDisplay(_INTL("¡{1} recuperó PS gracias a su {2}!", user.pbThis, user.itemName))
  }
)
