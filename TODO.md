# LinguaLearn Update Plan - 2024

## Current Status: ✅ Most Features Implemented

## Phase 1: Fix Warnings & Dependencies (In Progress)

### 1.1 Update Browserslist Database

- [x] Run update-browserslist-db

### 1.2 Update baseline-browser-mapping

- [x] Install baseline-browser-mapping@latest

## Phase 2: Word Builder Improvements (In Progress)

### 2.1 Show Word Count (X/5 words remaining)

- [x] Add remaining words counter to header

### 2.2 Show Translation Clearly

- [x] Add "Translate to English" label

### 2.3 Tighten Validation

- [x] Reject phrases, accept only single words (3-15 letters)

## Phase 3: Real World Practice Enhancements

### 3.1 Scenario-Based Exercises

- [x] Already implemented with 6 scenarios

### 3.2 More Context-Aware

- [x] Added scenario prompts per word

## Phase 4: Test Import

### 4.1 CSV/XLSX Import

- [x] Import service fully implemented
- [x] Dictionary page has import UI
- [ ] Test with actual files

## Phase 5: Deployment

- [ ] Push to GitHub
- [ ] Deploy to Vercel

---

## Notes

- OpenRouter already configured (API key in .env as VITE_OPENROUTER_API_KEY)
- Excel import using xlsx library (already installed)
- All translations use OpenRouter as primary with fallbacks
