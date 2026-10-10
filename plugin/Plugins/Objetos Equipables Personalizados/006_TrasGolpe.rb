#===============================================================================
# Objetos que actúan después de golpear o de ser drenado
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

#-------------------------------------------------------------------------------
# FILTRO DE ÉTER: anula la curación por drenaje del rival y le inflige el 50%
# de lo que iba a curar (Absorber, Gigadrenado, Puño Drenaje, Drenadoras...).
#-------------------------------------------------------------------------------
class Battle::Battler
  alias __chi_ether_pbRecoverHPFromDrain pbRecoverHPFromDrain
  def pbRecoverHPFromDrain(amt, target, msg = nil)
    if amt > 0 && target && target.hasActiveItem?(:ETHERFILTER) &&
       !target.hasActiveAbility?(:LIQUIDOOZE, true)
      dmg = [(amt * CustomHeldItems::ETHERFILTER_RATIO).round, 1].max
      pbReduceHP(dmg)
      @battle.pbDisplay(_INTL("¡El {1} de {2} convirtió el drenaje en daño!", target.itemName, target.pbThis(true)))
      pbItemHPHealCheck
      return
    end
    __chi_ether_pbRecoverHPFromDrain(amt, target, msg)
  end
end
