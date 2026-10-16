#===============================================================================
# Movimiento: Fisura Táctica (TECTONICPIT)
#-------------------------------------------------------------------------------
# Este archivo funciona solo. Si no quieres esta parte, bórralo (y quita también
# su entrada del PBS). Si solo instalas este archivo, esta es su entrada de PBS:
#
#   [TECTONICPIT]
#   Name = Tectonic Pit
#   Type = GROUND
#   Category = Status
#   Accuracy = 100
#   TotalPP = 10
#   Target = NearOther
#   FunctionCode = RemoveEntryHazardsTrapTargetOneTurn
#   Flags = CanProtect,CanMirrorMove
#   Description = Removes hazards from both sides of the field and traps the target until the end of the next turn. Protect only stops the trapping.
#===============================================================================

#===============================================================================
# Fisura Táctica (Tectonic Pit)
# Elimina las trampas de ambos lados del campo y el objetivo no puede cambiar
# hasta el final del turno siguiente.
#===============================================================================
class Battle::Move::RemoveEntryHazardsTrapTargetOneTurn < Battle::Move
  def pbHazardsOnSide?(side)
    return side.effects[PBEffects::StealthRock] || side.effects[PBEffects::Spikes] > 0 ||
           side.effects[PBEffects::ToxicSpikes] > 0 || side.effects[PBEffects::StickyWeb]
  end

  def pbCanTrap?(target)
    return false if target.effects[PBEffects::TectonicPit] > 0
    return false if Settings::MORE_TYPE_EFFECTS && target.pbHasType?(:GHOST)
    return true
  end

  def pbFailsAgainstTarget?(user, target, show_message)
    return false if pbHazardsOnSide?(user.pbOwnSide) || pbHazardsOnSide?(user.pbOpposingSide)
    return false if pbCanTrap?(target)
    @battle.pbDisplay(_INTL("But it failed!")) if show_message
    return true
  end

  # Protección solo para lo de atrapar: las trampas se quitan aunque el rival se proteja
  def worksWithNoTargets?; return true; end

  def pbEffectGeneral(user)
    [user.pbOwnSide, user.pbOpposingSide].each do |side|
      next if !pbHazardsOnSide?(side)
      side.effects[PBEffects::StealthRock] = false
      side.effects[PBEffects::Spikes]      = 0
      side.effects[PBEffects::ToxicSpikes] = 0
      side.effects[PBEffects::StickyWeb]   = false
      if side == @battle.sides[0]
        @battle.pbDisplay(_INTL("¡La fisura aplastó las trampas del campo de tu equipo!"))
      else
        @battle.pbDisplay(_INTL("¡La fisura aplastó las trampas del campo rival!"))
      end
    end
  end

  def pbEffectAgainstTarget(user, target)
    return if !pbCanTrap?(target)
    target.effects[PBEffects::TectonicPit] = 2
    @battle.pbDisplay(_INTL("¡{1} quedó atrapado en la zanja y no puede huir!", target.pbThis))
  end
end

class Battle::Battler
  alias __af_pit_pbInitEffects pbInitEffects unless method_defined?(:__af_pit_pbInitEffects)

  def pbInitEffects(batonPass)
    __af_pit_pbInitEffects(batonPass)
    @effects[PBEffects::TectonicPit] = 0
  end
end

class Battle
  alias __af_pit_pbEndOfRoundPhase pbEndOfRoundPhase unless method_defined?(:__af_pit_pbEndOfRoundPhase)

  def pbEndOfRoundPhase
    ret = __af_pit_pbEndOfRoundPhase
    return ret if @decision > 0
    allBattlers.each { |b| b.effects[PBEffects::TectonicPit] -= 1 if b.effects[PBEffects::TectonicPit] > 0 }
    return ret
  end
end

#===============================================================================
# Fisura Táctica: impide cambiar
#===============================================================================
class Battle::Battler
  alias __af_pit_trappedInBattle? trappedInBattle? unless method_defined?(:__af_pit_trappedInBattle?)

  def trappedInBattle?
    return true if @effects[PBEffects::TectonicPit] > 0
    return __af_pit_trappedInBattle?
  end
end

# Ayuda para la IA
Battle::AI::Handlers::MoveFailureAgainstTargetCheck.add("RemoveEntryHazardsTrapTargetOneTurn",
  proc { |move, user, target, ai, battle|
    hazards = [user.pbOwnSide, user.pbOpposingSide].any? do |side|
      side.effects[PBEffects::StealthRock] || side.effects[PBEffects::Spikes] > 0 ||
        side.effects[PBEffects::ToxicSpikes] > 0 || side.effects[PBEffects::StickyWeb] ||
        side.effects[PBEffects::MindSnare]
    end
    next false if hazards
    next true if target.effects[PBEffects::TectonicPit] > 0
    next Settings::MORE_TYPE_EFFECTS && target.has_type?(:GHOST)
  }
)
