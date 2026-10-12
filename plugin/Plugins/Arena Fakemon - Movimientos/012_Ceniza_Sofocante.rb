#===============================================================================
# Movimiento: Ceniza Sofocante (CHOKINGASH)
#-------------------------------------------------------------------------------
# Este archivo funciona solo. Si no quieres esta parte, bórralo (y quita también
# su entrada del PBS). Si solo instalas este archivo, esta es su entrada de PBS:
#
#   [CHOKINGASH]
#   Name = Choking Ash
#   Type = FIRE
#   Category = Status
#   Accuracy = 0
#   TotalPP = 15
#   Target = FoeSide
#   FunctionCode = StartChokingAshOnFoeSide
#   Description = Covers the foe in ash for 3 turns: its physical moves may fail (30%), except for Fire, Steel and Rock types.
#===============================================================================

#===============================================================================
# Ceniza Sofocante (Choking Ash)
# Durante 3 turnos, los rivales que no sean Fuego, Acero o Roca tienen un 30% de
# fallar sus movimientos físicos. Precisión propia del movimiento: 90%.
#===============================================================================
class Battle::Move::StartChokingAshOnFoeSide < Battle::Move
  def pbMoveFailed?(user, targets)
    if user.pbOpposingSide.effects[PBEffects::ChokingAsh] > 0
      @battle.pbDisplay(_INTL("But it failed!"))
      return true
    end
    if @accuracy > 0 && @battle.pbRandom(100) >= @accuracy
      @battle.pbDisplay(_INTL("¡Pero la ceniza se dispersó sin efecto!"))
      return true
    end
    return false
  end

  def pbEffectGeneral(user)
    user.pbOpposingSide.effects[PBEffects::ChokingAsh] = 3
    if user.idxOwnSide == 0
      @battle.pbDisplay(_INTL("¡Una nube de ceniza ardiente cubrió al equipo rival!"))
    else
      @battle.pbDisplay(_INTL("¡Una nube de ceniza ardiente cubrió a tu equipo!"))
    end
  end
end

class Battle::ActiveSide
  alias __af_ash_initialize initialize unless private_method_defined?(:__af_ash_initialize)

  def initialize
    __af_ash_initialize
    @effects[PBEffects::ChokingAsh] = 0
  end
end

class Battle
  alias __af_ash_pbEndOfRoundPhase pbEndOfRoundPhase unless method_defined?(:__af_ash_pbEndOfRoundPhase)

  def pbEndOfRoundPhase
    ret = __af_ash_pbEndOfRoundPhase
    return ret if @decision > 0
    2.times do |side|
      next if @sides[side].effects[PBEffects::ChokingAsh] <= 0
      @sides[side].effects[PBEffects::ChokingAsh] -= 1
      if @sides[side].effects[PBEffects::ChokingAsh] == 0
        msg = (side == 0) ? _INTL("¡La ceniza que cubría a tu equipo se dispersó!") :
                            _INTL("¡La ceniza que cubría al equipo rival se dispersó!")
        pbDisplay(msg)
      end
    end
    return ret
  end
end

#===============================================================================
# Ceniza Sofocante: 30% de fallar movimientos físicos
#===============================================================================
class Battle::Battler
  alias __af_ash_pbTryUseMove pbTryUseMove unless method_defined?(:__af_ash_pbTryUseMove)

  def pbTryUseMove(choice, move, specialUsage, skipAccuracyCheck)
    ret = __af_ash_pbTryUseMove(choice, move, specialUsage, skipAccuracyCheck)
    return ret if !ret
    if pbOwnSide.effects[PBEffects::ChokingAsh] > 0 && move.physicalMove? &&
       !pbHasType?(:FIRE) && !pbHasType?(:STEEL) && !pbHasType?(:ROCK) &&
       @battle.pbRandom(100) < 30
      @battle.pbDisplay(_INTL("¡{1} se asfixia entre la ceniza y no puede atacar!", pbThis))
      @lastMoveFailed = true
      return false
    end
    return ret
  end
end

# Ayuda para la IA
Battle::AI::Handlers::MoveFailureCheck.add("StartChokingAshOnFoeSide",
  proc { |move, user, ai, battle|
    next user.pbOpposingSide.effects[PBEffects::ChokingAsh] > 0
  }
)
Battle::AI::Handlers::MoveEffectScore.add("StartChokingAshOnFoeSide",
  proc { |score, move, user, ai, battle|
    useless = true
    ai.each_foe_battler(user.side) do |b, i|
      next if b.has_type?(:FIRE) || b.has_type?(:STEEL) || b.has_type?(:ROCK)
      next if !b.check_for_move { |m| m.physicalMove? }
      useless = false
      score += 10
    end
    next (useless) ? Battle::AI::MOVE_USELESS_SCORE : score
  }
)
