// Import the mp variable
const mp = require("mp")

// Client-side spectate system
let isSpectating = false
let spectateTarget: any = null

mp.events.add("startSpectate", (targetId: number) => {
  const target = mp.players.getById(targetId)
  if (!target) return

  isSpectating = true
  spectateTarget = target

  mp.players.local.setAlpha(0)
  mp.game.cam.setGameplayCamRelativeHeading(0)
  mp.game.cam.setGameplayCamRelativePitch(0, 1)

  // Attach camera to target
  mp.game.streaming.requestCollisionAtCoord(target.position.x, target.position.y, target.position.z)
  mp.players.local.attachTo(target.handle, -1, 0, 0, 2, 0, 0, 0, false, false, false, false, 2, true)
})

mp.events.add("stopSpectate", () => {
  if (!isSpectating) return

  isSpectating = false
  spectateTarget = null

  mp.players.local.setAlpha(255)
  mp.players.local.detach(true, true)
})

// Handle spectate target disconnect
mp.events.add("playerQuit", (player: any) => {
  if (isSpectating && spectateTarget && spectateTarget.id === player.id) {
    mp.events.call("stopSpectate")
  }
})
