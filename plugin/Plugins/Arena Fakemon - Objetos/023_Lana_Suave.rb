#===============================================================================
# Objeto: Lana Suave (SOFTWOOL)
#-------------------------------------------------------------------------------
# Este archivo funciona solo. Si no quieres esta parte, bórralo (y quita también
# su entrada del PBS). Si solo instalas este archivo, esta es su entrada de PBS:
#
#   [SOFTWOOL]
#   Name = Soft Wool
#   NamePlural = Soft Wools
#   Pocket = 1
#   Price = 4000
#   Flags = Fling_10
#   Description = Reduces damage from physical contact moves by 15%.
#
# Icono: Graphics/Items/SOFTWOOL.png
#===============================================================================

#-------------------------------------------------------------------------------
# Lana Suave: -15% de daño de movimientos físicos de contacto.
#-------------------------------------------------------------------------------
Battle::ItemEffects::DamageCalcFromTarget.add(:SOFTWOOL,
  proc { |item, user, target, move, mults, power, type|
    next if !move.physicalMove?(type) || !move.pbContactMove?(user)
    mults[:final_damage_multiplier] *= 0.85
  }
)
