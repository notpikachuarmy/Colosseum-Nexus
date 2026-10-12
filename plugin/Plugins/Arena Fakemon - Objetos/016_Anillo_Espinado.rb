#===============================================================================
# Objeto: Anillo Espinado (THORNRING)
#-------------------------------------------------------------------------------
# Este archivo funciona solo. Si no quieres esta parte, bórralo (y quita también
# su entrada del PBS). Si solo instalas este archivo, esta es su entrada de PBS:
#
#   [THORNRING]
#   Name = Thorn Ring
#   NamePlural = Thorn Rings
#   Pocket = 1
#   Price = 4000
#   Flags = Fling_30
#   Description = Contact moves deal an extra 5% to the foe, but cost the holder 3% of its HP.
#
# Icono: Graphics/Items/THORNRING.png
#===============================================================================

#-------------------------------------------------------------------------------
# ANILLO ESPINADO: tras un ataque de contacto, 5% extra al rival y 3% al portador.
#-------------------------------------------------------------------------------
Battle::ItemEffects::AfterMoveUseFromUser.add(:THORNRING,
  proc { |item, user, targets, move, numHits, battle|
    next if !move.damagingMove? || numHits == 0 || user.fainted?
    next if !move.pbContactMove?(user)
    hit = false
    targets.each do |b|
      next if b.fainted? || b.damageState.unaffected || b.damageState.substitute
      next if b.damageState.totalHPLost <= 0 || !b.takesIndirectDamage?
      amt = [(b.totalhp * CustomHeldItems::THORNRING_DAMAGE).floor, 1].max
      battle.pbDisplay(_INTL("¡El {1} de {2} hirió a {3}!", user.itemName, user.pbThis(true), b.pbThis(true)))
      b.pbReduceHP(amt, false)
      b.pbItemHPHealCheck
      b.pbFaint if b.fainted?
      hit = true
    end
    next if !hit || !user.takesIndirectDamage?
    recoil = [(user.totalhp * CustomHeldItems::THORNRING_RECOIL).floor, 1].max
    user.pbReduceHP(recoil, false)
    battle.pbDisplay(_INTL("¡{1} se hirió con su {2}!", user.pbThis, user.itemName))
    user.pbItemHPHealCheck
    user.pbFaint if user.fainted?
  }
)
