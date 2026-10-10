#===============================================================================
# Objetos Equipables Personalizados - Configuración y utilidades
# Pokémon Essentials v21.1
#===============================================================================
module CustomHeldItems
  # Flags de PBS/moves.txt que identifican cada categoría de movimiento.
  CLAW_FLAG      = "Claw"
  PIVOT_FLAG     = "Pivot"
  SACRIFICE_FLAG = "Sacrifice"

  # Listas de respaldo: un movimiento cuenta si tiene la flag O si está aquí.
  # Si prefieres controlarlo todo desde moves.txt, deja las listas vacías: []
  CLAW_MOVES      = [:CRUSHCLAW, :SHADOWCLAW, :DRAGONCLAW, :SLASH, :METALCLAW,
                     :HONECLAWS, :CROSSPOISON]
  PIVOT_MOVES     = [:UTURN, :VOLTSWITCH, :FLIPTURN, :BATONPASS, :PARTINGSHOT]
  SACRIFICE_MOVES = [:EXPLOSION, :SELFDESTRUCT, :MEMENTO, :FINALGAMBIT,
                     :MISTYEXPLOSION]

  # Valores de balance
  SHUKO_POWER_MULT      = 1.2   # Shuko: +20% poder
  RIOTVEST_DEF_MULT     = 1.5   # Chaleco Antidisturbios: +50% Defensa
  PORTABLEROD_DMG_MULT  = 0.5   # Pararrayos Portátil: daño Eléctrico recibido
  HAZARDBAND_POWER_MULT = 1.5   # Banda Kamikaze: +50% poder
  ABSORBFILTER_HEAL     = 0.15  # Filtro Absorbente: % del daño causado
  THORNRING_DAMAGE      = 0.05  # Anillo Espinado: % PS máx. del rival
  THORNRING_RECOIL      = 0.03  # Anillo Espinado: % PS máx. del portador
  ETHERFILTER_RATIO     = 0.5   # Filtro de Éter: % de la curación que se devuelve
  CALTROPS_MAX_LAYERS   = 3     # Abrojo Trampa: capas máximas de Púas

  # Brazal Inversor: qué ocurre con las inmunidades del portador.
  #   :neutral -> pasan a ser daño normal (tu diseño original)
  #   :super   -> pasan a ser supereficaces (como los Combates Inversos oficiales)
  INVERSION_IMMUNITY = :neutral

  module_function

  # Comprueba flag de PBS o lista de respaldo. Sirve para Battle::Move y GameData::Move.
  def move_in_category?(move, flag, list)
    return false if !move
    flags = move.instance_variable_get(:@flags) || []
    return true if flags.any? { |f| f.to_s.downcase == flag.downcase }
    return list.include?(move.id)
  end

  def claw?(move);      move_in_category?(move, CLAW_FLAG, CLAW_MOVES);           end
  def pivot?(move);     move_in_category?(move, PIVOT_FLAG, PIVOT_MOVES);         end
  def sacrifice?(move); move_in_category?(move, SACRIFICE_FLAG, SACRIFICE_MOVES); end
end

class Battle
  attr_accessor :chi_reflecting   # Evita rebotes infinitos de la Piedra Espejo
end
