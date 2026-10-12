#===============================================================================
# Objeto: Shuko (SHUKO)
#-------------------------------------------------------------------------------
# Este archivo funciona solo. Si no quieres esta parte, bórralo (y quita también
# su entrada del PBS). Si solo instalas este archivo, esta es su entrada de PBS:
#
#   [SHUKO]
#   Name = Shuko
#   NamePlural = Shukos
#   Pocket = 1
#   Price = 4000
#   Flags = Fling_30
#   Description = Boosts claw moves by 20% and ignores the target's Defense boosts.
#
# Icono: Graphics/Items/SHUKO.png
#===============================================================================

#-------------------------------------------------------------------------------
# SHUKO: +20% a movimientos de garra e ignora las subidas de Defensa del rival.
#-------------------------------------------------------------------------------
Battle::ItemEffects::DamageCalcFromUser.add(:SHUKO,
  proc { |item, user, target, move, mults, power, type|
    next if !CustomHeldItems.claw?(move)
    mults[:power_multiplier] *= CustomHeldItems::SHUKO_POWER_MULT
    next if !move.physicalMove?(type)
    next if target.damageState.critical        # Los críticos ya las ignoran
    next if user.hasActiveAbility?(:UNAWARE)   # Ignorante ya las ignora
    stage = target.stages[:DEFENSE] || 0
    next if stage <= 0
    # Deshace el multiplicador de etapa positiva: (2 + etapa) / 2
    mults[:defense_multiplier] /= (2 + stage) / 2.0
  }
)
