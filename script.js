// ═══════════════════════════════════════════════════════
//  EyeAble — script.js
//  Full-screen scattered keyboard, dwell typing
// ═══════════════════════════════════════════════════════

const output       = document.getElementById('output');
const questionText = document.getElementById('questionText');
const keyCanvas    = document.getElementById('keyCanvas');
const gazePointer  = document.getElementById('gazePointer');
const dbgEl        = document.getElementById('dbg');

const KEY_DWELL    = 500;
const SUBMIT_DWELL = 500;
const COOLDOWN     = 600;
const ALPHA        = 0.08;
const CAND_STABLE  = 180;

let gx = window.innerWidth / 2, gy = window.innerHeight / 2;
let sx = null, sy = null;
let gazeReady     = false;
let gazeCallCount = 0;

let zones      = [];
let curZone    = null, dwellStart = null;
let candZone   = null, candTime   = 0;
let lastFired  = 0,   locked     = false;

// ── debug ────────────────────────────────────────────────
function dbg(extra) {
  dbgEl.innerHTML =
    `calls:${gazeCallCount} ready:${gazeReady}<br>` +
    `gaze:(${Math.round(gx)},${Math.round(gy)})<br>` +
    `zone:${curZone ? curZone.key : '—'} ` +
    `held:${dwellStart ? (Date.now()-dwellStart)+'ms' : '—'}<br>` +
    `ans:"${output.value}" ` + (extra||'');
}

// ── gaze listener ────────────────────────────────────────
function onGaze(data) {
  if (!data || data.x == null) return;
  gazeCallCount++;
  if (sx === null) { sx = data.x; sy = data.y; }
  sx += ALPHA * (data.x - sx);
  sy += ALPHA * (data.y - sy);
  gx = sx; gy = sy;
  gazePointer.style.left = gx + 'px';
  gazePointer.style.top  = gy + 'px';
}

// ── scatter keys across full screen ─────────────────────
function buildKeyboard() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const allKeys = [...letters, 'SPACE', 'BACK'];

  // Available area: below answer bar (110px from top), above submit (90px from bottom)
  // Leave 40px padding on sides
  const PAD_X  = 40;
  const PAD_Y  = 10;
  const TOP    = 110 + PAD_Y;
  const BOTTOM = window.innerHeight - 90;
  const LEFT   = PAD_X;
  const RIGHT  = window.innerWidth - PAD_X;

  const areaW  = RIGHT - LEFT;
  const areaH  = BOTTOM - TOP;

  // Fit keys into a grid that fills the space
  // 28 keys → try 7 cols × 4 rows
  const COLS   = 7;
  const ROWS   = Math.ceil(allKeys.length / COLS);  // 4
  const KEY_W  = 80;
  const KEY_H  = 80;

  const cellW  = areaW / COLS;
  const cellH  = areaH / ROWS;

  keyCanvas.innerHTML = '';

  allKeys.forEach((k, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);

    // Center of this cell
    const cx = LEFT + cellW * col + cellW / 2;
    const cy = TOP  + cellH * row + cellH / 2;

    const btn = document.createElement('button');
    btn.className = 'key' + (k === 'SPACE' ? ' space-key' : k === 'BACK' ? ' back-key' : '');
    btn.textContent = k;
    btn.dataset.key = k;

    const w = k === 'SPACE' ? 160 : k === 'BACK' ? 120 : KEY_W;
    const h = (k === 'SPACE' || k === 'BACK') ? 60 : KEY_H;

    btn.style.left   = (cx - w / 2) + 'px';
    btn.style.top    = (cy - h / 2) + 'px';
    btn.style.width  = w + 'px';
    btn.style.height = h + 'px';

    btn.addEventListener('click', () => typeKey(k));
    keyCanvas.appendChild(btn);
  });
}

// ── cache hit zones ──────────────────────────────────────
function buildZones() {
  zones = [];
  document.querySelectorAll('.key').forEach(el => {
    const r = el.getBoundingClientRect();
    zones.push({ el, key: el.dataset.key, x1:r.left, y1:r.top, x2:r.right, y2:r.bottom, dwell:KEY_DWELL });
  });
  const sb = document.getElementById('submitBtn');
  if (sb) {
    const r = sb.getBoundingClientRect();
    zones.push({ el:sb, key:'__SUBMIT__', x1:r.left, y1:r.top, x2:r.right, y2:r.bottom, dwell:SUBMIT_DWELL });
  }
  dbgEl.innerHTML = `zones:${zones.length} — stare at a key to type!`;
}

window.addEventListener('resize', () => {
  sx=null; sy=null; curZone=null; dwellStart=null; candZone=null;
  buildKeyboard();
  setTimeout(buildZones, 300);
});

function findZone(x, y) {
  for (let z of zones) if (x>=z.x1 && x<=z.x2 && y>=z.y1 && y<=z.y2) return z;
  return null;
}

// ── progress ─────────────────────────────────────────────
function setProg(z, f) {
  if (!z) return;
  f = Math.min(Math.max(f,0),1);
  z.el.style.setProperty('--dwell-progress',(f*100)+'%');
  if (z.el.classList.contains('key')) {
    const fade = Math.round(220*(1-f));
    z.el.style.background = `rgb(${Math.round(10+245*f)},${fade},${fade})`;
  }
}
function clrProg(z) {
  if (!z) return;
  z.el.style.setProperty('--dwell-progress','0%');
  z.el.style.background = '';
  z.el.classList.remove('active','gazing');
}

