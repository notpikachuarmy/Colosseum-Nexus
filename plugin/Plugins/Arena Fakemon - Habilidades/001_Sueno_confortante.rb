#===============================================================================
# Habilidad: Sueño confortante (SOOTHINGSLUMBER)
#-------------------------------------------------------------------------------
# Este archivo funciona solo. Si no quieres esta parte, bórralo (y quita también
# su entrada del PBS). Si solo instalas este archivo, esta es su entrada de PBS:
#
#   [SOOTHINGSLUMBER]
#   Name = Soothing Slumber
#   Description = When hit by a physical move, may put the attacker to sleep (25%).
#===============================================================================

#-------------------------------------------------------------------------------
# Sueño confortante: al recibir un movimiento físico, 25% de dormir al atacante.
#-------------------------------------------------------------------------------
Battle::AbilityEffects::OnBeingHit.add(:SOOTHINGSLUMBER,
  proc { |ability, user, target, move, battle|
    next if user.index == target.index
    next if !move.physicalMove?
    next if user.asleep?
    next if battle.pbRandom(100) >= 25
    battle.pbShowAbilitySplash(target)
    if user.pbCanSleep?(target, Battle::Scene::USE_ABILITY_SPLASH)
      msg = nil
      if !Battle::Scene::USE_ABILITY_SPLASH
        msg = _INTL("{1}'s {2} made {3} fall asleep!", target.pbThis,
                    target.abilityName, user.pbThis(true))
      end
      user.pbSleep(msg)
    end
    battle.pbHideAbilitySplash(target)
  }
)
