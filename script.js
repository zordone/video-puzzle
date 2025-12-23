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
    if (isEmpty) continue;
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
    context.font = "3rem sans-serif";
    context.fillStyle = "#0F04";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(originalIndex, canvasWidth / 2, canvasHeight / 2);
  }
  if (!video.paused && !video.ended) {
    video.requestVideoFrameCallback(onFrame);
  }
}

function onCanvasClick(event) {
  const clickedBlock = blocks.find((block) => block.canvas === event.target);
  const emptyBlock = blocks.find((block) => block.isEmpty);
  // is adjacent?
  const xDiff = Math.abs(emptyBlock.currentX - clickedBlock.currentX);
  const yDiff = Math.abs(emptyBlock.currentY - clickedBlock.currentY);
  const isAdjacent =
    (xDiff === 1 && yDiff === 0) || (xDiff === 0 && yDiff === 1);
  if (!isAdjacent) return;
  // swap
  document.startViewTransition(() => {
    const { currentX: tempX, currentY: tempY } = emptyBlock;
    emptyBlock.currentX = clickedBlock.currentX;
    emptyBlock.currentY = clickedBlock.currentY;
    clickedBlock.currentX = tempX;
    clickedBlock.currentY = tempY;
    for ({ canvas, currentX, currentY } of blocks) {
      const order = currentY * SPLIT_WIDTH + currentX;
      canvas.style.order = order;
    }
  });
}

// TODO: remove test stuff
video.currentTime = 15;

window.stop = () => {
  video.pause();
  clearInterval(timer);
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
  document.startViewTransition(() => {
    for ({ canvas, currentX, currentY } of blocks) {
      const order = currentY * SPLIT_WIDTH + currentX;
      canvas.style.order = order;
    }
  });
};
