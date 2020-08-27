import React from "react";

class Game extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      remainPiles: null,
      winner: null,
      piles: null,
      playerOut: false, // is true when the non-owner player gets out of the game
    };

    this.listenEvents = this.listenEvents.bind(this);
    this.handlePickOne = this.handlePickOne.bind(this);
    this.handleNextTrun = this.handleNextTrun.bind(this);

    this.listenEvents();
  }

  listenEvents() {
    this.props.socket.on("getGameState", (gameState) => {
      this.setState({
        piles: gameState.gamePiles,
        players: gameState.players,
        turn: gameState.turn,
        winner: gameState.winner,
        pilePickedFrom: gameState.pilePickedFrom,
        remainPiles: gameState.remainPiles,
      });
    });
    this.props.socket.on("doneGame", ({ winner }) => {
      this.setState({ winner: winner });
    });
    this.props.socket.on("playerOut", ({ winner }) => {
      this.setState({ winner: winner, playerOut: true });
    });
  }

  handlePickOne(i) {
    if (this.state.piles[i]) {
      if (
        this.state.pilePickedFrom === i ||
        this.state.pilePickedFrom === null
      ) {
        let newPiles = this.state.piles,
          newRemainPiles = this.state.remainPiles;
        newPiles[i]--;
        if (newPiles[i] === 0) newRemainPiles--;

        let dataToSend = {
          gamePiles: newPiles,
          players: this.state.players,
          turn: this.state.turn,
          winner: null,
          pilePickedFrom: i,
          remainPiles: newRemainPiles,
        };
        this.props.socket.emit("gameEvent", dataToSend);
      } else {
        alert("You can pick from only one pile for each turn");
      }
    } else {
      alert("You can't pick from an empty pile.");
    }
  }

  handleNextTrun() {
    if (this.state.pilePickedFrom === null) {
      alert("You must pick before end your turn");
    } else {
      let dataToSend = {
        gamePiles: this.state.piles,
        players: this.state.players,
        turn: 1 - this.state.turn,
        pilePickedFrom: null,
        winner: null,
        remainPiles: this.state.remainPiles,
      };
      this.props.socket.emit("gameEvent", dataToSend);
    }
  }

  render() {
    // if gameState hasn't reached yet
    if (this.state.piles === null) return null;

    let pilesDivs = [],
      isMyTurn = false;

    if (
      (this.state.players[0].id === this.props.socket.id &&
        this.state.turn === 0) ||
      (this.state.players[1].id === this.props.socket.id &&
        this.state.turn === 1)
    )
      isMyTurn = true;

    for (let i = 0; i < this.state.piles.length; i++) {
      let blocks = [];
      if (isMyTurn && this.state.piles[i])
        blocks.push(
          <input
            type="button"
            className="pick-block-btn btn btn-primary"
            value="Pick one"
            onClick={() => {
              this.handlePickOne(i);
            }}
          />
        );
      for (let j = 1; j <= this.state.piles[i]; j++)
        blocks.push(<div class="block">{j}</div>);
      if (blocks.length) pilesDivs.push(<div className="pile">{blocks}</div>);
    }

    if (this.state.winner === null) {
      return (
        <div>
          <div id="current-playres">
            <div id={this.state.turn === 0 ? "current-player" : ""}>
              {this.state.players[0].username}
            </div>
            <div id={this.state.turn === 1 ? "current-player" : ""}>
              {this.state.players[1].username}
            </div>
          </div>
          <div id="handle-bottom-piles">
            <div id="piles-div">
              {pilesDivs}{" "}
              {isMyTurn ? (
                <input
                  type="button"
                  id="end-turn-btn"
                  className="btn btn-outline-primary"
                  value="End turn"
                  onClick={this.handleNextTrun}
                />
              ) : null}
            </div>
          </div>
        </div>
      );
    } else {
      let winnerUserName = this.state.players[this.state.winner].username;
      return (
        <div id="winner-div" class="jumbotron">
          <h1 class="display-4">{winnerUserName} won the game!</h1>
          {this.state.playerOut === true ? (
            <small>The other player is out.</small>
          ) : null}
        </div>
      );
    }
  }
}

export default Game;
