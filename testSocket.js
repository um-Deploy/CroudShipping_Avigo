const { io } = require("socket.io-client");

const socket = io("http://localhost:5000");

socket.on("connect", () => {
  console.log("Connected to socket:", socket.id);

  socket.emit("joinOrderRoom", "test-order-1");
});