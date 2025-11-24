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
import LoginPage from './pages/LoginPage';
import MasteredWordsPage from './pages/MasteredWordsPage';
import ReadingPracticePage from './pages/ReadingPracticePage';
import StoryReaderPage from './pages/StoryReaderPage';
import { db } from './services/db';
import { INITIAL_WORDS } from './data/seed';
import { ToastProvider } from './context/ToastContext';
import { getCurrentUser } from './services/auth';

function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        await db.seedInitialData(INITIAL_WORDS);

        // Check if user is logged in
        const currentUser = await getCurrentUser();

        if (!currentUser) {
          // No user logged in - need to login
          setNeedsAuth(true);
        } else {
          // User logged in - check if they have profile
          const settings = await db.getSettings();
          if (!settings?.profile?.name) {
            setNeedsOnboarding(true);
          }
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
          <Route path="/login" element={<LoginPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          {needsAuth ? (
            <Route path="*" element={<LoginPage />} />
          ) : needsOnboarding ? (
            <Route path="*" element={<OnboardingPage />} />
          ) : (
            <>
              {/* Regular routes with normal layout */}
              <Route path="/" element={<Layout><HomePage /></Layout>} />
              <Route path="/dictionary" element={<Layout><DictionaryPage /></Layout>} />
              <Route path="/dictionary/:id" element={<Layout><WordDetailPage /></Layout>} />
              <Route path="/games" element={<Layout><GamesPage /></Layout>} />
              <Route path="/content" element={<Layout><ContentSuggestionsPage /></Layout>} />
              <Route path="/settings" element={<Layout><SettingsPage /></Layout>} />
              <Route path="/mastered" element={<Layout><MasteredWordsPage /></Layout>} />
              <Route path="/reading" element={<Layout><ReadingPracticePage /></Layout>} />
              <Route path="/reading/:storyId" element={<Layout><StoryReaderPage /></Layout>} />

              {/* Game routes with fullscreen layout (no header/footer) */}
              <Route path="/games/dungeon" element={<Layout fullscreen><VocabDungeonPage /></Layout>} />
              <Route path="/games/flashcards" element={<Layout fullscreen><FlashcardGamePage /></Layout>} />
              <Route path="/games/word-match" element={<Layout fullscreen><WordMatchPage /></Layout>} />
            </>
          )}
        </Routes>
      </Router>
    </ToastProvider>
  );
}

export default App;
