require("dotenv").config();
const express = require("express"),
  app = express(),
  PORT = process.env.PORT || 8080,
  path = require("path"),
  myServer = app.listen(PORT, () =>
    console.log("Server is listening on port " + PORT)
  );

const socketIO = require("socket.io");
const ioServer = socketIO(myServer);
const roomModel = require("./models/room");
const mongoose = require("mongoose");
const events = require("./events");

app.use(express.static(path.resolve(__dirname, "../client/public")));
app.use(express.static(path.resolve(__dirname, "../dist")));

mongoose
  .connect(process.env.DB_STRING, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("DB is connected..."))
  .catch((err) => {
    throw err;
  });

/****************************************************************
 ****************************************************************/

app.get("*", (req, res) => {
  res.sendFile(path.resolve(__dirname, "../client/public/index.html"));
});

ioServer.on("connection", (socket) => {
  socket.on("host", (data) => events.host(data, socket, ioServer));
  socket.on("join", (data) => events.join(data, socket, ioServer));
});
