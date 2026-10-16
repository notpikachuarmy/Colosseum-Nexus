#===============================================================================
# Movimiento: Muda Oscura (XDSHADOWSHED)
#-------------------------------------------------------------------------------
# Necesita 000_Base.rb (reglas comunes de los movimientos oscuros).
# Si solo instalas este archivo, esta es su entrada de PBS:
#
#   [XDSHADOWSHED]
#   Name = Shadow Shed
#   Type = NORMAL
#   Category = Status
#   Accuracy = 100
#   TotalPP = 3
#   Target = FoeSide
#   FunctionCode = ShadowRemoveScreensFoeSide
#   Description = Shadow move. Removes Reflect, Light Screen and Safeguard from the opposing side.
#===============================================================================

#===============================================================================
# Muda Oscura (Shadow Shed)
# Quita Reflejo, Pantalla de Luz y Velo Sagrado del equipo rival.
#===============================================================================
class Battle::Move::ShadowRemoveScreensFoeSide < Battle::Move
  def pbScreensUp?(side)
    return side.effects[PBEffects::Reflect] > 0 || side.effects[PBEffects::LightScreen] > 0 ||
           side.effects[PBEffects::Safeguard] > 0
  end

  def pbMoveFailed?(user, targets)
    if !pbScreensUp?(user.pbOpposingSide)
      @battle.pbDisplay(_INTL("But it failed!"))
      return true
    end
    return false
  end

  def pbEffectGeneral(user)
    side = user.pbOpposingSide
    if side.effects[PBEffects::Reflect] > 0
      side.effects[PBEffects::Reflect] = 0
      @battle.pbDisplay(_INTL("{1}'s Reflect wore off!", user.pbOpposingTeam))
    end
    if side.effects[PBEffects::LightScreen] > 0
      side.effects[PBEffects::LightScreen] = 0
      @battle.pbDisplay(_INTL("{1}'s Light Screen wore off!", user.pbOpposingTeam))
    end
    if side.effects[PBEffects::Safeguard] > 0
      side.effects[PBEffects::Safeguard] = 0
      @battle.pbDisplay(_INTL("{1} is no longer protected by Safeguard!", user.pbOpposingTeam))
    end
  end
end

# Ayuda para la IA: no lo usa si no hay nada que quitar
Battle::AI::Handlers::MoveFailureCheck.add("ShadowRemoveScreensFoeSide",
  proc { |move, user, ai, battle|
    side = user.battler.pbOpposingSide
    next side.effects[PBEffects::Reflect] == 0 && side.effects[PBEffects::LightScreen] == 0 &&
         side.effects[PBEffects::Safeguard] == 0
  }
)
