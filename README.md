# weight-tracker

**Know your numbers, own your progress.**

A privacy-first weight tracking app that keeps your data yours. Log entries manually, snap a photo of your scale, import existing records from a CSV file, and watch your progress unfold in an interactive chart — all behind a passwordless magic-link login.

---

## What it does

### Passwordless login
No passwords. Enter your email, receive a magic link, and you're in. Sessions are JWT-based and short-lived.

### Log your weight
Add an entry manually by typing your weight directly. Each entry is timestamped and stored per user.

### OCR from a photo
Point your camera at your scale display and the app reads the number for you using Tesseract OCR — no typing required.

### Edit and delete entries
Every entry can be corrected or removed. Your history stays accurate.

### Interactive chart
A line chart visualises your weight over time. Filter by date range to zoom in on a specific period and spot trends at a glance.

### Import from CSV
Already tracking your weight in a spreadsheet? Upload a `.csv` file and all historical entries are imported in one shot.

### Export your data
Your data is always yours. Export everything as a CSV file at any time.

---

## Backend (Python FastAPI)

Located in `server/` folder.

### Setup

1. Install Python 3.8+
2. Create virtual environment: `python3 -m venv venv`
3. Activate: `source venv/bin/activate`
4. Install dependencies: `pip install -r requirements.txt`
5. Install Tesseract OCR: `brew install tesseract` (on macOS)
6. Run: `python main.py`

API runs on http://localhost:8000

## Frontend (React TypeScript)

Located in `client/` folder.

### Setup

1. Install pnpm
2. Install dependencies: `pnpm install`
3. Run dev server: `pnpm dev`

## Mobile App (React Native Expo)

Located in `mobile/` folder. iOS only.

### Setup

1. Install Expo CLI: `npm install -g @expo/cli`
2. Install dependencies: `cd mobile && npm install`
3. Run: `npm start` or `expo start`
4. For iOS: `npm run ios` (requires Xcode and iOS Simulator)

App connects to the same backend API.