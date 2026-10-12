#===============================================================================
# Objeto: Pluma Vendaval (GALEFEATHER)
#-------------------------------------------------------------------------------
# Este archivo funciona solo. Si no quieres esta parte, bórralo (y quita también
# su entrada del PBS). Si solo instalas este archivo, esta es su entrada de PBS:
#
#   [GALEFEATHER]
#   Name = Gale Feather
#   NamePlural = Gale Feathers
#   Pocket = 1
#   Price = 4000
#   Flags = Fling_10
#   Description = Boosts priority moves by 30%, or by 10% if the holder was already faster.
#
# Icono: Graphics/Items/GALEFEATHER.png
#===============================================================================

#-------------------------------------------------------------------------------
# Pluma Vendaval: movimientos con prioridad +30% de potencia, o solo +10% si
# el portador ya habría atacado primero por Velocidad.
#-------------------------------------------------------------------------------
Battle::ItemEffects::DamageCalcFromUser.add(:GALEFEATHER,
  proc { |item, user, target, move, mults, power, type|
    next if CustomMovesItems.move_priority(user, move) <= 0
    battle = user.battle
    faster = if battle.field.effects[PBEffects::TrickRoom] > 0
               user.pbSpeed < target.pbSpeed
             else
               user.pbSpeed > target.pbSpeed
             end
    mults[:power_multiplier] *= (faster) ? 1.1 : 1.3
  }
)
