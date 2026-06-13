import React, { useState, useEffect, useRef } from 'react';

// Demo configuration - customize with your actual features
const GUIDED_TOUR_STEPS = [
  {
    id: 'welcome',
    title: '🎉 Welcome to AIRA',
    description: 'Let us show you the key features that make AIRA powerful. This tour takes 2 minutes.',
    target: null,
    position: 'center',
    highlightPadding: 0
  },
  {
    id: 'hero-section',
    title: 'Your Main Dashboard',
    description: 'Start here. This is the heart of AIRA - your command center for all operations.',
    target: '[data-tour="hero-section"]',
    position: 'bottom',
    highlightPadding: 16
  },
  {
    id: 'search-bar',
    title: '⚡ Smart Search',
    description: 'Type anything to find features, data, or previous actions. Powered by AI.',
    target: '[data-tour="search-bar"]',
    position: 'bottom',
    highlightPadding: 12
  },
  {
    id: 'feature-cards',
    title: 'Key Features at a Glance',
    description: 'Quick access to your most-used tools. Customize these based on your workflow.',
    target: '[data-tour="feature-cards"]',
    position: 'top',
    highlightPadding: 16
  },
  {
    id: 'settings-panel',
    title: '⚙️ Personalization',
    description: 'Control your preferences, integrations, and workspace settings here.',
    target: '[data-tour="settings-panel"]',
    position: 'left',
    highlightPadding: 12
  },
  {
    id: 'automation-builder',
    title: '🤖 Automation Builder',
    description: 'Create powerful automations without code. Drag, drop, and automate.',
    target: '[data-tour="automation-builder"]',
    position: 'top',
    highlightPadding: 16
  },
  {
    id: 'analytics-dashboard',
    title: '📊 Analytics & Insights',
    description: 'Track performance metrics, trends, and get AI-powered recommendations.',
    target: '[data-tour="analytics-dashboard"]',
    position: 'bottom',
    highlightPadding: 16
  },
  {
    id: 'final-cta',
    title: '✨ Ready to Explore?',
    description: 'You now know the basics. Start building your workflow and unlock AIRA\'s full potential!',
    target: null,
    position: 'center',
    highlightPadding: 0
  }
];

interface HighlightPosition {
  top: number;
  left: number;
  width: number;
  height: number;
}

