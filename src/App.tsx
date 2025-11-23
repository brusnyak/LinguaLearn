import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import DictionaryPage from './pages/DictionaryPage';
import WordDetailPage from './pages/WordDetailPage';
import GamesPage from './pages/GamesPage';
import VocabDungeonPage from './pages/VocabDungeonPage';
import FlashcardGamePage from './pages/FlashcardGamePage';
import WordMatchPage from './pages/WordMatchPage';
import ContentSuggestionsPage from './pages/ContentSuggestionsPage';
import SettingsPage from './pages/SettingsPage';
import OnboardingPage from './pages/OnboardingPage';
import { db } from './services/db';
import { INITIAL_WORDS } from './data/seed';
import { ToastProvider } from './context/ToastContext';

function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        await db.seedInitialData(INITIAL_WORDS);
        const settings = await db.getSettings();
        if (!settings?.profile?.name) {
          setNeedsOnboarding(true);
        }
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize DB:', error);
        setIsInitialized(true);
      }
    };
    init();
  }, []);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] text-[var(--color-primary)]">
        <div className="animate-pulse font-bold text-xl">LinguaLearn...</div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <Router>
        <Routes>
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="*" element={
            needsOnboarding ? (
              <OnboardingPage />
            ) : (
              <Layout>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/dictionary" element={<DictionaryPage />} />
                  <Route path="/word/:id" element={<WordDetailPage />} />
                  <Route path="/games" element={<GamesPage />} />
                  <Route path="/games/dungeon" element={<VocabDungeonPage />} />
                  <Route path="/games/flashcards" element={<FlashcardGamePage />} />
                  <Route path="/games/word-match" element={<WordMatchPage />} />
                  <Route path="/content" element={<ContentSuggestionsPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Routes>
              </Layout>
            )
          } />
        </Routes>
      </Router>
    </ToastProvider>
  );
}

export default App;
