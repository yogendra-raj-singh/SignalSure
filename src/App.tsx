import { useCallback, useEffect, useState } from 'react';
import { Footer } from './components/Footer';
import { Navbar, type AppRoute } from './components/Navbar';
import type { ServerCapabilities } from './lib/types';
import { AboutPage } from './pages/AboutPage';
import { AnalyzePage } from './pages/AnalyzePage';
import { AssistantPage } from './pages/AssistantPage';
import { HomePage } from './pages/HomePage';
import { LearnPage } from './pages/LearnPage';
import { ReportPage } from './pages/ReportPage';

function normalizeRoute(pathname: string): AppRoute {
  switch (pathname) {
    case '/analyze':
      return '/analyze';
    case '/assistant':
      return '/assistant';
    case '/learn':
      return '/learn';
    case '/report':
      return '/report';
    case '/about':
      return '/about';
    default:
      return '/';
  }
}

const ROUTE_TITLES: Record<AppRoute, string> = {
  '/': 'SignalSure — Trust less. Verify more.',
  '/analyze': 'Analyze Message or Link — SignalSure',
  '/assistant': 'Safety Assistant — SignalSure',
  '/learn': 'Digital Safety Guides — SignalSure',
  '/report': 'Report an Incident — SignalSure',
  '/about': 'About & Privacy — SignalSure',
};

export default function App() {
  const [route, setRoute] = useState<AppRoute>(() =>
    normalizeRoute(window.location.pathname)
  );
  const [capabilities, setCapabilities] = useState<ServerCapabilities | null>(
    null
  );
  const [pendingSampleId, setPendingSampleId] = useState<string | null>(null);

  useEffect(() => {
    document.title = ROUTE_TITLES[route];
  }, [route]);

  useEffect(() => {
    const onPopState = () => {
      setRoute(normalizeRoute(window.location.pathname));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    let active = true;
    fetch('/api/health')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data?.capabilities) {
          setCapabilities(data.capabilities as ServerCapabilities);
        }
      })
      .catch(() => {
        // Offline/static fallback if server health check unavailable
      });
    return () => {
      active = false;
    };
  }, []);

  const navigate = useCallback((nextRoute: AppRoute) => {
    if (window.location.pathname !== nextRoute) {
      window.history.pushState({}, '', nextRoute);
    }
    setRoute(nextRoute);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const handleConsumeSample = useCallback(() => {
    setPendingSampleId(null);
  }, []);

  return (
    <div
      data-route={route}
      className="flex min-h-screen flex-col bg-[#030808] text-[#F1F7F6]"
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-[2px] focus:bg-[#00F0C8] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[#031411]"
      >
        Skip to main content
      </a>

      <Navbar currentRoute={route} onNavigate={navigate} />

      <main id="main-content" className="flex-1">
        {route === '/' && (
          <HomePage
            onNavigate={navigate}
            onSelectSampleForAnalyzer={(sampleId) =>
              setPendingSampleId(sampleId)
            }
          />
        )}
        {route === '/analyze' && (
          <AnalyzePage
            capabilities={capabilities}
            initialSampleId={pendingSampleId}
            onConsumeInitialSample={handleConsumeSample}
          />
        )}
        {route === '/assistant' && (
          <AssistantPage capabilities={capabilities} />
        )}
        {route === '/learn' && <LearnPage onNavigate={navigate} />}
        {route === '/report' && <ReportPage capabilities={capabilities} />}
        {route === '/about' && (
          <AboutPage capabilities={capabilities} onNavigate={navigate} />
        )}
      </main>

      <Footer onNavigate={navigate} />
    </div>
  );
}
