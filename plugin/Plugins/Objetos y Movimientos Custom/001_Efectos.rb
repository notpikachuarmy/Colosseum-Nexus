#===============================================================================
# Objetos y Movimientos Custom - Efectos de combate nuevos
#===============================================================================
module PBEffects
  # Efectos de combatiente
  CurseReel        = 200   # Turnos restantes de Proyección Maldita
  CurseReelDamage  = 201   # Daño que recibe si intenta cambiar
  Paranoia         = 202   # Índice del combatiente que causó la Paranoia (-1 = nada)
  ParanoiaSource   = 203   # Pokémon que causó la Paranoia
  ReflectiveFrost  = 204   # Niebla Espejo activa este turno
  TectonicPit      = 205   # Turnos restantes atrapado por Fisura Táctica
  # Efectos de lado del campo
  ChokingAsh       = 850   # Turnos restantes de Ceniza Sofocante
end

module CustomMovesItems
  # Especies que cuentan como "línea evolutiva fósil" para el Fragmento Meteorito.
  # Para tus fakemon fósiles, añade su ID aquí o pon "Flags = Fossil" en su
  # entrada de pokemon.txt (basta con ponerlo en la primera fase de la línea).
  FOSSIL_SPECIES = [
    :OMANYTE, :OMASTAR, :KABUTO, :KABUTOPS, :AERODACTYL,
    :LILEEP, :CRADILY, :ANORITH, :ARMALDO,
    :CRANIDOS, :RAMPARDOS, :SHIELDON, :BASTIODON,
    :TIRTOUGA, :CARRACOSTA, :ARCHEN, :ARCHEOPS,
    :TYRUNT, :TYRANTRUM, :AMAURA, :AURORUS,
    :DRACOZOLT, :ARCTOZOLT, :DRACOVISH, :ARCTOVISH
  ]

  module_function

  def fossil_line?(battler)
    return false if !battler.pokemon
    species_data = battler.pokemon.species_data
    return true if FOSSIL_SPECIES.include?(species_data.species)
    return true if species_data.has_flag?("Fossil")
    baby = GameData::Species.get(species_data.get_baby_species)
    return true if FOSSIL_SPECIES.include?(baby.species)
    return baby.has_flag?("Fossil")
  end

  # Prioridad con la que el combatiente va a usar su movimiento este turno
  def move_priority(battler, move)
    choice = battler.battle.choices[battler.index]
    return choice[4].to_i if choice && choice[0] == :UseMove && choice[2] == move
    return move.pbPriority(battler)
  end

  def side_name(battler)
    return (battler.idxOwnSide == 0) ? _INTL("tu equipo") : _INTL("el equipo rival")
  end
end

#===============================================================================
# Inicialización de los efectos nuevos
#===============================================================================
class Battle::Battler
  alias __custom_pbInitEffects pbInitEffects unless method_defined?(:__custom_pbInitEffects)

  def pbInitEffects(batonPass)
    __custom_pbInitEffects(batonPass)
    @effects[PBEffects::CurseReel]       = 0
    @effects[PBEffects::CurseReelDamage] = 0
    @effects[PBEffects::ReflectiveFrost] = false
    @effects[PBEffects::TectonicPit]     = 0
    if !batonPass || @effects[PBEffects::Confusion] <= 0
      @effects[PBEffects::Paranoia]       = -1
      @effects[PBEffects::ParanoiaSource] = nil
    end
  end
end

class Battle::ActiveSide
  alias __custom_initialize initialize unless private_method_defined?(:__custom_initialize)

  def initialize
    __custom_initialize
    @effects[PBEffects::ChokingAsh] = 0
  end
end

