const roomModel = require("./models/room");
const mongoose = require("mongoose");
const { createIndexes } = require("./models/room");
const room = require("./models/room");

const broadcastAllPeople = (room, ioServer, roomId) => {
  ioServer.sockets.in(roomId).emit("update people", { people: room.people });
};

const broadcastGameState = (room, ioServer, roomId) => {
  ioServer.sockets.in(roomId).emit("getGameState", room.gameState);
};

const emitGameState = (socket, roomId) => {
  roomModel.findOne({ _id: roomId }, (err, room) => {
    socket.emit("getGameState", room.gameState);
  });
};

const handleGameEvent = (roomId, socket, ioServer, gameState) => {
  room.findOne({ _id: roomId }, (err, room) => {
    if (err) {
      console.log(err.message);
    } else if (room) {
      room.gameState = gameState;
      room.save((err, room) => {
        if (err) console.log("Failed to save the game state.");
        broadcastGameState(room, ioServer, roomId);

        if (gameState.remainPiles === 0) {
          ioServer.sockets
            .in(roomId)
            .emit("doneGame", { winner: gameState.turn });
          room.gameState.winner = gameState.turn;
          room.markModified("gameState");
          room.save();
        }
      });
    } else {
      console.log("No room exists");
    }
  });
};

let host = function (data, socket, ioServer) {
  const socketId = socket.id;
  // New Room
  let username = data.username;
  let newRoom = new roomModel();
  let roomId;
  newRoom.owner = {
    username: username,
    id: socketId,
  };
  newRoom.people.push({
    username: username,
    id: socketId,
  });
  newRoom.save((err, room) => {
    if (err) {
      console.log(err.message);
    }
    roomId = String(room._id);
    socket.join(roomId);

    // Emit room info
    socket.emit("responseForRoom", {
      success: true,
      username,
      roomId,
      role: "owner",
      people: room.people,
    });

    socket.on("changeRoomState", (newState) => {
      roomModel.findOne({ _id: roomId }, (err, room) => {
        room.roomState = newState;
        if (newState !== "game") room.gameState = null;
        room.save();
      });
      ioServer.sockets.in(roomId).emit("changeRoomState", newState);
    });

    // On disconnect
    socket.on("disconnect", () => {
      console.log("Owner disconnected");
      ioServer.sockets.in(roomId).emit("endRoom");
      roomModel.deleteOne({ _id: roomId }, (err) => {
        if (err) console.log(err);
      });
    });
  });

  // Gaming
  socket.on("setGameState", (gameState) => {
    roomModel.findOne({ _id: roomId }, (err, room) => {
      room.gameState = gameState;
      room.save().then(() => broadcastGameState(room, ioServer, roomId));
    });
  });

  socket.on("getGameState", () => {
    emitGameState(socket, roomId);
  });

  socket.on("gameEvent", (gameState) => {
    handleGameEvent(roomId, socket, ioServer, gameState);
  });

  // Chatting
  socket.on("newMessage", ({ username, msg }) => {
    roomModel.findOne({ _id: roomId }, (err, room) => {
      room.chat.push({ username, msg });
      room.save();
      socket.in(roomId).broadcast.emit("newMessage", { username, msg });
    });
  });
};

let join = function (data, socket, ioServer) {
  let username = data.username,
    roomId = data.roomId,
    socketId = socket.id;

  // Get the room
  roomModel.findOne({ _id: roomId }, async (err, room) => {
    socket.join(roomId);
    room.people.push({
      id: socketId,
      username,
    });
    room.save();
    socket.emit("responseForRoom", {
      success: true,
      username,
      roomId,
      role: "visitor",
      people: room.people,
    });
    broadcastAllPeople(room, ioServer, roomId);
  });

  socket.on("disconnect", () => {
    roomModel.findOne({ _id: roomId }, async (err, room) => {
      if (err) {
        console.log(err.message);
      } else if (room) {
        console.log("Visitor disconnected");
        let visitorIndex = room.people.findIndex((doc) => {
          return doc.id === socketId;
        });
        room.people.splice(visitorIndex, 1);
        room.save((err, room) => {
          broadcastAllPeople(room, ioServer, roomId);
          if (room.gameState !== null && room.gameState.winner === null) {
            if (socket.id === room.gameState.players[0].id) {
              socket.in(roomId).emit("playerOut", { winner: 1 });
              room.gameState.winner = 1;
              room.markModified("gameState");
              room.save((err) => {
                if (err) console.log(err.message);
              });
            } else if (socket.id === room.gameState.players[1].id) {
              socket.in(roomId).emit("playerOut", { winner: 0 });
              room.gameState.winner = 0;
              room.markModified("gameState");
              room.save((err) => {
                if (err) console.log(err.message);
              });
            }
          }
        });
      } else {
        console.log("Room is deleted...");
      }
    });
  });

  // For new visitors
  socket.on("getRoomState", () => {
    roomModel.findOne({ _id: roomId }, (err, room) => {
      let data = {
        roomState: room.roomState,
      };
      socket.emit("getRoomState", data);
    });
  });

  // Gaming
  socket.on("getGameState", () => {
    emitGameState(socket, roomId);
  });

  socket.on("gameEvent", (gameState) => {
    handleGameEvent(roomId, socket, ioServer, gameState);
  });

  // Chatting
  socket.on("getRoomChat", () => {
    roomModel.findOne({ _id: roomId }, (err, room) => {
      if (err) {
        console.log(err.message);
      } else if (room) {
        socket.emit("getRoomChat", room.chat);
      } else console.log("Error: Can't get chat of null");
    });
  });

  socket.on("newMessage", ({ username, msg }) => {
    roomModel.findOne({ _id: roomId }, (err, room) => {
      room.chat.push({ username, msg });
      room.save();
      socket.in(roomId).broadcast.emit("newMessage", { username, msg });
    });
  });
};

module.exports = {
  host,
  join,
};
