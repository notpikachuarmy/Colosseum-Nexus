#===============================================================================
# Habilidad: Sonámbulo (SLEEPWALKER)
#-------------------------------------------------------------------------------
# Este archivo funciona solo. Si no quieres esta parte, bórralo (y quita también
# su entrada del PBS). Si solo instalas este archivo, esta es su entrada de PBS:
#
#   [SLEEPWALKER]
#   Name = Sleepwalker
#   Description = Can use its moves even while asleep, but they deal 25% less damage while it sleeps.
#===============================================================================

#-------------------------------------------------------------------------------
# Sonámbulo: puede usar cualquier movimiento aunque esté dormido (como si todos
# fueran Ronquido). Mientras duerme, sus ataques hacen un 25% menos de daño.
# El contador de sueño sigue bajando con normalidad.
#-------------------------------------------------------------------------------
class Battle::Battler
  alias __af_sleepwalker_pbTryUseMove pbTryUseMove unless method_defined?(:__af_sleepwalker_pbTryUseMove)

  def pbTryUseMove(choice, move, specialUsage, skipAccuracyCheck)
    sonambulo = (@status == :SLEEP && hasActiveAbility?(:SLEEPWALKER))
    move.instance_variable_set(:@__af_sleepwalk, true) if sonambulo
    begin
      ret = __af_sleepwalker_pbTryUseMove(choice, move, specialUsage, skipAccuracyCheck)
    ensure
      move.instance_variable_set(:@__af_sleepwalk, false)
    end
    if ret && sonambulo && asleep?
      @battle.pbShowAbilitySplash(self)
      @battle.pbDisplay(_INTL("{1} is sleepwalking!", pbThis))
      @battle.pbHideAbilitySplash(self)
    end
    return ret
  end
end

class Battle::Move
  alias __af_sleepwalker_usableWhenAsleep? usableWhenAsleep? unless method_defined?(:__af_sleepwalker_usableWhenAsleep?)

  def usableWhenAsleep?
    return true if @__af_sleepwalk
    return __af_sleepwalker_usableWhenAsleep?
  end
end

Battle::AbilityEffects::DamageCalcFromUser.add(:SLEEPWALKER,
  proc { |ability, user, target, move, mults, power, type|
    mults[:power_multiplier] *= 0.75 if user.asleep?
  }
)
