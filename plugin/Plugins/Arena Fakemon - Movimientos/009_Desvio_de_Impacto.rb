#===============================================================================
# Movimiento: Desvío de Impacto (PARRYSTRIKE)
#-------------------------------------------------------------------------------
# Este archivo funciona solo. Si no quieres esta parte, bórralo (y quita también
# su entrada del PBS). Si solo instalas este archivo, esta es su entrada de PBS:
#
#   [PARRYSTRIKE]
#   Name = Parry Strike
#   Type = FIGHTING
#   Category = Physical
#   Power = 50
#   Accuracy = 100
#   TotalPP = 15
#   Target = NearOther
#   Priority = 1
#   FunctionCode = AlwaysCriticalIfTargetUsedContactMove
#   Flags = Contact,CanProtect,CanMirrorMove
#   Description = +1 priority. Always lands a critical hit if the target already used a contact move this turn.
#===============================================================================

#===============================================================================
# Desvío de Impacto (Parry Strike)
# Crítico garantizado si el objetivo ya usó un movimiento de contacto este turno.
#===============================================================================
class Battle::Move::AlwaysCriticalIfTargetUsedContactMove < Battle::Move
  def pbCritialOverride(user, target)
    return 0 if !target.movedThisRound? || !target.lastMoveUsed
    move_data = GameData::Move.try_get(target.lastMoveUsed)
    return 1 if move_data && move_data.has_flag?("Contact")
    return 0
  end
end