#===============================================================================
# Cuenta atrás de los efectos al final de la ronda
#===============================================================================
class Battle
  alias __custom_pbEndOfRoundPhase pbEndOfRoundPhase unless method_defined?(:__custom_pbEndOfRoundPhase)

  def pbEndOfRoundPhase
    ret = __custom_pbEndOfRoundPhase
    return ret if @decision > 0
    allBattlers.each do |b|
      b.effects[PBEffects::ReflectiveFrost] = false
      if b.effects[PBEffects::CurseReel] > 0
        b.effects[PBEffects::CurseReel] -= 1
        b.effects[PBEffects::CurseReelDamage] = 0 if b.effects[PBEffects::CurseReel] == 0
      end
      b.effects[PBEffects::TectonicPit] -= 1 if b.effects[PBEffects::TectonicPit] > 0
    end
    2.times do |side|
      next if @sides[side].effects[PBEffects::ChokingAsh] <= 0
      @sides[side].effects[PBEffects::ChokingAsh] -= 1
      if @sides[side].effects[PBEffects::ChokingAsh] == 0
        msg = (side == 0) ? _INTL("¡La ceniza que cubría a tu equipo se dispersó!") :
                            _INTL("¡La ceniza que cubría al equipo rival se dispersó!")
        pbDisplay(msg)
      end
    end
    return ret
  end

  # Proyección Maldita: daño al intentar cambiar de Pokémon
  alias __custom_pbRecallAndReplace pbRecallAndReplace unless method_defined?(:__custom_pbRecallAndReplace)

  def pbRecallAndReplace(idxBattler, idxParty, randomReplacement = false, batonPass = false)
    b = @battlers[idxBattler]
    if !randomReplacement && b && !b.fainted? &&
       b.effects[PBEffects::CurseReel] > 0 && b.effects[PBEffects::CurseReelDamage] > 0 &&
       b.takesIndirectDamage?
      @scene.pbDamageAnimation(b)
      b.pbReduceHP(b.effects[PBEffects::CurseReelDamage], false)
      pbDisplay(_INTL("¡La pesadilla persigue a {1} mientras intenta huir!", b.pbThis(true)))
      b.effects[PBEffects::CurseReel]       = 0
      b.effects[PBEffects::CurseReelDamage] = 0
      b.pbFaint if b.fainted?
    end
    __custom_pbRecallAndReplace(idxBattler, idxParty, randomReplacement, batonPass)
  end
end

#===============================================================================
# Fisura Táctica: impide cambiar
#===============================================================================
class Battle::Battler
  alias __custom_trappedInBattle? trappedInBattle? unless method_defined?(:__custom_trappedInBattle?)

  def trappedInBattle?
    return true if @effects[PBEffects::TectonicPit] > 0
    return __custom_trappedInBattle?
  end
end

#===============================================================================
# Paranoia (Gas de Paranoia): al herirse por la confusión se le cae el objeto
#===============================================================================
class Battle::Battler
  alias __custom_pbCureConfusion pbCureConfusion unless method_defined?(:__custom_pbCureConfusion)

  def pbCureConfusion
    __custom_pbCureConfusion
    @effects[PBEffects::Paranoia]       = -1
    @effects[PBEffects::ParanoiaSource] = nil
  end

  alias __custom_pbConfusionDamage pbConfusionDamage unless method_defined?(:__custom_pbConfusionDamage)

  def pbConfusionDamage(msg)
    paranoid = @effects[PBEffects::Paranoia] >= 0
    __custom_pbConfusionDamage(msg)
    pbParanoiaDropItem if paranoid && !fainted?
  end

  def pbParanoiaDropItem
    return if !self.item || unlosableItem?(self.item)
    if hasActiveAbility?(:STICKYHOLD)
      @battle.pbShowAbilitySplash(self)
      @battle.pbDisplay(_INTL("¡{1} se aferra a su objeto pese al pánico!", pbThis))
      @battle.pbHideAbilitySplash(self)
      return
    end
    dropped = self.item
    dropped_name = itemName
    @battle.pbDisplay(_INTL("¡Presa del pánico, a {1} se le cayó su {2}!", pbThis(true), dropped_name))
    pbRemoveItem(false)
    # El causante de la Paranoia lo recoge con Prestidigitador o Hurto
    thief = @battle.battlers[@effects[PBEffects::Paranoia]]
    return if !thief || thief.fainted? || thief.item || thief.wild?
    return if thief.pokemon != @effects[PBEffects::ParanoiaSource]
    return if !thief.hasActiveAbility?([:MAGICIAN, :PICKPOCKET])
    return if thief.unlosableItem?(dropped)
    @battle.pbShowAbilitySplash(thief)
    thief.item = dropped
    if @battle.wildBattle? && !thief.initialItem && dropped == self.initialItem
      thief.setInitialItem(dropped)
      setInitialItem(nil)
    end
    @battle.pbDisplay(_INTL("¡{1} recogió el objeto {2}!", thief.pbThis, dropped_name))
    @battle.pbHideAbilitySplash(thief)
  end
