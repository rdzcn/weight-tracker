# Weight Tracker

A personal weight tracking app with manual entry and OCR from photos.

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