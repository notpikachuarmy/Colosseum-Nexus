#===============================================================================
# Movimiento: Ocaso Oscuro (XDSHADOWDUSK)
#-------------------------------------------------------------------------------
# Necesita 000_Base.rb (reglas comunes de los movimientos oscuros).
# Si solo instalas este archivo, esta es su entrada de PBS:
#
#   [XDSHADOWDUSK]
#   Name = Shadow Dusk
#   Type = NORMAL
#   Category = Status
#   Accuracy = 100
#   TotalPP = 5
#   Target = AllNearFoes
#   FunctionCode = ShadowLowerTargetsDefense2
#   Flags = CanProtect,CanMagicCoat,CanMirrorMove
#   Description = Shadow move. Harshly lowers all opponents' Defense.
#===============================================================================

#===============================================================================
# Ocaso Oscuro (Shadow Dusk)
# Baja dos niveles la Defensa de todos los rivales (como Chirrido, pero sin
# tabla de tipos: también afecta a los de tipo Fantasma).
#===============================================================================
class Battle::Move::ShadowLowerTargetsDefense2 < Battle::Move::LowerTargetDefense2
  def pbCalcTypeMod(moveType, user, target)
    return Effectiveness::NORMAL_EFFECTIVE_MULTIPLIER
  end
end
