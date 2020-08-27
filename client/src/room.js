import React from "react";
import { render } from "react-dom";
import Game from "./game";

class Chat extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      chat: [],
    };

    this.handleSendMessage = this.handleSendMessage.bind(this);
    this.listenEvents = this.listenEvents.bind(this);

    this.listenEvents();
  }

  listenEvents() {
    this.props.socket.on("newMessage", ({ username, msg }) => {
      let newChatContent = this.state.chat;
      newChatContent.push(
        <div className="friend-msg">
          <strong>{username}</strong> : {msg}
        </div>
      );
      this.setState({ chat: newChatContent });
    });
    this.props.socket.on("getRoomChat", (chat) => {
      let newChatContent = [];
      chat.forEach((obj) => {
        newChatContent.push(
          <div className="friend-msg">
            <strong>{obj.username}</strong> : {obj.msg}
          </div>
        );
      });
      this.setState({ chat: newChatContent });
    });
  }

  handleSendMessage(e) {
    const txt = document.getElementById("chat-txt"),
      msg = txt.value;
    if (msg == "") return;
    txt.value = "";
    this.props.socket.emit("newMessage", {
      username: this.props.username,
      msg: msg,
    });
    let newChatContent = this.state.chat;
    newChatContent.push(
      <div className="my-msg">
        <strong>{this.props.username}</strong> : {msg}
      </div>
    );
    this.setState({ chat: newChatContent });
  }

  componentDidMount() {
    this.props.socket.emit("getRoomChat");
  }
  componentDidUpdate() {
    let chatContent = document.getElementById("chat-content");
    chatContent.scrollTop = chatContent.scrollHeight;
  }

  render() {
    return (
      <div id="chat-bar">
        <div
          id="chat-head"
          onClick={() => {
            this.props.handleClickBarHead(document.getElementById("chat-body"));
          }}
        >
          <h4>Chat</h4>
        </div>
        <div id="chat-body" class="closed-body">
          <div id="chat-content">{this.state.chat}</div>
          <footer id="chat-footer">
            <input
              type="text"
              id="chat-txt"
              onKeyUp={(e) => {
                if (e.keyCode === 13) {
                  document.getElementById("send").click();
                }
              }}
            />
            <input
              type="button"
              id="send"
              value="Send"
              onClick={this.handleSendMessage}
            />
          </footer>
        </div>
      </div>
    );
  }
}

function Friends(props) {
  return (
    <div id="friends-bar">
      <div
        id="friends-head"
        onClick={() => {
          props.handleClickBarHead(document.getElementById("friends-body"));
        }}
      >
        <h4>Friends</h4>
      </div>
      <div id="friends-body" class="closed-body">
        {props.peopleArr}
      </div>
    </div>
  );
}
class InitGame extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      selected: [],
    };
    this.handleClickUser = this.handleClickUser.bind(this);
    this.handleDone = this.handleDone.bind(this);
  }

  handleClickUser(i) {
    let newSelectedArr = this.state.selected;
    if (!this.state.selected.includes(i)) newSelectedArr.push(i);
    else newSelectedArr.splice(newSelectedArr.indexOf(i), 1);
    this.setState({ selected: newSelectedArr });
  }

  getRandomeGame() {
    let ret = [],
      len = Math.ceil(6 * Math.random() + 3); //  (3,9)
    for (let i = 0; i < len; i++) {
      ret[i] = Math.ceil(4 * Math.random() + 5);
    }
    return ret;
  }

  handleDone() {
    if (this.state.selected.length != 2) {
      alert("You must select exactly 2 players");
    } else {
      let gamePiles = this.getRandomeGame(),
        players = [],
        turn = Math.round(Math.random());
      this.state.selected.forEach((i) => {
        players.push({
          id: this.props.people[i].id,
          username: this.props.people[i].username,
        });
      });

      this.props.handleStartGame({
        gamePiles,
        players,
        turn,
        pilePickedFrom: null,
        winner: null,
        remainPiles: gamePiles.length,
      });
    }
  }

  render() {
    let peopleArr = [];
    for (let i = 0; i < this.props.people.length; i++) {
      peopleArr.push(
        <div
          onClick={(e) => {
            this.handleClickUser(i);
          }}
          class={
            "candidate-player" +
            " " +
            (this.state.selected.includes(i)
              ? "selected-player"
              : "non-selected-player")
          }
        >
          {this.props.people[i].username}
        </div>
      );
    }

    return (
      <div id="init-game-div">
        {peopleArr}
        <input
          type="button"
          class="btn btn-secondary"
          value="Done"
          onClick={this.handleDone}
        />
      </div>
    );
  }
}

