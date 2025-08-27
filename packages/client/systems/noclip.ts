// Client-side noclip system
let noclipEnabled = false
const noclipSpeed = 1.0

// Declare mp variable or import it as needed
const mp = require("mp") // Example import, replace with actual import if needed

mp.events.add("toggleNoclip", (enabled: boolean) => {
  noclipEnabled = enabled

  if (enabled) {
    mp.players.local.freezePosition(true)
    mp.players.local.setInvincible(true)
    mp.players.local.setVisible(false, false)
  } else {
    mp.players.local.freezePosition(false)
    mp.players.local.setInvincible(false)
    mp.players.local.setVisible(true, false)
  }
})

mp.events.add("render", () => {
  if (!noclipEnabled) return

  const player = mp.players.local
  const position = player.position
  const heading = mp.game.cam.getGameplayCamRelativeHeading()
  const pitch = mp.game.cam.getGameplayCamRelativePitch()

  let newPosition = position

  // Movement controls
  if (mp.keys.isDown(0x57)) {
    // W key
    const forward = mp.game.entity.getForwardVector(player.handle)
    newPosition = new mp.Vector3(
      position.x + forward.x * noclipSpeed,
      position.y + forward.y * noclipSpeed,
      position.z + forward.z * noclipSpeed,
    )
  }

  if (mp.keys.isDown(0x53)) {
    // S key
    const forward = mp.game.entity.getForwardVector(player.handle)
    newPosition = new mp.Vector3(
      position.x - forward.x * noclipSpeed,
      position.y - forward.y * noclipSpeed,
      position.z - forward.z * noclipSpeed,
    )
  }

  if (mp.keys.isDown(0x41)) {
    // A key
    const right = mp.game.entity.getRightVector(player.handle)
    newPosition = new mp.Vector3(
      position.x - right.x * noclipSpeed,
      position.y - right.y * noclipSpeed,
      position.z - right.z * noclipSpeed,
    )
  }

  if (mp.keys.isDown(0x44)) {
    // D key
    const right = mp.game.entity.getRightVector(player.handle)
    newPosition = new mp.Vector3(
      position.x + right.x * noclipSpeed,
      position.y + right.y * noclipSpeed,
      position.z + right.z * noclipSpeed,
    )
  }

  if (mp.keys.isDown(0x20)) {
    // Space key
    newPosition = new mp.Vector3(position.x, position.y, position.z + noclipSpeed)
  }

  if (mp.keys.isDown(0x10)) {
    // Shift key
    newPosition = new mp.Vector3(position.x, position.y, position.z - noclipSpeed)
  }

  player.position = newPosition
})
