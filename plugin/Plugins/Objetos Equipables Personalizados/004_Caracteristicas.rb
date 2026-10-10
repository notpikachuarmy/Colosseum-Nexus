#===============================================================================
# Objetos que reaccionan a bajadas de características
#===============================================================================
class Battle::Battler
  #-----------------------------------------------------------------------------
  # SELLO DEL GUARDIÁN: el rival no puede bajarle las características.
  #-----------------------------------------------------------------------------
  alias __chi_wardseal_pbCanLowerStatStage? pbCanLowerStatStage?
  def pbCanLowerStatStage?(stat, user = nil, move = nil, showFailMsg = false, *args)
    if (!user || user.index != @index) && hasActiveItem?(:WARDSEAL) && !fainted?
      if showFailMsg
        @battle.pbDisplay(_INTL("¡El {1} de {2} impide que bajen sus características!", itemName, pbThis(true)))
      end
      return false
    end
    return __chi_wardseal_pbCanLowerStatStage?(stat, user, move, showFailMsg, *args)
  end

  #-----------------------------------------------------------------------------
  # PIEDRA ESPEJO: devuelve la primera bajada provocada por el rival.
  #-----------------------------------------------------------------------------
  def chi_try_reflect_stat_loss(stat, increment, user)
    return false if @battle.chi_reflecting
    return false if !user || user.index == @index || user.fainted?
    return false if !hasActiveItem?(:REFLECTMIRROR)
    return false if hasActiveAbility?([:CONTRARY, :MIRRORARMOR])
    @battle.pbDisplay(_INTL("¡La {1} de {2} devolvió la bajada de características!", itemName, pbThis(true)))
    pbConsumeItem
    @battle.chi_reflecting = true
    begin
      user.pbLowerStatStage(stat, increment, self) if user.pbCanLowerStatStage?(stat, self, nil, true)
    ensure
      @battle.chi_reflecting = false
    end
    return true
  end

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

  alias __chi_stats_pbLowerStatStage pbLowerStatStage
  def pbLowerStatStage(stat, increment, user, *args)
    return false if chi_try_reflect_stat_loss(stat, increment, user)
    ret = __chi_stats_pbLowerStatStage(stat, increment, user, *args)
    chi_chaos_stone_trigger(user) if ret
    return ret
  end

  alias __chi_stats_pbLowerStatStageByCause pbLowerStatStageByCause
  def pbLowerStatStageByCause(stat, increment, user, cause, *args)
    return false if chi_try_reflect_stat_loss(stat, increment, user)
    ret = __chi_stats_pbLowerStatStageByCause(stat, increment, user, cause, *args)
    chi_chaos_stone_trigger(user) if ret
    return ret
  end
end