end

#===============================================================================
# Niebla Espejo: devuelve las bajadas de características este turno
#===============================================================================
class Battle::Battler
  def pbReflectiveFrostBounces?(stat, user, ignoreMirrorArmor)
    return false if !@effects[PBEffects::ReflectiveFrost] || ignoreMirrorArmor
    return false if !user || user.index == @index
    return !statStageAtMin?(stat)
  end

  alias __custom_pbCanLowerStatStage? pbCanLowerStatStage? unless method_defined?(:__custom_pbCanLowerStatStage?)

  def pbCanLowerStatStage?(stat, user = nil, move = nil, showFailMsg = false,
                           ignoreContrary = false, ignoreMirrorArmor = false)
    return true if !fainted? && pbReflectiveFrostBounces?(stat, user, ignoreMirrorArmor)
    return __custom_pbCanLowerStatStage?(stat, user, move, showFailMsg, ignoreContrary, ignoreMirrorArmor)
  end

  alias __custom_pbLowerStatStage pbLowerStatStage unless method_defined?(:__custom_pbLowerStatStage)

  def pbLowerStatStage(stat, increment, user, showAnim = true, ignoreContrary = false,
                       mirrorArmorSplash = 0, ignoreMirrorArmor = false)
    if pbReflectiveFrostBounces?(stat, user, ignoreMirrorArmor)
      @battle.pbDisplay(_INTL("¡La Niebla Espejo de {1} devolvió el efecto!", pbThis(true)))
      return false if !user.pbCanLowerStatStage?(stat, self, nil, true, ignoreContrary, true)
      return user.pbLowerStatStage(stat, increment, self, showAnim, ignoreContrary, 0, true)
    end
    return __custom_pbLowerStatStage(stat, increment, user, showAnim, ignoreContrary,
                                     mirrorArmorSplash, ignoreMirrorArmor)
  end

  alias __custom_pbLowerStatStageByCause pbLowerStatStageByCause unless method_defined?(:__custom_pbLowerStatStageByCause)

  def pbLowerStatStageByCause(stat, increment, user, cause, showAnim = true,
                              ignoreContrary = false, ignoreMirrorArmor = false)
    if pbReflectiveFrostBounces?(stat, user, ignoreMirrorArmor)
      @battle.pbDisplay(_INTL("¡La Niebla Espejo de {1} devolvió el efecto!", pbThis(true)))
      return false if !user.pbCanLowerStatStage?(stat, self, nil, true, ignoreContrary, true)
      return user.pbLowerStatStageByCause(stat, increment, self, cause, showAnim, ignoreContrary, true)
    end
    return __custom_pbLowerStatStageByCause(stat, increment, user, cause, showAnim,
                                            ignoreContrary, ignoreMirrorArmor)
  end
end

class Battle::Move
  alias __custom_pbCalcDamageMultipliers pbCalcDamageMultipliers unless method_defined?(:__custom_pbCalcDamageMultipliers)

  def pbCalcDamageMultipliers(user, target, numTargets, type, baseDmg, multipliers)
    __custom_pbCalcDamageMultipliers(user, target, numTargets, type, baseDmg, multipliers)
    if target.effects[PBEffects::ReflectiveFrost] && specialMove?(type)
      multipliers[:final_damage_multiplier] /= 2
    end
  end
end

#===============================================================================
# Ceniza Sofocante: 30% de fallar movimientos físicos
#===============================================================================
class Battle::Battler
  alias __custom_pbTryUseMove pbTryUseMove unless method_defined?(:__custom_pbTryUseMove)

  def pbTryUseMove(choice, move, specialUsage, skipAccuracyCheck)
    ret = __custom_pbTryUseMove(choice, move, specialUsage, skipAccuracyCheck)
    return ret if !ret
    if pbOwnSide.effects[PBEffects::ChokingAsh] > 0 && move.physicalMove? &&
       !pbHasType?(:FIRE) && !pbHasType?(:STEEL) && !pbHasType?(:ROCK) &&
       @battle.pbRandom(100) < 30
      @battle.pbDisplay(_INTL("¡{1} se asfixia entre la ceniza y no puede atacar!", pbThis))
      @lastMoveFailed = true
      return false
    end
    return ret
  end
end
