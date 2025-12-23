const SPLIT_WIDTH = 4;
const SPLIT_HEIGHT = 3;

const video = document.querySelector("video");

const container = document.querySelector("#container");
container.style = `--columns: ${SPLIT_WIDTH}`;

const blocks = [];

for (let y = 0; y < SPLIT_HEIGHT; y += 1) {
  for (let x = 0; x < SPLIT_WIDTH; x += 1) {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    canvas.width = 100;
    canvas.height = 100;
    container.appendChild(canvas);
    blocks.push({ canvas, context, x, y });
  }
}

function onFrame() {
  const blockWidth = video.videoWidth / SPLIT_WIDTH;
  const blockHeight = video.videoHeight / SPLIT_HEIGHT;

  const canvasWidth = video.clientWidth / SPLIT_WIDTH;
  const canvasHeight = video.clientHeight / SPLIT_HEIGHT;

  for ({ canvas, context, x, y } of blocks) {
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    context.drawImage(
      video,
      blockWidth * x,
      blockHeight * y,
      blockWidth,
      blockHeight,
      0,
      0,
      canvasWidth,
      canvasHeight
    );
  }

  if (!video.paused && !video.ended) {
    video.requestVideoFrameCallback(onFrame);
  }
}

video.onloadeddata = onFrame;
video.onplay = onFrame;

// TODO: remove test stuff
video.currentTime = 15;
window.stop = () => {
  video.pause();
  clearInterval(timer);
};

// TODO: remove test shuffle
const timer = setInterval(() => {
  document.startViewTransition(() => {
    for ({ canvas } of blocks) {
      canvas.style.order = Math.round(Math.random() * 1000);
    }
  });
}, 1000);
