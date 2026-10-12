#===============================================================================
# Movimiento: Drenaje Umbrío (SHADOWDRAIN)
#-------------------------------------------------------------------------------
# Este archivo funciona solo. Si no quieres esta parte, bórralo (y quita también
# su entrada del PBS). Si solo instalas este archivo, esta es su entrada de PBS:
#
#   [SHADOWDRAIN]
#   Name = Shadow Drain
#   Type = DARK
#   Category = Special
#   Power = 75
#   Accuracy = 100
#   TotalPP = 10
#   Target = NearOther
#   FunctionCode = HealUserByHalfOfDamageDone
#   Flags = CanProtect,CanMirrorMove
#   Description = Drains the target's life energy. The user recovers half the damage dealt.
#===============================================================================

# Usa el código de función oficial de Essentials "HealUserByHalfOfDamageDone"
# (el mismo que Gigadrenado), así que no necesita código propio.
# Basta con su entrada en el PBS.
