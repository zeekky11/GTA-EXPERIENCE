// Client-side freeze system
let isFrozen = false

// Declare mp variable or import it before using
const mp = require("mp") // Example import, replace with actual import if needed

mp.events.add("freezePlayer", (freeze: boolean) => {
  isFrozen = freeze
  mp.players.local.freezePosition(freeze)

  if (freeze) {
    mp.game.ui.displayHelpTextThisFrame("Has sido congelado por un administrador")
  }
})

mp.events.add("render", () => {
  if (isFrozen) {
    mp.game.controls.disableAllControlActions(0)
    mp.game.ui.displayHelpTextThisFrame("CONGELADO - Espera a ser descongelado")
  }
})
