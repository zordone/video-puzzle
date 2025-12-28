const blocks = [];

// init dom
const video = document.querySelector("video");
video.onloadeddata = onVideoFrame;
video.onplay = onVideoFrame;
video.onended = checkWinOrLose;
video.ontimeupdate = onTimeUpdate;

const container = document.querySelector("#container");

const timer = document.querySelector("#timer");

const dialogEnd = document.querySelector("#dialog-end");
const dialogEndTitle = dialogEnd.querySelector(".title");
const dialogEndMessage = dialogEnd.querySelector(".subtitle");

const dialogStart = document.querySelector("#dialog-start");

document.querySelector("#start-game").onclick = startGame;
document.querySelector("#new-game").onclick = newGame;
document.querySelector("#pause").onclick = pauseResumeGame;
document.querySelector("#mute").onclick = muteUnmuteGame;
document.querySelector("#give-up").onclick = giveUpGame;

document.querySelectorAll(".step-select button").forEach((button) => {
  button.onclick = onSettingChanged;
});

// init settings
const defaultSettings = {
  video:
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  splitWidth: "4",
  splitHeight: "3",
  shuffleSteps: "100",
  showNumbers: "yes",
};

const settings = localStorage.getItem("settings")
  ? JSON.parse(localStorage.getItem("settings"))
  : defaultSettings;

Object.entries(settings).forEach(([key, value]) => {
  const select = document.getElementById(key);
  select.value = value;
});

function initBlocks() {
  blocks.length = 0;
  container.innerHTML = "";
  const lastIndex = settings.splitWidth * settings.splitHeight - 1;
  for (let y = 0; y < settings.splitHeight; y += 1) {
    for (let x = 0; x < settings.splitWidth; x += 1) {
      const index = y * settings.splitWidth + x;
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      canvas.width = 0;
      canvas.height = 0;
      canvas.className = index === lastIndex ? "empty" : "";
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
      });
    }
  }
}

function applySettings() {
  if (video.src !== settings.video) {
    video.src = settings.video;
    video.play();
  }
  container.style = `--columns: ${settings.splitWidth}`;
  initBlocks();
  updateBlocks();
}

function isAdjacent(blockA, blockB) {
  const xDiff = Math.abs(blockA.currentX - blockB.currentX);
  const yDiff = Math.abs(blockA.currentY - blockB.currentY);
  return (xDiff === 1 && yDiff === 0) || (xDiff === 0 && yDiff === 1);
}

function swapBlocks(blockA, blockB) {
  const { currentX: tempX, currentY: tempY } = blockA;
  blockA.currentX = blockB.currentX;
  blockA.currentY = blockB.currentY;
  blockB.currentX = tempX;
  blockB.currentY = tempY;
}

function updateBlocks() {
  const isPlaying = !video.paused && !video.ended;
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

function formatTime(seconds) {
  seconds ||= 0;
  const mins = Math.floor(seconds / 60);
  const secs = String(Math.floor(seconds % 60)).padStart(2, "0");
  return `${mins}:${secs}`;
}

function checkWinOrLose() {
  const isPlaying = !video.paused && !video.ended;
  const isSolved = blocks.every(
    ({ originalY, originalX, currentX, currentY }) =>
      currentX === originalX && currentY === originalY
  );
  if (isPlaying && isSolved) {
    const time = formatTime(video.currentTime);
    dialogEndTitle.textContent = "Congratulations!";
    dialogEndMessage.textContent = `You solved the puzzle in ${time}.`;
    video.pause();
    updateControls();
    setTimeout(() => dialogEnd.showModal(), 400);
  } else if (!isPlaying && !isSolved) {
    dialogEndTitle.textContent = "Game Over!";
    dialogEndMessage.textContent =
      "You failed to solve the puzzle before the video ended.";
    dialogEnd.showModal();
  }
}

function onVideoFrame() {
  const blockWidth = Math.round(video.videoWidth / settings.splitWidth);
  const blockHeight = Math.round(video.videoHeight / settings.splitHeight);
  const canvasWidth = Math.round(video.clientWidth / settings.splitWidth);
  const canvasHeight = Math.round(video.clientHeight / settings.splitHeight);
  for (let { canvas, context, originalX, originalY } of blocks) {
    if (canvas.width !== canvasWidth || canvas.height !== canvasHeight) {
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      context.font = "3rem Rubik, system-ui, sans-serif";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillStyle = "#7e9b94";
    }
    const originalIndex = originalY * settings.splitWidth + originalX;
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
    if (settings.showNumbers === "yes") {
      context.fillText(originalIndex, canvasWidth / 2, canvasHeight / 2);
    }
  }
  if (!video.paused && !video.ended) {
    video.requestVideoFrameCallback(onVideoFrame);
  }
}

function onTimeUpdate() {
  const remaining = formatTime(video.duration - video.currentTime);
  const text = `-${remaining}`;
  if (timer.textContent !== text) {
    timer.textContent = text;
  }
}

function onCanvasClick(event) {
  if (video.paused || video.ended) return;
  const clickedBlock = blocks.find((block) => block.canvas === event.target);
  const emptyBlock = blocks.at(-1);
  if (!isAdjacent(clickedBlock, emptyBlock)) return;
  document
    .startViewTransition(() => {
      swapBlocks(emptyBlock, clickedBlock);
      updateBlocks();
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
    const chosenBlock = choices[Math.floor(Math.random() * choices.length)];
    swapBlocks(emptyBlock, chosenBlock);
    previousChoice = chosenBlock;
  }
  document.startViewTransition(updateBlocks);
}

function newGame() {
  dialogEnd.close();
  dialogStart.showModal();
}

function startGame() {
  dialogStart.close();
  video.currentTime = 0;
  video.play();
  updateControls();
  shuffle();
}

function updateControls() {
  pause.textContent = video.paused ? "Resume" : "Pause";
  mute.textContent = video.muted ? "Unmute" : "Mute";
}

function pauseResumeGame() {
  if (video.paused) {
    video.play();
  } else {
    video.pause();
  }
  updateControls();
  updateBlocks();
}

function muteUnmuteGame() {
  video.muted = !video.muted;
  updateControls();
}

function giveUpGame() {
  video.pause();
  updateControls();
  checkWinOrLose();
}

// start a demo/preview game behind the new game dialog
applySettings();
dialogStart.showModal();
video.play();
updateControls();
