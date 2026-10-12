#===============================================================================
# Objeto: Capa Térmica (THERMALCLOAK)
#-------------------------------------------------------------------------------
# Este archivo funciona solo. Si no quieres esta parte, bórralo (y quita también
# su entrada del PBS). Si solo instalas este archivo, esta es su entrada de PBS:
#
#   [THERMALCLOAK]
#   Name = Thermal Cloak
#   NamePlural = Thermal Cloaks
#   Pocket = 1
#   Price = 4000
#   Flags = Fling_10
#   Description = Protects from hail damage and prevents burns.
#
# Icono: Graphics/Items/THERMALCLOAK.png
#===============================================================================

#-------------------------------------------------------------------------------
# CAPA TÉRMICA: inmune al daño por granizo y a las quemaduras.
#-------------------------------------------------------------------------------
class Battle::Battler
  if method_defined?(:takesHailDamage?)
    alias __chi_thermal_takesHailDamage? takesHailDamage?
    def takesHailDamage?
      return false if hasActiveItem?(:THERMALCLOAK)
      return __chi_thermal_takesHailDamage?
    end
  end

  alias __chi_thermal_pbCanInflictStatus? pbCanInflictStatus?
  def pbCanInflictStatus?(newStatus, user, showMessages, move = nil, ignoreStatus = false)
    if newStatus == :BURN && self.status != :BURN && hasActiveItem?(:THERMALCLOAK)
      if showMessages
        @battle.pbDisplay(_INTL("¡La {1} de {2} lo protege de las quemaduras!", itemName, pbThis(true)))
      end
      return false
    end
    return __chi_thermal_pbCanInflictStatus?(newStatus, user, showMessages, move, ignoreStatus)
  end

  if method_defined?(:pbCanSynchronizeStatus?)
    alias __chi_thermal_pbCanSynchronizeStatus? pbCanSynchronizeStatus?
    def pbCanSynchronizeStatus?(newStatus, user)
      return false if newStatus == :BURN && hasActiveItem?(:THERMALCLOAK)
      return __chi_thermal_pbCanSynchronizeStatus?(newStatus, user)
    end
  end
end
