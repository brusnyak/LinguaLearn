# LinguaLearn Update Plan

## Phase 1: Critical Fixes

### 1.1 DB Version Mismatch Fix

- [x] Understand the issue: App uses version 3, cache has version 5
- [x] Fix: Update db.ts to use version 5 consistently
- [ ] Fix: Ensure all IndexedDB opens use version 5

### 1.2 Fix FlashcardGame Hooks Issue

- [ ] Fix: Ensure hooks are called in consistent order
- [ ] Fix: Add boundaries to prevent crashes

### 1.3 Fix Login/Auth DB Loading

- [ ] Fix: Update auth.ts to use proper DB version

## Phase 2: API Integration

### 2.1 Switch from Google Gemini to OpenRouter

- [ ] Install openrouter SDK
- [ ] Create openrouter service
- [ ] Update gemini.ts to use OpenRouter
- [ ] Handle story generation with OpenRouter

### 2.2 Keep Translation Fallbacks

- [ ] Maintain LibreTranslate, MyMemory, Google fallbacks

## Phase 3: Excel/CSV Import

### 3.1 File Import Service

- [ ] Create import service for CSV
- [ ] Create import service for XLSX
- [ ] Handle both term/translation and full word objects

### 3.2 Import UI

- [ ] Add import button to Dictionary
- [ ] Add file picker (CSV/XLSX)
- [ ] Show import preview
- [ ] Confirm and save

## Phase 4: New Exercises

### 4.1 Real-World Training Exercises

- [ ] Scenario-based exercises
- [ ] Context-aware translations
- [ ] Situational phrases

### 4.2 Exercise Types

- [ ] Restaurant/Food ordering
- [ ] Directions/Transportation
- [ ] Shopping
- [ ] Social interactions

## Phase 5: UI Updates

### 5.1 Word Builder Fixes

- [ ] Show word count (remaining/total)
- [ ] Show translation clearly in English
- [ ] Fix error on last word completion
- [ ] Better hint system

### 5.2 General UI Improvements

- [ ] Loading states
- [ ] Error handling
- [ ] Better feedback

## Phase 6: Testing & Deployment

### 6.1 Local Testing

- [ ] Test all games work
- [ ] Test import works
- [ ] Test auth works
- [ ] Test offline mode

### 6.2 Deploy

- [ ] Push to GitHub
- [ ] Deploy to Vercel
- [ ] Verify production

---

## Notes

- OpenRouter key already in .env: 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
- TMDB key also available
- Need xlsx library for Excel import
