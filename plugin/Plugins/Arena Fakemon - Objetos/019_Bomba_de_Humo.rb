#===============================================================================
# Objeto: Bomba de Humo (SMOKEBOMB)
#-------------------------------------------------------------------------------
# Este archivo funciona solo. Si no quieres esta parte, bórralo (y quita también
# su entrada del PBS). Si solo instalas este archivo, esta es su entrada de PBS:
#
#   [SMOKEBOMB]
#   Name = Smoke Bomb
#   NamePlural = Smoke Bombs
#   Pocket = 1
#   Price = 4000
#   Flags = Fling_30
#   Description = If the holder is hit by a physical move, it bursts and lowers the attacker's accuracy. Consumed.
#
# Icono: Graphics/Items/SMOKEBOMB.png
#===============================================================================

#-------------------------------------------------------------------------------
# Bomba de Humo: si recibe un ataque físico, se consume y baja 1 nivel la
# Precisión del atacante.
#-------------------------------------------------------------------------------
Battle::ItemEffects::OnBeingHit.add(:SMOKEBOMB,
  proc { |item, user, target, move, battle|
    next if !move.physicalMove?
    next if user.fainted? || user.index == target.index
    next if !user.pbCanLowerStatStage?(:ACCURACY, target)
    battle.pbCommonAnimation("UseItem", target)
    battle.pbDisplay(_INTL("¡La {1} de {2} estalló y llenó todo de humo!", target.itemName, target.pbThis(true)))
    user.pbLowerStatStage(:ACCURACY, 1, target)
    target.pbHeldItemTriggered(item)
  }
)
