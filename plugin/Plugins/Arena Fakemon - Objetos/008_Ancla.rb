#===============================================================================
# Objeto: Ancla (AEROANCHOR)
#-------------------------------------------------------------------------------
# Este archivo funciona solo. Si no quieres esta parte, bórralo (y quita también
# su entrada del PBS). Si solo instalas este archivo, esta es su entrada de PBS:
#
#   [AEROANCHOR]
#   Name = Aero Anchor
#   NamePlural = Aero Anchors
#   Pocket = 1
#   Price = 4000
#   Flags = Fling_100
#   Description = Prevents the holder from being forced out by the foe's moves or items.
#
# Icono: Graphics/Items/AEROANCHOR.png
#===============================================================================

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
