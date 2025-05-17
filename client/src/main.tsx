import { createRoot } from "react-dom/client";
import { useState, useEffect } from "react";
import App from "./App";
import { ThemeProvider } from "./providers/theme-provider";
import { SplashLoading } from "./components/splash-loading";
import "./index.css";

// Wrapper component to handle the splash screen logic
function AppWithSplash() {
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [isHardRefresh, setIsHardRefresh] = useState<boolean>(true);

  // Check if this is a hard refresh or navigation within the app
  useEffect(() => {
    // If this is the first load after navigating to the site, show splash
    // Using performance navigation type to detect hard refreshes
    const navType = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const isReload = navType ? navType.type === 'reload' : false;
    
    // Also check session storage to see if we've been here before
    const hasVisited = sessionStorage.getItem('hasVisitedBefore');
    
    // Only show splash on hard refreshes or first visits
    setIsHardRefresh(isReload || !hasVisited);
    
    // Mark that we've visited the site in this session
    sessionStorage.setItem('hasVisitedBefore', 'true');

    // If it's not a hard refresh, skip the splash screen
    if (!isReload && hasVisited) {
      setShowSplash(false);
    }
  }, []);

  // Handle splash screen completion
  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  return (
    <>
      {showSplash && isHardRefresh ? (
        <SplashLoading onComplete={handleSplashComplete} />
      ) : null}
      <div style={{ 
        visibility: showSplash && isHardRefresh ? 'hidden' : 'visible',
        height: '100%' 
      }}>
        <App />
      </div>
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <ThemeProvider defaultTheme="light" storageKey="contactsync-theme">
    <AppWithSplash />
  </ThemeProvider>
);
