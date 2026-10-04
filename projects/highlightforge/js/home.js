/* ==========================================================================
   HighlightForge — animated waveform timeline in the home hero
   ========================================================================== */

const heroDetectionLabels = [
  "● Clutch 1v4 détecté · 01:47:12",
  "● Pic du chat (+840 msg/min) · 02:03:55",
  "● Ace en 14 secondes · 02:21:08",
  "● Fou rire facecam · 02:38:41",
  "● Rush final remporté · 02:56:19"
];

/* Returns a deterministic pseudo-random value between 0 and 1 for an index. */
function getSeededNoise(sampleIndex) {
  const sineValue = Math.sin(sampleIndex * 12.9898 + 78.233) * 43758.5453;
  return sineValue - Math.floor(sineValue);
}

/* Computes the audio amplitude and highlight state of a waveform sample. */
function getWaveformSample(sampleIndex) {
  const cyclePosition = ((sampleIndex % 140) + 140) % 140;
  const isHighlight = cyclePosition > 96 && cyclePosition < 118;
  const baseAmplitude = 0.18 + getSeededNoise(sampleIndex) * 0.32 + Math.sin(sampleIndex / 9) * 0.08;
  const highlightBoost = isHighlight ? Math.sin(((cyclePosition - 96) / 22) * Math.PI) * 0.55 : 0;
  return { amplitude: Math.min(baseAmplitude + highlightBoost, 1), isHighlight, isChatPeak: isHighlight && cyclePosition > 104 && cyclePosition < 112 };
}

/* Draws one frame of the scrolling waveform onto the canvas. */
function drawHeroWaveform(canvasContext, canvasWidth, canvasHeight, scrollOffset) {
  const barWidth = 4;
  const barGap = 2;
  const barStep = barWidth + barGap;
  const playheadPosition = canvasWidth * 0.7;
  const firstSampleIndex = Math.floor(scrollOffset / barStep);
  const pixelShift = scrollOffset % barStep;
  canvasContext.clearRect(0, 0, canvasWidth, canvasHeight);
  for (let barPosition = -pixelShift, sampleIndex = firstSampleIndex; barPosition < canvasWidth; barPosition += barStep, sampleIndex += 1) {
    const waveformSample = getWaveformSample(sampleIndex);
    const barHeight = waveformSample.amplitude * (canvasHeight - 24);
    if (waveformSample.isHighlight) {
      canvasContext.fillStyle = "rgba(182, 255, 59, 0.10)";
      canvasContext.fillRect(barPosition - 1, 0, barStep, canvasHeight);
    }
    canvasContext.fillStyle = waveformSample.isChatPeak ? "#ff2bd6" : waveformSample.isHighlight ? "#b6ff3b" : barPosition < playheadPosition ? "rgba(0, 240, 255, 0.85)" : "rgba(0, 240, 255, 0.35)";
    canvasContext.fillRect(barPosition, (canvasHeight - barHeight) / 2, barWidth, barHeight);
  }
  canvasContext.fillStyle = "#ffffff";
  canvasContext.fillRect(playheadPosition - 1, 0, 2, canvasHeight);
  canvasContext.beginPath();
  canvasContext.moveTo(playheadPosition - 6, 0);
  canvasContext.lineTo(playheadPosition + 6, 0);
  canvasContext.lineTo(playheadPosition, 8);
  canvasContext.fill();
  return getWaveformSample(firstSampleIndex + Math.floor((playheadPosition + pixelShift) / barStep));
}

/* Starts the hero waveform animation and keeps the canvas sharp on resize. */
function initializeHeroWaveform() {
  const waveformCanvasElement = document.querySelector("[data-hero-waveform]");
  const detectionChipElement = document.querySelector("[data-hero-chip]");
  if (!waveformCanvasElement) return;
  const canvasContext = waveformCanvasElement.getContext("2d");
  const animationState = { scrollOffset: 0, lastFrameTime: 0, isVisible: true, frameRequestId: 0, wasOnHighlight: false, detectionIndex: 0, cssWidth: 0, cssHeight: 0 };
  const resizeCanvas = () => {
    const pixelRatio = window.devicePixelRatio || 1;
    animationState.cssWidth = waveformCanvasElement.clientWidth;
    animationState.cssHeight = waveformCanvasElement.clientHeight;
    waveformCanvasElement.width = Math.round(animationState.cssWidth * pixelRatio);
    waveformCanvasElement.height = Math.round(animationState.cssHeight * pixelRatio);
    canvasContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawHeroWaveform(canvasContext, animationState.cssWidth, animationState.cssHeight, animationState.scrollOffset);
  };
  const renderAnimationFrame = (frameTime) => {
    const elapsedTime = animationState.lastFrameTime ? frameTime - animationState.lastFrameTime : 16;
    animationState.lastFrameTime = frameTime;
    animationState.scrollOffset += elapsedTime * 0.05;
    const playheadSample = drawHeroWaveform(canvasContext, animationState.cssWidth, animationState.cssHeight, animationState.scrollOffset);
    if (playheadSample.isHighlight && !animationState.wasOnHighlight && detectionChipElement) {
      animationState.detectionIndex = (animationState.detectionIndex + 1) % heroDetectionLabels.length;
      detectionChipElement.textContent = heroDetectionLabels[animationState.detectionIndex];
    }
    animationState.wasOnHighlight = playheadSample.isHighlight;
    if (animationState.isVisible) animationState.frameRequestId = requestAnimationFrame(renderAnimationFrame);
  };
  new ResizeObserver(resizeCanvas).observe(waveformCanvasElement);
  resizeCanvas();
  if (isReducedMotionPreferred()) return;
  new IntersectionObserver((observerEntries) => {
    animationState.isVisible = observerEntries[0].isIntersecting;
    cancelAnimationFrame(animationState.frameRequestId);
    animationState.lastFrameTime = 0;
    if (animationState.isVisible) animationState.frameRequestId = requestAnimationFrame(renderAnimationFrame);
  }).observe(waveformCanvasElement);
}

document.addEventListener("DOMContentLoaded", initializeHeroWaveform);
