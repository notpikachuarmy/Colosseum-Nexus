#===============================================================================
# Movimiento: Proyección Maldita (CURSEREEL)
#-------------------------------------------------------------------------------
# Este archivo funciona solo. Si no quieres esta parte, bórralo (y quita también
# su entrada del PBS). Si solo instalas este archivo, esta es su entrada de PBS:
#
#   [CURSEREEL]
#   Name = Curse Reel
#   Type = GHOST
#   Category = Special
#   Power = 80
#   Accuracy = 90
#   TotalPP = 10
#   Target = NearOther
#   FunctionCode = LowerTargetAccuracyOrConfuseHurtOnSwitch
#   Flags = CanProtect,CanMirrorMove
#   EffectChance = 30
#   Description = May confuse the target or lower its accuracy (30%). If the target switches out next turn, it takes extra damage.
#===============================================================================

#===============================================================================
# Proyección Maldita (Curse Reel)
# 30%: baja 1 la Precisión o confunde (al azar). Si el objetivo cambia de
# Pokémon antes de que acabe el turno siguiente, recibe un 25% del daño que le
# hizo el movimiento.
#===============================================================================
class Battle::Move::LowerTargetAccuracyOrConfuseHurtOnSwitch < Battle::Move
  def pbEffectAgainstTarget(user, target)
    return if target.fainted? || target.damageState.substitute
    return if target.damageState.hpLost <= 0
    target.effects[PBEffects::CurseReel]       = 2
    target.effects[PBEffects::CurseReelDamage] = [target.damageState.hpLost / 4, 1].max
    @battle.pbDisplay(_INTL("¡{1} quedó atrapado en una escena de pesadilla!", target.pbThis))
  end

  def pbAdditionalEffect(user, target)
    return if target.fainted? || target.damageState.substitute
    options = []
    options.push(:CONFUSION) if target.pbCanConfuse?(user, false, self)
    options.push(:ACCURACY) if target.pbCanLowerStatStage?(:ACCURACY, user, self)
    return if options.empty?
    if options[@battle.pbRandom(options.length)] == :CONFUSION
      target.pbConfuse
    else
      target.pbLowerStatStage(:ACCURACY, 1, user)
    end
  end
end

class Battle::Battler
  alias __af_cursereel_pbInitEffects pbInitEffects unless method_defined?(:__af_cursereel_pbInitEffects)

  def pbInitEffects(batonPass)
    __af_cursereel_pbInitEffects(batonPass)
    @effects[PBEffects::CurseReel]       = 0
    @effects[PBEffects::CurseReelDamage] = 0
  end
end

class Battle
  alias __af_cursereel_pbEndOfRoundPhase pbEndOfRoundPhase unless method_defined?(:__af_cursereel_pbEndOfRoundPhase)

  def pbEndOfRoundPhase
    ret = __af_cursereel_pbEndOfRoundPhase
    return ret if @decision > 0
    allBattlers.each do |b|
      next if b.effects[PBEffects::CurseReel] <= 0
      b.effects[PBEffects::CurseReel] -= 1
      b.effects[PBEffects::CurseReelDamage] = 0 if b.effects[PBEffects::CurseReel] == 0
    end
    return ret
  end
end

# Daño al intentar cambiar de Pokémon
class Battle
  # Proyección Maldita: daño al intentar cambiar de Pokémon
  alias __af_cursereel_pbRecallAndReplace pbRecallAndReplace unless method_defined?(:__af_cursereel_pbRecallAndReplace)

  def pbRecallAndReplace(idxBattler, idxParty, randomReplacement = false, batonPass = false)
    b = @battlers[idxBattler]
    if !randomReplacement && b && !b.fainted? &&
       b.effects[PBEffects::CurseReel] > 0 && b.effects[PBEffects::CurseReelDamage] > 0 &&
       b.takesIndirectDamage?
      @scene.pbDamageAnimation(b)
      b.pbReduceHP(b.effects[PBEffects::CurseReelDamage], false)
      pbDisplay(_INTL("¡La pesadilla persigue a {1} mientras intenta huir!", b.pbThis(true)))
      b.effects[PBEffects::CurseReel]       = 0
      b.effects[PBEffects::CurseReelDamage] = 0
      b.pbFaint if b.fainted?
    end
    __af_cursereel_pbRecallAndReplace(idxBattler, idxParty, randomReplacement, batonPass)
  end
end
