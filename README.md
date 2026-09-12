# ✊✋✌️ Rock Paper Scissors - AI Battle Arena

An interactive, browser-based Rock-Paper-Scissors game powered by a custom **Google Teachable Machine** image classification model, built entirely with **pure HTML5, CSS3, and JavaScript** (no build tools or complex frameworks required).

Play against a randomized CPU opponent using your live webcam gestures or by uploading photos of your hand gestures!

---

## 🌟 Key Features

- **Teachable Machine AI Vision**: Real-time hand gesture recognition classifying **ROCK ✊**, **PAPER ✋**, and **SCISSORS ✌️**.
- **Camera Permission & Fallback System**:
  - The game automatically requests camera access upon startup.
  - **Camera Allowed**: Stream live video with real-time confidence meters and lock in a single frame using the **"Lock Image"** button or the **"3-2-1 Shoot!"** countdown timer.
  - **Camera Denied or Unavailable**: Seamlessly falls back to **Image Upload Mode**, letting players drag-and-drop or browse an image of their gesture.
- **Player 1 vs CPU**: Player 1 is you, and Player 2 is a CPU that randomly picks moves with an animated mystery card shuffle before revealing its choice.
- **Live Scoreboard & Round Announcements**:
  - Tracks Player 1 Wins, CPU Wins, Ties, and Total Rounds.
  - Displays match results with custom badges, animations, and matchup explanations (e.g., *"Rock crushes Scissors"*).
  - Scores persist across page refreshes via `localStorage` (with a one-click reset button).
- **Web Audio API Sound Synthesizer**: Built-in dynamic 8-bit sound effects for clicks, countdowns, victories, defeats, and ties without external audio asset dependencies.
- **Modern Arcade UI**: Cyberpunk glassmorphism design with neon accents, responsive layout for desktop and mobile, and real-time probability progress bars.

---

## 📂 Model Setup & Directory Structure

> [!IMPORTANT]
> ### Where to place the model files
> Any downloaded Teachable Machine model files **MUST be placed directly inside the `my_model/` folder**.

The application expects the following 3 files inside `my_model/`:

```
rock-paper-scissor/
│
├── index.html              # Main game interface
├── style.css               # Styling, animations, and layout
├── game.js                 # Game logic, camera handler & model inference
├── temo.html               # Reference code for Teachable Machine integration
├── README.md               # Project documentation
│
├── my_model/               # ⚠️ PLACE YOUR DOWNLOADED MODEL HERE
│   ├── metadata.json       # Model metadata (classes: ROCK, PAPER, SCISSOR)
│   ├── model.json          # Model architecture definition
│   └── weights.bin         # Trained neural network weights
│
└── dataset/                # Sample test images
    ├── rock/
    ├── paper/
    └── scissor/
```

### How to export and update your model from Teachable Machine:
1. Go to [Google Teachable Machine](https://teachablemachine.withgoogle.com/).
2. Train your model with classes: `ROCK`, `PAPER`, and `SCISSOR` (or `SCISSORS`).
3. Click **Export Model**.
4. Select **TensorFlow.js** and choose **Download (model.json, metadata.json, weights.bin)**.
5. Extract the downloaded zip file and place all three files (`model.json`, `metadata.json`, and `weights.bin`) into the `my_model/` directory of this project.

---

## 🚀 How to Run the Game

Because Teachable Machine loads model weights via `fetch()`, modern browsers block loading local files directly via `file://` due to CORS security policies. **You must run a lightweight local HTTP server.**

### Option 1: Using Python 3 (Easiest)
Open your terminal in the project directory and run:

```bash
python3 -m http.server 8000
```
Then open your browser and navigate to:
```
http://localhost:8000
```

### Option 2: Using Node.js
If you have Node.js installed, you can use `npx serve`:

```bash
npx serve .
```

### Option 3: VS Code Live Server
If you use Visual Studio Code, right-click `index.html` and select **"Open with Live Server"**.

---

## 🎮 How to Play

1. **Start the Game**:
   - When you open the page, your browser will prompt you for camera permission.
2. **Camera Mode**:
   - Click **Allow** on the browser's camera prompt.
   - Hold your hand up in front of the webcam.
   - Click **"Lock Image"** to freeze your current hand gesture, or click **"3-2-1 Shoot!"** for an authentic countdown.
   - Your frozen frame will be fed into the model to classify your move.
3. **Upload Mode (Camera Fallback)**:
   - If camera access was denied or you don't have a webcam, the game automatically switches to **Upload Image Mode** (you can also switch manually using the tabs at any time).
   - Drag and drop or browse for an image file showing your gesture.
   - Click **"Play With This Image"** to lock your move.
4. **CPU Turn & Outcome**:
   - The CPU shuffles and picks a random move.
   - The outcome is displayed with a winner announcement and sound effect.
   - Click **"Next Round ➔"** to play again!

---

## 📋 Rules Summary

| Player 1 Move | CPU Move | Result |
| :--- | :--- | :--- |
| ✊ **Rock** | ✌️ **Scissors** | **Player 1 Wins** (Rock crushes Scissors) |
| ✋ **Paper** | ✊ **Rock** | **Player 1 Wins** (Paper covers Rock) |
| ✌️ **Scissors** | ✋ **Paper** | **Player 1 Wins** (Scissors cuts Paper) |
| *Same Gesture* | *Same Gesture* | **It's a Tie!** |

---

## 🛠️ Built With

- **HTML5** & **CSS3** (Flexbox, Grid, CSS Variables, Animations)
- **Vanilla JavaScript (ES6+)**
- **[TensorFlow.js](https://www.tensorflow.org/js)** (via CDN)
- **[@teachablemachine/image](https://github.com/googlecreativelab/teachablemachine-community)** (via CDN)
- **Web Audio API** for synthesized sound effects
