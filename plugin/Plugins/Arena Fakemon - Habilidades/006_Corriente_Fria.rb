#===============================================================================
# Habilidad: Corriente Fría (COLDCURRENT)
#-------------------------------------------------------------------------------
# Este archivo funciona solo. Si no quieres esta parte, bórralo (y quita también
# su entrada del PBS). Si solo instalas este archivo, esta es su entrada de PBS:
#
#   [COLDCURRENT]
#   Name = Cold Current
#   Description = Raises Speed when entering battle in rain or snow, or when it starts to rain or snow.
#===============================================================================

#-------------------------------------------------------------------------------
# Corriente Fría: +1 Velocidad al entrar con lluvia o granizo/nieve, y cada vez
# que empieza a llover o a granizar/nevar.
#-------------------------------------------------------------------------------
module ArenaFakemon
  CLIMAS_CORRIENTE_FRIA = [:Rain, :HeavyRain, :Hail, :Snow, :Snowstorm]

  def self.corriente_fria(battler)
    return if !battler || battler.fainted?
    return if !battler.hasActiveAbility?(:COLDCURRENT)
    return if !CLIMAS_CORRIENTE_FRIA.include?(battler.effectiveWeather)
    battler.pbRaiseStatStageByAbility(:SPEED, 1, battler)
  end
end

Battle::AbilityEffects::OnSwitchIn.add(:COLDCURRENT,
  proc { |ability, battler, battle, switch_in|
    ArenaFakemon.corriente_fria(battler)
  }
)

class Battle
  alias __arenafakemon__pbStartWeather pbStartWeather unless method_defined?(:__arenafakemon__pbStartWeather)

  def pbStartWeather(user, newWeather, fixedDuration = false, showAnim = true)
    old_weather = @field.weather
    __arenafakemon__pbStartWeather(user, newWeather, fixedDuration, showAnim)
    return if @field.weather == old_weather
    allBattlers.each { |b| ArenaFakemon.corriente_fria(b) }
  end
end
