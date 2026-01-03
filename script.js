const blocks = [];
let isStarted = false;
let frameCallbackId = null;

// init dom
window.onresize = onResize;

const video = document.querySelector("video");
video.onloadeddata = onVideoFrame;
video.onplay = onVideoFrame;
video.onended = onVideoEnded;
video.ontimeupdate = onTimeUpdate;

const soundSlide = document.querySelector("#soundSlide");
soundSlide.volume = 0.05;
const soundWin = document.querySelector("#soundWin");
soundWin.volume = 0.13;
const soundLose = document.querySelector("#soundLose");
soundLose.volume = 0.05;

const container = document.querySelector("#container");

const timer = document.querySelector("#timer");

const dialogEnd = document.querySelector("#dialog-end");
const dialogEndTitle = dialogEnd.querySelector(".title");
const dialogEndMessage = dialogEnd.querySelector(".subtitle");

const dialogStart = document.querySelector("#dialog-start");

document.querySelector("#startGame").onclick = startGame;
document.querySelector("#newGame").onclick = newGame;

const pause = document.querySelector("#pauseGame");
pause.onclick = pauseResumeGame;

const mute = document.querySelector("#muteGame");
mute.onclick = muteUnmuteGame;

const giveUp = document.querySelector("#giveUpGame");
giveUp.onclick = giveUpNewGame;

document.querySelectorAll(".step-select button").forEach((button) => {
  button.onclick = onSettingChanged;
});

// init settings
const defaultSettings = {
  video:
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  splitWidth: "4",
  splitHeight: "3",
  shuffleSteps: "90",
  showNumbers: "yes",
};

const settings = localStorage.getItem("settings")
  ? JSON.parse(localStorage.getItem("settings"))
  : defaultSettings;

Object.entries(settings).forEach(([key, value]) => {
  const select = document.getElementById(key);
  select.value = value;
});

function isAdjacent(blockA, blockB) {
  const xDiff = Math.abs(blockA.currentX - blockB.currentX);
  const yDiff = Math.abs(blockA.currentY - blockB.currentY);
  return (xDiff === 1 && yDiff === 0) || (xDiff === 0 && yDiff === 1);
}

function formatTime(seconds) {
  seconds ||= 0;
  const mins = Math.floor(seconds / 60);
  const secs = String(Math.floor(seconds % 60)).padStart(2, "0");
  return `${mins}:${secs}`;
}

function initBlocks() {
  const { splitWidth, splitHeight } = settings;
  blocks.length = 0;
  container.innerHTML = "";
  const lastIndex = splitWidth * splitHeight - 1;
  for (let y = 0; y < splitHeight; y += 1) {
    for (let x = 0; x < splitWidth; x += 1) {
      const index = y * splitWidth + x;
      const isEmpty = index === lastIndex;
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      canvas.width = 0;
      canvas.height = 0;
      canvas.className = isEmpty ? "empty" : "";
      canvas.onclick = onCanvasClick;
      container.appendChild(canvas);
      blocks.push({
        canvas,
        context,
        originalIndex: index,
        originalX: x,
        originalY: y,
        currentX: x,
        currentY: y,
        isEmpty,
      });
    }
  }
}

function updateBlocks() {
  const isPlaying = isStarted && !video.paused && !video.ended;
  const emptyBlock = blocks.at(-1);
  for (let block of blocks) {
    const { canvas, currentX, currentY } = block;
    const order = currentY * settings.splitWidth + currentX;
    canvas.style.order = order;
    canvas.classList.toggle(
      "active",
      isPlaying && isAdjacent(block, emptyBlock)
    );
  }
}

function swapBlocks(blockA, blockB) {
  const { currentX: tempX, currentY: tempY } = blockA;
  blockA.currentX = blockB.currentX;
  blockA.currentY = blockB.currentY;
  blockB.currentX = tempX;
  blockB.currentY = tempY;
}

function applySettings() {
  const { video: src, splitWidth } = settings;
  if (video.src !== src) {
    video.src = src;
    video.play();
  }
  container.style = `--columns: ${splitWidth}`;
  initBlocks();
  updateBlocks();
}

function checkWinOrLose(giveUp = false) {
  const isSolved = blocks.every(
    ({ originalY, originalX, currentX, currentY }) =>
      currentX === originalX && currentY === originalY
  );
  if (isStarted && isSolved) {
    const time = formatTime(video.currentTime);
    dialogEndTitle.textContent = "Congratulations!";
    dialogEndMessage.textContent = `You solved the puzzle in ${time}.`;
    video.pause();
    isStarted = false;
    updateControls();
    updateBlocks();
    setTimeout(() => dialogEnd.showModal(), 400);
    soundWin.play();
  } else if (giveUp || (isStarted && video.ended && !isSolved)) {
    isStarted = false;
    updateControls();
    updateBlocks();
    dialogEndTitle.textContent = "Game Over!";
    dialogEndMessage.textContent =
      "You failed to solve the puzzle before the video ended.";
    dialogEnd.showModal();
    soundLose.play();
  }
}

