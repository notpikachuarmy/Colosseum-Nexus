#===============================================================================
# Arena Fakemon - Movimientos extra para Pokémon Essentials v21.1
#-------------------------------------------------------------------------------
# Movimientos que no estaban en "Objetos y Movimientos Custom":
#   SWEETDREAM    Sueño dulce        (FunctionCode SleepTargetHealUser)
#   PRIMEVALROAR  Rugido Ancestral   (FunctionCode SuperEffectiveAgainstPoison)
#   MINDSNARE     Trampa Mental      (FunctionCode AddMindSnareToFoeSide)
# Los datos (tipo, potencia, PP...) están en PBS/moves_custom.txt.
#===============================================================================

module PBEffects
  MindSnare = 851   # Efecto de lado: Trampa Mental colocada (true/false)
end

class Battle::ActiveSide
  alias __arenafakemon_initialize initialize unless private_method_defined?(:__arenafakemon_initialize)

  def initialize
    __arenafakemon_initialize
    @effects[PBEffects::MindSnare] = false
  end
end

#===============================================================================
# Sueño dulce (Sweet Dream)
# Duerme al objetivo y, si lo consigue, el usuario recupera 1/8 de sus PS máximos.
#===============================================================================
class Battle::Move::SleepTargetHealUser < Battle::Move::SleepTarget
  def pbEffectAgainstTarget(user, target)
    return if damagingMove?
    target.pbSleep
    return if !target.asleep? || !user.canHeal?
    user.pbRecoverHP(user.totalhp / 8)
    @battle.pbDisplay(_INTL("{1}'s HP was restored.", user.pbThis))
  end
end

#===============================================================================
# Rugido Ancestral (Primeval Roar)
# Supereficaz contra el tipo Veneno (como Liofilización contra el tipo Agua).
# Al ser de sonido (Flags = Sound), atraviesa los sustitutos.
#===============================================================================
class Battle::Move::SuperEffectiveAgainstPoison < Battle::Move
  def pbCalcTypeModSingle(moveType, defType, user, target)
    return Effectiveness::SUPER_EFFECTIVE_MULTIPLIER if defType == :POISON
    return super
  end
end

#===============================================================================
# Trampa Mental (Mind Snare)
# Trampa de entrada: confunde a los Pokémon rivales que entran tocando el suelo.
# Los de tipo Siniestro son inmunes. Las Botas Gruesas también la evitan.
# Se quita igual que las demás trampas (Giro Rápido, Despejar, Cambio de Cancha,
# Fisura Táctica).
#===============================================================================
class Battle::Move::AddMindSnareToFoeSide < Battle::Move
  def canMagicCoat?; return true; end

  def pbMoveFailed?(user, targets)
    if user.pbOpposingSide.effects[PBEffects::MindSnare]
      @battle.pbDisplay(_INTL("But it failed!"))
      return true
    end
    return false
  end

  def pbEffectGeneral(user)
    user.pbOpposingSide.effects[PBEffects::MindSnare] = true
    @battle.pbDisplay(_INTL("Strange illusions spread around {1}'s feet!",
                            user.pbOpposingTeam(true)))
  end
end

module ArenaFakemon
  module_function

  # Quita la Trampa Mental de un lado. Devuelve true si había.
  def quitar_trampa_mental(battle, side, user = nil)
    return false if !side.effects[PBEffects::MindSnare]
    side.effects[PBEffects::MindSnare] = false
    if user
      battle.pbDisplay(_INTL("{1} blew away the mind snare!", user.pbThis))
    else
      battle.pbDisplay(_INTL("The mind snare disappeared!"))
    end
    return true
  end
end

# Al entrar en combate
class Battle
  alias __arenafakemon_pbEntryHazards pbEntryHazards unless method_defined?(:__arenafakemon_pbEntryHazards)

  def pbEntryHazards(battler)
    __arenafakemon_pbEntryHazards(battler)
    return if battler.fainted?
    return if !battler.pbOwnSide.effects[PBEffects::MindSnare]
    return if battler.airborne? || battler.hasActiveItem?(:HEAVYDUTYBOOTS)
    return if battler.pbHasType?(:DARK)
    return if !battler.pbCanConfuse?(nil, false)
    pbDisplay(_INTL("{1} stepped on the mind snare!", battler.pbThis))
    battler.pbConfuse
  end
end

# Giro Rápido (y Giro Mortal si tu juego lo tiene, que hereda de esta clase)
class Battle::Move::RemoveUserBindingAndEntryHazards
  alias __arenafakemon_pbEffectAfterAllHits pbEffectAfterAllHits unless method_defined?(:__arenafakemon_pbEffectAfterAllHits)

  def pbEffectAfterAllHits(user, target)
    __arenafakemon_pbEffectAfterAllHits(user, target)
    return if user.fainted? || target.damageState.unaffected
    ArenaFakemon.quitar_trampa_mental(@battle, user.pbOwnSide, user)
  end
end

# Despejar
class Battle::Move::LowerTargetEvasion1RemoveSideEffects
  alias __arenafakemon_pbFailsAgainstTarget? pbFailsAgainstTarget? unless method_defined?(:__arenafakemon_pbFailsAgainstTarget?)

  def pbFailsAgainstTarget?(user, target, show_message)
    return false if target.pbOwnSide.effects[PBEffects::MindSnare]
    return false if Settings::MECHANICS_GENERATION >= 6 && target.pbOpposingSide.effects[PBEffects::MindSnare]
    return __arenafakemon_pbFailsAgainstTarget?(user, target, show_message)
  end

  alias __arenafakemon_pbEffectAgainstTarget pbEffectAgainstTarget unless method_defined?(:__arenafakemon_pbEffectAgainstTarget)

  def pbEffectAgainstTarget(user, target)
    __arenafakemon_pbEffectAgainstTarget(user, target)
    quitada = ArenaFakemon.quitar_trampa_mental(@battle, target.pbOwnSide, user)
    if Settings::MECHANICS_GENERATION >= 6 && target.pbOpposingSide.effects[PBEffects::MindSnare]
      target.pbOpposingSide.effects[PBEffects::MindSnare] = false
      @battle.pbDisplay(_INTL("{1} blew away the mind snare!", user.pbThis)) if !quitada
    end
  end
end

# Cambio de Cancha: también intercambia la Trampa Mental
class Battle::Move::SwapSideEffects
  alias __arenafakemon_initialize initialize unless private_method_defined?(:__arenafakemon_initialize)

  def initialize(battle, move)
    __arenafakemon_initialize(battle, move)
    @boolean_effects.push(PBEffects::MindSnare) if !@boolean_effects.include?(PBEffects::MindSnare)
  end
end

# Fisura Táctica (del plugin "Objetos y Movimientos Custom"): también la quita
if defined?(Battle::Move::RemoveEntryHazardsTrapTargetOneTurn)
  class Battle::Move::RemoveEntryHazardsTrapTargetOneTurn
    alias __arenafakemon_pbHazardsOnSide? pbHazardsOnSide? unless method_defined?(:__arenafakemon_pbHazardsOnSide?)

    def pbHazardsOnSide?(side)
      return true if side.effects[PBEffects::MindSnare]
      return __arenafakemon_pbHazardsOnSide?(side)
    end

    alias __arenafakemon_pbEffectAgainstTarget pbEffectAgainstTarget unless method_defined?(:__arenafakemon_pbEffectAgainstTarget)

    def pbEffectAgainstTarget(user, target)
      __arenafakemon_pbEffectAgainstTarget(user, target)
      [user.pbOwnSide, user.pbOpposingSide].each { |side| side.effects[PBEffects::MindSnare] = false }
    end
  end
end
