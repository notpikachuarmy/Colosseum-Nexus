#===============================================================================
# Habilidad: Botín de Guerra (SPOILSOFWAR)
#-------------------------------------------------------------------------------
# Este archivo funciona solo. Si no quieres esta parte, bórralo (y quita también
# su entrada del PBS). Si solo instalas este archivo, esta es su entrada de PBS:
#
#   [SPOILSOFWAR]
#   Name = Spoils of War
#   Description = If it knocks out a foe with a move while holding no item, it takes the foe's held item.
#===============================================================================

#-------------------------------------------------------------------------------
# Botín de Guerra: si debilita a un rival con un movimiento y no lleva objeto,
# se queda con el objeto del rival (como Prestidigitador, pero solo al derrotar).
#-------------------------------------------------------------------------------
Battle::AbilityEffects::OnEndOfUsingMove.add(:SPOILSOFWAR,
  proc { |ability, user, targets, move, battle|
    next if battle.futureSight
    next if !move.pbDamagingMove?
    next if user.item || user.fainted?
    next if user.wild?
    targets.each do |b|
      next if !b.damageState.fainted
      next if !user.opposes?(b)
      next if !b.item
      next if b.unlosableItem?(b.item) || user.unlosableItem?(b.item)
      battle.pbShowAbilitySplash(user)
      user.item = b.item
      b.item = nil
      if battle.wildBattle? && !user.initialItem && user.item == b.initialItem
        user.setInitialItem(user.item)
        b.setInitialItem(nil)
      end
      battle.pbDisplay(_INTL("{1} took {2}'s {3} as spoils of war!", user.pbThis,
         b.pbThis(true), user.itemName))
      battle.pbHideAbilitySplash(user)
      user.pbHeldItemTriggerCheck
      break
    end
  }
)
