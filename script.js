// DOM Elements
const keyboardDiv = document.getElementById("keyboard");
const output = document.getElementById("output");
const questionText = document.getElementById("questionText");

// Keyboard configuration
const keys = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

// Eye tracking variables
let currentKey = null;
let gazeStartTime = null;
let typingLocked = false;
let webgazerInitialized = false;

// Dwell time for gaze typing (milliseconds)
const dwellTime = 500;

// Smoothing variables
let smoothX = null;
let smoothY = null;
const smoothingFactor = 0.15; // 0.1–0.2 = smooth & responsive
const jitterThreshold = 5; // ignore tiny movement in pixels

// Load question from Firebase or localStorage
function loadQuestion() {
  if (window.database) {
    window.database.ref('currentQuestion').once('value')
      .then((snapshot) => {
        const question = snapshot.val();
        if (question) {
          questionText.innerText = question;
          localStorage.setItem('question', question);
        } else {
          // Fallback to localStorage
          const savedQuestion = localStorage.getItem("question");
          questionText.innerText = savedQuestion || "Type the word: CAT";
        }
      })
      .catch((error) => {
        console.error('Error loading question:', error);
        // Fallback to localStorage
        const savedQuestion = localStorage.getItem("question");
        questionText.innerText = savedQuestion || "Type the word: CAT";
      });
  } else {
    // Fallback to localStorage
    const savedQuestion = localStorage.getItem("question");
    questionText.innerText = savedQuestion || "Type the word: CAT";
  }
}

// Load question when script loads
loadQuestion();

// Build keyboard with proper SPACE and BACK sizing
console.log('Building keyboard...');
keys.forEach(letter => {
  const btn = document.createElement("button");
  btn.innerText = letter;
  btn.className = "key";
  keyboardDiv.appendChild(btn);
  btn.onclick = () => handleKey(letter);
});

// Create SPACE key with special class
const spaceBtn = document.createElement("button");
spaceBtn.innerText = "SPACE";
spaceBtn.className = "key space-key";
keyboardDiv.appendChild(spaceBtn);
spaceBtn.onclick = () => handleKey("SPACE");

// Create BACK key with special class
const backBtn = document.createElement("button");
backBtn.innerText = "BACK";
backBtn.className = "key back-key";
keyboardDiv.appendChild(backBtn);
backBtn.onclick = () => handleKey("BACK");
console.log('Keyboard built with', document.querySelectorAll('.key').length, 'keys');

// Handle key press (both manual and gaze-based)
function handleKey(label) {
  console.log('Key pressed:', label);
  if (label === "SPACE") {
    output.value += " ";
  } else if (label === "BACK") {
    output.value = output.value.slice(0, -1);
  } else {
    output.value += label;
  }
  
  // Auto-save answer to localStorage
  localStorage.setItem("answer", output.value);
}

// Initialize WebGazer for eye tracking
async function initWebGazer() {
  try {
    if (typeof webgazer === 'undefined') {
      console.error('WebGazer not loaded');
      setTimeout(initWebGazer, 1000);
      return;
    }

    console.log('Initializing WebGazer...');

    // Configure WebGazer
    await webgazer
      .setRegression('ridge')
      .setTracker('TFFacemesh')
      .setGazeListener((data, elapsedTime) => {
        if (!data || data.x === undefined || data.y === undefined) return;

        let rawX = data.x;
        let rawY = data.y;

        // Initialize smoothing
        if (smoothX === null) smoothX = rawX;
        if (smoothY === null) smoothY = rawY;

        // Exponential smoothing
        smoothX = smoothX + smoothingFactor * (rawX - smoothX);
        smoothY = smoothY + smoothingFactor * (rawY - smoothY);

        const x = smoothX;
        const y = smoothY;

        let hoveredKey = null;
        const allKeys = document.querySelectorAll(".key");

        // Check which key is being looked at
        allKeys.forEach(key => {
          const rect = key.getBoundingClientRect();
          if (
            x >= rect.left &&
            x <= rect.right &&
            y >= rect.top &&
            y <= rect.bottom
          ) {
            hoveredKey = key;
          }
        });

        // Remove active class from all keys
        allKeys.forEach(key => key.classList.remove("active"));

        if (hoveredKey) {
          hoveredKey.classList.add("active");

          // Handle dwell time for gaze typing
          if (currentKey === hoveredKey) {
            if (!gazeStartTime) gazeStartTime = Date.now();

            if (Date.now() - gazeStartTime > dwellTime && !typingLocked) {
              typingLocked = true;
              handleKey(hoveredKey.innerText);

              // Prevent double typing
              setTimeout(() => {
                typingLocked = false;
              }, 500);

              gazeStartTime = null;
              currentKey = null;
            }
          } else {
            currentKey = hoveredKey;
            gazeStartTime = Date.now();
          }
        } else {
          currentKey = null;
          gazeStartTime = null;
        }
      })
      .begin();

    // Configure WebGazer settings
    webgazer.setStabilization(true);
    webgazer.setPredictionPoints(true);
    webgazer.showVideo(true);
    webgazer.showFaceOverlay(true);
    webgazer.showFaceFeedbackBox(true);
    webgazer.showPredictionPoints(true);
    webgazer.params.videoMirror = false;

    console.log('WebGazer initialized successfully');
    webgazerInitialized = true;

    // Style the video container after it's created
    setTimeout(() => {
      styleVideoContainer();
    }, 2000);

  } catch (error) {
    console.error('Error initializing WebGazer:', error);
    const loading = document.getElementById('loading');
    if (loading) {
      loading.innerHTML = 'Failed to initialize eye tracking. Please refresh the page.';
      loading.style.background = '#f8d7da';
      loading.style.color = '#721c24';
    }
  }
}

