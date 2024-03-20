import { Message } from "../Message";
import { Player } from "../Player";
import io from "socket.io-client";
import { pokemonWords } from "../PokemonWords";

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

console.log("client.js executing");

const socket = io();
let player: Player = null;
let gameStarter = false;

export function createGame() {
  const playerID: string = makeid(6);
  const displayNameBox = document.getElementById("displayName");
  const displayName = displayNameBox.innerText.substring(0, 20);
  if (displayName === "") return;
  player = new Player(playerID, displayName);
  socket.emit("createGame", { playerID: playerID, playerName: displayName });
}

export function setDisplayName() {
  const displayNameBox = document.getElementById(
    "displayNameEntry",
  ) as HTMLInputElement;
  const displayName = displayNameBox.value;
  const displayNameInitial = document.getElementById("displayNameInitial");
  displayNameInitial.style.display = "none";
  const initial = document.getElementById("initial");
  initial.style.display = "block";
  const displayNameDisplay = document.getElementById("displayName");
  displayNameDisplay.innerText = displayName.substring(0, 20);
}

export function updateArtist() {
  socket.emit("updateArtistServer", {
    roomID: player.m_currentRoomId,
    artistID: player.m_id,
  });
}

let isPainting = false;
let isCurrentArtist = false;

export function getIsCurrentArtist() {
  return isCurrentArtist;
}

export function word1StartDrawing() {
  isCurrentArtist = true;
  const word1Button = document.getElementById("word1");
  const word = word1Button.innerHTML;
  word1Button.style.display = "none";
  document.getElementById("word2").style.display = "none";
  document.getElementById("word3").style.display = "none";
  const dataToSend = { roomID: player.m_currentRoomId, word: 0 };
  socket.emit("startDrawingServer", dataToSend);
}

export function word2StartDrawing() {
  isCurrentArtist = true;
  const word2Button = document.getElementById("word2");
  const word = word2Button.innerHTML;
  word2Button.style.display = "none";
  document.getElementById("word1").style.display = "none";
  document.getElementById("word3").style.display = "none";
  const dataToSend = { roomID: player.m_currentRoomId, word: 1 };
  socket.emit("startDrawingServer", dataToSend);
}

export function word3StartDrawing() {
  isCurrentArtist = true;
  const word3Button = document.getElementById("word3");
  const word = word3Button.innerHTML;
  word3Button.style.display = "none";
  document.getElementById("word1").style.display = "none";
  document.getElementById("word2").style.display = "none";
  const dataToSend = { roomID: player.m_currentRoomId, word: 2 };
  socket.emit("startDrawingServer", dataToSend);
}

export function detectMob() {
  const toMatch = [
    /Android/i,
    /webOS/i,
    /iPhone/i,
    /iPad/i,
    /iPod/i,
    /BlackBerry/i,
    /Windows Phone/i,
  ];

  return toMatch.some((toMatchItem) => {
    return navigator.userAgent.match(toMatchItem);
  });
}

export function disableScroll(e) {
  if (detectMob()) {
    e.preventDefault();
    e.stopPropagation();
  }
}

function getColorAtPixel(imageData, x, y) {
  const { width, data } = imageData;

  return {
    r: data[4 * (width * y + x) + 0],
    g: data[4 * (width * y + x) + 1],
    b: data[4 * (width * y + x) + 2],
    a: data[4 * (width * y + x) + 3],
  };
}

function setColorAtPixel(imageData, color, x, y) {
  const { width, data } = imageData;

  data[4 * (width * y + x) + 0] = color.r & 0xff;
  data[4 * (width * y + x) + 1] = color.g & 0xff;
  data[4 * (width * y + x) + 2] = color.b & 0xff;
  data[4 * (width * y + x) + 3] = color.a & 0xff;
}

function colorMatch(a, b) {
  return a.r === b.r && a.g === b.g && a.b === b.b && a.a === b.a;
}

function floodFill(imageData, newColor, x, y) {
  const { width, height, data } = imageData;
  const stack = [];
  const baseColor = getColorAtPixel(imageData, x, y);
  let operator = { x, y };

  // Check if base color and new color are the same
  if (colorMatch(baseColor, newColor)) {
    return;
  }

  // Add the clicked location to stack
  stack.push({ x: operator.x, y: operator.y });

  while (stack.length) {
    operator = stack.pop();
    let contiguousDown = true; // Vertical is assumed to be true
    let contiguousUp = true; // Vertical is assumed to be true
    let contiguousLeft = false;
    let contiguousRight = false;

    // Move to top most contiguousDown pixel
    while (contiguousUp && operator.y >= 0) {
      operator.y--;
      contiguousUp = colorMatch(
        getColorAtPixel(imageData, operator.x, operator.y),
        baseColor,
      );
    }

    // Move downward
    while (contiguousDown && operator.y < height) {
      setColorAtPixel(imageData, newColor, operator.x, operator.y);

      // Check left
      if (
        operator.x - 1 >= 0 &&
        colorMatch(
          getColorAtPixel(imageData, operator.x - 1, operator.y),
          baseColor,
        )
      ) {
        if (!contiguousLeft) {
          contiguousLeft = true;
          stack.push({ x: operator.x - 1, y: operator.y });
        }
      } else {
        contiguousLeft = false;
      }

      // Check right
      if (
        operator.x + 1 < width &&
        colorMatch(
          getColorAtPixel(imageData, operator.x + 1, operator.y),
          baseColor,
        )
      ) {
        if (!contiguousRight) {
          stack.push({ x: operator.x + 1, y: operator.y });
          contiguousRight = true;
        }
      } else {
        contiguousRight = false;
      }

      operator.y++;
      contiguousDown = colorMatch(
        getColorAtPixel(imageData, operator.x, operator.y),
        baseColor,
      );
    }
  }
}

