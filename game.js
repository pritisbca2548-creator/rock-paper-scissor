/**
 * Rock Paper Scissors - AI Battle Arena
 * Pure HTML, CSS, and JS using Teachable Machine Image Model
 */

// Model URL
const MODEL_URL = "./my_model/";

// Game State
let model = null;
let webcam = null;
let isWebcamRunning = false;
let currentMode = "camera"; // 'camera' or 'upload'
let isCameraLocked = false;
let isCountdownRunning = false;
let animationFrameId = null;
let uploadedImageElement = null;

// Scores
let scores = {
  player: 0,
  cpu: 0,
  ties: 0,
  rounds: 1
};

// Sound setting
let soundEnabled = true;
let audioCtx = null;

// Emojis and display names
const GESTURE_DATA = {
  ROCK: { name: "Rock", icon: "✊", beats: "SCISSOR", verb: "crushes" },
  PAPER: { name: "Paper", icon: "✋", beats: "ROCK", verb: "covers" },
  SCISSOR: { name: "Scissors", icon: "✌️", beats: "PAPER", verb: "cuts" }
};

// Initialize game on window load
window.addEventListener("DOMContentLoaded", () => {
  loadScores();
  updateScoreUI();
  setupDragAndDrop();
  initModelAndGame();
});

/**
 * Initialize Audio Context lazily on user gesture
 */
function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Sound FX synthesizer using Web Audio API
 */
function playSound(type) {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  if (type === "tick") {
    osc.type = "sine";
    osc.frequency.setValueAtTime(600, now);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.start(now);
    osc.stop(now + 0.08);
  } else if (type === "shoot") {
    osc.type = "triangle";
    osc.frequency.setValueAtTime(880, now);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.start(now);
    osc.stop(now + 0.18);
  } else if (type === "win") {
    // Joyful arpeggio
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.type = "triangle";
      o.frequency.setValueAtTime(freq, now + i * 0.1);
      g.gain.setValueAtTime(0.2, now + i * 0.1);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.25);
      o.start(now + i * 0.1);
      o.stop(now + i * 0.1 + 0.25);
    });
  } else if (type === "lose") {
    // Descending buzz
    [440, 392, 330, 261].forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.type = "sawtooth";
      o.frequency.setValueAtTime(freq, now + i * 0.12);
      g.gain.setValueAtTime(0.15, now + i * 0.12);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.2);
      o.start(now + i * 0.12);
      o.stop(now + i * 0.12 + 0.2);
    });
  } else if (type === "tie") {
    [440, 440].forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.type = "sine";
      o.frequency.setValueAtTime(freq, now + i * 0.12);
      g.gain.setValueAtTime(0.15, now + i * 0.12);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.15);
      o.start(now + i * 0.12);
      o.stop(now + i * 0.12 + 0.15);
    });
  }
}

/**
 * Toggle sound effects
 */
function toggleSound() {
  soundEnabled = !soundEnabled;
  document.getElementById("sound-status").textContent = soundEnabled ? "ON" : "OFF";
  document.getElementById("sound-toggle-icon").textContent = soundEnabled ? "🔊" : "🔇";
}

/**
 * Load and configure Teachable Machine model
 */
async function initModelAndGame() {
  showStatus("Loading AI gesture model...", "info");

  try {
    const modelURL = MODEL_URL + "model.json";
    const metadataURL = MODEL_URL + "metadata.json";
    
    // Load TM image model
    model = await tmImage.load(modelURL, metadataURL);
    showStatus("AI Model loaded successfully! Requesting camera permission...", "info");
    
    // Attempt camera setup
    await initCamera();
  } catch (err) {
    console.error("Initialization error:", err);
    showStatus("Failed to load AI model. Please ensure files exist in ./my_model/ and run via a local server.", "error");
  }
}

/**
 * Initialize Camera and handle user permission
 */
async function initCamera() {
  if (webcam) {
    try {
      await webcam.stop();
    } catch (e) {}
    webcam = null;
  }

  showStatus("Requesting camera permission...", "info");

  try {
    const width = 360;
    const height = 270;
    const flip = true; // mirror mode for intuitive play
    webcam = new tmImage.Webcam(width, height, flip);

    // This triggers the browser's camera permission dialog
    await webcam.setup();
    await webcam.play();
    isWebcamRunning = true;
    isCameraLocked = false;

    // Attach webcam canvas to DOM
    const container = document.getElementById("webcam-container");
    container.innerHTML = "";
    container.appendChild(webcam.canvas);

    // Hide snapshot canvas
    document.getElementById("lock-snapshot-canvas").classList.add("hidden");
    document.getElementById("btn-unlock-camera").classList.add("hidden");
    document.getElementById("btn-lock-image").classList.remove("hidden");
    document.getElementById("btn-countdown-shoot").classList.remove("hidden");
    document.getElementById("frame-scanner").classList.remove("hidden");

    // Start rendering and live prediction loop
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    animationFrameId = window.requestAnimationFrame(cameraLoop);

    showStatus("Camera active! Show Rock, Paper, or Scissors and lock your move.", "success");
    document.getElementById("current-mode-badge").textContent = "Camera Live";
  } catch (err) {
    console.warn("Camera access denied or unavailable:", err);
    showStatus("Camera permission denied or camera not found. Switched to Image Upload Mode.", "warning");
    // Fall back automatically to upload mode
    switchMode("upload");
  }
}