class Room extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      people: this.props.people,
      roomState: "normal",
    };
    this.listenEvents();

    this.listenEvents = this.listenEvents.bind(this);
    this.handleClickBarHead = this.handleClickBarHead.bind(this);
    this.handleClickNewGame = this.handleClickNewGame.bind(this);
    this.handleStartGame = this.handleStartGame.bind(this);
    this.handleEndGame = this.handleEndGame.bind(this);
  }

  // For the room owner
  handleStartGame(gameState) {
    this.props.socket.emit("setGameState", gameState);
    this.props.socket.emit("changeRoomState", "game");
  }

  listenEvents() {
    this.props.socket.on("update people", ({ people }) => {
      this.setState({ people });
    });
    this.props.socket.on("endRoom", () => {
      location.reload();
    });
    this.props.socket.on("changeRoomState", (newState) => {
      this.setState({ roomState: newState });
    });
    this.props.socket.on("getRoomState", (data) => {
      this.setState({
        roomState: data.roomState,
      });
      if (data.roomState === "game") {
        this.props.socket.emit("getGameState");
      }
    });
  }

  handleClickNewGame() {
    this.setState({
      roomState: "init",
    });
  }
  handleClickBarHead(barBody) {
    if (barBody.className === "bar-body") barBody.className = "closed-body";
    else barBody.className = "bar-body";
  }
  handleEndGame() {
    this.props.socket.emit("changeRoomState", "normal");
  }

  componentDidMount() {
    this.props.socket.emit("getRoomState");
  }

  render() {
    let peopleArr = [];
    this.state.people.forEach((person) => {
      peopleArr.push(
        <p>
          {person.username} {person.id === this.props.socket.id ? " (me)" : ""}
        </p>
      );
    });

    return (
      <div>
        <div
          class="toast show room-head-section"
          role="message"
          aria-atomic="true"
        >
          <div class="toast-header">
            <strong class="mr-auto">Room ID</strong>
          </div>
          <div class="toast-body">{this.props.roomId}</div>
        </div>

        <Chat handleClickBarHead={this.handleClickBarHead} {...this.props} />
        <Friends
          handleClickBarHead={this.handleClickBarHead}
          peopleArr={peopleArr}
        />

        {this.props.role === "owner" && this.state.roomState === "normal" ? (
          <input
            type="button"
            id="new-game-btn"
            class="btn btn-outline-secondary"
            value="New Game"
            onClick={this.handleClickNewGame}
          />
        ) : null}

        {this.state.roomState === "init" ? (
          <InitGame
            people={this.state.people}
            username={this.props.username}
            role={this.props.role}
            socket={this.props.socket}
            handleStartGame={this.handleStartGame}
          />
        ) : this.state.roomState === "game" ? (
          <div>
            {this.props.role === "owner" ? (
              <input
                type="button"
                id="end-game-btn"
                class="btn btn-outline-secondary"
                value="End game"
                onClick={this.handleEndGame}
              />
            ) : null}
            <Game socket={this.props.socket} username={this.props.username} />
          </div>
        ) : null}
      </div>
    );
  }
}

export default Room;