const hex2rgb = (hex) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  // return {r, g, b}
  return { r: r, g: g, b: b, a: 255 };
};

const setFillButton = () => {
  const fillButton = document.getElementById("fill");
  if (fill) {
    fill = false;
    fillButton.innerHTML = "Fill";
  } else {
    fill = true;
    fillButton.innerHTML = "Line";
  }
};

const setDrawingBoardTool = () => {
  const drawingBoard = document.getElementById("drawing-board-container");
  if (fill) {
    drawingBoard.classList.remove("line");
    drawingBoard.classList.add("fill");
  } else {
    drawingBoard.classList.remove("fill");
    drawingBoard.classList.add("line");
  }
};

let darkMode = 0;

export function getAllThemedElements() {
  const result = [];

  const page = document.getElementById("page");
  const messages = document.getElementsByClassName("message");
  const textInputs = document.querySelectorAll("input[type=text]");
  const numberInputs = document.querySelectorAll("input[type=number]");
  const buttonInputs = document.querySelectorAll("button");
  const selectors = document.querySelectorAll("select");

  result.push(page);
  for (let i = 0; i < messages.length; i++) {
    result.push(messages[i]);
  }
  for (let i = 0; i < textInputs.length; i++) {
    result.push(textInputs[i]);
  }
  for (let i = 0; i < buttonInputs.length; i++) {
    result.push(buttonInputs[i]);
  }
  for (let i = 0; i < numberInputs.length; i++) {
    result.push(numberInputs[i]);
  }
  for (let i = 0; i < selectors.length; i++) {
    result.push(selectors[i]);
  }

  return result;
}

export function setupTheme() {
  const storageDarkMode = localStorage.getItem("darkMode");
  if (typeof storageDarkMode !== "undefined") {
    darkMode = parseInt(storageDarkMode);
  } else {
    darkMode = 0;
  }
  localStorage.setItem("darkMode", darkMode.toString());
  
  const changeThemeButton = document.getElementById("changeTheme") as HTMLButtonElement;
  const setChangeThemeButton = () => {
    if (darkMode) {
      changeThemeButton.innerHTML = "Light Mode";
      const allThemedElements = getAllThemedElements();
      for (let i = 0; i < allThemedElements.length; i++) {
        allThemedElements[i].classList.add("dark");
        allThemedElements[i].classList.add("transition");
      }
    } else {
      changeThemeButton.innerHTML = "Dark Mode";
      const allThemedElements = getAllThemedElements();
      for (let i = 0; i < allThemedElements.length; i++) {
        allThemedElements[i].classList.remove("dark");
        allThemedElements[i].classList.add("transition");
      }
    }
  }
  setChangeThemeButton();
  changeThemeButton.onclick = () => {
    if (darkMode === 1) {
      darkMode = 0;
    } else {
      darkMode = 1;
    }
    localStorage.setItem("darkMode", darkMode.toString());
    setChangeThemeButton();
  };
}

const rgb2hex = (rgb) => `#${rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/).slice(1).map(n => parseInt(n, 10).toString(16).padStart(2, '0')).join('')}`

export function setSwatch(e) {
  const active = document.getElementsByClassName('active')[0];
  if (active) {
      active.classList.remove("active");
  }
  const swatch = e.target;
  swatch.classList.add("active");
  const stroke = document.getElementById("stroke") as HTMLInputElement;
  stroke.value = rgb2hex(swatch.style.backgroundColor);
}

export function deselectSwatch(e) {
  const active = document.getElementsByClassName('active')[0];
  if (active) {
      active.classList.remove("active");
  }
}

let fill = false;
let canvasUrls = [];

let lastX = 0;
let lastY = 0;

let autoJoinFunc = () => {}

let autoJoin = false;

socket.on("connect", () => {
  if (player != null && player.m_currentRoomId != null) {
    joinGameWithCode(player.m_currentRoomId);
    return;
  }

  // get path from current URL
  if (!window.location.pathname.startsWith("/join=")) return;
  let room = window.location.pathname.slice(6);   // remove leading /join/
  autoJoinFunc = () => {
    joinGameWithCode(room);
  }
  autoJoin = true;
});

