const SPLIT_WIDTH = 4;
const SPLIT_HEIGHT = 3;
const SHUFFLE_STEPS = 150;
const SHOW_NUMBERS = true;

// init dom
const video = document.querySelector("video");
video.onloadeddata = onFrame;
video.onplay = onFrame;
video.onended = checkWin;

const container = document.querySelector("#container");
container.style = `--columns: ${SPLIT_WIDTH}`;

const dialog = document.querySelector("#dialog");
const dialogTitle = dialog.querySelector(".title");
const dialogMessage = dialog.querySelector(".subtitle");

const restart = document.querySelector("#restart");
restart.onclick = () => {
  dialog.close();
  video.currentTime = 0;
  video.play();
  shuffle();
};

// init blocks
const blocks = [];
for (let y = 0; y < SPLIT_HEIGHT; y += 1) {
  for (let x = 0; x < SPLIT_WIDTH; x += 1) {
    const canvas = document.createElement("canvas");
    canvas.width = 100;
    canvas.height = 100;
    canvas.onclick = onCanvasClick;
    const context = canvas.getContext("2d");
    const index = y * SPLIT_WIDTH + x;
    container.appendChild(canvas);
    blocks.push({
      canvas,
      context,
      originalIndex: index,
      originalX: x,
      originalY: y,
      currentX: x,
      currentY: y,
      isEmpty: false,
    });
  }
}
blocks.at(-1).isEmpty = true;

// copy video frame to blocks
function onFrame() {
  const blockWidth = video.videoWidth / SPLIT_WIDTH;
  const blockHeight = video.videoHeight / SPLIT_HEIGHT;
  const canvasWidth = video.clientWidth / SPLIT_WIDTH;
  const canvasHeight = video.clientHeight / SPLIT_HEIGHT;
  for (let { canvas, context, originalX, originalY, isEmpty } of blocks) {
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    canvas.style.opacity = isEmpty ? "0.2" : "1";
    const originalIndex = originalY * SPLIT_WIDTH + originalX;
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
    if (SHOW_NUMBERS) {
      context.font = "3rem Rubik, system-ui, sans-serif";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillStyle = "#7e9b94";
      context.fillText(originalIndex, canvasWidth / 2, canvasHeight / 2);
    }
  }
  if (!video.paused && !video.ended) {
    video.requestVideoFrameCallback(onFrame);
  }
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
  const emptyBlock = blocks.find((block) => block.isEmpty);
  for (let block of blocks) {
    const { canvas, currentX, currentY } = block;
    const order = currentY * SPLIT_WIDTH + currentX;
    canvas.style.order = order;
    canvas.classList.toggle("active", isAdjacent(block, emptyBlock));
  }
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = String(Math.floor(seconds % 60)).padStart(2, "0");
  return `${mins}:${secs}`;
}

function checkWin() {
  const isPlaying = !video.paused && !video.ended;
  const isSolved = blocks.every(
    ({ originalY, originalX, currentX, currentY }) =>
      currentX === originalX && currentY === originalY
  );
  if (isPlaying && isSolved) {
    const time = formatTime(video.currentTime);
    dialogTitle.textContent = "Congratulations!";
    dialogMessage.textContent = `You solved the puzzle in ${time}.`;
    setTimeout(() => dialog.showModal(), 400);
  } else if (!isPlaying && !isSolved) {
    dialogTitle.textContent = "Game Over!";
    dialogMessage.textContent =
      "You failed to solve the puzzle before the video ended.";
    dialog.showModal();
  }
}

function onCanvasClick(event) {
  const clickedBlock = blocks.find((block) => block.canvas === event.target);
  const emptyBlock = blocks.find((block) => block.isEmpty);
  if (!isAdjacent(clickedBlock, emptyBlock)) return;
  document
    .startViewTransition(() => {
      swapBlocks(emptyBlock, clickedBlock);
      updateBlocks();
    })
    .finished.then(checkWin);
}

function shuffle() {
  let previousChoice = null;
  const emptyBlock = blocks.find((block) => block.isEmpty);
  for (let index = 0; index < SHUFFLE_STEPS; index += 1) {
    const choices = blocks.filter(
      (block) => isAdjacent(block, emptyBlock) && block !== previousChoice
    );
    const chosenBlock = choices[Math.floor(Math.random() * choices.length)];
    swapBlocks(emptyBlock, chosenBlock);
    previousChoice = chosenBlock;
  }
  document.startViewTransition(updateBlocks);
}

// TODO: remove test stuff
window.stop = () => {
  video.pause();
};

setTimeout(shuffle, 2000);
