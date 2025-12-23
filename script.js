const SPLIT_WIDTH = 4;
const SPLIT_HEIGHT = 3;

// init dom
const video = document.querySelector("video");
video.onloadeddata = onFrame;
video.onplay = onFrame;

const container = document.querySelector("#container");
container.style = `--columns: ${SPLIT_WIDTH}`;

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
    context.font = "3rem Rubik, system-ui, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = "#7e9b94";
    context.fillText(originalIndex, canvasWidth / 2, canvasHeight / 2);
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

function updateBlocks() {
  const emptyBlock = blocks.find((block) => block.isEmpty);
  for (let block of blocks) {
    const { canvas, currentX, currentY } = block;
    const order = currentY * SPLIT_WIDTH + currentX;
    canvas.style.order = order;
    canvas.classList.toggle("active", isAdjacent(block, emptyBlock));
  }
}

function onCanvasClick(event) {
  const clickedBlock = blocks.find((block) => block.canvas === event.target);
  const emptyBlock = blocks.find((block) => block.isEmpty);
  if (!isAdjacent(clickedBlock, emptyBlock)) return;
  // swap
  document.startViewTransition(() => {
    const { currentX: tempX, currentY: tempY } = emptyBlock;
    emptyBlock.currentX = clickedBlock.currentX;
    emptyBlock.currentY = clickedBlock.currentY;
    clickedBlock.currentX = tempX;
    clickedBlock.currentY = tempY;
    updateBlocks();
  });
}

// TODO: remove test stuff
video.currentTime = 15;

window.stop = () => {
  video.pause();
};

window.shuffle = () => {
  for (let i = 0; i < blocks.length; i++) {
    const one = blocks[i];
    const two = blocks[Math.floor(Math.random() * blocks.length)];
    const { currentX: tempX, currentY: tempY } = one;
    one.currentX = two.currentX;
    one.currentY = two.currentY;
    two.currentX = tempX;
    two.currentY = tempY;
  }
  document.startViewTransition(updateBlocks);
};

setTimeout(window.shuffle, 2000);