/**
 * Continuous loop for camera update and live probability rendering
 */
async function cameraLoop() {
  if (!isWebcamRunning) return;

  webcam.update();

  // If not currently locked, run live prediction for feedback
  if (!isCameraLocked && model) {
    try {
      const predictions = await model.predict(webcam.canvas);
      renderPredictions(predictions);
    } catch (e) {
      // Ignore intermediate frame dropped errors
    }
  }

  animationFrameId = window.requestAnimationFrame(cameraLoop);
}

/**
 * Render probability bars and live top choice
 */
function renderPredictions(predictions) {
  let highestProb = -1;
  let topClass = "";

  for (let i = 0; i < predictions.length; i++) {
    const p = predictions[i];
    const className = p.className.toUpperCase();
    const probPercent = (p.probability * 100).toFixed(0);

    // Update corresponding bar
    const bar = document.getElementById(`prob-bar-${className.toLowerCase()}`);
    const val = document.getElementById(`prob-val-${className.toLowerCase()}`);
    if (bar && val) {
      bar.style.width = `${probPercent}%`;
      val.textContent = `${probPercent}%`;
    }

    if (p.probability > highestProb) {
      highestProb = p.probability;
      topClass = className;
    }
  }

  const resultElem = document.getElementById("user-choice-result");
  if (topClass && GESTURE_DATA[topClass]) {
    const item = GESTURE_DATA[topClass];
    resultElem.textContent = `${item.icon} ${item.name} (${(highestProb * 100).toFixed(0)}%)`;
  }
}

/**
 * Lock current camera frame as Player 1's move
 */
async function lockCurrentFrame() {
  if (!webcam || !webcam.canvas || isCameraLocked || !model) return;

  isCameraLocked = true;
  playSound("shoot");

  // Copy current webcam frame to snapshot canvas
  const snapshotCanvas = document.getElementById("lock-snapshot-canvas");
  snapshotCanvas.width = webcam.canvas.width;
  snapshotCanvas.height = webcam.canvas.height;
  const ctx = snapshotCanvas.getContext("2d");
  ctx.drawImage(webcam.canvas, 0, 0);

  // Show snapshot canvas over live feed
  snapshotCanvas.classList.remove("hidden");
  document.getElementById("frame-scanner").classList.add("hidden");
  document.getElementById("btn-unlock-camera").classList.remove("hidden");
  document.getElementById("btn-lock-image").classList.add("hidden");
  document.getElementById("btn-countdown-shoot").classList.add("hidden");

  // Predict on locked frame
  const predictions = await model.predict(snapshotCanvas);
  renderPredictions(predictions);

  const userChoice = getTopClass(predictions);
  document.getElementById("current-mode-badge").textContent = `Locked: ${GESTURE_DATA[userChoice].name}`;
  showStatus(`You locked in: ${GESTURE_DATA[userChoice].icon} ${GESTURE_DATA[userChoice].name}! CPU is playing...`, "info");

  // Trigger CPU play
  playRoundWithChoices(userChoice);
}

/**
 * 3-2-1 Countdown & Shoot feature
 */
function startCountdownShoot() {
  if (isCountdownRunning || isCameraLocked) return;
  isCountdownRunning = true;

  const overlay = document.getElementById("countdown-overlay");
  const countText = document.getElementById("countdown-text");
  overlay.classList.remove("hidden");

  let count = 3;
  countText.textContent = count;
  playSound("tick");

  const interval = setInterval(() => {
    count--;
    if (count > 0) {
      countText.textContent = count;
      playSound("tick");
    } else if (count === 0) {
      countText.textContent = "SHOOT!";
      playSound("shoot");
    } else {
      clearInterval(interval);
      overlay.classList.add("hidden");
      isCountdownRunning = false;
      lockCurrentFrame();
    }
  }, 900);
}

/**
 * Unlock camera feed to retake or play next round
 */
