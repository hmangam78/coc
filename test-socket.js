const { io } = require("socket.io-client")

const URL = "http://localhost:3000"
const SESSION_ID = "820ffe00-5924-4d54-b910-b79096fc532a"

// ---- CLIENTE 1 ----
const client1 = io(URL)

let player1Id = null
let player1Token = null

client1.on("connect", () => {
  console.log("Client1 connected")

  client1.emit("join", { sessionId: SESSION_ID }, (response) => {
    console.log("Client1 joined:", response)
    player1Id = response?.playerId
    player1Token = response?.playerToken
  })
})

client1.on("state_update", (state) => {
  console.log("Client1 received update:", state)
})

client1.on("events", (payload) => {
  console.log("Client1 received events:", payload)
})

// ---- CLIENTE 2 ----
const client2 = io(URL)

let player2Id = null
let player2Token = null

client2.on("connect", () => {
  console.log("Client2 connected")

  client2.emit("join", { sessionId: SESSION_ID }, (response) => {
    console.log("Client2 joined:", response)
    player2Id = response?.playerId
    player2Token = response?.playerToken

    // después de 2 segundos, hace acción
    setTimeout(() => {
      console.log("Client2 sending action...")

      client2.emit("action", {
        sessionId: SESSION_ID,
        actionId: "enter_house",
        playerToken: player2Token
      })
    }, 2000)
  })
})

client2.on("state_update", (state) => {
  console.log("Client2 received update:", state)
})

client2.on("events", (payload) => {
  console.log("Client2 received events:", payload)
})
