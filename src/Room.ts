import { Message } from "./Message";
import { Player } from "./Player";
import { wordsList2 } from "./Words";

export function getRandomInt(max: number) {
  return Math.floor(Math.random() * max);
}

export class Room {
  public m_id: string;
  public m_started: boolean;
  public m_players: { [index: string]: Player };
  public m_playerOrder: Array<string>;
  public m_messages: Array<Message>;
  public m_scores: { [index: string]: number };
  public m_currentArtistID: string;
  public m_currentWord: string;
  public m_potentialWords: Array<string>;
  public m_drawTimeRemaining: number;
  public m_guessedTheWord: { [index: string]: boolean };
  public m_currentlyDrawing = false;
  public m_artistQueueIndex: number;
  public m_roundsRemaining: number;
  public m_winnerID: string;
  public m_revealedLetters: Array<number>;
  public m_paths;

  public get ID() {
    return this.m_id;
  }

  constructor(i_id: string) {
    this.m_id = i_id;
    this.m_started = false;
    this.m_players = {};
    this.m_messages = [];
    this.m_scores = {};
    this.m_playerOrder = [];
    this.m_drawTimeRemaining = 80;
    this.m_guessedTheWord = {};
    this.m_artistQueueIndex = 0;
    this.m_roundsRemaining = 3;
    this.m_revealedLetters = [];
    this.m_potentialWords = [...wordsList2];
    this.m_paths = [[]];
  }

  public containsPlayerName(i_name : string) : boolean {
    for (let id in this.m_players) {
      const name = this.m_players[id].m_name;
      if (i_name === name) {
        return true;
      }
    }
    return false;
  }

  public resetGame() {
    for (let id in this.m_scores) {
      this.m_scores[id] = 0;
      this.m_guessedTheWord[id] = false;
    }
    this.randomizeArtistQueue();
    this.m_drawTimeRemaining = 80;
    this.m_artistQueueIndex = 0;
    this.m_roundsRemaining = 3;
    this.m_revealedLetters = [];
    this.m_winnerID = "";
    this.m_potentialWords = [...wordsList2];
  }

  /**
   * adds the given player to this room
   * @param i_player the player to add
   */
  public addPlayer(i_player: Player) {
    this.m_players[i_player.ID] = new Player(i_player.ID, i_player.Name);
    this.m_players[i_player.ID].m_currentRoomId = this.m_id;
    this.m_scores[i_player.ID] = 0;
    this.m_playerOrder.push(i_player.ID);
    this.m_guessedTheWord[i_player.ID] = false;
  }

  public removePlayer(i_playerID: string) {
    delete this.m_players[i_playerID];
    this.m_playerOrder.splice(this.m_playerOrder.indexOf(i_playerID), 1);
    if (this.m_artistQueueIndex >= this.m_playerOrder.length) {
      this.m_artistQueueIndex = this.m_playerOrder.length - 1;
    }
  }

  /**
   * awards points to the player with the specified ID.
   * @param i_playerID the id of the player to award points to
   * @param i_score the amount of points to award
   */
  public awardScore(i_playerID: string, i_score: number) {
    const scoreToAward = Math.floor(i_score);
    this.m_scores[i_playerID] += scoreToAward;
  }

  public getScore(i_playerID: string): number {
    return this.m_scores[i_playerID];
  }

  public setNewRandomWord() {
    this.m_currentWord = this.popRandomWord();
  }

  public setNewWord(i_newWord: string) {
    this.m_currentWord = i_newWord.toLowerCase();
  }

  public popRandomWord(): string {
    if (this.m_potentialWords.length <= 0) return "";
    const randIndex = getRandomInt(this.m_potentialWords.length);
    const result = this.m_potentialWords[randIndex];
    this.m_potentialWords.splice(randIndex, 1);
    return result;
  }

  public setTimeRemaining(i_timeRemaining: number) {
    this.m_drawTimeRemaining = Math.max(i_timeRemaining, 0);
    if (this.m_drawTimeRemaining <= 0) {
      this.stopDrawing();
    }
  }

  public stopDrawing() {
    this.m_currentlyDrawing = false;
  }

  public decrementTimeRemaining() {
    this.m_drawTimeRemaining--;
    this.m_drawTimeRemaining = Math.max(this.m_drawTimeRemaining, 0);
    if (this.m_drawTimeRemaining <= 0) {
      this.stopDrawing();
    }
  }

  public resetGuessedTracker() {
    for (let playerID in this.m_players) {
      this.m_guessedTheWord[playerID] = false;
    }
  }

  public startDrawingPhase() {
    this.m_currentlyDrawing = true;
    this.m_drawTimeRemaining = 80;
    this.m_paths = [[]];
    this.resetGuessedTracker();
  }

  public playerCount(): number {
    let result = 0;
    for (let id in this.m_players) {
      result++;
    }
    return result;
  }

  public updateCurrentArtist() {
    this.m_currentArtistID = this.m_playerOrder[this.m_artistQueueIndex];
  }

  public randomizeArtistQueue() {
    let allIDs = [];
    for (let id in this.m_players) {
      allIDs.push(id);
    }
    this.m_playerOrder = [];
    const numOfPlayers = this.playerCount();
    for (let i = 0; i < numOfPlayers; i++) {
      const randIndex = getRandomInt(allIDs.length);
      const id = allIDs[randIndex];
      allIDs.splice(randIndex, 1);
      this.m_playerOrder.push(id);
    }
  }

  public setNextArtist() {
    this.m_artistQueueIndex =
      (this.m_artistQueueIndex + 1) % this.playerCount();
    this.m_currentArtistID = this.m_playerOrder[this.m_artistQueueIndex];
    if (this.m_artistQueueIndex === 0) {
      this.m_roundsRemaining--;
    }
  }

  public setWinner() {
    let maxScore = 0;
    for (let id in this.m_scores) {
      if (this.m_scores[id] > maxScore) {
        maxScore = this.m_scores[id];
        this.m_winnerID = id;
      }
    }
  }

  public revealLetter() {
    let lettersToChooseFrom = [];
    for (let i = 0; i < this.m_currentWord.length; i++) {
      if (
        this.m_revealedLetters.indexOf(i) < 0 &&
        this.m_currentWord.charAt(i) !== " "
      ) {
        lettersToChooseFrom.push(i);
      }
    }
    const randIndex = getRandomInt(lettersToChooseFrom.length);
    this.m_revealedLetters.push(lettersToChooseFrom[randIndex]);
  }
}
