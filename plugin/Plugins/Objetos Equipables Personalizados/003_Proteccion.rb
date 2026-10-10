#===============================================================================
# Objetos defensivos / de protección
#===============================================================================

#-------------------------------------------------------------------------------
# CASCO DE PRUEBAS: evita una vez el retroceso o el daño por confusión.
#-------------------------------------------------------------------------------
if defined?(Battle::Move::RecoilMove)
  Battle::Move::RecoilMove.class_eval do
    alias __chi_helmet_pbEffectAfterAllHits pbEffectAfterAllHits
    def pbEffectAfterAllHits(user, target)
      if !target.damageState.unaffected && user.takesIndirectDamage? &&
         !user.hasActiveAbility?(:ROCKHEAD) && user.hasActiveItem?(:IMPACTHELMET)
        @battle.pbDisplay(_INTL("¡El {1} de {2} amortiguó el retroceso!", user.itemName, user.pbThis(true)))
        user.pbConsumeItem
        return
      end
      __chi_helmet_pbEffectAfterAllHits(user, target)
    end
  end
end

class Battle::Battler
  alias __chi_helmet_pbConfusionDamage pbConfusionDamage
  def pbConfusionDamage(msg)
    if hasActiveItem?(:IMPACTHELMET)
      @battle.pbDisplay(_INTL("¡El {1} de {2} lo protegió de herirse en su confusión!", itemName, pbThis(true)))
      pbConsumeItem
      return
    end
    __chi_helmet_pbConfusionDamage(msg)
  end
end

#-------------------------------------------------------------------------------
# FALSO SUSTITUTO: anula por completo el primer golpe directo y se consume.
#-------------------------------------------------------------------------------
class Battle::Move
  alias __chi_fakesub_pbReduceDamage pbReduceDamage
  def pbReduceDamage(user, target)
    ds = target.damageState
    if user.index != target.index && target.hasActiveItem?(:FAKESUB) &&
       ds.calcDamage > 0 && !ds.substitute && !ds.disguise && !ds.iceFace
      ds.hpLost = 0
      @battle.pbDisplay(_INTL("¡El {1} de {2} recibió el golpe en su lugar!", target.itemName, target.pbThis(true)))
      target.pbConsumeItem
      return
    end
    __chi_fakesub_pbReduceDamage(user, target)
  end
end

#-------------------------------------------------------------------------------
# ANCLA: impide los cambios forzados (Rugido, Remolino, Cola Dragón,
# Llave Giro, Tarjeta Roja...).
#-------------------------------------------------------------------------------
if defined?(Battle::Move::SwitchOutTargetStatusMove)
  Battle::Move::SwitchOutTargetStatusMove.class_eval do
    alias __chi_anchor_pbFailsAgainstTarget? pbFailsAgainstTarget?
    def pbFailsAgainstTarget?(user, target, show_message)
      if target.hasActiveItem?(:AEROANCHOR)
        @battle.pbDisplay(_INTL("¡El {1} de {2} impidió que lo cambiaran!", target.itemName, target.pbThis(true))) if show_message
        return true
      end
      return __chi_anchor_pbFailsAgainstTarget?(user, target, show_message)
    end
  end
end

if defined?(Battle::Move::SwitchOutTargetDamagingMove)
  Battle::Move::SwitchOutTargetDamagingMove.class_eval do
    # Combates salvajes: evita que el ataque termine el combate
    alias __chi_anchor_pbEffectAgainstTarget pbEffectAgainstTarget
    def pbEffectAgainstTarget(user, target)
      return if target.hasActiveItem?(:AEROANCHOR)
      __chi_anchor_pbEffectAgainstTarget(user, target)
    end

    alias __chi_anchor_pbSwitchOutTargetEffect pbSwitchOutTargetEffect
    def pbSwitchOutTargetEffect(user, targets, numHits, switched_battlers)
      if switched_battlers.empty? && !user.fainted? && numHits > 0
        anchored = targets.select do |b|
          !b.fainted? && !b.damageState.unaffected && !b.damageState.substitute &&
            b.hasActiveItem?(:AEROANCHOR)
        end
        anchored.each do |b|
          @battle.pbDisplay(_INTL("¡El {1} de {2} impidió que lo cambiaran!", b.itemName, b.pbThis(true)))
        end
        targets = targets - anchored
      end
      __chi_anchor_pbSwitchOutTargetEffect(user, targets, numHits, switched_battlers)
    end
  end
end

# Tarjeta Roja del rival
if Battle::ItemEffects::AfterMoveUseFromTarget[:REDCARD]
  chi_old_redcard = Battle::ItemEffects::AfterMoveUseFromTarget[:REDCARD]
  Battle::ItemEffects::AfterMoveUseFromTarget.add(:REDCARD,
    proc { |*args|
      user = args[2]
      if user && !user.fainted? && user.hasActiveItem?(:AEROANCHOR)
        args[-1].pbDisplay(_INTL("¡El {1} de {2} impidió que lo cambiaran!", user.itemName, user.pbThis(true)))
        next
      end
      chi_old_redcard.call(*args)
    }
  )
end

#-------------------------------------------------------------------------------
# CAPA TÉRMICA: inmune al daño por granizo y a las quemaduras.
#-------------------------------------------------------------------------------
class Battle::Battler
  if method_defined?(:takesHailDamage?)
    alias __chi_thermal_takesHailDamage? takesHailDamage?
    def takesHailDamage?
      return false if hasActiveItem?(:THERMALCLOAK)
      return __chi_thermal_takesHailDamage?
    end
  end

  alias __chi_thermal_pbCanInflictStatus? pbCanInflictStatus?
  def pbCanInflictStatus?(newStatus, user, showMessages, move = nil, ignoreStatus = false)
    if newStatus == :BURN && self.status != :BURN && hasActiveItem?(:THERMALCLOAK)
      if showMessages
        @battle.pbDisplay(_INTL("¡La {1} de {2} lo protege de las quemaduras!", itemName, pbThis(true)))
      end
      return false
    end
    return __chi_thermal_pbCanInflictStatus?(newStatus, user, showMessages, move, ignoreStatus)
  end

  if method_defined?(:pbCanSynchronizeStatus?)
    alias __chi_thermal_pbCanSynchronizeStatus? pbCanSynchronizeStatus?
    def pbCanSynchronizeStatus?(newStatus, user)
      return false if newStatus == :BURN && hasActiveItem?(:THERMALCLOAK)
      return __chi_thermal_pbCanSynchronizeStatus?(newStatus, user)
    end
  end
end