window.onload = function () {
  // code goes here
  
  setupTheme();

  const textInputs = document.querySelectorAll("input[type=text]");
  for (let i = 0; i < textInputs.length; i++) {
    textInputs[i].addEventListener("touchstart", (e) => {
      e.preventDefault();
      e.stopPropagation();
      (textInputs[i] as HTMLInputElement).focus({preventScroll: true});
    });
  }

  let swatches = document.getElementsByClassName('swatch');
  for (let i = 0; i < swatches.length; i++) {
    swatches[i].addEventListener('click', setSwatch);
  }

  const stroke = document.getElementById("stroke") as HTMLInputElement;
  stroke.onchange = deselectSwatch;

  const word1Button = document.getElementById("word1") as HTMLButtonElement;
  word1Button.onclick = word1StartDrawing;

  const word2Button = document.getElementById("word2") as HTMLButtonElement;
  word2Button.onclick = word2StartDrawing;

  const word3Button = document.getElementById("word3") as HTMLButtonElement;
  word3Button.onclick = word3StartDrawing;

  const createGameButton: HTMLButtonElement = document.getElementById(
    "createGameButton",
  ) as HTMLButtonElement;
  createGameButton.onclick = createGame;

  const joinGameButton: HTMLButtonElement = document.getElementById(
    "joinGameButton",
  ) as HTMLButtonElement;
  joinGameButton.onclick = joinGame;

  const roomUniqueID = document.getElementById(
    "roomUniqueID",
  ) as HTMLInputElement;
  roomUniqueID.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      joinGame();
    }
  });

  const displayNameButton = document.getElementById(
    "displayNameButton",
  ) as HTMLButtonElement;
  
  let displayNameFunc = () => {
    setDisplayName();
    autoJoinFunc();
  };

  displayNameButton.onclick = displayNameFunc;
  const displayNameEntry = document.getElementById(
    "displayNameEntry",
  ) as HTMLInputElement;
  displayNameEntry.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      displayNameFunc();
    }
  });

  const canvas = document.getElementById("drawing-board") as HTMLCanvasElement;
  canvas.width = 400;
  canvas.height = 300;
  const ctx = canvas.getContext("2d");

  ctx.lineWidth = parseInt(
    (document.getElementById("lineWidth") as HTMLInputElement).value,
  );
  ctx.lineCap = "round";
  ctx.strokeStyle = (
    document.getElementById("stroke") as HTMLInputElement
  ).value;

  const fillButton = document.getElementById("fill");
  fillButton.onclick = () => {
    setFillButton();
    setDrawingBoardTool();
  };

  const cursorBrush = document.getElementById("cursor-brush");
  const moveCursorBrush = (e) => {
    let clientX = e.clientX;
    let clientY = e.clientY;
    const lineWidth = parseInt(
      (document.getElementById("lineWidth") as HTMLInputElement).value,
    );
    const strokeStyle = (document.getElementById("stroke") as HTMLInputElement)
      .value;
    let x = clientX - lineWidth / 2 - 1;
    let y = clientY - lineWidth / 2 - 1;
    cursorBrush.style.width = `${lineWidth}px`;
    cursorBrush.style.height = `${lineWidth}px`;
    const col = hex2rgb(strokeStyle);
    cursorBrush.style.backgroundColor = `rgba(${col.r}, ${col.g}, ${col.b}, 0.5)`;
    cursorBrush.style.top = `${y}px`;
    cursorBrush.style.left = `${x}px`;
  };

  const removeCursorBrush = () => {
    cursorBrush.style.display = "none";
    cursorBrush.style.width = "0px";
    cursorBrush.style.height = "0px";
  };

  window.addEventListener("scroll", moveCursorBrush);

  canvas.addEventListener("mousemove", moveCursorBrush);
  canvas.addEventListener("mouseenter", (e) => {
    const toolbar = document.getElementById("toolbar");
    if (detectMob() || fill || toolbar.style.display === "none") {
      removeCursorBrush();
      return;
    } else {
      cursorBrush.style.display = "block";
      moveCursorBrush(e);
    }
  });

  canvas.addEventListener("mouseleave", (e) => {
    removeCursorBrush();
  });

  const sendLineSegment = (path) => {
    socket.emit("sendLineSegment", {
      path: path,
      roomID: player.m_currentRoomId,
      playerID: player.m_id,
    });
  };

  const undoCanvas = () => {
    undoCanvasClient();
  };

  const undoButton = document.getElementById("undo") as HTMLButtonElement;
  undoButton.onclick = undoCanvas;

  const updateCanvasList = () => {
    canvasUrls.push(canvas.toDataURL());
    socket.emit("updateCanvasList", {roomID: player.m_currentRoomId, playerID: player.m_id});
  };

  const clearButton = document.getElementById("clear") as HTMLButtonElement;
  const clearCanvas = () => {
    if (!getIsCurrentArtist()) return;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    canvasUrls.push(canvas.toDataURL());
    const point = {clear: true}
    socket.emit("clearCanvasServer", {roomID: player.m_currentRoomId, playerID: player.m_id, point: point});
  };
  clearButton.onclick = clearCanvas;

  const down = (e) => {
    if (!getIsCurrentArtist()) return;
    disableScroll(e);
    if (!fill) {
      isPainting = true;
    }
    let clientX = e.clientX;
    let clientY = e.clientY;
    if (detectMob()) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    }
    ctx.lineWidth = parseInt(
      (document.getElementById("lineWidth") as HTMLInputElement).value,
    );
    ctx.lineCap = "round";
    ctx.strokeStyle = (
      document.getElementById("stroke") as HTMLInputElement
    ).value;
    const canvas = document.getElementById(
      "drawing-board",
    ) as HTMLCanvasElement;
    if (fill) {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const col = hex2rgb(ctx.strokeStyle);
      const x = Math.round(clientX - canvas.offsetLeft + window.scrollX);
      const y = Math.round(clientY - canvas.offsetTop + window.scrollY);
      floodFill(imageData, col, x, y);
      ctx.putImageData(imageData, 0, 0);
      const point = {
        x: x,
        y: y,
        strokeStyle: ctx.strokeStyle,
        fill: true
      }
      canvasUrls.push(canvas.toDataURL());
      socket.emit("fillCanvasServer", {roomID: player.m_currentRoomId, playerID: player.m_id, point});
    } else {
      const x = clientX - canvas.offsetLeft + window.scrollX;
      const y = clientY - canvas.offsetTop + window.scrollY;
      lastX = x;
      lastY = y;
      ctx.beginPath();
      ctx.moveTo(x, y);
      if (detectMob()) {
        ctx.fillStyle = ctx.strokeStyle;
        ctx.arc(x, y, ctx.lineWidth / 2, 0, 2 * Math.PI, true);
        ctx.fill();
        ctx.beginPath();
        ctx.lineTo(x, y);
        ctx.stroke();
      } else {
        ctx.lineTo(
          x,
          y,
        );
        ctx.stroke();
        const path = {
          x1: x,
          y1: y,
          x2: x,
          y2: y,
          lineCap: ctx.lineCap,
          lineWidth: ctx.lineWidth,
          strokeStyle: ctx.strokeStyle
        }
        sendLineSegment(path);
      }
      
    }
  };

  if (detectMob()) {
    canvas.addEventListener("touchstart", down);
  } else {
    canvas.addEventListener("mousedown", down);
  }

  const up = (e) => {
    if (!getIsCurrentArtist()) return;
    if (!isPainting) return;
    disableScroll(e);
    isPainting = false;
    ctx.stroke();
    ctx.beginPath();
    if (!fill) {
      const path = {
        x1: lastX,
        y1: lastY,
        x2: lastX,
        y2: lastY,
        lineCap: ctx.lineCap,
        lineWidth: ctx.lineWidth,
        strokeStyle: ctx.strokeStyle
      }
      sendLineSegment(path);
      updateCanvasList();
    }
  };

  if (detectMob()) {
    canvas.addEventListener("touchend", up);
    canvas.addEventListener("touchcancel", up);
  } else {
    canvas.addEventListener("mouseup", up);
    window.addEventListener("mouseup", up);
  }

  const draw = (e) => {
    if (!getIsCurrentArtist()) return;
    disableScroll(e);
    if (!isPainting) {
      return;
    }
    let clientX = e.clientX;
    let clientY = e.clientY;
    if (detectMob()) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    }
    ctx.lineWidth = parseInt(
      (document.getElementById("lineWidth") as HTMLInputElement).value,
    );
    ctx.lineCap = "round";
    ctx.strokeStyle = (
      document.getElementById("stroke") as HTMLInputElement
    ).value;
    const canvas = document.getElementById(
      "drawing-board",
    ) as HTMLCanvasElement;
    const x = clientX - canvas.offsetLeft + window.scrollX;
    const y = clientY - canvas.offsetTop + window.scrollY;
    ctx.lineTo(
      x,
      y,
    );
    ctx.stroke();
    const path = {
      x1: lastX,
      y1: lastY,
      x2: x,
      y2: y,
      lineCap: ctx.lineCap,
      lineWidth: ctx.lineWidth,
      strokeStyle: ctx.strokeStyle
    }
    lastX = x;
    lastY = y;
    sendLineSegment(path);
  };

  if (detectMob()) {
    canvas.addEventListener("touchmove", draw);
  } else {
    canvas.addEventListener("mousemove", draw);
  }
};

