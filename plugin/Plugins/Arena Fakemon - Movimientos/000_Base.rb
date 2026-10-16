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

#===============================================================================
# Movimientos oscuros (Lugia Oscuro): reglas comunes
#-------------------------------------------------------------------------------
# - No usan la tabla de tipos: nunca son supereficaces, poco eficaces ni fallan
#   por inmunidad (por eso van con tipo NORMAL en el PBS).
# - Hacen x1,3 de daño a todos, salvo a otros Pokémon oscuros (x0,5).
# - No se pueden copiar con Esquema.
# Un Pokémon "oscuro" es un Pokémon Oscuro de Essentials (shadowPokemon?) o una
# de las formas de SHADOW_FORMS. Lugia Oscuro es la forma 1 de LUGIA en
# pokemon_forms_custom.txt: si en tu juego tiene otro número, cámbialo aquí.
#===============================================================================
module AFShadow
  SHADOW_FORMS = {
    :LUGIA => [1]
  }
  CODES = ["ShadowMoveHighCritical", "ShadowRemoveScreensFoeSide",
           "ShadowLowerTargetsDefense2", "ShadowMoveNoEffect"]

  def self.shadow?(battler)
    return false if !battler
    return true if battler.respond_to?(:shadowPokemon?) && battler.shadowPokemon?
    forms = SHADOW_FORMS[battler.species]
    return forms ? forms.include?(battler.form) : false
  end
end

# Daño de los movimientos oscuros (lo usan los que hacen daño)
module AFShadowDamage
  def pbCalcTypeMod(moveType, user, target)
    return Effectiveness::NORMAL_EFFECTIVE_MULTIPLIER
  end

  def pbBaseDamage(baseDmg, user, target)
    mult = AFShadow.shadow?(target) ? 0.5 : 1.3
    return [(baseDmg * mult).round, 1].max
  end
end

# Esquema no puede copiar los movimientos oscuros
class Battle::Move::ReplaceMoveWithTargetLastMoveUsed
  alias __af_shadow_initialize initialize unless method_defined?(:__af_shadow_initialize)

  def initialize(battle, move)
    __af_shadow_initialize(battle, move)
    @moveBlacklist += AFShadow::CODES if @moveBlacklist.is_a?(Array)
  end
end
