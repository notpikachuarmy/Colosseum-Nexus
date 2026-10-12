#===============================================================================
# Movimiento: Destello Cegador (BLINDINGFLASH)
#-------------------------------------------------------------------------------
# Este archivo funciona solo. Si no quieres esta parte, bórralo (y quita también
# su entrada del PBS). Si solo instalas este archivo, esta es su entrada de PBS:
#
#   [BLINDINGFLASH]
#   Name = Blinding Flash
#   Type = FAIRY
#   Category = Special
#   Power = 60
#   Accuracy = 100
#   TotalPP = 15
#   Target = NearOther
#   FunctionCode = LowerTargetAtkSpAtk1IfTargetAttacks
#   Flags = CanProtect,CanMirrorMove
#   Description = A burst of light. If the target attacks this turn, its Attack and Sp. Atk fall.
#===============================================================================

#===============================================================================
# Destello Cegador (Blinding Flash)
# Baja 1 el Ataque y el At. Esp. del objetivo si ataca este mismo turno.
#===============================================================================
class Battle::Move::LowerTargetAtkSpAtk1IfTargetAttacks < Battle::Move
  def pbEffectAgainstTarget(user, target)
    return if target.fainted? || target.damageState.substitute
    choice = @battle.choices[target.index]
    return if !choice || choice[0] != :UseMove || !choice[2] || choice[2].statusMove?
    showAnim = true
    [:ATTACK, :SPECIAL_ATTACK].each do |stat|
      next if !target.pbCanLowerStatStage?(stat, user, self)
      showAnim = false if target.pbLowerStatStage(stat, 1, user, showAnim)
    end
  end
end