export function joinGameWithCode(roomUniqueID: string) {
  let idToSet = makeid(6);
  if (player != null && player.m_id != null) {
    idToSet = player.m_id;
  }
  const playerID: string = idToSet;
  const displayNameDisplay = document.getElementById("displayName");
  const displayName = displayNameDisplay.innerText;
  if (displayName === "") return;
  player = new Player(playerID, displayName);
  const data = {
    roomUniqueID: roomUniqueID,
    playerID: playerID,
    playerName: displayName,
  };
  socket.emit("joinGame", data);
}

export function joinGame() {
  const roomUniqueID = (
    document.getElementById("roomUniqueID") as HTMLInputElement
  ).value;
  joinGameWithCode(roomUniqueID);
}

export function startGame() {
  const mode = (document.getElementById("modeSelector") as HTMLSelectElement).value;
  if (mode === "pokemonSettings") {
    startGamePokemon();
  } else if (mode === "customSettings") {

  } else {
    socket.emit("startGame", {
      roomID: player.m_currentRoomId,
    });
  }
}

export function startGamePokemon() {
  const genCheckboxes = document.getElementById("genCheckboxes");
  const includedGens = [];
  for (let i = 0; i < genCheckboxes.children.length; i++) {
    const div = genCheckboxes.children[i];
    const checkbox = div.children[0] as HTMLInputElement;
    if (checkbox.checked) {
      includedGens.push(i);
    }
  }
  socket.emit("startGamePokemon", {
    roomID: player.m_currentRoomId,
    includedGens: includedGens
  });
}

