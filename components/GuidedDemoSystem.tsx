import React, { useState, useEffect, useRef } from 'react';

// Steps customized specifically for AIRA features
const GUIDED_TOUR_STEPS = [
  {
    id: 'welcome',
    title: '🎉 Welcome to AIRA',
    description: 'Let us show you how AIRA turns natural-language marketing goals into audience segments, channel strategies, and live telemetry log streams. This tour takes 2 minutes.',
    target: null,
    position: 'center',
    highlightPadding: 0
  },
  {
    id: 'platform-takeover',
    title: '🚀 AI-Native Landing Takeover',
    description: 'AIRA acts as an autonomous reach agent, designed to map business objectives directly onto complex marketing campaigns.',
    target: '[data-tour="platform-takeover"]',
    position: 'bottom',
    highlightPadding: 8
  },
  {
    id: 'goal-input',
    title: '📝 Campaign Goal Input',
    description: 'Describe your campaign target in plain English or select one of the suggested goals. Press Ctrl+Enter to dispatch the AI agent.',
    target: '[data-tour="goal-input"]',
    position: 'top',
    highlightPadding: 16
  },
  {
    id: 'pipeline-diagram',
    title: '🛰️ Live Pipeline Simulation',
    description: 'Visualize how the routing engine analyzes customer variables, calculates transaction records, and determines delivery channels in real time.',
    target: '[data-tour="pipeline-diagram"]',
    position: 'top',
    highlightPadding: 12
  },
  {
    id: 'observability-stack',
    title: '📊 Telemetry & Snapshots',
    description: 'Monitor database transactions, observe API request response latencies, and restore past campaign states to review logs.',
    target: '[data-tour="observability-stack"]',
    position: 'top',
    highlightPadding: 12
  },
  {
    id: 'showcase-sections',
    title: '🏆 Accomplishments & Roadmap',
    description: 'Check out the underlying architecture achievements, known limitations, and future development milestones for the AIRA agent.',
    target: '[data-tour="showcase-sections"]',
    position: 'top',
    highlightPadding: 12
  },
  {
    id: 'final-cta',
    title: '✨ Start Orchestrating!',
    description: 'You are now ready to pilot the system. Enter your custom campaign goal or pick a template above to generate audience metrics and telemetry callbacks!',
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

interface GuidedDemoSystemProps {
  isActive?: boolean;
  onClose?: () => void;
  onDemoComplete?: () => void;
}

export const GuidedDemoSystem: React.FC<GuidedDemoSystemProps> = ({
  isActive: externalActive,
  onClose,
  onDemoComplete
}) => {
  const [localActive, setLocalActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightPos, setHighlightPos] = useState<HighlightPosition | null>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  
  const highlightRef = useRef<HTMLDivElement>(null);

  // Sync external active state if provided
  const isActive = externalActive !== undefined ? externalActive : localActive;

  const setIsActive = (val: boolean) => {
    if (externalActive === undefined) {
      setLocalActive(val);
    }
    if (!val && onClose) {
      onClose();
    }
  };

  // Centralized analytics logger
  const trackDemoEvent = (eventName: string, data: any) => {
    const logStyle = "color: white; background: linear-gradient(135deg, #ef4444, #ec4899); font-weight: bold; padding: 2px 8px; border-radius: 4px;";
    console.log(`%c[AIRA Analytics] ${eventName}`, logStyle, data);

    if (typeof window !== 'undefined') {
      const win = window as any;
      if (win.mixpanel && typeof win.mixpanel.track === 'function') {
        win.mixpanel.track(eventName, data);
      }
      if (win.gtag && typeof win.gtag === 'function') {
        win.gtag('event', eventName, data);
      }
      if (win.plausible && typeof win.plausible === 'function') {
        win.plausible(eventName, { props: data });
      }
    }
  };

  // Track start of tour
  useEffect(() => {
    if (isActive) {
      setCurrentStep(0);
      const start = Date.now();
      setStartTime(start);
      trackDemoEvent('tour_started', {
        timestamp: new Date().toISOString()
      });
    }
  }, [isActive]);

  // Track step changes
  useEffect(() => {
    if (isActive) {
      const step = GUIDED_TOUR_STEPS[currentStep];
      trackDemoEvent('tour_step_viewed', {
        step_index: currentStep + 1,
        step_id: step.id,
        step_title: step.title,
        timestamp: new Date().toISOString()
      });
    }
  }, [isActive, currentStep]);

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
      } else {
        // Fallback if target element is not rendered
        setHighlightPos(null);
      }
    };

    // Delay slightly to allow any phase transitions to render
    const timer = setTimeout(updateHighlight, 100);
    window.addEventListener('resize', updateHighlight);
    window.addEventListener('scroll', updateHighlight);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateHighlight);
      window.removeEventListener('scroll', updateHighlight);
    };
  }, [isActive, currentStep]);

  // Keyboard navigation listener
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isScrolling) return;

      if (e.key === 'ArrowRight') {
        handleNextStep();
      } else if (e.key === 'ArrowLeft') {
        handlePrevStep();
      } else if (e.key === 'Escape') {
        handleSkipTour();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, currentStep, isScrolling]);

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

  const handleSkipTour = () => {
    const elapsed = startTime ? Date.now() - startTime : 0;
    trackDemoEvent('tour_skipped', {
      duration_ms: elapsed,
      last_step_index: currentStep + 1,
      last_step_id: GUIDED_TOUR_STEPS[currentStep].id
    });
    setIsActive(false);
    setCurrentStep(0);
  };

  const handleCompleteTour = () => {
    const elapsed = startTime ? Date.now() - startTime : 0;
    trackDemoEvent('tour_completed', {
      duration_ms: elapsed,
      total_steps: GUIDED_TOUR_STEPS.length
    });
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
          className="fixed bottom-6 right-6 z-50 px-4 py-2.5 bg-gradient-to-r from-[#ef4444] to-[#ec4899] text-white rounded-full font-bold text-xs hover:shadow-lg hover:shadow-pink-500/50 transition-all hover:scale-105 flex items-center gap-2 uppercase tracking-wider border border-white/10"
        >
          <span>🎯</span> Start Tour
        </button>
      )}

      {isActive && (
        <>
          {/* Overlay */}
          <div className="fixed inset-0 z-[100] bg-black/55 backdrop-blur-sm transition-opacity duration-300" />

          {/* Spotlight/Highlight Box */}
          {highlightPos && (
            <div
              ref={highlightRef}
              className="fixed z-[100] border-2 border-[#ec4899] rounded-2xl pointer-events-none transition-all duration-300"
              style={{
                top: `${highlightPos.top}px`,
                left: `${highlightPos.left}px`,
                width: `${highlightPos.width}px`,
                height: `${highlightPos.height}px`,
                boxShadow: '0 0 0 9999px rgba(2, 6, 23, 0.65)',
                animation: 'pulse-border 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
              }}
            >
              <style>{`
                @keyframes pulse-border {
                  0%, 100% { box-shadow: 0 0 0 9999px rgba(2, 6, 23, 0.65), 0 0 0 2px rgba(236, 72, 153, 0.8); }
                  50% { box-shadow: 0 0 0 9999px rgba(2, 6, 23, 0.65), 0 0 0 2px rgba(236, 72, 153, 0.3); }
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
            className="fixed z-[110] bg-slate-950/95 border border-purple-500/20 rounded-2xl p-6 shadow-2xl transition-all duration-300 backdrop-blur-md"
            style={{
              ...getTooltipPosition() as any,
              animation: 'slide-up 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}
          >
            {/* Progress Bar */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#ef4444] via-[#ec4899] to-indigo-500 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-[10px] font-mono font-medium text-slate-400">
                {currentStep + 1}/{GUIDED_TOUR_STEPS.length}
              </span>
            </div>

            {/* Title & Description */}
            <h3 className="text-sm font-bold text-white mb-2 uppercase tracking-wide">
              {currentStepData.title}
            </h3>
            <p className="text-xs text-slate-300 mb-6 leading-relaxed">
              {currentStepData.description}
            </p>

            {/* Navigation Buttons */}
            <div className="flex gap-3 mb-3 font-mono text-xs">
              {currentStep > 0 && (
                <button
                  onClick={handlePrevStep}
                  disabled={isScrolling}
                  className="flex-1 py-2 px-3 rounded-xl border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900/50 disabled:opacity-50 transition-colors font-medium"
                >
                  ← Back
                </button>
              )}

              {currentStep < GUIDED_TOUR_STEPS.length - 1 ? (
                <button
                  onClick={handleNextStep}
                  disabled={isScrolling}
                  className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-[#ec4899] text-white disabled:opacity-50 transition-all font-bold hover:brightness-115"
                >
                  Next →
                </button>
              ) : (
                <button
                  onClick={handleCompleteTour}
                  className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white transition-all font-bold hover:brightness-115"
                >
                  🚀 End Tour
                </button>
              )}
            </div>

            {/* Skip Option */}
            <button
              onClick={handleSkipTour}
              className="w-full py-1 text-[10px] text-slate-600 hover:text-slate-400 transition-colors font-medium font-mono uppercase tracking-wider"
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
