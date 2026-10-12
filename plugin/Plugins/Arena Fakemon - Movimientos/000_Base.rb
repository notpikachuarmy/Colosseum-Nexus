#===============================================================================
# Arena Fakemon - Movimientos: base común
#-------------------------------------------------------------------------------
# Números de los efectos nuevos. No borres este archivo (los demás lo usan).
#===============================================================================
module PBEffects
  # Efectos de combatiente
  CurseReel        = 200   # Turnos restantes de Proyección Maldita
  CurseReelDamage  = 201   # Daño que recibe si intenta cambiar
  Paranoia         = 202   # Índice del combatiente que causó la Paranoia (-1 = nada)
  ParanoiaSource   = 203   # Pokémon que causó la Paranoia
  ReflectiveFrost  = 204   # Niebla Espejo activa este turno
  TectonicPit      = 205   # Turnos restantes atrapado por Fisura Táctica
  # Efectos de lado del campo
  ChokingAsh       = 850   # Turnos restantes de Ceniza Sofocante
  MindSnare        = 851   # Trampa Mental colocada (true/false)
end
