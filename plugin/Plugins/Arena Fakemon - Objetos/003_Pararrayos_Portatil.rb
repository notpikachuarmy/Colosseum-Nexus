#===============================================================================
# Objeto: Pararrayos Portátil (PORTABLEROD)
#-------------------------------------------------------------------------------
# Este archivo funciona solo. Si no quieres esta parte, bórralo (y quita también
# su entrada del PBS). Si solo instalas este archivo, esta es su entrada de PBS:
#
#   [PORTABLEROD]
#   Name = Portable Rod
#   NamePlural = Portable Rods
#   Pocket = 1
#   Price = 4000
#   Flags = Fling_60
#   Description = Draws Electric-type moves to the holder and halves their damage.
#
# Icono: Graphics/Items/PORTABLEROD.png
#===============================================================================

#-------------------------------------------------------------------------------
# PARARRAYOS PORTÁTIL: atrae ataques Eléctricos de un solo objetivo y los
# recibe a la mitad de daño.
#-------------------------------------------------------------------------------
Battle::ItemEffects::DamageCalcFromTarget.add(:PORTABLEROD,
  proc { |item, user, target, move, mults, power, type|
    mults[:final_damage_multiplier] *= CustomHeldItems::PORTABLEROD_DMG_MULT if type == :ELECTRIC
  }
)

class Battle::Battler
  alias __chi_portablerod_pbChangeTargets pbChangeTargets
  def pbChangeTargets(move, user, targets)
    targets = __chi_portablerod_pbChangeTargets(move, user, targets)
    return targets if @battle.switching
    return targets if targets.length != 1 || move.calcType != :ELECTRIC
    return targets if move.cannotRedirect? || move.targetsPosition?
    target_data = move.pbTarget(user)
    return targets if !target_data.can_target_one_foe?
    return targets if user.hasActiveAbility?([:STALWART, :PROPELLERTAIL])
    return targets if targets[0].hasActiveItem?(:PORTABLEROD) ||
                      targets[0].hasActiveAbility?(:LIGHTNINGROD)
    nearOnly = !target_data.can_choose_distant_target?
    @battle.pbPriority(true).each do |b|
      next if b.index == user.index || b.index == targets[0].index
      next if !b.hasActiveItem?(:PORTABLEROD)
      next if nearOnly && !b.near?(user)
      @battle.pbDisplay(_INTL("¡{1} atrajo el ataque con su {2}!", b.pbThis, b.itemName))
      return [b]
    end
    return targets
  end
end
