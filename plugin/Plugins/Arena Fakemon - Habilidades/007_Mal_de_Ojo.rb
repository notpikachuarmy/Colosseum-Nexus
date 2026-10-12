#===============================================================================
# Habilidad: Mal de Ojo (EVILEYE)
#-------------------------------------------------------------------------------
# Este archivo funciona solo. Si no quieres esta parte, bórralo (y quita también
# su entrada del PBS). Si solo instalas este archivo, esta es su entrada de PBS:
#
#   [EVILEYE]
#   Name = Evil Eye
#   Description = On entering battle, a cursed glare lowers the Sp. Def of opposing Pokémon.
#===============================================================================

#-------------------------------------------------------------------------------
# Mal de Ojo: al entrar, baja 1 nivel la Defensa Especial de los rivales
# cercanos (como Intimidación, pero con la Defensa Especial).
#-------------------------------------------------------------------------------
Battle::AbilityEffects::OnSwitchIn.add(:EVILEYE,
  proc { |ability, battler, battle, switch_in|
    battle.pbShowAbilitySplash(battler)
    battle.allOtherSideBattlers(battler.index).each do |b|
      next if !b.near?(battler) || b.fainted?
      if b.effects[PBEffects::Substitute] > 0
        battle.pbDisplay(_INTL("{1} is protected by its substitute!", b.pbThis))
        next
      end
      b.pbLowerStatStageByAbility(:SPECIAL_DEFENSE, 1, battler, false)
    end
    battle.pbHideAbilitySplash(battler)
  }
)
