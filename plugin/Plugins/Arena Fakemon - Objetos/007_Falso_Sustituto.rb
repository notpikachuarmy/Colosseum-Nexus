#===============================================================================
# Objeto: Falso Sustituto (FAKESUB)
#-------------------------------------------------------------------------------
# Este archivo funciona solo. Si no quieres esta parte, bórralo (y quita también
# su entrada del PBS). Si solo instalas este archivo, esta es su entrada de PBS:
#
#   [FAKESUB]
#   Name = Fake Sub
#   NamePlural = Fake Subs
#   Pocket = 1
#   Price = 4000
#   Flags = Fling_10
#   Description = Completely blocks the damage of the first attack received. Consumed when it breaks.
#
# Icono: Graphics/Items/FAKESUB.png
#===============================================================================

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
