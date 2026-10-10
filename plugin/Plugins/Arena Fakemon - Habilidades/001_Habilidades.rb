#===============================================================================
# Arena Fakemon - Habilidades personalizadas para Pokémon Essentials v21.1
#-------------------------------------------------------------------------------
# Las habilidades se definen en PBS/abilities_custom.txt (ver carpeta PBS de este
# paquete). Este archivo solo programa lo que hace cada una en combate.
#
#   SOOTHINGSLUMBER  Sueño confortante   NIGHTTERROR   Terror nocturno
#   DRAGONHEART      Corazón de Dragón   ANTIVENOM     Contraveneno
#   MORNINGDEW       Rocío Matinal       COLDCURRENT   Corriente Fría
#   EVILEYE          Mal de Ojo
#===============================================================================

#-------------------------------------------------------------------------------
# Sueño confortante: al recibir un movimiento físico, 25% de dormir al atacante.
#-------------------------------------------------------------------------------
Battle::AbilityEffects::OnBeingHit.add(:SOOTHINGSLUMBER,
  proc { |ability, user, target, move, battle|
    next if user.index == target.index
    next if !move.physicalMove?
    next if user.asleep?
    next if battle.pbRandom(100) >= 25
    battle.pbShowAbilitySplash(target)
    if user.pbCanSleep?(target, Battle::Scene::USE_ABILITY_SPLASH)
      msg = nil
      if !Battle::Scene::USE_ABILITY_SPLASH
        msg = _INTL("{1}'s {2} made {3} fall asleep!", target.pbThis,
                    target.abilityName, user.pbThis(true))
      end
      user.pbSleep(msg)
    end
    battle.pbHideAbilitySplash(target)
  }
)

#-------------------------------------------------------------------------------
# Terror nocturno: +30% de daño contra objetivos dormidos (o con Comatose).
#-------------------------------------------------------------------------------
Battle::AbilityEffects::DamageCalcFromUser.add(:NIGHTTERROR,
  proc { |ability, user, target, move, mults, power, type|
    if target.asleep? || target.hasActiveAbility?(:COMATOSE)
      mults[:final_damage_multiplier] *= 1.3
    end
  }
)

#-------------------------------------------------------------------------------
# Corazón de Dragón: movimientos de tipo Dragón x1.5 con 1/3 de PS o menos.
#-------------------------------------------------------------------------------
Battle::AbilityEffects::DamageCalcFromUser.add(:DRAGONHEART,
  proc { |ability, user, target, move, mults, power, type|
    if user.hp <= user.totalhp / 3 && type == :DRAGON
      mults[:attack_multiplier] *= 1.5
    end
  }
)

#-------------------------------------------------------------------------------
# Contraveneno: inmune a los movimientos de tipo Veneno (le suben el Ataque) y
# no puede ser envenenado.
#-------------------------------------------------------------------------------
Battle::AbilityEffects::MoveImmunity.add(:ANTIVENOM,
  proc { |ability, user, target, move, type, battle, show_message|
    next target.pbMoveImmunityStatRaisingAbility(user, move, type,
       :POISON, :ATTACK, 1, show_message)
  }
)

Battle::AbilityEffects::StatusImmunity.add(:ANTIVENOM,
  proc { |ability, battler, status|
    next true if status == :POISON
  }
)

Battle::AbilityEffects::StatusCure.add(:ANTIVENOM,
  proc { |ability, battler|
    next if battler.status != :POISON
    battler.battle.pbShowAbilitySplash(battler)
    battler.pbCureStatus(Battle::Scene::USE_ABILITY_SPLASH)
    if !Battle::Scene::USE_ABILITY_SPLASH
      battler.battle.pbDisplay(_INTL("{1}'s {2} cured its poisoning!", battler.pbThis, battler.abilityName))
    end
    battler.battle.pbHideAbilitySplash(battler)
  }
)

#-------------------------------------------------------------------------------
# Rocío Matinal: recupera 1/16 de PS al final de cada turno; 1/8 con lluvia o
# con Campo de Hierba (si toca el suelo).
#-------------------------------------------------------------------------------
Battle::AbilityEffects::EndOfRoundHealing.add(:MORNINGDEW,
  proc { |ability, battler, battle|
    next if !battler.canHeal?
    amount = battler.totalhp / 16
    if [:Rain, :HeavyRain].include?(battler.effectiveWeather) ||
       (battle.field.terrain == :Grassy && battler.affectedByTerrain?)
      amount = battler.totalhp / 8
    end
    battle.pbShowAbilitySplash(battler)
    battler.pbRecoverHP(amount)
    if Battle::Scene::USE_ABILITY_SPLASH
      battle.pbDisplay(_INTL("{1}'s HP was restored.", battler.pbThis))
    else
      battle.pbDisplay(_INTL("{1}'s {2} restored its HP.", battler.pbThis, battler.abilityName))
    end
    battle.pbHideAbilitySplash(battler)
  }
)

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

#-------------------------------------------------------------------------------
# Mal de Ojo: al entrar, baja 1 nivel la Defensa Especial de los rivales
# cercanos (como Intimidación, pero con la Defensa Especial).
#-------------------------------------------------------------------------------
Battle::AbilityEffects::OnSwitchIn.add(:EVILEYE,
  proc { |ability, battler, battle, switch_in|
    battle.pbShowAbilitySplash(battler)
    battle.allOtherSideBattlers(battler.index).each do |b|
      next if !b.near?(battler) || b.fainted?
      if b.effects[PBEffects::Substitute] > 0
        battle.pbDisplay(_INTL("{1} is protected by its substitute!", b.pbThis))
        next
      end
      b.pbLowerStatStageByAbility(:SPECIAL_DEFENSE, 1, battler, false)
    end
    battle.pbHideAbilitySplash(battler)
  }
)