function unlockCamera() {
  isCameraLocked = false;
  document.getElementById("lock-snapshot-canvas").classList.add("hidden");
  document.getElementById("frame-scanner").classList.remove("hidden");
  document.getElementById("btn-unlock-camera").classList.add("hidden");
  document.getElementById("btn-lock-image").classList.remove("hidden");
  document.getElementById("btn-countdown-shoot").classList.remove("hidden");
  document.getElementById("current-mode-badge").textContent = "Camera Live";
  showStatus("Camera live. Point your hand and lock your gesture.", "info");
}

/**
 * Switch between Camera and Upload mode
 */
async function switchMode(mode) {
  currentMode = mode;

  const btnCamera = document.getElementById("btn-mode-camera");
  const btnUpload = document.getElementById("btn-mode-upload");
  const cameraView = document.getElementById("camera-view");
  const uploadView = document.getElementById("upload-view");

  if (mode === "camera") {
    btnCamera.classList.add("active");
    btnUpload.classList.remove("active");
    cameraView.classList.remove("hidden");
    uploadView.classList.add("hidden");
    document.getElementById("current-mode-badge").textContent = "Camera Live";
    await initCamera();
  } else {
    btnCamera.classList.remove("active");
    btnUpload.classList.add("active");
    cameraView.classList.add("hidden");
    uploadView.classList.remove("hidden");
    document.getElementById("current-mode-badge").textContent = "Upload Mode";

    // Pause webcam if it was active
    if (webcam) {
      try {
        await webcam.stop();
      } catch (e) {}
      isWebcamRunning = false;
    }
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }

    showStatus("Upload an image of your Rock, Paper, or Scissors gesture.", "info");
  }
}

/**
 * Setup drag-and-drop for image uploads
 */
function setupDragAndDrop() {
  const dropzone = document.getElementById("upload-dropzone");

  ["dragenter", "dragover"].forEach((eventName) => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add("dragover");
    }, false);
  });

  ["dragleave", "drop"].forEach((eventName) => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove("dragover");
    }, false);
  });

  dropzone.addEventListener("drop", (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files && files.length > 0) {
      processImageFile(files[0]);
    }
  });
}

function triggerFileInput() {
  document.getElementById("image-file-input").click();
}

function handleImageUpload(event) {
  const file = event.target.files[0];
  if (file) {
    processImageFile(file);
  }
}

/**
 * Read and preview uploaded file
 */
function processImageFile(file) {
  if (!file.type.startsWith("image/")) {
    showStatus("Please upload a valid image file (JPG, PNG, WEBP).", "error");
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = document.getElementById("upload-preview-img");
    img.src = e.target.result;
    img.classList.remove("hidden");
    document.getElementById("upload-placeholder").classList.add("hidden");
    document.getElementById("btn-evaluate-upload").disabled = false;
    uploadedImageElement = img;

    // Run preview prediction on uploaded image once loaded
    img.onload = async () => {
      if (model) {
        const predictions = await model.predict(img);
        renderPredictions(predictions);
        showStatus("Image ready! Click 'Play With This Image' to lock your move.", "success");
      }
    };
  };
  reader.readAsDataURL(file);
}

/**
 * Lock uploaded image as Player 1 choice
 */
async function lockUploadedImage() {
  if (!uploadedImageElement || !model) return;

  playSound("shoot");
  const predictions = await model.predict(uploadedImageElement);
  renderPredictions(predictions);

  const userChoice = getTopClass(predictions);
  document.getElementById("current-mode-badge").textContent = `Locked: ${GESTURE_DATA[userChoice].name}`;
  showStatus(`You locked in: ${GESTURE_DATA[userChoice].icon} ${GESTURE_DATA[userChoice].name}! CPU is playing...`, "info");

  playRoundWithChoices(userChoice);
}

/**
 * Get class with maximum probability
 */
function getTopClass(predictions) {
  let highest = -1;
  let topName = "ROCK";

  for (let i = 0; i < predictions.length; i++) {
    if (predictions[i].probability > highest) {
      highest = predictions[i].probability;
      topName = predictions[i].className.toUpperCase();
    }
  }
  return topName;
}

/**
 * Play a round with User choice and random CPU choice
 */
function playRoundWithChoices(userChoice) {
  const cpuCard = document.getElementById("cpu-card");
  const cpuIcon = document.getElementById("cpu-icon");
  const cpuName = document.getElementById("cpu-gesture-name");
  const cpuStatus = document.getElementById("cpu-status-text");

  // Animate CPU shuffle
  cpuCard.classList.add("cpu-shuffling");
  cpuStatus.textContent = "CPU is choosing...";

  const gestures = ["ROCK", "PAPER", "SCISSOR"];
  let shuffleCount = 0;
  const shuffleInterval = setInterval(() => {
    const tempChoice = gestures[shuffleCount % gestures.length];
    cpuIcon.textContent = GESTURE_DATA[tempChoice].icon;
    cpuName.textContent = GESTURE_DATA[tempChoice].name;
    shuffleCount++;
  }, 100);

  setTimeout(() => {
    clearInterval(shuffleInterval);
    cpuCard.classList.remove("cpu-shuffling");

    // Pick CPU move randomly
    const cpuChoice = gestures[Math.floor(Math.random() * gestures.length)];
    cpuIcon.textContent = GESTURE_DATA[cpuChoice].icon;
    cpuName.textContent = GESTURE_DATA[cpuChoice].name;
    cpuStatus.textContent = `CPU selected ${GESTURE_DATA[cpuChoice].name}!`;

    // Determine Winner
    evaluateOutcome(userChoice, cpuChoice);
  }, 800);
}

