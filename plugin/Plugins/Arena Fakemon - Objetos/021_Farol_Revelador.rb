#===============================================================================
# Objeto: Farol Revelador (REVEALINGLANTERN)
#-------------------------------------------------------------------------------
# Este archivo funciona solo. Si no quieres esta parte, bórralo (y quita también
# su entrada del PBS). Si solo instalas este archivo, esta es su entrada de PBS:
#
#   [REVEALINGLANTERN]
#   Name = Revealing Lantern
#   NamePlural = Revealing Lanterns
#   Pocket = 1
#   Price = 4000
#   Flags = Fling_30
#   Description = Ignores the target's evasion boosts and the holder's accuracy drops.
#
# Icono: Graphics/Items/REVEALINGLANTERN.png
#===============================================================================

#-------------------------------------------------------------------------------
# Farol Revelador: ignora las subidas de Evasión del objetivo y las bajadas de
# Precisión del portador.
#-------------------------------------------------------------------------------
Battle::ItemEffects::AccuracyCalcFromUser.add(:REVEALINGLANTERN,
  proc { |item, mods, user, target, move, type|
    mods[:evasion_stage]  = 0 if mods[:evasion_stage] > 0
    mods[:accuracy_stage] = 0 if mods[:accuracy_stage] < 0
  }
)
