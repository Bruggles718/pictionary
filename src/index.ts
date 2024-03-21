import { Room } from "./Room.js";

import express from "express";
const app = express();
import * as http from "http";
import * as path from "path";
const server = http.createServer(app);

import { Server } from "socket.io";
import { Player } from "./Player.js";
import { Message } from "./Message.js";
import { wordsList2 } from "./Words.js";
import { pokemonWords } from "./PokemonWords.js";

const io = new Server(server);

app.use(express.static(path.join(__dirname, "client")));

app.get("/healthcheck", (req, res) => {
  res.send("App running...");
});

app.get("/", (req, res) => {
  res.sendFile("index.html");
});

app.get("/join=:room", (req, res) => {
  res.sendFile(__dirname + "/client/index.html")
});

let rooms: { [index: string]: Room } = {};
let players: { [index: string]: Player } = {};

io.on("connection", (socket) => {
  console.log("user connected");

  const sendScoreboard = (room) => {
    const scoreboardRoomToSend = {
      m_id: room.m_id,
      m_players: room.m_players,
      m_scores: room.m_scores,
      m_currentArtistID: room.m_currentArtistID,
      m_guessedTheWord: room.m_guessedTheWord
    };
    socket.to(room.m_id).emit("updateScoreboardClient", { room: scoreboardRoomToSend });
    socket.emit("updateScoreboardClient", { room: scoreboardRoomToSend });
  }

  const sendMessage = (room) => {
    const messagesRoomToSend = {
      m_id: room.m_id,
      m_messages: room.m_messages.slice(-24)
    };
    socket.to(room.ID).emit("sendMessage", { room: messagesRoomToSend });
    socket.emit("sendMessage", { room: messagesRoomToSend });
    room.m_messages = room.m_messages.slice(-24);
  }

  const endGame = (roomID) => {
    const room = rooms[roomID];
    if (!room) return;
    const message = new Message("Game Over!");
    message.setColor("txred");
    room.m_messages.push(message);
    room.setWinner();
    const winner = room.m_players[room.m_winnerID];
    if (winner) {
      const message2 = new Message("The winner is " + winner.m_name + "!");
      message2.setColor("txgreen");
      room.m_messages.push(message2);
    }
    sendMessage(room);
    const gameOverRoomToSend = {
      m_id: room.m_id,
      m_winnerID: room.m_winnerID,
      m_players: room.m_players
    };
    socket.to(room.ID).emit("gameOver", { room: gameOverRoomToSend });
    socket.emit("gameOver", { room: gameOverRoomToSend });
  };

  const updateArtistClient = (roomID) => {
    const room = rooms[roomID];
    if (!room) return;
    room.m_paths = [[]];
    const word1 = room.popRandomWord();
    const word2 = room.popRandomWord();
    const word3 = room.popRandomWord();
    room.m_wordsToChoose = [];
    room.m_wordsToChoose.push(word1);
    room.m_wordsToChoose.push(word2);
    room.m_wordsToChoose.push(word3);
    const updateArtistRoomToSend = {
      m_id: room.m_id,
      m_currentArtistID: room.m_currentArtistID,
      m_roundsRemaining: room.m_roundsRemaining
    };
    const dataToSend = { room: updateArtistRoomToSend, word1: word1, word2: word2, word3: word3 };
    socket.to(roomID).emit("updateArtistClient", dataToSend);
    socket.emit("updateArtistClient", dataToSend);
    const currentArtist = room.m_players[room.m_currentArtistID];
    if (currentArtist) {
      const message = new Message(currentArtist.m_name + " is drawing now!");
      message.setColor("txlightBlue");
      room.m_messages.push(message);
    }
    sendMessage(room);
    sendScoreboard(room);
  };

  socket.on("disconnect", () => {
    console.log("user disconnected");
    const playerDisconnect = players[socket.id];
    if (!playerDisconnect) return;
    delete players[socket.id];
    const roomID = playerDisconnect.m_currentRoomId;
    const room = rooms[roomID];
    if (!room) return;
    room.cachePlayer(playerDisconnect.m_id);
    console.log("removing player");
    room.removePlayer(playerDisconnect.m_id);
    if (room.playerCount() <= 0) {
      room.clearCachedTimouts();
      delete rooms[roomID];
      console.log(`room ${roomID} was deleted`);
      return;
    }
    console.log(`player (${playerDisconnect.m_name}, ${playerDisconnect.m_id}) left room ${room.m_id}`);
    const message = new Message(playerDisconnect.m_name + " disconnected!");
    message.setColor("txred");
    room.m_messages.push(message);
    sendMessage(room);
    sendScoreboard(room);
    const playersConnectedRoomToSend = {
      m_id: room.m_id,
      m_players: room.m_players,
      m_started: room.m_started
    };
    socket.to(roomID).emit("playersConnected", { room: playersConnectedRoomToSend, playerConnectedID: playerDisconnect.m_id});
    socket.emit("playersConnected", { room: playersConnectedRoomToSend });
    let everybodyGuessed = true;
    for (let id in room.m_guessedTheWord) {
      if (id !== room.m_currentArtistID) {
        everybodyGuessed = everybodyGuessed && room.m_guessedTheWord[id];
      }
    }
    if (room.m_started && room.m_currentArtistID === playerDisconnect.m_id && room.m_currentlyDrawing && room.playerCount() > 1) {
      room.setTimeRemaining(0);
    } else if (room.m_started && room.m_currentArtistID === playerDisconnect.m_id  && room.playerCount() > 1) {
      room.updateCurrentArtist();
      updateArtistClient(room.m_id);
    } else if (room.m_started && room.m_currentArtistID !== playerDisconnect.m_id && everybodyGuessed && room.playerCount() > 1) {
      room.setTimeRemaining(0);
    } else if (room.m_started && room.playerCount() <= 1) {
      endGame(room.m_id);
    }
  });

  socket.on("resetGame", (data) => {
    const roomID = data.roomID;
    const room = rooms[roomID];
    if (!room) return;
    if (room.playerCount() <= 1) return;
    room.resetGame();
    room.m_started = true;
    socket.to(roomID).emit("showGameArea", { roomID: roomID });
    socket.emit("showGameArea", { roomID: roomID });
    sendScoreboard(room);
    room.randomizeArtistQueue();
    room.updateCurrentArtist();
    room.setNewRandomWord();
    updateArtistClient(roomID);
  });

  const countDownTimer = (roomID: string) => {
    const room = rooms[roomID];
    if (!room) return;
    room.decrementTimeRemaining();
    const timeRoomToSend = {
      m_id: room.m_id,
      m_drawTimeRemaining: room.m_drawTimeRemaining
    }
    socket.to(roomID).emit("updateTimeClient", { room: timeRoomToSend });
    socket.emit("updateTimeClient", { room: timeRoomToSend });
    if (room.m_currentlyDrawing) {
      if (
        room.m_drawTimeRemaining <= 50 &&
        room.m_revealedLetters.length === 0
      ) {
        room.revealLetter();
        const wordDisplayRoomToSend = {
          m_id: room.m_id,
          m_currentArtistID: room.m_currentArtistID,
          m_currentWord: room.m_currentWord,
          m_guessedTheWord: room.m_guessedTheWord,
          m_revealedLetters: room.m_revealedLetters
        }
        socket.to(roomID).emit("updateWordDisplay", { room: wordDisplayRoomToSend });
        socket.emit("updateWordDisplay", { room: wordDisplayRoomToSend });
      }
      if (
        room.m_drawTimeRemaining <= 25 &&
        room.m_revealedLetters.length === 1
      ) {
        room.revealLetter();
        const wordDisplayRoomToSend = {
          m_id: room.m_id,
          m_currentArtistID: room.m_currentArtistID,
          m_currentWord: room.m_currentWord,
          m_guessedTheWord: room.m_guessedTheWord,
          m_revealedLetters: room.m_revealedLetters
        }
        socket.to(roomID).emit("updateWordDisplay", { room: wordDisplayRoomToSend });
        socket.emit("updateWordDisplay", { room: wordDisplayRoomToSend });
      }
      setTimeout(countDownTimer, 1000, roomID);
    } else {
      const message = new Message("The word was '" + room.m_currentWord + "'");
      message.setColor("txgreen");
      room.m_messages.push(message);
      sendMessage(room);
      const noTimeRoomToSend = {
        m_id: room.m_id,
        m_currentWord: room.m_currentWord
      };
      socket.to(roomID).emit("noTimeRemaining", { room: noTimeRoomToSend });
      socket.emit("noTimeRemaining", { room: noTimeRoomToSend });
      setTimeout(() => {
        room.setNextArtist();
        room.m_revealedLetters = [];
        if (room.m_roundsRemaining > 0) {
          updateArtistClient(roomID);
        } else {
          endGame(roomID);
        }
      }, 5000);
    }
  };

  const startGame = (data, i_wordBank: Array<string>, i_allowSpellingPrediction: boolean) => {
    const roomID = data.roomID;
    const room = rooms[roomID];
    if (!room) return;
    room.initWordBank(i_wordBank);
    room.m_allowSpellingPrediction = i_allowSpellingPrediction;
    room.m_started = true;
    let showGameAreaData: {[index: string]: any} = { 
      roomID: roomID, 
      allowSpellingPrediction: i_allowSpellingPrediction
    };
    if (i_allowSpellingPrediction) {
      showGameAreaData = {
        ...showGameAreaData,
        wordBank: i_wordBank
      }
    }
    socket.to(roomID).emit("showGameArea", showGameAreaData);
    socket.emit("showGameArea", showGameAreaData);
    sendScoreboard(room);
    room.randomizeArtistQueue();
    room.updateCurrentArtist();
    room.setNewRandomWord();
    updateArtistClient(roomID);
  }

  socket.on("startGame", (data) => {
    startGame(data, [...wordsList2], false);
  });

  socket.on("startGamePokemon", (data) => {
    const genKeys = Object.keys(pokemonWords);
    const includedGens = data.includedGens;
    let wordBank = [];
    for (let i = 0; i < includedGens.length; i++) {
      const genKeyIdx = includedGens[i];
      const genKey = genKeys[genKeyIdx];
      wordBank = [...wordBank, ...pokemonWords[genKey]];
    }
    const startData = {
      roomID: data.roomID
    }
    startGame(startData, wordBank, data.allowSpellingPrediction);
  });

  socket.on("startGameCustom", (data) => {
    
  });

  socket.on("startDrawingServer", (data) => {
    const roomID = data.roomID;
    const room = rooms[roomID];
    if (!room) return;
    room.setNewWord(room.m_wordsToChoose[data.word]);
    const currentWordRoomToSend = {
      m_id: room.m_id,
      m_currentWord: room.m_currentWord,
      m_currentArtistID: room.m_currentArtistID
    }
    socket.to(roomID).emit("updateCurrentWord", { room: currentWordRoomToSend });
    socket.emit("updateCurrentWord", { room: currentWordRoomToSend });
    room.startDrawingPhase();
    const timeRoomToSend = {
      m_id: room.m_id,
      m_drawTimeRemaining: room.m_drawTimeRemaining
    }
    socket.to(roomID).emit("updateTimeClient", { room: timeRoomToSend });
    socket.emit("updateTimeClient", { room: timeRoomToSend });
    setTimeout(() => countDownTimer(roomID), 1000);
  });

  socket.on("undoCanvasServer", (data) => {
    const roomID = data.roomID;
    const room = rooms[roomID];
    if (!room) return;
    room.m_paths.pop();
    room.m_paths.pop();
    room.m_paths.push([]);
    if (room.m_currentArtistID !== data.playerID) return;
    socket.to(roomID).emit("undoCanvasClient");
  });

  socket.on("updateCanvasList", (data) => {
    const roomID = data.roomID;
    const room = rooms[roomID];
    if (!room) return;

    room.m_paths.push([]);

    if (room.m_currentArtistID !== data.playerID) return;
    socket.to(roomID).emit("updateCanvasListClient");
  });

  socket.on("fillCanvasServer", (data) => {
    const roomID = data.roomID;
    const room = rooms[roomID];
    if (!room) return;
    room.m_paths[room.m_paths.length - 1].push(data.point);
    room.m_paths.push([]);
    if (room.m_currentArtistID !== data.playerID) return;
    socket.to(roomID).emit("fillCanvasClient", {point: data.point});
  });

  socket.on("clearCanvasServer", (data) => {
    const roomID = data.roomID;
    const room = rooms[roomID];
    if (!room) return;
    room.m_paths[room.m_paths.length - 1].push(data.point);
    room.m_paths.push([]);
    if (room.m_currentArtistID !== data.playerID) return;
    socket.to(roomID).emit("clearCanvasClient");
  });

  const messageHasWord = (i_message: string, i_word: string) => {
    const message = i_message.toLowerCase().split(".").join("").split("'").join("");
    const word = i_word.toLowerCase().split(".").join("").split("'").join("");
    return message.includes(word);
  }

  socket.on("updateMessages", (data) => {
    const defaultStartTime = 80;
    const guessDropTime = 30;
    const roomID = data.roomID;
    const room = rooms[roomID];
    if (!room) {
      console.log("room id null");
      return;
    }
    let messageStr = data.player.m_name + ": " + data.message;
    let color = "txplain";
    let backgroundColor = "bgplainv1";
    if (
      room.m_started &&
      messageHasWord(data.message.toLowerCase(), room.m_currentWord) &&
      !room.m_guessedTheWord[data.player.m_id] &&
      room.m_currentArtistID !== data.player.m_id &&
      room.m_drawTimeRemaining > 0
    ) {
      room.m_guessedTheWord[data.player.m_id] = true;
      messageStr = data.player.m_name + " guessed the word!";
      color = "txlightGreen";
      socket.to(roomID).emit("wordGuessed", {
        playerID: data.player.m_id,
        word: room.m_currentWord,
      });
      socket.emit("wordGuessed", {
        playerID: data.player.m_id,
        word: room.m_currentWord,
      });
      let numOfPeopleGuessed = 0;
      for (let id in room.m_guessedTheWord) {
        if (room.m_guessedTheWord[id]) {
          numOfPeopleGuessed++;
        }
      }
      room.awardScore(
        data.player.m_id,
        Math.max(
          200 *
            (room.m_drawTimeRemaining / defaultStartTime),
          0,
        ),
      );
      room.awardScore(
        room.m_currentArtistID,
        Math.max(400 * (room.m_drawTimeRemaining / defaultStartTime), 0),
      );
      sendScoreboard(room);
      if (numOfPeopleGuessed === 1 && room.m_drawTimeRemaining > 30) {
        room.setTimeRemaining(guessDropTime);
      }
      if (numOfPeopleGuessed === room.playerCount() - 1) {
        room.setTimeRemaining(0);
      }
      const timeRoomToSend = {
        m_id: room.m_id,
        m_drawTimeRemaining: room.m_drawTimeRemaining
      }
      socket.to(roomID).emit("updateTimeClient", { room: timeRoomToSend });
      socket.emit("updateTimeClient", { room: timeRoomToSend });
    } else {
      const backgroundColorChoices = {
        "bgplainv1": "bgplainv2",
        "bgplainv2": "bgplainv1",
      };
      backgroundColor =
        backgroundColorChoices[
          room.m_messages[room.m_messages.length - 1].m_backgroundColor
        ];
    }
    const brokenUpMessage = splitIntoLines(messageStr, 40);
    for (let i = 0; i < brokenUpMessage.length; i++) {
      const message = new Message(brokenUpMessage[i]);
      message.setColor(color);
      message.setBackgroundColor(backgroundColor);
      room.m_messages.push(message);
    }
    sendMessage(room);
  });

  socket.on("createGame", (data) => {
    const roomUniqueID = makeid(6);
    const room = new Room(roomUniqueID);
    rooms[roomUniqueID] = room;
    const player: Player = new Player(data.playerID, data.playerName);
    player.m_currentRoomId = roomUniqueID;
    players[socket.id] = player;
    room.addPlayer(player);
    room.m_currentArtistID = data.playerID;
    socket.join(roomUniqueID);
    socket.emit("newGame", { roomUniqueID: roomUniqueID });
    socket.to(roomUniqueID).emit("setupMessages", { playerID: data.playerID });
    socket.emit("setupMessages", { playerID: data.playerID });
    const message = new Message(data.playerName + " joined!");
    message.setColor("txlightGreen");
    room.m_messages.push(message);
    sendMessage(room);
    console.log(`player (${data.playerName}, ${data.playerID}) created room ${room.m_id}`)
  });

  socket.on("joinGame", (data) => {
    if (
      rooms[data.roomUniqueID] != null
    ) {
      if (rooms[data.roomUniqueID].containsPlayerName(data.playerName)) {
        socket.emit("invalidName", { playerID: data.playerID });
        return;
      }
      socket.join(data.roomUniqueID);
      const room = rooms[data.roomUniqueID];
      const playerToAdd = new Player(data.playerID, data.playerName);
      playerToAdd.m_currentRoomId = data.roomUniqueID;
      players[socket.id] = playerToAdd;
      room.addPlayer(playerToAdd);
      const playersConnectedRoomToSend = {
        m_id: room.m_id,
        m_players: room.m_players,
        m_started: room.m_started
      };
      socket.to(room.m_id).emit("playersConnected", { room: playersConnectedRoomToSend});
      socket.emit("playersConnected", { room: playersConnectedRoomToSend });
      // setup messages for player that joined, and send messages
      socket
        .to(data.roomUniqueID)
        .emit("setupMessages", { playerID: data.playerID });
      socket.emit("setupMessages", { playerID: data.playerID });
      room.loadCachedData(data.playerID);
      if (room.m_started) {
        let showGameAreaData: {[index: string]: any} = { 
          roomID: data.roomUniqueID, 
          allowSpellingPrediction: room.m_allowSpellingPrediction
        };
        if (room.m_allowSpellingPrediction) {
          showGameAreaData = {
            ...showGameAreaData,
            wordBank: room.m_wordBank
          }
        }        
        socket.emit("showGameArea", showGameAreaData);
        sendScoreboard(room);
        const timeRoomToSend = {
          m_id: room.m_id,
          m_drawTimeRemaining: room.m_drawTimeRemaining
        }
        socket.emit("updateTimeClient", { room: timeRoomToSend });
        const updateArtistRoomToSend = {
          m_id: room.m_id,
          m_currentArtistID: room.m_currentArtistID,
          m_roundsRemaining: room.m_roundsRemaining
        };
        const dataToSend = { room: updateArtistRoomToSend, word1: "", word2: "", word3: "" };
        socket.emit("updateArtistClient", dataToSend);
        const wordDisplayRoomToSend = {
          m_id: room.m_id,
          m_currentArtistID: room.m_currentArtistID,
          m_currentWord: room.m_currentWord,
          m_guessedTheWord: room.m_guessedTheWord,
          m_revealedLetters: room.m_revealedLetters
        }
        socket.emit("updateWordDisplay", { room: wordDisplayRoomToSend });
        socket.to(room.m_id).emit("drawPaths", {paths: room.m_paths, playerID: data.playerID});
        socket.emit("drawPaths", {paths: room.m_paths, playerID: data.playerID});
      }
      const message = new Message(data.playerName + " joined!");
      message.setColor("txlightGreen");
      room.m_messages.push(message);
      sendMessage(room);
      console.log(`player (${data.playerName}, ${data.playerID}) joined room ${room.m_id}`)
    } else {
      console.log("room id null");
      socket.emit("invalidRoomID", { playerID: data.playerID });
    }
  });

  const updateCanvasServer = (data) => {
    const room = rooms[data.roomID];
    if (!room) return;

    const roomID = data.roomID;

    const playerIsArtist = room.m_currentArtistID === data.playerID;

    if (playerIsArtist) {
      socket.to(roomID).emit("updateCanvasClient", {canvasURL: data.canvasURL});
    }
  };

  socket.on("sendLineSegment", (data : {roomID, playerID, path}) => {
    const room = rooms[data.roomID];
    if (!room) return;

    room.m_paths[room.m_paths.length - 1].push(data.path);

    const roomID = data.roomID;
    const playerIsArtist = room.m_currentArtistID === data.playerID;

    const dataToSend = { path: data.path };
    if (playerIsArtist) {
      socket.to(roomID).emit("sendLineSegmentClient", dataToSend);
    }
  });

  socket.on("updateCanvasServer", (data) => {
    updateCanvasServer(data);
  });

  socket.on("updateArtistServer", (data) => {
    const room = rooms[data.roomID];
    if (!room) {
      console.log("room id null");
      return;
    }
    room.m_currentArtistID = data.artistID;
    updateArtistClient(data.roomID);
  });
});

server.listen(3000, () => {
  console.log("listening on *:3000");
});

function makeid(length) {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
}

function addWordOntoLine(line, word) {
  if (line.length != 0) {
    line += " ";
  }
  return (line += word);
}

function splitIntoLines(input, len) {
  var i;
  var output = [];
  var lineSoFar = "";
  var temp;
  var words = input.split(" ");
  for (i = 0; i < words.length; ) {
    // check if adding this word would exceed the len
    temp = addWordOntoLine(lineSoFar, words[i]);
    if (temp.length > len) {
      if (lineSoFar.length == 0) {
        lineSoFar = temp; // force to put at least one word in each line
        i++; // skip past this word now
      }
      output.push(lineSoFar); // put line into output
      lineSoFar = ""; // init back to empty
    } else {
      lineSoFar = temp; // take the new word
      i++; // skip past this word now
    }
  }
  if (lineSoFar.length > 0) {
    output.push(lineSoFar);
  }
  return output;
}
