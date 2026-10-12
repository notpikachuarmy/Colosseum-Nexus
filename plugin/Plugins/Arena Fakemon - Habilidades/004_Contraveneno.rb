#===============================================================================
# Habilidad: Contraveneno (ANTIVENOM)
#-------------------------------------------------------------------------------
# Este archivo funciona solo. Si no quieres esta parte, bórralo (y quita también
# su entrada del PBS). Si solo instalas este archivo, esta es su entrada de PBS:
#
#   [ANTIVENOM]
#   Name = Antivenom
#   Description = Can't be poisoned. If hit by a Poison-type move, it takes no damage and its Attack rises.
#===============================================================================

#-------------------------------------------------------------------------------
# Contraveneno: inmune a los movimientos de tipo Veneno (le suben el Ataque) y
# no puede ser envenenado.
#-------------------------------------------------------------------------------
Battle::AbilityEffects::MoveImmunity.add(:ANTIVENOM,
  proc { |ability, user, target, move, type, battle, show_message|
    next target.pbMoveImmunityStatRaisingAbility(user, move, type,
       :POISON, :ATTACK, 1, show_message)
  }
)

Battle::AbilityEffects::StatusImmunity.add(:ANTIVENOM,
  proc { |ability, battler, status|
    next true if status == :POISON
  }
)

Battle::AbilityEffects::StatusCure.add(:ANTIVENOM,
  proc { |ability, battler|
    next if battler.status != :POISON
    battler.battle.pbShowAbilitySplash(battler)
    battler.pbCureStatus(Battle::Scene::USE_ABILITY_SPLASH)
    if !Battle::Scene::USE_ABILITY_SPLASH
      battler.battle.pbDisplay(_INTL("{1}'s {2} cured its poisoning!", battler.pbThis, battler.abilityName))
    end
    battler.battle.pbHideAbilitySplash(battler)
  }
)
