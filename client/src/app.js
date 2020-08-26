import React from "react";
import Room from "./room";

class Init extends React.Component {
  constructor(props) {
    super(props);
    this.handleSetUp = this.handleSetUp.bind(this);
    this.props.socket.on(
      "responseForRoom",
      ({ success, roomId, username, role, people }) => {
        if (success === false) {
          alert("Failed to connect this room");
          return;
        }
        this.props.changeAppState(roomId, username, role, people);
      }
    );
  }

  handleSetUp(e) {
    let username = document.getElementById("username").value,
      order = document.getElementById("order-type");
    if (username === "") username = "bro";

    if (order.value === "host") {
      this.props.socket.emit("host", { username });
    } else {
      let roomId = prompt("Enter the room's id :");
      if (roomId) this.props.socket.emit("join", { username, roomId });
    }
  }

  render() {
    return (
      <div id="logging-div">
        <input
          id="username"
          className="form-control"
          name="username"
          type="text"
          maxlength="22"
          placeholder="Enter username (default:'bro')"
        />
        <select id="order-type" defaultValue="join" className="form-control">
          <option value="join">Join</option>
          <option value="host">Host</option>
        </select>
        <button
          value="Push"
          onClick={this.handleSetUp}
          className="form-control btn-primary"
        >
          LOG
        </button>
      </div>
    );
  }
}
class App extends React.Component {
  constructor(props) {
    super(props);
    console.log(location.origin);
    let socket = io(location.origin);
    this.state = {
      appState: "init",
      socket: socket,
    };
    this.changeAppState = this.changeAppState.bind(this);
  }

  changeAppState(roomId, username, role, people) {
    this.setState({ roomId, username, role, appState: "room", people });
  }

  render() {
    if (this.state.appState == "init") {
      return (
        <Init socket={this.state.socket} changeAppState={this.changeAppState} />
      );
    } else {
      return <Room {...this.state} />;
    }
  }
}

export default App;
