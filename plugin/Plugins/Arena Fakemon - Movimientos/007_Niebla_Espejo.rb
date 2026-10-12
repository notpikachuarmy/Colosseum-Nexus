#===============================================================================
# Movimiento: Niebla Espejo (REFLECTIVEFROST)
#-------------------------------------------------------------------------------
# Este archivo funciona solo. Si no quieres esta parte, bórralo (y quita también
# su entrada del PBS). Si solo instalas este archivo, esta es su entrada de PBS:
#
#   [REFLECTIVEFROST]
#   Name = Reflective Frost
#   Type = ICE
#   Category = Status
#   Accuracy = 0
#   TotalPP = 10
#   Target = User
#   Priority = 1
#   FunctionCode = HalveSpecialDamageReflectStatDropsThisRound
#   Flags = CanSnatch
#   Description = +1 priority. This turn the user takes half damage from special moves and reflects stat drops.
#===============================================================================

#===============================================================================
# Niebla Espejo (Reflective Frost)
# Este turno: recibe la mitad de daño de ataques especiales y devuelve las
# bajadas de características.
#===============================================================================
class Battle::Move::HalveSpecialDamageReflectStatDropsThisRound < Battle::Move
  def canSnatch?; return true; end

  def pbMoveFailed?(user, targets)
    if user.effects[PBEffects::ReflectiveFrost]
      @battle.pbDisplay(_INTL("But it failed!"))
      return true
    end
    return false
  end

  def pbEffectGeneral(user)
    user.effects[PBEffects::ReflectiveFrost] = true
    @battle.pbDisplay(_INTL("¡{1} se cubrió con un escudo de escarcha deslumbrante!", user.pbThis))
  end
end

class Battle::Battler
  alias __af_frost_pbInitEffects pbInitEffects unless method_defined?(:__af_frost_pbInitEffects)

  def pbInitEffects(batonPass)
    __af_frost_pbInitEffects(batonPass)
    @effects[PBEffects::ReflectiveFrost] = false
  end
end

class Battle
  alias __af_frost_pbEndOfRoundPhase pbEndOfRoundPhase unless method_defined?(:__af_frost_pbEndOfRoundPhase)

  def pbEndOfRoundPhase
    ret = __af_frost_pbEndOfRoundPhase
    return ret if @decision > 0
    allBattlers.each { |b| b.effects[PBEffects::ReflectiveFrost] = false }
    return ret
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

  alias __af_frost_pbCanLowerStatStage? pbCanLowerStatStage? unless method_defined?(:__af_frost_pbCanLowerStatStage?)

  def pbCanLowerStatStage?(stat, user = nil, move = nil, showFailMsg = false,
                           ignoreContrary = false, ignoreMirrorArmor = false)
    return true if !fainted? && pbReflectiveFrostBounces?(stat, user, ignoreMirrorArmor)
    return __af_frost_pbCanLowerStatStage?(stat, user, move, showFailMsg, ignoreContrary, ignoreMirrorArmor)
  end

  alias __af_frost_pbLowerStatStage pbLowerStatStage unless method_defined?(:__af_frost_pbLowerStatStage)

  def pbLowerStatStage(stat, increment, user, showAnim = true, ignoreContrary = false,
                       mirrorArmorSplash = 0, ignoreMirrorArmor = false)
    if pbReflectiveFrostBounces?(stat, user, ignoreMirrorArmor)
      @battle.pbDisplay(_INTL("¡La Niebla Espejo de {1} devolvió el efecto!", pbThis(true)))
      return false if !user.pbCanLowerStatStage?(stat, self, nil, true, ignoreContrary, true)
      return user.pbLowerStatStage(stat, increment, self, showAnim, ignoreContrary, 0, true)
    end
    return __af_frost_pbLowerStatStage(stat, increment, user, showAnim, ignoreContrary,
                                     mirrorArmorSplash, ignoreMirrorArmor)
  end

  alias __af_frost_pbLowerStatStageByCause pbLowerStatStageByCause unless method_defined?(:__af_frost_pbLowerStatStageByCause)

  def pbLowerStatStageByCause(stat, increment, user, cause, showAnim = true,
                              ignoreContrary = false, ignoreMirrorArmor = false)
    if pbReflectiveFrostBounces?(stat, user, ignoreMirrorArmor)
      @battle.pbDisplay(_INTL("¡La Niebla Espejo de {1} devolvió el efecto!", pbThis(true)))
      return false if !user.pbCanLowerStatStage?(stat, self, nil, true, ignoreContrary, true)
      return user.pbLowerStatStageByCause(stat, increment, self, cause, showAnim, ignoreContrary, true)
    end
    return __af_frost_pbLowerStatStageByCause(stat, increment, user, cause, showAnim,
                                            ignoreContrary, ignoreMirrorArmor)
  end
end

class Battle::Move
  alias __af_frost_pbCalcDamageMultipliers pbCalcDamageMultipliers unless method_defined?(:__af_frost_pbCalcDamageMultipliers)

  def pbCalcDamageMultipliers(user, target, numTargets, type, baseDmg, multipliers)
    __af_frost_pbCalcDamageMultipliers(user, target, numTargets, type, baseDmg, multipliers)
    if target.effects[PBEffects::ReflectiveFrost] && specialMove?(type)
      multipliers[:final_damage_multiplier] /= 2
    end
  end
end

# Ayuda para la IA
Battle::AI::Handlers::MoveFailureCheck.add("HalveSpecialDamageReflectStatDropsThisRound",
  proc { |move, user, ai, battle|
    next user.effects[PBEffects::ReflectiveFrost]
  }
)