function onVideoFrame() {
  if (video.readyState >= 2) {
    const { splitWidth, splitHeight, showNumbers } = settings;
    const blockWidth = Math.trunc(video.videoWidth / splitWidth);
    const blockHeight = Math.trunc(video.videoHeight / splitHeight);
    const canvasWidth = Math.trunc(video.clientWidth / splitWidth);
    const canvasHeight = Math.trunc(video.clientHeight / splitHeight);
    for (let { canvas, context, originalX, originalY, isEmpty } of blocks) {
      if (canvas.width !== canvasWidth || canvas.height !== canvasHeight) {
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        context.font = "2rem Knewave, system-ui, sans-serif";
        context.textAlign = "center";
        context.textBaseline = "middle";
      }
      const originalIndex = originalY * splitWidth + originalX;
      context.drawImage(
        video,
        blockWidth * originalX,
        blockHeight * originalY,
        blockWidth,
        blockHeight,
        0,
        0,
        canvasWidth,
        canvasHeight
      );
      if (showNumbers === "yes" && !isEmpty) {
        const x = canvasWidth / 2;
        const y = canvasHeight / 2 + 3;
        context.fillStyle = "#283e39";
        context.fillText(originalIndex, x + 1, y + 1);
        context.fillStyle = "#7e9b94";
        context.fillText(originalIndex, x, y);
      }
    }
  }
  if (!video.paused && !video.ended) {
    video.cancelVideoFrameCallback(frameCallbackId);
    frameCallbackId = video.requestVideoFrameCallback(onVideoFrame);
  }
}

function onVideoEnded() {
  checkWinOrLose();
  isStarted = false;
  updateControls();
}

function onTimeUpdate() {
  const remaining = formatTime(video.duration - video.currentTime);
  const text = `- ${remaining}`;
  if (timer.textContent !== text) {
    timer.textContent = text;
  }
}

function onResize() {
  if (video.paused || video.ended) {
    onVideoFrame();
  }
}

function onCanvasClick(event) {
  if (!isStarted || video.paused || video.ended) return;
  const clickedBlock = blocks.find((block) => block.canvas === event.target);
  const emptyBlock = blocks.at(-1);
  if (!isAdjacent(clickedBlock, emptyBlock)) return;
  document
    .startViewTransition(() => {
      swapBlocks(emptyBlock, clickedBlock);
      updateBlocks();
      soundSlide.play();
    })
    .finished.then(checkWinOrLose);
}

function onSettingChanged(event) {
  const button = event.target;
  const isPrev = button.classList.contains("prev");
  const select = button.parentElement.querySelector("select");
  const options = Array.from(select.querySelectorAll("option"));
  const currentIndex = options.findIndex((option) => option.selected);
  const newIndex =
    (currentIndex + options.length + (isPrev ? -1 : 1)) % options.length;
  options[newIndex].selected = true;
  settings[select.id] = options[newIndex].value;
  localStorage.setItem("settings", JSON.stringify(settings));
  applySettings();
}

function shuffle() {
  let previousChoice = null;
  const emptyBlock = blocks.at(-1);
  for (let index = 0; index < settings.shuffleSteps; index += 1) {
    const choices = blocks.filter(
      (block) => isAdjacent(block, emptyBlock) && block !== previousChoice
    );
    const chosenBlock = choices[Math.trunc(Math.random() * choices.length)];
    swapBlocks(emptyBlock, chosenBlock);
    previousChoice = chosenBlock;
  }
  document.startViewTransition(updateBlocks);
}

function updateControls() {
  pause.textContent = video.ended ? "Play" : video.paused ? "Resume" : "Pause";
  mute.textContent = video.muted ? "Unmute" : "Mute";
  giveUp.textContent = isStarted ? "Give Up" : "New Game";
}

function newGame() {
  dialogEnd.close();
  dialogStart.showModal();
}

function startGame() {
  dialogStart.close();
  video.currentTime = 0;
  video.play();
  shuffle();
  isStarted = true;
  updateControls();
}

function pauseResumeGame() {
  if (video.paused || video.ended) {
    video.play();
  } else {
    video.pause();
  }
  updateControls();
  updateBlocks();
}

function muteUnmuteGame() {
  video.muted = !video.muted;
  soundSlide.muted = video.muted;
  soundWin.muted = video.muted;
  soundLose.muted = video.muted;
  updateControls();
}

function giveUpNewGame() {
  if (isStarted) {
    isStarted = false;
    video.pause();
    updateControls();
    updateBlocks();
    checkWinOrLose(true);
  } else {
    newGame();
  }
}

// start a demo/preview game behind the new game dialog
applySettings();
dialogStart.showModal();
video.play();
updateControls();
