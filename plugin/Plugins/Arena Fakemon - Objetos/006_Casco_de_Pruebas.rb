#===============================================================================
# Objeto: Casco de Pruebas (IMPACTHELMET)
#-------------------------------------------------------------------------------
# Este archivo funciona solo. Si no quieres esta parte, bórralo (y quita también
# su entrada del PBS). Si solo instalas este archivo, esta es su entrada de PBS:
#
#   [IMPACTHELMET]
#   Name = Impact Helmet
#   NamePlural = Impact Helmets
#   Pocket = 1
#   Price = 4000
#   Flags = Fling_30
#   Description = Prevents recoil or confusion damage once. Consumed after use.
#
# Icono: Graphics/Items/IMPACTHELMET.png
#===============================================================================

#-------------------------------------------------------------------------------
# CASCO DE PRUEBAS: evita una vez el retroceso o el daño por confusión.
#-------------------------------------------------------------------------------
if defined?(Battle::Move::RecoilMove)
  Battle::Move::RecoilMove.class_eval do
    alias __chi_helmet_pbEffectAfterAllHits pbEffectAfterAllHits
    def pbEffectAfterAllHits(user, target)
      if !target.damageState.unaffected && user.takesIndirectDamage? &&
         !user.hasActiveAbility?(:ROCKHEAD) && user.hasActiveItem?(:IMPACTHELMET)
        @battle.pbDisplay(_INTL("¡El {1} de {2} amortiguó el retroceso!", user.itemName, user.pbThis(true)))
        user.pbConsumeItem
        return
      end
      __chi_helmet_pbEffectAfterAllHits(user, target)
    end
  end
end

class Battle::Battler
  alias __chi_helmet_pbConfusionDamage pbConfusionDamage
  def pbConfusionDamage(msg)
    if hasActiveItem?(:IMPACTHELMET)
      @battle.pbDisplay(_INTL("¡El {1} de {2} lo protegió de herirse en su confusión!", itemName, pbThis(true)))
      pbConsumeItem
      return
    end
    __chi_helmet_pbConfusionDamage(msg)
  end
end