export function unsecuredCopyToClipboard(text) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    document.execCommand('copy');
  } catch (err) {
    console.error('Unable to copy to clipboard', err);
  }
  document.body.removeChild(textArea);
}

socket.on("clearCanvasClient", () => {
  const canvas = document.getElementById('drawing-board') as HTMLCanvasElement;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  canvasUrls.push(canvas.toDataURL());
});

socket.on("updateCanvasListClient", () => {
  const canvas = document.getElementById("drawing-board") as HTMLCanvasElement;
  const ctx = canvas.getContext('2d');
  ctx.beginPath();
  canvasUrls.push(canvas.toDataURL());
});

socket.on("sendLineSegmentClient", (data : {path}) => {
  const canvas = document.getElementById('drawing-board') as HTMLCanvasElement;
  const ctx = canvas.getContext('2d');
  const path = data.path;

  ctx.lineCap = path.lineCap;
  ctx.lineWidth = path.lineWidth;
  ctx.strokeStyle = path.strokeStyle;

  // draw path
  ctx.moveTo(path.x1,path.y1);
  if (path.x1 === path.x2 && path.y1 === path.y2 && detectMob()) {
    ctx.fillStyle = ctx.strokeStyle;
    ctx.arc(path.x1, path.y1, ctx.lineWidth / 2, 0, 2 * Math.PI, true);
    ctx.fill();
    ctx.beginPath();
    ctx.lineTo(path.x2,path.y2);
    ctx.stroke();
  } else {
    ctx.lineTo(path.x2,path.y2);
    ctx.stroke();
  }
});

socket.on("drawPaths", (data : {paths, playerID}) => {
  if (data.playerID !== player.m_id) {
    return;
  }
  const canvas = document.getElementById('drawing-board') as HTMLCanvasElement;
  const ctx = canvas.getContext('2d');
  const paths = data.paths;
  paths.pop();
  ctx.beginPath();
  paths.forEach((points) => {
    points.forEach((path) => {
      if (path.clear) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else if (path.fill) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const col = hex2rgb(path.strokeStyle);
        const x = path.x;
        const y = path.y;
        floodFill(imageData, col, x, y);
        ctx.putImageData(imageData, 0, 0);
      } else {
        ctx.lineCap = path.lineCap;
        ctx.lineWidth = path.lineWidth;
        ctx.strokeStyle = path.strokeStyle;
      
        // draw path
        ctx.moveTo(path.x1,path.y1);
        if (path.x1 === path.x2 && path.y1 === path.y2 && detectMob()) {
          ctx.fillStyle = ctx.strokeStyle;
          ctx.arc(path.x1, path.y1, ctx.lineWidth / 2, 0, 2 * Math.PI, true);
          ctx.fill();
          ctx.beginPath();
          ctx.lineTo(path.x2,path.y2);
          ctx.stroke();
        } else {
          ctx.lineTo(path.x2,path.y2);
          ctx.stroke();
        }
      }
    });
    ctx.beginPath();
    canvasUrls.push(canvas.toDataURL());
  });
});

socket.on("invalidRoomID", (data) => {
  if (data.playerID !== player.m_id) return;
  const invalidWarning = document.getElementById("invalid-warning");
  invalidWarning.style.display = "block";
  invalidWarning.innerHTML = "Invalid room ID";
});

socket.on("invalidName", (data) => {
  if (data.playerID !== player.m_id) return;
  const invalidWarning = document.getElementById("invalid-warning");
  invalidWarning.style.display = "block";
  invalidWarning.innerHTML = "Invalid name: someone in the room already has that display name";
});

