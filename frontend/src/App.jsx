import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import LocalityDetail from './pages/LocalityDetail';
import Compare from './pages/Compare';
import Insights from './pages/Insights';

export default function App() {
  const [activePage, setActivePage] = useState('home');
  const [selectedLocalityId, setSelectedLocalityId] = useState(null);
  const [comparedIds, setComparedIds] = useState([]);
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' ||
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  // Sync dark class on root document
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const handleSelectLocality = (id) => {
    setSelectedLocalityId(id);
    setActivePage('detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCompareLocalities = (ids) => {
    setComparedIds(ids);
    setActivePage('compare');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToHome = () => {
    setActivePage('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface-light dark:bg-surface-darkBg text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <Navbar
        activePage={activePage}
        setActivePage={(page) => {
          setActivePage(page);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        isDark={isDark}
        setIsDark={setIsDark}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {activePage === 'home' && (
          <Home
            onSelectLocality={handleSelectLocality}
            onCompareLocalities={handleCompareLocalities}
            comparedIds={comparedIds}
            setComparedIds={setComparedIds}
            isDark={isDark}
          />
        )}

        {activePage === 'detail' && (
          <LocalityDetail
            localityId={selectedLocalityId}
            onBack={handleBackToHome}
            onCompare={(ids) => handleCompareLocalities(ids)}
            isDark={isDark}
          />
        )}

        {activePage === 'compare' && (
          <Compare
            selectedIds={comparedIds}
            setSelectedIds={setComparedIds}
            onSelectLocality={handleSelectLocality}
            isDark={isDark}
          />
        )}

        {activePage === 'insights' && (
          <Insights
            onSelectLocality={handleSelectLocality}
            isDark={isDark}
          />
        )}
      </main>

      <Footer />
    </div>
  );
}
