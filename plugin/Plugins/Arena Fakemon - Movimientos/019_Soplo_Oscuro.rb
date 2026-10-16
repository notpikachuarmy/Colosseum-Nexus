#===============================================================================
# Movimiento: Soplo Oscuro (XDSHADOWBLAST)
#-------------------------------------------------------------------------------
# Necesita 000_Base.rb (reglas comunes de los movimientos oscuros).
# Si solo instalas este archivo, esta es su entrada de PBS:
#
#   [XDSHADOWBLAST]
#   Name = Shadow Blast
#   Type = NORMAL
#   Category = Special
#   Power = 80
#   Accuracy = 100
#   TotalPP = 3
#   Target = NearOther
#   FunctionCode = ShadowMoveHighCritical
#   Flags = CanProtect,CanMirrorMove,HighCriticalHitRate
#   Description = Shadow move. High critical-hit ratio. Ignores type matchups: x1.3 against everyone (x0.5 against Shadow Pokémon).
#===============================================================================

#===============================================================================
# Soplo Oscuro (Shadow Blast)
# Versión oscura y más débil de Aerochorro: alta probabilidad de crítico
# (la da el flag HighCriticalHitRate del PBS).
#===============================================================================
class Battle::Move::ShadowMoveHighCritical < Battle::Move
  include AFShadowDamage
end