export function onModeSelection(e) {
  const mode = e.target.value;
  for (let div of e.target.children) {
    let displayStyle = "none";
    if (div.value === mode) {
      displayStyle = "block";
    }
    document.getElementById(div.value).style.display = displayStyle;
  }
}

socket.on("newGame", (data) => {
  gameStarter = true;
  const roomUniqueID = data.roomUniqueID;
  player.setCurrentRoomId(roomUniqueID);
  document.getElementById("initial").style.display = "none";
  document.getElementById("gamePlay").style.display = "block";
  let copyButton = document.getElementById("copyButton");
  copyButton.style.display = 'block';
  copyButton.addEventListener("click", () => {
    const copyText = window.location.protocol + "//" + window.location.hostname + ":" + window.location.port + "/join=" + roomUniqueID;
    try {
      navigator.clipboard.writeText(copyText).then(
        function () {
          console.log("Async: copying to clipboard was successful");
        },
        function (err) {
          console.error("Async: could not copy text: ", err);
        },
      );
    } catch (err) {
      unsecuredCopyToClipboard(copyText);
    }
  });
  const code = document.getElementById("code");
  code.innerText = `${roomUniqueID}`;
  const waitingArea = document.getElementById("waitingArea");
  waitingArea.style.display = "block";

  const startGameButton = document.getElementById(
    "startButton",
  ) as HTMLButtonElement;
  startGameButton.onclick = startGame;
  
  const settingsArea = document.getElementById("settingsArea");
  settingsArea.style.display = "block";

  document.getElementById("modeSelector").addEventListener("change", onModeSelection);
  const genCheckboxes = document.getElementById("genCheckboxes");
  for (let i = 0; i < Object.keys(pokemonWords).length; i++) {
    const containerDiv = document.createElement("div");
    const strLabel = `Gen ${i + 1}`;
    const label = document.createElement("label");
    label.setAttribute("for", strLabel);
    label.innerText = strLabel;
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = true;
    checkbox.id = strLabel;
    containerDiv.appendChild(checkbox);
    containerDiv.appendChild(label);
    containerDiv.appendChild(document.createElement("br"));
    genCheckboxes.appendChild(containerDiv);
  }
});

socket.on("playersConnected", (data) => {
  document.getElementById("initial").style.display = "none";
  document.getElementById("gamePlay").style.display = "block";
  if (!data.room.m_started) {
    document.getElementById("waitingArea").style.display = "block";
  }
  player.m_currentRoomId = data.room.m_id;
  const players = data.room.m_players;
  let numOfPlayers = 0;
  for (let playerID in players) {
    numOfPlayers++;
  }

  if (data.room.m_started) return;

  if (!gameStarter) {
    const codeMessage = document.getElementById("codeMessage");
    codeMessage.innerHTML = "Waiting to start: ";
  }

  if (numOfPlayers > 1 && gameStarter) {
    const startButton = document.getElementById("startButton");
    startButton.style.display = "block";
  } else if (gameStarter) {
    const startButton = document.getElementById("startButton");
    startButton.style.display = "none";
  }
});

socket.on("showGameArea", (data) => {
  if (data.roomID !== player.m_currentRoomId) return;
  document.getElementById("waitingArea").style.display = "none";
  document.getElementById("gameArea").style.display = "block";
  document.getElementById("overlay").style.display = "none";
  document.getElementById("playAgain").style.display = "none";
  document.getElementById("end-word-overlay").innerHTML = "";
  document
    .getElementById("game-area-container")
    .appendChild(document.getElementById("game-chat-area"));
  const chatbox = document.getElementById("chatbox");
  chatbox.scrollTop = chatbox.scrollHeight - chatbox.clientHeight;
  document.getElementById("welcome").style.textAlign = "left";
  document.getElementById("startedRoomIDHeader").style.display = "block";
  document.getElementById("startedRoomID").innerText = player.m_currentRoomId;
});

socket.on("setupMessages", (data) => {
  if (data.playerID !== player.m_id) return;
  const messageField: HTMLInputElement = document.getElementById(
    "message",
  ) as HTMLInputElement;
  messageField.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      updateMessages();
    }
  });
  const sendButton: HTMLButtonElement = document.getElementById(
    "sendMessageButton",
  ) as HTMLButtonElement;
  sendButton.onclick = updateMessages;
});

export function updateMessages() {
  const messageField: HTMLInputElement = document.getElementById(
    "message",
  ) as HTMLInputElement;
  const message = messageField.value.substring(0, 200);
  if (message === "") return;
  const roomID = player.m_currentRoomId;
  socket.emit("updateMessages", {
    player: player,
    message: message,
    roomID: roomID,
  });
  messageField.value = "";
}

