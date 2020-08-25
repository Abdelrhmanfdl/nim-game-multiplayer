const mongoose = require("mongoose");

let roomSchema = new mongoose.Schema({
  owner: { type: Object, required: true },
  people: { type: Array },
  roomState: { type: String, default: "normal" },
  gameState: { type: Object, default: null },
  chat: { type: Array },
});

module.exports = mongoose.model("room", roomSchema);