export const GuidedDemoSystem = ({ onDemoComplete }: { onDemoComplete?: () => void }) => {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightPos, setHighlightPos] = useState<HighlightPosition | null>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const highlightRef = useRef<HTMLDivElement>(null);

  // Update highlight position when step changes or window resizes
  useEffect(() => {
    if (!isActive || !GUIDED_TOUR_STEPS[currentStep].target) {
      setHighlightPos(null);
      return;
    }

    const updateHighlight = () => {
      const target = document.querySelector(GUIDED_TOUR_STEPS[currentStep].target!);
      if (target) {
        const rect = target.getBoundingClientRect();
        const padding = GUIDED_TOUR_STEPS[currentStep].highlightPadding;
        
        setHighlightPos({
          top: window.scrollY + rect.top - padding,
          left: rect.left - padding,
          width: rect.width + padding * 2,
          height: rect.height + padding * 2
        });

        // Smooth scroll to element
        setIsScrolling(true);
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => setIsScrolling(false), 600);
      }
    };

    updateHighlight();
    window.addEventListener('resize', updateHighlight);
    return () => window.removeEventListener('resize', updateHighlight);
  }, [isActive, currentStep]);

  const handleNextStep = () => {
    if (currentStep < GUIDED_TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCompleteTour = () => {
    setIsActive(false);
    setCurrentStep(0);
    onDemoComplete?.();
  };

  const currentStepData = GUIDED_TOUR_STEPS[currentStep];
  const progress = ((currentStep + 1) / GUIDED_TOUR_STEPS.length) * 100;

  // Calculate tooltip position based on step configuration
  const getTooltipPosition = () => {
    if (!highlightPos) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

    const position = currentStepData.position;
    const offset = 24;

    switch (position) {
      case 'bottom':
        return {
          top: `${highlightPos.top + highlightPos.height + offset}px`,
          left: `${highlightPos.left + highlightPos.width / 2}px`,
          transform: 'translateX(-50%)',
          maxWidth: '320px'
        };
      case 'top':
        return {
          top: `${highlightPos.top - offset}px`,
          left: `${highlightPos.left + highlightPos.width / 2}px`,
          transform: 'translateX(-50%) translateY(-100%)',
          maxWidth: '320px'
        };
      case 'left':
        return {
          top: `${highlightPos.top + highlightPos.height / 2}px`,
          left: `${highlightPos.left - offset}px`,
          transform: 'translateX(-100%) translateY(-50%)',
          maxWidth: '280px'
        };
      default: // center
        return {
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          maxWidth: '400px'
        };
    }
  };

  return (
    <>
      {/* Start button - position where you want it */}
      {!isActive && (
        <button
          onClick={() => setIsActive(true)}
          className="fixed bottom-6 right-6 z-50 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full font-semibold text-sm hover:shadow-lg hover:shadow-purple-500/50 transition-all hover:scale-105 flex items-center gap-2"
        >
          🎯 Start Tour
        </button>
      )}

      {isActive && (
        <>
          {/* Overlay */}
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300" />

          {/* Spotlight/Highlight Box */}
          {highlightPos && (
            <div
              ref={highlightRef}
              className="fixed z-40 border-2 border-amber-400/80 rounded-2xl pointer-events-none shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] transition-all duration-300"
              style={{
                top: `${highlightPos.top}px`,
                left: `${highlightPos.left}px`,
                width: `${highlightPos.width}px`,
                height: `${highlightPos.height}px`,
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)',
                animation: 'pulse-border 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
              }}
            >
              <style>{`
                @keyframes pulse-border {
                  0%, 100% { box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.6), 0 0 0 2px rgba(251, 191, 36, 0.8); }
                  50% { box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.6), 0 0 0 2px rgba(251, 191, 36, 0.4); }
                }
                @keyframes slide-up {
                  from { opacity: 0; transform: translateY(20px); }
                  to { opacity: 1; transform: translateY(0); }
                }
              `}</style>
            </div>
          )}

          {/* Tooltip Card */}
          <div
            className="fixed z-50 bg-slate-950 border border-purple-500/40 rounded-2xl p-6 shadow-2xl transition-all duration-300 animate-in fade-in"
            style={{
              ...getTooltipPosition() as any,
              animation: 'slide-up 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}
          >
            {/* Progress Bar */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 via-purple-500 to-pink-500 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs font-medium text-slate-400">
                {currentStep + 1}/{GUIDED_TOUR_STEPS.length}
              </span>
            </div>

            {/* Title & Description */}
            <h3 className="text-lg font-bold text-white mb-2">
              {currentStepData.title}
            </h3>
            <p className="text-sm text-slate-300 mb-6 leading-relaxed">
              {currentStepData.description}
            </p>

            {/* Navigation Buttons */}
            <div className="flex gap-3 mb-3">
              {currentStep > 0 && (
                <button
                  onClick={handlePrevStep}
                  disabled={isScrolling}
                  className="flex-1 py-2.5 px-3 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800/50 disabled:opacity-50 transition-colors text-sm font-medium"
                >
                  ← Back
                </button>
              )}

              {currentStep < GUIDED_TOUR_STEPS.length - 1 ? (
                <button
                  onClick={handleNextStep}
                  disabled={isScrolling}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white disabled:opacity-50 transition-all text-sm font-medium hover:shadow-lg hover:shadow-purple-500/30"
                >
                  Next →
                </button>
              ) : (
                <button
                  onClick={handleCompleteTour}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white transition-all text-sm font-medium hover:shadow-lg hover:shadow-emerald-500/30"
                >
                  🚀 Get Started
                </button>
              )}
            </div>

            {/* Skip Option */}
            <button
              onClick={handleCompleteTour}
              className="w-full py-1.5 text-xs text-slate-500 hover:text-slate-400 transition-colors font-medium"
            >
              Skip tour
            </button>
          </div>
        </>
      )}
    </>
  );
};

export default GuidedDemoSystem;