socket.on("sendMessage", (data) => {
  if (data.room.m_id !== player.m_currentRoomId) return;
  const messages: Array<Message> = data.room.m_messages;
  const chatbox = document.getElementById("chatbox");
  const isScrolledToBottom = chatbox.scrollHeight - chatbox.clientHeight <= chatbox.scrollTop + 1;
  chatbox.innerHTML = "";
  const maxMessageCount = 24;
  const startVal = Math.max(messages.length - maxMessageCount, 0);
  for (let i = startVal; i < messages.length; i++) {
    const messageToAdd = document.createElement("div");
    messageToAdd.classList.add("message");
    messageToAdd.innerText = messages[i].m_message;
    messageToAdd.classList.add(messages[i].m_color);
    messageToAdd.classList.add(messages[i].m_backgroundColor);
    if (darkMode) {
      messageToAdd.classList.add("dark");
    }
    messageToAdd.style.textOverflow = "clip";
    chatbox.appendChild(messageToAdd);
  }
  if (isScrolledToBottom) {
    chatbox.scrollTop = chatbox.scrollHeight - chatbox.clientHeight;
  }
});

socket.on("undoCanvasClient", () => {
  const currentCanvas = document.getElementById(
    "drawing-board",
  ) as HTMLCanvasElement;
  const ctx = currentCanvas.getContext("2d");

  canvasUrls.pop();
  if (canvasUrls.length > 0) {
    const img = new Image();
    img.src = canvasUrls[canvasUrls.length - 1];
    const start = () => {
      ctx.drawImage(img, 0, 0);
    };
    img.onload = start;
  } else {
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, currentCanvas.width, currentCanvas.height);
  }
});

export function undoCanvasClient() {
  const currentCanvas = document.getElementById(
    "drawing-board",
  ) as HTMLCanvasElement;
  const ctx = currentCanvas.getContext("2d");

  canvasUrls.pop();
  if (canvasUrls.length > 0) {
    const img = new Image();
    img.src = canvasUrls[canvasUrls.length - 1];
    const start = () => {
      ctx.drawImage(img, 0, 0);
    };
    img.onload = start;
  } else {
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, currentCanvas.width, currentCanvas.height);
  }
  socket.emit("undoCanvasServer", ({roomID: player.m_currentRoomId, playerID: player.m_id}));
}

socket.on("fillCanvasClient", (data) => {
  const canvas = document.getElementById(
    "drawing-board",
  ) as HTMLCanvasElement;
  const ctx = canvas.getContext("2d");
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const col = hex2rgb(data.point.strokeStyle);
  const x = data.point.x;
  const y = data.point.y;
  floodFill(imageData, col, x, y);
  ctx.putImageData(imageData, 0, 0);
  canvasUrls.push(canvas.toDataURL());
});

socket.on("updateCanvasClient", (data) => {
  const img = new Image();
  img.src = data.canvasURL;
  function start() {
    const currentCanvas = document.getElementById(
      "drawing-board",
    ) as HTMLCanvasElement;
    const ctx = currentCanvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
  }
  img.onload = start;
});

socket.on("updateArtistClient", (data) => {
  if (data.room.m_id !== player.m_currentRoomId) return;
  const artistID = data.room.m_currentArtistID;
  const defaultRoundCount = 3;
  const currentCanvas = document.getElementById(
    "drawing-board",
  ) as HTMLCanvasElement;
  const ctx = currentCanvas.getContext("2d");
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, currentCanvas.width, currentCanvas.height);
  isCurrentArtist = false;
  document.getElementById("current-word").innerHTML = "";
  document.getElementById("overlay").style.display = "none";
  document.getElementById("current-round").innerHTML = `${
    defaultRoundCount + 1 - data.room.m_roundsRemaining
  } of ${defaultRoundCount}`;
  if (artistID === player.m_id) {
    document.getElementById("toolbar").style.display = "block";
    //document.getElementById('message-sending-area').style.display = 'none';
    const word1 = document.getElementById("word1") as HTMLButtonElement;
    const word2 = document.getElementById("word2") as HTMLButtonElement;
    const word3 = document.getElementById("word3") as HTMLButtonElement;
    word1.style.display = "block";
    word2.style.display = "block";
    word3.style.display = "block";
    word1.innerHTML = data.word1;
    word2.innerHTML = data.word2;
    word3.innerHTML = data.word3;
    document.getElementById("time-remaining").innerHTML = "Choose word: ";
    setDrawingBoardTool();
  } else {
    document.getElementById("time-remaining").innerHTML = "Waiting to start";
    document.getElementById("toolbar").style.display = "none";
    document.getElementById("message-sending-area").style.display = "block";
    document.getElementById("drawing-board-container").classList.remove("line");
    document.getElementById("drawing-board-container").classList.remove("fill");
    const word1 = document.getElementById("word1") as HTMLButtonElement;
    const word2 = document.getElementById("word2") as HTMLButtonElement;
    const word3 = document.getElementById("word3") as HTMLButtonElement;
    word1.style.display = "none";
    word2.style.display = "none";
    word3.style.display = "none";
  }
});

function isLetter(str) {
  return str.length === 1 && str.match(/[a-z]/i);
}