// Style the WebGazer video container
function styleVideoContainer() {
  const videoContainer = document.getElementById("webgazerVideoContainer");

  if (videoContainer) {
    videoContainer.style.position = "fixed";
    videoContainer.style.top = "20px";
    videoContainer.style.left = "20px";
    videoContainer.style.zIndex = "9999";
    videoContainer.style.width = "220px";
    videoContainer.style.height = "165px";
    videoContainer.style.overflow = "hidden";
    videoContainer.style.border = "2px solid #444";
    videoContainer.style.borderRadius = "10px";
    videoContainer.style.backgroundColor = "#000";
    videoContainer.style.boxShadow = "0 4px 8px rgba(0,0,0,0.2)";

    const video = document.querySelector('#webgazerVideoContainer video');
    if (video) {
      video.style.width = '100%';
      video.style.height = '100%';
      video.style.objectFit = 'cover';
      video.style.position = 'absolute';
      video.style.top = '50%';
      video.style.left = '50%';
      video.style.transform = 'translate(-50%, -50%) scaleX(1)';
    }

    const canvases = videoContainer.querySelectorAll('canvas');
    canvases.forEach((canvas) => {
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.position = 'absolute';
      canvas.style.top = '50%';
      canvas.style.left = '50%';
      canvas.style.transform = 'translate(-50%, -50%) scaleX(1)';
      canvas.style.objectFit = 'cover';
      canvas.style.pointerEvents = 'none';
    });

    // Hide loading indicator
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'none';
  }
}

// Submit answer to Firebase
function submitAnswer() {
  const answer = output.value;
  
  if (!answer.trim()) {
    alert('Please type an answer before submitting');
    return;
  }
  
  const user = firebase.auth().currentUser;
  
  if (!user) {
    alert('You must be logged in to submit an answer');
    return;
  }

  // Save to localStorage as backup
  localStorage.setItem("answer", answer);

  // Save to Firebase if available
  if (window.database) {
    const answerData = {
      text: answer,
      studentId: user.uid,
      studentEmail: user.email,
      studentName: user.displayName || user.email,
      timestamp: Date.now(),
      question: questionText.innerText
    };

    window.database.ref('answers').push(answerData)
      .then(() => {
        alert("Answer submitted successfully: " + answer);
      })
      .catch((error) => {
        console.error('Error submitting answer:', error);
        alert("Answer saved locally but failed to sync to cloud. Please check your connection.\nYour answer: " + answer);
      });
  } else {
    alert("Answer saved locally: " + answer);
  }
}

// Clear the answer textarea
function clearAnswer() {
  output.value = '';
  localStorage.removeItem('answer');
}

// Load saved answer from localStorage
function loadSavedAnswer() {
  const savedAnswer = localStorage.getItem('answer');
  if (savedAnswer) {
    output.value = savedAnswer;
  }
}

// Initialize everything when page loads
window.addEventListener('load', () => {
  console.log('Page loaded, initializing...');
  
  // Load any saved answer
  loadSavedAnswer();
  
  // Start WebGazer after a short delay
  setTimeout(initWebGazer, 1000);
  
  // Verify keyboard was built
  const keyCount = document.querySelectorAll('.key').length;
  console.log('Keyboard has', keyCount, 'keys');
  
  if (keyCount === 0) {
    console.error('Keyboard not built! Rebuilding...');
    // Rebuild keyboard if missing
    keys.forEach(letter => {
      const btn = document.createElement("button");
      btn.innerText = letter;
      btn.className = "key";
      keyboardDiv.appendChild(btn);
      btn.onclick = () => handleKey(letter);
    });
    
    // Create SPACE key with special class
    const spaceBtn = document.createElement("button");
    spaceBtn.innerText = "SPACE";
    spaceBtn.className = "key space-key";
    keyboardDiv.appendChild(spaceBtn);
    spaceBtn.onclick = () => handleKey("SPACE");

    // Create BACK key with special class
    const backBtn = document.createElement("button");
    backBtn.innerText = "BACK";
    backBtn.className = "key back-key";
    keyboardDiv.appendChild(backBtn);
    backBtn.onclick = () => handleKey("BACK");
  }
});

// Clean up when page unloads
window.addEventListener('beforeunload', () => {
  if (webgazer && typeof webgazer.end === 'function') {
    try {
      webgazer.end();
    } catch (e) {
      console.log('Error stopping webgazer:', e);
    }
  }
});

// Handle window resize to adjust gaze tracking
window.addEventListener('resize', () => {
  // Reset smoothing on resize to prevent incorrect tracking
  smoothX = null;
  smoothY = null;
});

// Export functions for use in HTML
window.handleKey = handleKey;
window.submitAnswer = submitAnswer;
window.clearAnswer = clearAnswer;