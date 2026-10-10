#===============================================================================
# Objetos y Movimientos Custom - Ayudas para la IA
#===============================================================================
Battle::AI::Handlers::MoveFailureCheck.add("HalveSpecialDamageReflectStatDropsThisRound",
  proc { |move, user, ai, battle|
    next user.effects[PBEffects::ReflectiveFrost]
  }
)

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

Battle::AI::Handlers::MoveFailureAgainstTargetCheck.add("RemoveEntryHazardsTrapTargetOneTurn",
  proc { |move, user, target, ai, battle|
    hazards = [user.pbOwnSide, user.pbOpposingSide].any? do |side|
      side.effects[PBEffects::StealthRock] || side.effects[PBEffects::Spikes] > 0 ||
        side.effects[PBEffects::ToxicSpikes] > 0 || side.effects[PBEffects::StickyWeb]
    end
    next false if hazards
    next true if target.effects[PBEffects::TectonicPit] > 0
    next Settings::MORE_TYPE_EFFECTS && target.has_type?(:GHOST)
  }
)
