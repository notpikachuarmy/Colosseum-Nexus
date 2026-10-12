#===============================================================================
# Objeto: Piedra Espejo (REFLECTMIRROR)
#-------------------------------------------------------------------------------
# Este archivo funciona solo. Si no quieres esta parte, bórralo (y quita también
# su entrada del PBS). Si solo instalas este archivo, esta es su entrada de PBS:
#
#   [REFLECTMIRROR]
#   Name = Reflect Mirror
#   NamePlural = Reflect Mirrors
#   Pocket = 1
#   Price = 4000
#   Flags = Fling_30
#   Description = Reflects the first stat drop a foe causes back at it. Consumed.
#
# Icono: Graphics/Items/REFLECTMIRROR.png
#===============================================================================

class Battle
  attr_accessor :chi_reflecting   # Evita rebotes infinitos de la Piedra Espejo
end

class Battle::Battler
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

  alias __chi_mirror_pbLowerStatStage pbLowerStatStage
  def pbLowerStatStage(stat, increment, user, *args)
    return false if chi_try_reflect_stat_loss(stat, increment, user)
    return __chi_mirror_pbLowerStatStage(stat, increment, user, *args)
  end

  alias __chi_mirror_pbLowerStatStageByCause pbLowerStatStageByCause
  def pbLowerStatStageByCause(stat, increment, user, cause, *args)
    return false if chi_try_reflect_stat_loss(stat, increment, user)
    return __chi_mirror_pbLowerStatStageByCause(stat, increment, user, cause, *args)
  end
end