socket.on("updateCurrentWord", (data) => {
  if (data.room.m_id !== player.m_currentRoomId) return;
  const artistID = data.room.m_currentArtistID;
  if (artistID === player.m_id) {
    document.getElementById("toolbar").style.display = "block";
    document.getElementById("current-word").innerHTML = data.room.m_currentWord;
  } else {
    document.getElementById("toolbar").style.display = "none";
    document.getElementById("message-sending-area").style.display = "block";
    let currentWordBlank = "";
    for (let i = 0; i < data.room.m_currentWord.length; i++) {
      if (data.room.m_currentWord.charAt(i) === " ") {
        currentWordBlank += "&nbsp;&nbsp;&nbsp;&nbsp;";
      } else if (isLetter(data.room.m_currentWord.charAt(i))) {
        currentWordBlank += "_ ";
      } else {
        currentWordBlank += `${data.room.m_currentWord.charAt(i)} `;
      }
    }
    document.getElementById("current-word").innerHTML = currentWordBlank;
  }
});

socket.on("updateWordDisplay", (data) => {
  if (data.room.m_id !== player.m_currentRoomId) return;
  const artistID = data.room.m_currentArtistID;
  if (artistID !== player.m_id && !data.room.m_guessedTheWord[player.m_id]) {
    let currentWordBlank = "";
    for (let i = 0; i < data.room.m_currentWord.length; i++) {
      if (data.room.m_currentWord.charAt(i) === " ") {
        currentWordBlank += "&nbsp;&nbsp;&nbsp;&nbsp;";
      } else if (data.room.m_revealedLetters.indexOf(i) > -1) {
        currentWordBlank += `${data.room.m_currentWord.charAt(i)} `;
      } else if (isLetter(data.room.m_currentWord.charAt(i))) {
        currentWordBlank += "_ ";
      } else {
        currentWordBlank += `${data.room.m_currentWord.charAt(i)} `;
      }
    }
    document.getElementById("current-word").innerHTML = currentWordBlank;
  }
});

socket.on("wordGuessed", (data) => {
  if (data.playerID !== player.m_id) return;
  let currentWord = "";
  for (let i = 0; i < data.word.length; i++) {
    if (data.word.charAt(i) === " ") {
      currentWord += "&nbsp;&nbsp;&nbsp;&nbsp;";
    } else {
      currentWord += data.word.charAt(i) + " ";
    }
  }
  document.getElementById("current-word").innerHTML = currentWord;
});

socket.on("updateScoreboardClient", (data) => {
  if (data.room.m_id !== player.m_currentRoomId) return;
  const scoreboard = document.getElementById("scoreboard");
  scoreboard.innerHTML = "";
  for (let playerID in data.room.m_players) {
    const scoreboardStr =
      data.room.m_players[playerID].m_name +
      ": " +
      data.room.m_scores[playerID];
    const elem = document.createElement("div");
    elem.innerText = scoreboardStr;
    elem.classList.add("scoreName");
    if (data.room.m_guessedTheWord[playerID]) {
      elem.classList.add("txlightGreen");
    }
    if (data.room.m_currentArtistID === playerID) {
      elem.classList.add("txlightBlue");
    }
    scoreboard.appendChild(elem);
  }
});

socket.on("updateTimeClient", (data) => {
  if (data.room.m_id !== player.m_currentRoomId) return;
  document.getElementById("time-remaining").innerHTML =
    data.room.m_drawTimeRemaining;
});

socket.on("noTimeRemaining", (data) => {
  if (data.room.m_id !== player.m_currentRoomId) return;
  document.getElementById("current-word").innerHTML = data.room.m_currentWord;
  const overlay = document.getElementById("overlay");
  const wordOverlay = document.getElementById("word-overlay");
  wordOverlay.innerHTML = "The word was '" + data.room.m_currentWord + "'";
  overlay.style.display = "block";
  const canvas = document.getElementById("drawing-board") as HTMLCanvasElement;
  const ctx = canvas.getContext("2d");
  ctx.stroke();
  ctx.beginPath();
  isPainting = false;
  canvasUrls = [];
});

socket.on("gameOver", (data) => {
  if (data.room.m_id !== player.m_currentRoomId) return;
  const overlay = document.getElementById("overlay");
  document.getElementById("end-word-overlay").innerHTML = "Game Over!";
  const wordOverlay = document.getElementById("word-overlay");
  const winner = data.room.m_players[data.room.m_winnerID];
  if (winner) {
    wordOverlay.innerHTML = "The winner is " + winner.m_name + "!";
  }
  overlay.style.display = "block";
  const playAgainButton = document.getElementById(
    "playAgain",
  ) as HTMLButtonElement;
  playAgainButton.style.display = "block";
  const playAgain = () => {
    const canvas = document.getElementById(
      "drawing-board",
    ) as HTMLCanvasElement;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    socket.emit("resetGame", { roomID: player.m_currentRoomId });
    playAgainButton.style.display = "none";
  };
  playAgainButton.onclick = playAgain;
});
