# Weight Tracker - Copilot Instructions

## Project Architecture

This is a **monorepo with three independent services** sharing a single backend API:

```
weight-tracker/
├── server/        # FastAPI backend (Python) - runs on http://localhost:8000
├── client/        # React web app (TypeScript) - runs on http://localhost:5174  
├── mobile/        # React Native iOS app (Expo) - connects to same backend
└── README.md      # Full setup instructions
```

### Key Design: Shared Backend API

All three frontends communicate with the same FastAPI server. The API uses:
- **SQLite database** at `server/weight.db` for persistence
- **FormData** for multipart requests (weight + image uploads)
- **CORS** enabled for frontend origins only

## Technology Stack

| Layer | Technology | Key Details |
|-------|-----------|------------|
| **Backend** | Python FastAPI | SQLAlchemy ORM, SQLite, Pytesseract OCR |
| **Web Frontend** | React 19 + TypeScript | Vite (port 5174), Tailwind CSS v4, shadcn/ui |
| **Mobile** | React Native (Expo) | iOS only, Expo Image Picker |
| **Styling** | Tailwind CSS v4 | Uses `@import "tailwindcss"` (new v4 syntax) |
| **Components** | shadcn/ui | Button, Input, Card (installed via CLI) |

## Critical Workflows

### Running All Services

**Terminal 1 - Backend:**
```bash
cd server
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python main.py  # Runs on http://localhost:8000
```

**Terminal 2 - Web Frontend:**
```bash
cd client
pnpm install
pnpm dev  # Runs on http://localhost:5174
```

**Terminal 3 - Mobile (Expo):**
```bash
cd mobile
npm install
npm start  # Then press 'i' for iOS simulator
```

### Build & Deployment

- **Client:** `cd client && pnpm build` → `dist/` folder
- **Mobile:** Uses Expo for iOS distribution
- **Server:** Standard Python deployment with FastAPI/Uvicorn

## API Endpoints

All endpoints in `server/main.py`:

```python
POST /weight          # Submit weight (manual or image)
  - Form: weight (float), image (file optional)
  - Returns: {id, weight, timestamp, method}

GET /weights          # Fetch all entries
  - Query params: start, end (ISO timestamps for filtering)
  - Returns: [{id, weight, timestamp, method}, ...]

DELETE /weight/{id}   # Delete an entry
  - Returns: {id, message}
```

### Weight Entry Structure
```typescript
interface WeightEntry {
  id: number;
  weight: number;  // kg
  timestamp: string;  // ISO format
  method: string;  // 'manual' or 'ocr'
}
```

## Project-Specific Patterns

### Date Formatting
Both client and mobile use **consistent custom format**: `[Day of week, dd/MM/YYYY HH:mm]`
- Example: "Monday, 30/01/2026 14:35"
- See `formatDate()` function in App.tsx (client) and App.tsx (mobile)

### Component Architecture (Client)
- **shadcn/ui components** use path alias `@/lib/utils` (configured in tsconfig + vite.config)
- Components at `src/components/ui/` (Button, Input, Card)
- Single-file app: `src/App.tsx` contains all logic (can be split into features later)

### State Management (Both Web & Mobile)
- Simple React hooks (useState, useEffect, useRef)
- Fetch API directly (no HTTP client library)
- Loading state: `isLoading` boolean for async operations
- Deletion state: `deletingId` to track which entry is being deleted

### Image Upload Pattern
- Client: File input ref → FormData → POST to `/weight`
- Mobile: Expo ImagePicker → FormData → POST to `/weight`
- Server automatically extracts weight using Tesseract OCR

### Error Handling
- Client: `alert()` for user-facing errors, `console.error()` for debugging
- Mobile: `Alert.alert()` native dialogs
- Confirmation dialogs before destructive actions (delete)

## Integration Points & Gotchas

### CORS Configuration
- Server allows only `http://localhost:5174` (web frontend)
- Mobile uses `http://localhost:8000` directly (no CORS restrictions needed locally)
- **Change CORS origins before production!**

### Database
- SQLite file persists at `server/weight.db`
- Deleting `weight.db` resets all data
- No migrations setup yet - schema created on first run via `Base.metadata.create_all()`

### Tailwind CSS v4 Breaking Changes
- New import syntax: `@import "tailwindcss"` (not `@tailwind` directives)
- Requires `@tailwindcss/postcss` package (not legacy `tailwindcss`)
- PostCSS config: only `@tailwindcss/postcss` plugin needed

### TypeScript Path Aliases
- Configured for client: `@/*` → `src/*`
- Update both files when adding paths: `tsconfig.app.json` + `vite.config.ts`
- All shadcn/ui component imports use `@/lib/utils`

## File Structure Reference

**Key Files:**
- `server/main.py` - All API endpoints, database models, OCR logic
- `client/src/App.tsx` - Web UI (single component, 218 lines)
- `mobile/App.tsx` - Mobile UI (single component)
- `client/src/components/ui/` - shadcn/ui components
- `client/tailwind.config.js` - Tailwind content configuration
- `.gitignore` - Handles venv/, node_modules, *.db, .expo/

## When Adding Features

1. **Backend-first:** Add endpoint to `server/main.py`, test with curl/Postman
2. **Type-first:** Define interfaces matching backend response structure
3. **Both UIs:** Implement in both `client/src/App.tsx` AND `mobile/App.tsx` (keep in sync)
4. **Date/Time:** Always use `formatDate()` for consistency
5. **Loading States:** Track with `isLoading` and `deletingId` patterns shown in current code

## Quick Reference: Common Tasks

| Task | Command | Location |
|------|---------|----------|
| Add new API endpoint | Edit `server/main.py` | Lines 42-92 |
| Add UI component | `cd client && npx shadcn@latest add [component]` | `src/components/ui/` |
| Update date format | Modify `formatDate()` function | App.tsx (both) |
| Change CORS origin | Edit `allow_origins` list | `server/main.py` line 18 |
| Install Python deps | `pip install -r requirements.txt` | `server/` |
| Install JS deps | `pnpm install` (web) or `npm install` (mobile) | `client/` or `mobile/` |
