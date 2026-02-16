# 👁️ EyeAble

**EyeAble** is an assistive technology web application that enables users to type using eye gaze control. Built with WebGazer.js, it provides a complete solution for students with motor impairments to communicate through gaze-based typing, while teachers can remotely assign questions and monitor responses.

## ✨ Features

### 👨‍🎓 Student Portal
- **Gaze-Controlled Keyboard**: Type by looking at keys with adjustable dwell time
- **Real-Time Visual Feedback**: Keys highlight when being focused on
- **Dwell-Based Selection**: Maintain gaze on a key for 500ms to trigger typing
- **Camera Feed Display**: See your camera feed with gaze prediction overlay
- **Auto-Save**: Answers are automatically saved locally

### 👩‍🏫 Teacher Dashboard
- **Question Management**: Create and save typing exercises for students
- **Real-Time Answer Monitoring**: View student responses as they're submitted
- **Auto-Refresh**: Dashboard automatically checks for new answers every 2 seconds
- **Answer History**: Timestamps show when answers were submitted
- **Debug Panel**: View localStorage contents for troubleshooting

### 🔐 Authentication System
- **Role-Based Access**: Separate portals for students and teachers
- **Persistent Sessions**: Stay logged in until manually logging out
- **Secure Routing**: Automatic redirection based on user role
- **Logout Functionality**: Clear session data on exit

## 🚀 Getting Started

### Prerequisites
- Modern web browser (Chrome, Firefox, Edge recommended)
- Working webcam for eye tracking
- Local web server (optional - can run directly in browser)
