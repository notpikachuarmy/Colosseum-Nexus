#===============================================================================
# Habilidad: Rocío Matinal (MORNINGDEW)
#-------------------------------------------------------------------------------
# Este archivo funciona solo. Si no quieres esta parte, bórralo (y quita también
# su entrada del PBS). Si solo instalas este archivo, esta es su entrada de PBS:
#
#   [MORNINGDEW]
#   Name = Morning Dew
#   Description = Restores 1/16 of its max HP at the end of each turn, or 1/8 in rain or on Grassy Terrain.
#===============================================================================

#-------------------------------------------------------------------------------
# Rocío Matinal: recupera 1/16 de PS al final de cada turno; 1/8 con lluvia o
# con Campo de Hierba (si toca el suelo).
#-------------------------------------------------------------------------------
Battle::AbilityEffects::EndOfRoundHealing.add(:MORNINGDEW,
  proc { |ability, battler, battle|
    next if !battler.canHeal?
    amount = battler.totalhp / 16
    if [:Rain, :HeavyRain].include?(battler.effectiveWeather) ||
       (battle.field.terrain == :Grassy && battler.affectedByTerrain?)
      amount = battler.totalhp / 8
    end
    battle.pbShowAbilitySplash(battler)
    battler.pbRecoverHP(amount)
    if Battle::Scene::USE_ABILITY_SPLASH
      battle.pbDisplay(_INTL("{1}'s HP was restored.", battler.pbThis))
    else
      battle.pbDisplay(_INTL("{1}'s {2} restored its HP.", battler.pbThis, battler.abilityName))
    end
    battle.pbHideAbilitySplash(battler)
  }
)