/**
 * Determine winner and update score
 */
function evaluateOutcome(userChoice, cpuChoice) {
  const outcomeCard = document.getElementById("outcome-card");
  const headline = document.getElementById("outcome-headline");
  const detail = document.getElementById("outcome-detail");

  outcomeCard.className = "outcome-card"; // reset classes

  const user = GESTURE_DATA[userChoice];
  const cpu = GESTURE_DATA[cpuChoice];

  if (userChoice === cpuChoice) {
    // TIE
    scores.ties++;
    outcomeCard.classList.add("tie");
    headline.textContent = "IT'S A TIE!";
    detail.textContent = `Both chose ${user.name}!`;
    showStatus(`Tie game! Both players chose ${user.icon} ${user.name}.`, "warning");
    playSound("tie");
  } else if (user.beats === cpuChoice) {
    // USER WINS
    scores.player++;
    outcomeCard.classList.add("win");
    headline.textContent = "🎉 YOU WON!";
    detail.textContent = `${user.name} ${user.verb} ${cpu.name}!`;
    showStatus(`Victory! ${user.icon} ${user.name} ${user.verb} ${cpu.icon} ${cpu.name}.`, "success");
    playSound("win");
  } else {
    // CPU WINS
    scores.cpu++;
    outcomeCard.classList.add("lose");
    headline.textContent = "🤖 CPU WON!";
    detail.textContent = `${cpu.name} ${cpu.verb} ${user.name}!`;
    showStatus(`CPU won this round! ${cpu.icon} ${cpu.name} ${cpu.verb} ${user.icon} ${user.name}.`, "error");
    playSound("lose");
  }

  saveScores();
  updateScoreUI();
  outcomeCard.classList.remove("hidden");
}

/**
 * Prepare arena for the next round
 */
function resetForNextRound() {
  scores.rounds++;
  document.getElementById("round-number").textContent = scores.rounds;
  document.getElementById("outcome-card").classList.add("hidden");

  // Reset CPU display
  document.getElementById("cpu-icon").textContent = "❓";
  document.getElementById("cpu-gesture-name").textContent = "Waiting...";
  document.getElementById("cpu-status-text").textContent = "CPU is waiting for your move to lock in!";

  if (currentMode === "camera") {
    unlockCamera();
  } else {
    document.getElementById("current-mode-badge").textContent = "Upload Mode";
    showStatus("Ready for next round! Upload another image or lock your current one.", "info");
  }
}

/**
 * Scoreboard updates and persistence
 */
function updateScoreUI() {
  document.getElementById("player-score").textContent = scores.player;
  document.getElementById("cpu-score").textContent = scores.cpu;
  document.getElementById("tie-score").textContent = scores.ties;
  document.getElementById("round-number").textContent = scores.rounds;
}

function saveScores() {
  try {
    localStorage.setItem("rps_scores", JSON.stringify(scores));
  } catch (e) {}
}

function loadScores() {
  try {
    const saved = localStorage.getItem("rps_scores");
    if (saved) {
      scores = JSON.parse(saved);
    }
  } catch (e) {}
}

function resetGameScores() {
  scores = { player: 0, cpu: 0, ties: 0, rounds: 1 };
  saveScores();
  updateScoreUI();
  document.getElementById("outcome-card").classList.add("hidden");
  showStatus("Scores have been reset to zero.", "info");
}

/**
 * Status message bar updater
 */
function showStatus(msg, type = "info") {
  const bar = document.getElementById("status-bar");
  const text = document.getElementById("status-message");
  const icon = document.getElementById("status-icon");

  bar.className = `status-bar ${type}`;
  text.textContent = msg;

  const icons = {
    info: "🤖",
    success: "✨",
    warning: "⚠️",
    error: "❌"
  };
  icon.textContent = icons[type] || "ℹ️";
}

/**
 * Toggle instructions modal
 */
function toggleHelpModal(show) {
  const modal = document.getElementById("help-modal");
  if (show) {
    modal.classList.remove("hidden");
  } else {
    modal.classList.add("hidden");
  }
}
