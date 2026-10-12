#===============================================================================
# Habilidad: Cimientos (FOUNDATION)
#-------------------------------------------------------------------------------
# Este archivo funciona solo. Si no quieres esta parte, bórralo (y quita también
# su entrada del PBS). Si solo instalas este archivo, esta es su entrada de PBS:
#
#   [FOUNDATION]
#   Name = Foundation
#   Description = Stands so firmly that it is unaffected by entry hazards such as Spikes, Stealth Rock, Sticky Web or Mind Snare.
#===============================================================================

#-------------------------------------------------------------------------------
# Cimientos: como llevar Botas Gruesas, pero en forma de habilidad. Al entrar
# en combate no le afecta ninguna trampa de entrada (Trampa Rocas, Púas, Púas
# Tóxicas, Red Viscosa, Trampa Mental...). Las trampas siguen en el campo.
#
# Nota: las Púas Tóxicas NO se absorben aunque sea de tipo Veneno (las ignora).
#-------------------------------------------------------------------------------
class Battle
  alias __af_foundation_pbEntryHazards pbEntryHazards unless method_defined?(:__af_foundation_pbEntryHazards)

  def pbEntryHazards(battler)
    return if battler.hasActiveAbility?(:FOUNDATION)
    __af_foundation_pbEntryHazards(battler)
  end
end
