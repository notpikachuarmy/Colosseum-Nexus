#===============================================================================
# Objeto: Piedra del Caos (CHAOSSTONE)
#-------------------------------------------------------------------------------
# Este archivo funciona solo. Si no quieres esta parte, bórralo (y quita también
# su entrada del PBS). Si solo instalas este archivo, esta es su entrada de PBS:
#
#   [CHAOSSTONE]
#   Name = Chaos Stone
#   NamePlural = Chaos Stones
#   Pocket = 1
#   Price = 4000
#   Flags = Fling_30
#   Description = Randomly raises a stat when a foe lowers the holder's stats.
#
# Icono: Graphics/Items/CHAOSSTONE.png
#===============================================================================

class Battle::Battler
  #-----------------------------------------------------------------------------
  # PIEDRA DEL CAOS: si el rival le baja una característica, sube otra al azar.
  #-----------------------------------------------------------------------------
  def chi_chaos_stone_trigger(user)
    return if fainted? || !user || user.index == @index || !user.opposes?(self)
    return if !hasActiveItem?(:CHAOSSTONE) || hasActiveAbility?(:CONTRARY)
    candidates = [:ATTACK, :DEFENSE, :SPECIAL_ATTACK, :SPECIAL_DEFENSE, :SPEED].select do |s|
      pbCanRaiseStatStage?(s, self)
    end
    return if candidates.empty?
    @battle.pbDisplay(_INTL("¡La {1} de {2} reaccionó!", itemName, pbThis(true)))
    pbRaiseStatStage(candidates[@battle.pbRandom(candidates.length)], 1, self)
  end

  alias __chi_chaos_pbLowerStatStage pbLowerStatStage
  def pbLowerStatStage(stat, increment, user, *args)
    ret = __chi_chaos_pbLowerStatStage(stat, increment, user, *args)
    chi_chaos_stone_trigger(user) if ret
    return ret
  end

  alias __chi_chaos_pbLowerStatStageByCause pbLowerStatStageByCause
  def pbLowerStatStageByCause(stat, increment, user, cause, *args)
    ret = __chi_chaos_pbLowerStatStageByCause(stat, increment, user, cause, *args)
    chi_chaos_stone_trigger(user) if ret
    return ret
  end
end
