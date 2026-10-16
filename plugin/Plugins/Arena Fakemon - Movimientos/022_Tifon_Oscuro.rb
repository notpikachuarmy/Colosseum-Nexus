#===============================================================================
# Movimiento: Tifón Oscuro (XDSHADOWSTORM)
#-------------------------------------------------------------------------------
# Necesita 000_Base.rb (reglas comunes de los movimientos oscuros).
# Si solo instalas este archivo, esta es su entrada de PBS:
#
#   [XDSHADOWSTORM]
#   Name = Shadow Storm
#   Type = NORMAL
#   Category = Special
#   Power = 95
#   Accuracy = 100
#   TotalPP = 3
#   Target = AllNearFoes
#   FunctionCode = ShadowMoveNoEffect
#   Flags = CanProtect,CanMirrorMove,Wind
#   Description = Shadow move with no extra effect. Hits all opponents in doubles. Ignores type matchups: x1.3 against everyone (x0.5 against Shadow Pokémon).
#===============================================================================

#===============================================================================
# Tifón Oscuro (Shadow Storm)
# Daño sin efecto extra; en dobles golpea a todos los rivales (Target = AllNearFoes).
#===============================================================================
class Battle::Move::ShadowMoveNoEffect < Battle::Move
  include AFShadowDamage
end
