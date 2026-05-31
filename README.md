# 👁️ EyeAble

**EyeAble** is an assistive technology web application that enables students with motor impairments to communicate and complete assignments through eye gaze alone. Using a standard webcam, students look at keys on an on-screen keyboard to type — no hands, no touch, no click required.

Teachers get a dedicated dashboard to create assignments and monitor student submissions in real time.

> Built with [WebGazer.js](https://webgazer.cs.brown.edu/) and [Firebase](https://firebase.google.com/). Deployable as a fully static site — no server required.

---

## ✨ Features

### 👨‍🎓 Student Portal
- **Gaze-Controlled Keyboard** — Type by looking at keys; a key is selected after a 600ms dwell (no clicking needed)
- **Real-Time Visual Feedback** — Keys highlight in gold as you look at them, and a visible gaze dot shows where the camera thinks you're looking
- **Assignment List** — See all assignments posted by the teacher and tap/gaze to select one
- **No-Scroll Layout** — The entire interface fits in one screen, designed specifically for users who cannot scroll
- **Camera Preview** — Live webcam feed with face mesh overlay shown in the corner so students can self-calibrate

### 👩‍🏫 Teacher Dashboard
- **Assignment Management** — Create assignments with a title and description; delete them when done
- **Submission Viewer** — See every student's answer, which assignment it was for, and when it was submitted
- **Filter by Assignment** — Quickly find all answers to a specific task
- **Live Statistics** — See total assignments, total submissions, and number of active students at a glance
- **Real-Time Updates** — New student answers appear automatically without refreshing

### 🔐 Authentication
- **Email/Password Sign-Up and Login**
- **Google Sign-In**
- **Role-Based Routing** — Students land on the student portal; teachers land on the dashboard; wrong-role access is blocked automatically
- **Secure Firebase Rules** — Database rules enforce that only teachers can write assignments, only authenticated users can submit answers, and users can only read their own profile

---

## 🗂️ Project Structure

```
eyeable/
├── index.html       # Student portal (eye-tracking keyboard + assignment submission)
├── teacher.html     # Teacher dashboard (assignment creation + answer monitoring)
├── login.html       # Login / sign-up page (email + Google auth)
└── style.css        # Shared base styles
```

No build step. No `node_modules`. No bundler. Drop the four files in a folder and it works.

---

## 🚀 Deployment (Vercel)

1. Push all four files to a GitHub repository (in the root or a subfolder)
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import your repo
3. Set the following:

| Setting | Value |
|---|---|
| Framework Preset | **Other** |
| Build Command | *(leave empty)* |
| Output Directory | *(leave empty)* |
| Root Directory | `.` (or wherever your files are) |

4. Click **Deploy** — done.

---

## 🔧 Firebase Setup

EyeAble uses Firebase for authentication and the Realtime Database. To run your own instance:

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Authentication** → Email/Password and Google providers
3. Enable **Realtime Database** and set the following security rules:

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid",
        ".validate": "newData.hasChildren(['name', 'email', 'role', 'createdAt'])",
        "name":      { ".validate": "newData.isString() && newData.val().length > 0" },
        "email":     { ".validate": "newData.isString() && newData.val().matches(/^[^@]+@[^@]+$/)" },
        "role":      { ".validate": "newData.isString() && (newData.val() === 'teacher' || newData.val() === 'student')" },
        "createdAt": { ".validate": "newData.isString()" }
      }
    },
    "assignments": {
      ".read": "auth != null",
      ".write": "auth != null && root.child('users/' + auth.uid + '/role').val() === 'teacher'",
      "$assignmentId": {
        ".validate": "newData.hasChildren(['title', 'createdAt'])",
        "title":       { ".validate": "newData.isString() && newData.val().length > 0" },
        "description": { ".validate": "newData.isString()" },
        "createdAt":   { ".validate": "newData.isNumber()" },
        "$other":      { ".validate": false }
      }
    },
    "answers": {
      ".read": "auth != null && root.child('users/' + auth.uid + '/role').val() === 'teacher'",
      ".write": "auth != null",
      "$answerId": {
        ".validate": "newData.hasChildren(['text', 'studentId', 'timestamp'])",
        "text":            { ".validate": "newData.isString() && newData.val().length <= 5000" },
        "studentId":       { ".validate": "newData.isString() && newData.val() === auth.uid" },
        "studentEmail":    { ".validate": "newData.isString()" },
        "studentName":     { ".validate": "newData.isString()" },
        "timestamp":       { ".validate": "newData.isNumber() && newData.val() <= now" },
        "question":        { ".validate": "newData.isString()" },
        "assignmentId":    { ".validate": "newData.isString()" },
        "assignmentTitle": { ".validate": "newData.isString()" },
        "$other":          { ".validate": false }
      }
    },
    "currentQuestion": {
      ".read": "auth != null",
      ".write": "auth != null && root.child('users/' + auth.uid + '/role').val() === 'teacher'",
      ".validate": "newData.isString()"
    }
  }
}
```

4. Copy your Firebase config object and replace the `firebaseConfig` block in each HTML file:

```js
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

---

## 🌐 Browser Requirements

| Requirement | Notes |
|---|---|
| Webcam | Required for eye tracking |
| Camera permission | Must be granted when the browser prompts |
| Browser | Chrome or Edge recommended — best WebGazer support |
| JavaScript | Must be enabled |

Eye tracking accuracy improves after a few seconds as WebGazer calibrates to the user's face. For best results, ensure good lighting and position the camera at eye level.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Eye tracking | [WebGazer.js](https://webgazer.cs.brown.edu/) v2.1 |
| Auth & Database | [Firebase](https://firebase.google.com/) v8 (Realtime Database) |
| Frontend | Vanilla HTML, CSS, JavaScript — no framework |
| Hosting | [Vercel](https://vercel.com/) (static) |

---

## ♿ Accessibility Design

EyeAble is designed from the ground up for users with motor impairments:

- **No keyboard or mouse required** — the entire student interface is operable by eye gaze only
- **No scrolling** — the student portal fits entirely within the viewport; nothing is hidden off-screen
- **Large key targets** — keyboard keys are generously sized to accommodate gaze imprecision
- **Dwell selection** — keys trigger after sustained gaze (600ms), not on first glance, to prevent accidental input
- **High-contrast active state** — focused keys turn bright gold so students can clearly confirm what they're selecting
- **Visible gaze dot** — a red dot shows where the system thinks the student is looking, enabling self-correction

---

## 📄 License

MIT — free to use, modify, and deploy.
