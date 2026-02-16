const keyboardDiv = document.getElementById("keyboard");
const output = document.getElementById("output");
const questionText = document.getElementById("questionText");

const keys = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

let currentKey = null;
let gazeStartTime = null;
let typingLocked = false;
let webgazerInitialized = false;

const dwellTime = 500;

// Load question from localStorage if available
const savedQuestion = localStorage.getItem("question");
if (savedQuestion) {
  questionText.innerText = savedQuestion;
} else {
  questionText.innerText = "Type the word: CAT";
}

function optimizeCanvasReadPerformance() {
  const canvases = document.querySelectorAll("canvas");
  canvases.forEach(canvas => {
    try {
      canvas.getContext("2d", { willReadFrequently: true });
    } catch (e) {
      console.warn("Canvas optimization skipped:", e);
    }
  });
}

function createButton(label) {
  const btn = document.createElement("button");
  btn.innerText = label;
  btn.className = "key";
  keyboardDiv.appendChild(btn);
  btn.onclick = () => handleKey(label);
}

keys.forEach(letter => createButton(letter));
createButton("SPACE");
createButton("BACK");

function handleKey(label) {
  if (label === "SPACE") {
    output.value += " ";
  } else if (label === "BACK") {
    output.value = output.value.slice(0, -1);
  } else {
    output.value += label;
  }
}

// Initialize WebGazer
async function initWebGazer() {
  try {
    // Check if webgazer is available
    if (typeof webgazer === 'undefined') {
      console.error('WebGazer not loaded');
      setTimeout(initWebGazer, 1000);
      return;
    }

    console.log('Initializing WebGazer...');

    await webgazer
      .setRegression('ridge')
      .setTracker('TFFacemesh')
      .setGazeListener((data, elapsedTime) => {
        if (data == null) return;

        const x = data.x;
        const y = data.y;

        let hoveredKey = null;
        const allKeys = document.querySelectorAll(".key");

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

        allKeys.forEach(key => key.classList.remove("active"));

        if (hoveredKey) {
          hoveredKey.classList.add("active");

          if (currentKey === hoveredKey) {
            if (!gazeStartTime) gazeStartTime = Date.now();

            if (Date.now() - gazeStartTime > dwellTime && !typingLocked) {
              typingLocked = true;
              handleKey(hoveredKey.innerText);

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

    webgazer.showVideo(true);
    webgazer.showFaceOverlay(true);
    webgazer.showFaceFeedbackBox(true);
    webgazer.showPredictionPoints(true);
    
    // Disable video mirroring
    webgazer.params.videoMirror = false;

    console.log('WebGazer initialized successfully');
    webgazerInitialized = true;

    // Style the video container
    setTimeout(() => {
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
        
        // Style video element
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
        
        // Style all canvases
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

// Start WebGazer when page loads
window.addEventListener('load', () => {
  // Small delay to ensure DOM is ready
  setTimeout(initWebGazer, 1000);
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

function submitAnswer() {
  // Get the current answer
  const currentAnswer = output.value;
  
  // Save answer to localStorage for teacher to see
  localStorage.setItem("answer", currentAnswer);
  
  // Also save with timestamp
  localStorage.setItem("answer_timestamp", new Date().toLocaleString());
  
  // Show confirmation
  alert("Answer submitted: " + currentAnswer);
  
  // Log for debugging
  console.log("Answer saved to localStorage:", currentAnswer);
}