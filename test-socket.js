const { io } = require("socket.io-client")

// 🔹 cambia esto si tu backend usa otro puerto
const URL = "http://localhost:3000"

// 🔹 pega aquí el sessionId que creaste con curl
const SESSION_ID = "PEGA_AQUI_TU_SESSION_ID"

// Cliente 1
const client1 = io(URL)

// Cliente 2
const client2 = io(URL)

// ---- CLIENTE 1 ----
client1.on("connect", () => {
  console.log("Client1 connected")

  client1.emit("join", { sessionId: "d76575d9-fe99-4a20-8c2e-bbe6d779e012" })
})

client1.on("state_update", (state) => {
  console.log("Client1 received update:", state)
})

// ---- CLIENTE 2 ----
client2.on("connect", () => {
  console.log("Client2 connected")

  client2.emit("join", { sessionId: "d76575d9-fe99-4a20-8c2e-bbe6d779e012" })

  // después de 2 segundos, hace acción
  setTimeout(() => {
    console.log("Client2 sending action...")
    client2.emit("action", {
      sessionId: "d76575d9-fe99-4a20-8c2e-bbe6d779e012",
      actionId: "inspect"
    })
  }, 2000)
})

client2.on("state_update", (state) => {
  console.log("Client2 received update:", state)
})