// ── RAF loop ─────────────────────────────────────────────
function loop() {
  const now = Date.now();
  const hz  = gazeReady ? findZone(gx, gy) : null;

  document.querySelectorAll('.key.active').forEach(k=>k.classList.remove('active'));
  const sb = document.getElementById('submitBtn');
  if (sb) sb.classList.remove('gazing');
  if (hz) { hz.key==='__SUBMIT__' ? hz.el.classList.add('gazing') : hz.el.classList.add('active'); }

  dbg(hz ? `(${hz.key})` : '');

  if (!gazeReady) { requestAnimationFrame(loop); return; }

  if (hz !== curZone) {
    if (hz !== candZone) { candZone=hz; candTime=now; }
    else if (now-candTime >= CAND_STABLE) {
      clrProg(curZone); curZone=hz; dwellStart=hz?now:null; candZone=null;
    }
    requestAnimationFrame(loop); return;
  }

  if (!curZone) { requestAnimationFrame(loop); return; }
  if (!dwellStart) dwellStart = now;

  const held = now - dwellStart;
  setProg(curZone, held / curZone.dwell);

  if (held >= curZone.dwell && !locked && (now-lastFired)>COOLDOWN) {
    locked=true; lastFired=now;
    clrProg(curZone);
    const fired = curZone;
    fired.key==='__SUBMIT__' ? submitAnswer() : typeKey(fired.key);
    fired.el.style.background = 'rgba(0,255,170,0.45)';
    setTimeout(() => { fired.el.style.background=''; locked=false; }, COOLDOWN);
    curZone=null; dwellStart=null; candZone=null;
  }

  requestAnimationFrame(loop);
}

// ── type ─────────────────────────────────────────────────
function typeKey(k) {
  if (k==='SPACE') output.value+=' ';
  else if (k==='BACK') output.value=output.value.slice(0,-1);
  else output.value+=k;
  localStorage.setItem('answer', output.value);
}

// ── load question ─────────────────────────────────────────
function loadQuestion() {
  if (window.database) {
    window.database.ref('currentQuestion').once('value')
      .then(s => {
        const q = s.val();
        questionText.innerText = q || localStorage.getItem('question') || 'Type the word: CAT';
        if (q) localStorage.setItem('question', q);
      })
      .catch(() => { questionText.innerText = localStorage.getItem('question') || 'Type the word: CAT'; });
  } else {
    questionText.innerText = localStorage.getItem('question') || 'Type the word: CAT';
  }
}

// ── WebGazer init ─────────────────────────────────────────
async function initWebGazer() {
  if (typeof webgazer === 'undefined') { setTimeout(initWebGazer, 1000); return; }
  try {
    await webgazer
      .setRegression('ridge')
      .setTracker('TFFacemesh')
      .setGazeListener(onGaze)
      .begin();
    webgazer.showVideo(true);
    webgazer.showFaceOverlay(true);
    webgazer.showFaceFeedbackBox(true);
    webgazer.showPredictionPoints(false);
    webgazer.params.videoMirror = false;

    requestAnimationFrame(loop);

    setTimeout(() => {
      buildZones();
      gazeReady = true;
      styleCamera();
      dbgEl.innerHTML = 'READY — stare at a key for 0.5s to type';
    }, 2000);

  } catch(e) {
    dbgEl.innerHTML = 'WebGazer error — allow camera & refresh<br>' + e;
  }
}

function styleCamera() {
  const vc = document.getElementById('webgazerVideoContainer');
  if (!vc) return;
  Object.assign(vc.style, {
    position:'fixed', top:'54px', right:'16px', left:'auto',
    width:'150px', height:'110px', overflow:'hidden',
    border:'1px solid rgba(26,111,255,0.4)', borderRadius:'10px',
    background:'#000', boxShadow:'0 0 20px rgba(26,111,255,0.2)', zIndex:'9999'
  });
  const v = vc.querySelector('video');
  if (v) Object.assign(v.style,{width:'100%',height:'100%',objectFit:'cover',position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)'});
  vc.querySelectorAll('canvas').forEach(c=>Object.assign(c.style,{width:'100%',height:'100%',position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',pointerEvents:'none'}));
}

// ── submit / clear ────────────────────────────────────────
function submitAnswer() {
  const ans = output.value;
  if (!ans.trim()) { alert('Nothing typed yet!'); return; }
  const user = firebase.auth().currentUser;
  if (!user) { alert('Not logged in'); return; }
  localStorage.setItem('answer', ans);
  if (window.database) {
    window.database.ref('answers').push({
      text:ans, studentId:user.uid, studentEmail:user.email,
      studentName:user.displayName||user.email,
      timestamp:Date.now(), question:questionText.innerText
    }).then(()=>alert('✅ Submitted: '+ans)).catch(()=>alert('Saved locally: '+ans));
  } else { alert('Saved locally: '+ans); }
}
function clearAnswer() { output.value=''; localStorage.removeItem('answer'); }

// ── boot ──────────────────────────────────────────────────
window.addEventListener('load', () => {
  buildKeyboard();
  loadQuestion();
  const saved = localStorage.getItem('answer');
  if (saved) output.value = saved;
  setTimeout(initWebGazer, 800);
});
window.addEventListener('beforeunload', () => { if(typeof webgazer!=='undefined') try{webgazer.end();}catch(e){} });

window.typeKey      = typeKey;
window.submitAnswer = submitAnswer;
window.clearAnswer  = clearAnswer;