# LinguaLearn 🌍

A Progressive Web App (PWA) for language learning with interactive games, spaced repetition, and immersive content recommendations.

## 🚀 Live Demo

**Try it now:** [lingua-learn.vercel.app](https://lingua-learn-mtluc4bao-brusnyaks-projects.vercel.app)

> Install as a PWA on your phone or desktop for the best experience!

## Features

- 📚 **Dictionary Management**: Add and organize words and phrases
- 🎮 **Interactive Games**:
  - Vocab Dungeon (5 progressive levels)
  - Flashcards with spaced repetition
  - Word Match memory game
- ⭐ **Mastery Tracking**: Track word mastery with visual indicators
- 🎬 **Content Suggestions**: Movies and TV shows in your target language (powered by TMDb)
- 🔔 **Push Notifications**: Daily practice reminders
- 📅 **Activity Calendar**: Track your learning streak
- 🎨 **Customizable UI**: Multiple themes, fonts, and text sizes
- 🔊 **Sound Effects**: Audio feedback for interactions
- 📱 **PWA Support**: Install on mobile/desktop, works offline

## Tech Stack

- **React** + **TypeScript**
- **Vite** for build tooling
- **IndexedDB** for local data storage
- **Framer Motion** for animations
- **TMDb API** for content recommendations
- **Service Workers** for PWA functionality

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
# Clone the repository
git clone https://github.com/brusnyak/LinguaLearn.git
cd LinguaLearn

# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Add your TMDb API key to .env

# Start development server
npm run dev
```

### Environment Variables

Create a `.env` file with:

```
VITE_TMDB_API_KEY=your_tmdb_api_key
```

Get your TMDb API key at: https://www.themoviedb.org/settings/api

### Build for Production

```bash
npm run build
npm run preview
```

## Deployment

### Vercel (Recommended)

1. Install Vercel CLI: `npm i -g vercel`
2. Deploy: `vercel`
3. Add `VITE_TMDB_API_KEY` in Vercel dashboard under Environment Variables

### Netlify

1. Build: `npm run build`
2. Deploy the `dist` folder

## License

MIT

## Acknowledgments

- Movie/TV data provided by [TMDb](https://www.themoviedb.org/)
- Icons by [Lucide](https://lucide.dev/)
