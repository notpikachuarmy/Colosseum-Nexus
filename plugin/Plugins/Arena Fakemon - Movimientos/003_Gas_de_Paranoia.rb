#===============================================================================
# Movimiento: Gas de Paranoia (PHOBIAGAS)
#-------------------------------------------------------------------------------
# Este archivo funciona solo. Si no quieres esta parte, bórralo (y quita también
# su entrada del PBS). Si solo instalas este archivo, esta es su entrada de PBS:
#
#   [PHOBIAGAS]
#   Name = Phobia Gas
#   Type = DARK
#   Category = Physical
#   Power = 85
#   Accuracy = 0
#   TotalPP = 10
#   Target = NearOther
#   FunctionCode = LowerTargetSpeed2InflictParanoia
#   Flags = CanProtect,CanMirrorMove
#   Description = Never misses. Harshly lowers Speed and causes paranoia: a confusion that makes the target drop its item.
#===============================================================================

#===============================================================================
# Gas de Paranoia (Phobia Gas)
# Baja 2 la Velocidad e inflige Paranoia: confusión de 2-3 turnos; si se hiere a
# sí mismo, se le cae el objeto (y el usuario lo recoge con Prestidigitador o
# Hurto si no lleva nada).
#===============================================================================
class Battle::Move::LowerTargetSpeed2InflictParanoia < Battle::Move
  def pbEffectAgainstTarget(user, target)
    return if target.fainted? || target.damageState.substitute
    if target.pbCanLowerStatStage?(:SPEED, user, self)
      target.pbLowerStatStage(:SPEED, 2, user)
    end
    return if !target.pbCanConfuse?(user, false, self)
    target.effects[PBEffects::Paranoia]       = user.index
    target.effects[PBEffects::ParanoiaSource] = user.pokemon
    target.pbConfuse(_INTL("¡{1} revive sus peores pesadillas y cae en la paranoia!", target.pbThis))
    # 2-3 turnos de confusión (salvo que una baya la haya curado al instante)
    if target.effects[PBEffects::Confusion] > 0
      target.effects[PBEffects::Confusion] = 3 + @battle.pbRandom(2)
    end
  end
end

class Battle::Battler
  alias __af_paranoia_pbInitEffects pbInitEffects unless method_defined?(:__af_paranoia_pbInitEffects)

  def pbInitEffects(batonPass)
    __af_paranoia_pbInitEffects(batonPass)
    if !batonPass || @effects[PBEffects::Confusion] <= 0
      @effects[PBEffects::Paranoia]       = -1
      @effects[PBEffects::ParanoiaSource] = nil
    end
  end
end

#===============================================================================
# Paranoia (Gas de Paranoia): al herirse por la confusión se le cae el objeto
#===============================================================================
class Battle::Battler
  alias __af_paranoia_pbCureConfusion pbCureConfusion unless method_defined?(:__af_paranoia_pbCureConfusion)

  def pbCureConfusion
    __af_paranoia_pbCureConfusion
    @effects[PBEffects::Paranoia]       = -1
    @effects[PBEffects::ParanoiaSource] = nil
  end

  alias __af_paranoia_pbConfusionDamage pbConfusionDamage unless method_defined?(:__af_paranoia_pbConfusionDamage)

  def pbConfusionDamage(msg)
    paranoid = @effects[PBEffects::Paranoia] >= 0
    __af_paranoia_pbConfusionDamage(msg)
    pbParanoiaDropItem if paranoid && !fainted?
  end

  def pbParanoiaDropItem
    return if !self.item || unlosableItem?(self.item)
    if hasActiveAbility?(:STICKYHOLD)
      @battle.pbShowAbilitySplash(self)
      @battle.pbDisplay(_INTL("¡{1} se aferra a su objeto pese al pánico!", pbThis))
      @battle.pbHideAbilitySplash(self)
      return
    end
    dropped = self.item
    dropped_name = itemName
    @battle.pbDisplay(_INTL("¡Presa del pánico, a {1} se le cayó su {2}!", pbThis(true), dropped_name))
    pbRemoveItem(false)
    # El causante de la Paranoia lo recoge con Prestidigitador o Hurto
    thief = @battle.battlers[@effects[PBEffects::Paranoia]]
    return if !thief || thief.fainted? || thief.item || thief.wild?
    return if thief.pokemon != @effects[PBEffects::ParanoiaSource]
    return if !thief.hasActiveAbility?([:MAGICIAN, :PICKPOCKET])
    return if thief.unlosableItem?(dropped)
    @battle.pbShowAbilitySplash(thief)
    thief.item = dropped
    if @battle.wildBattle? && !thief.initialItem && dropped == self.initialItem
      thief.setInitialItem(dropped)
      setInitialItem(nil)
    end
    @battle.pbDisplay(_INTL("¡{1} recogió el objeto {2}!", thief.pbThis, dropped_name))
    @battle.pbHideAbilitySplash(thief)
  end
end
