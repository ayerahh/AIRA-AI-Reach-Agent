import React, { useState, useEffect, useRef } from 'react';
import { Play, Check } from 'lucide-react';

interface TourStep {
  id: string;
  title: string;
  description: string;
  target: string | null;
  position: 'center' | 'top' | 'bottom' | 'left' | 'right';
  highlightPadding: number;
}

const GUIDED_TOUR_STEPS: TourStep[] = [
  { id: 'welcome', title: 'Welcome to AIRA', description: 'Let us show you how AIRA turns natural-language marketing goals into audience segments, channel strategies, and live telemetry log streams.', target: null, position: 'center', highlightPadding: 0 },
  { id: 'platform-takeover', title: 'AI-Native Landing Takeover', description: 'AIRA acts as an autonomous reach agent, designed to map business objectives directly onto complex marketing campaigns.', target: '[data-tour="platform-takeover"]', position: 'bottom', highlightPadding: 8 },
  { id: 'onboarding-portal', title: 'Data Ingestion Portal', description: 'Generate a realistic brand dataset in one click, or paste your own raw customer JSON directly. AIRA ingests both instantly and seeds the live CRM store.', target: '[data-tour="onboarding-portal"]', position: 'top', highlightPadding: 12 },
  { id: 'customer-spotlight', title: 'Top Customer Spotlight', description: 'Once data is loaded, AIRA surfaces your highest-value customers ranked by a dynamic weighted RFM score — combining lifetime spend, order frequency, and recency signals.', target: '[data-tour="customer-spotlight"]', position: 'top', highlightPadding: 12 },
  { id: 'pipeline-diagram', title: 'Segment Routing Pipeline', description: 'A live contextual routing diagram that reacts to your campaign goal — showing user node, behavior timeline, AIRA decision core, and gateway relay statuses in real time.', target: '[data-tour="pipeline-diagram"]', position: 'top', highlightPadding: 12 },
  { id: 'goal-input', title: 'Campaign Goal Input', description: 'Type any marketing objective in plain English. AIRA parses intent, builds an audience segment with RFM filters, drafts 3 channel-specific message variants, and picks the best channel — all in one shot.', target: '[data-tour="goal-input"]', position: 'top', highlightPadding: 16 },
  { id: 'control-toolbar', title: 'Right-Rail Control Center', description: 'Open the Build War Logs sidebar to see every bug and battle from the 72-hour build, or launch the Engine Console to inspect live campaign snapshots.', target: '[data-tour="control-toolbar"]', position: 'top', highlightPadding: 12 },
  { id: 'observability-stack', title: 'Observability & Snapshot Engine', description: 'The Engine Console stores every launched campaign as a time-travel snapshot. Restore any past campaign to replay its audience, variants, and analytics — built for post-campaign auditing.', target: '[data-tour="observability-stack"]', position: 'top', highlightPadding: 12 },
  { id: 'showcase-sections', title: 'Achievements & Roadmap', description: 'Review platform milestones, honest known limitations, and the AI feature roadmap — what was shipped in 72 hours vs what comes next.', target: '[data-tour="showcase-sections"]', position: 'top', highlightPadding: 12 },
  { id: 'final-cta', title: 'Start Orchestrating!', description: 'You are ready. Enter a custom campaign goal or pick a template — AIRA will segment, message, and dispatch in seconds.', target: null, position: 'center', highlightPadding: 0 }
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
  onStart?: () => void;
  onDemoComplete?: () => void;
}

export const GuidedDemoSystem: React.FC<GuidedDemoSystemProps> = ({
  isActive: externalActive,
  onClose,
  onStart,
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
    if (val && onStart) {
      onStart();
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
      const target = document.querySelector(GUIDED_TOUR_STEPS[currentStep].target!) as HTMLElement;
      if (target) {
        const padding = GUIDED_TOUR_STEPS[currentStep].highlightPadding;
        
        // Helper to get absolute position relative to document
        const getAbsoluteCoords = (el: HTMLElement) => {
          const r = el.getBoundingClientRect();
          const scrollY = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
          const scrollX = window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft || 0;
          return {
            top: r.top + scrollY,
            left: r.left + scrollX,
            width: r.width,
            height: r.height
          };
        };

        const initialCoords = getAbsoluteCoords(target);

        // Position highlight frame immediately
        setHighlightPos({
          top: initialCoords.top - padding,
          left: initialCoords.left - padding,
          width: initialCoords.width + padding * 2,
          height: initialCoords.height + padding * 2
        });

        // Custom smooth scroll centering engine using requestAnimationFrame
        const smoothScrollTo = (targetY: number, duration: number = 500) => {
          const startY = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
          const difference = targetY - startY;
          const startTime = performance.now();

          const step = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Ease-in-out quadratic curve
            const ease = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
            const scrollPos = startY + difference * ease;
            
            window.scrollTo(0, scrollPos);
            if (document.documentElement) document.documentElement.scrollTop = scrollPos;
            if (document.body) document.body.scrollTop = scrollPos;

            if (progress < 1) {
              requestAnimationFrame(step);
            }
          };

          requestAnimationFrame(step);
        };

        // Scroll page so the target element is vertically centered in the viewport
        const targetY = initialCoords.top - (window.innerHeight / 2) + (initialCoords.height / 2);
        
        setIsScrolling(true);
        smoothScrollTo(Math.max(0, targetY), 500);

        // Recalculate and lock position once smooth scroll settles (600ms)
        setTimeout(() => {
          const settledCoords = getAbsoluteCoords(target);
          setHighlightPos({
            top: settledCoords.top - padding,
            left: settledCoords.left - padding,
            width: settledCoords.width + padding * 2,
            height: settledCoords.height + padding * 2
          });
          setIsScrolling(false);
        }, 650);
      } else {
        // Fallback if target element is not rendered
        setHighlightPos(null);
      }
    };

    // Delay slightly to allow any phase transitions to render
    const timer = setTimeout(updateHighlight, 200);
    window.addEventListener('resize', updateHighlight);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateHighlight);
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

  return (
    <>
      {/* Start button - position where you want it */}
      {!isActive && (
        <button
          onClick={() => setIsActive(true)}
          className="fixed bottom-6 right-6 z-50 px-4 py-2.5 bg-gradient-to-r from-[#ef4444] to-[#ec4899] text-white rounded-full font-bold text-xs hover:shadow-lg hover:shadow-pink-500/50 transition-all hover:scale-105 flex items-center gap-2 uppercase tracking-wider border border-white/10"
        >
          <Play size={12} fill="currentColor" /> Start Tour
        </button>
      )}

      {isActive && (
        <>
          {/* Transparent click blocker to prevent clicks on page during active tour steps */}
          <div className="fixed inset-0 z-[90] bg-transparent pointer-events-auto" />

          {/* Dark blurred overlay shown ONLY when there is no target highlighted (center steps, e.g. welcome) */}
          {!highlightPos && (
            <div className="fixed inset-0 z-[100] bg-slate-950/75 backdrop-blur-md transition-opacity duration-300" />
          )}

          {/* Spotlight/Highlight Box */}
          {highlightPos && (
            <div
              ref={highlightRef}
              className="absolute z-[100] border-2 border-[#ec4899] rounded-2xl pointer-events-none transition-all duration-300"
              style={{
                top: `${highlightPos.top}px`,
                left: `${highlightPos.left}px`,
                width: `${highlightPos.width}px`,
                height: `${highlightPos.height}px`,
                boxShadow: '0 0 0 9999px rgba(2, 6, 23, 0.7)',
                animation: 'pulse-border 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
              }}
            >
              <style>{`
                @keyframes pulse-border {
                  0%, 100% { box-shadow: 0 0 0 9999px rgba(2, 6, 23, 0.7), 0 0 0 2px rgba(236, 72, 153, 0.8); }
                  50% { box-shadow: 0 0 0 9999px rgba(2, 6, 23, 0.7), 0 0 0 2px rgba(236, 72, 153, 0.3); }
                }
                @keyframes slide-up {
                  from { opacity: 0; transform: translateY(10px); }
                  to { opacity: 1; transform: translateY(0); }
                }
                .animate-slide-up {
                  animation: slide-up 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                }
              `}</style>
            </div>
          )}

          {/* Fixed Tooltip Card Container */}
          <div
            className={highlightPos 
              ? "fixed bottom-8 left-1/2 -translate-x-1/2 z-[110] w-[90vw] max-w-md transition-all duration-300"
              : "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[110] w-[90vw] max-w-md transition-all duration-300"
            }
          >
            {/* Tooltip Card Content */}
            <div className="bg-slate-950/95 border border-purple-500/20 rounded-2xl p-6 shadow-2xl backdrop-blur-md animate-slide-up">
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
                    className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white transition-all font-bold hover:brightness-115 flex items-center justify-center gap-1.5"
                  >
                    <Check size={14} className="stroke-[3]" /> End Tour
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
          </div>
        </>
      )}
    </>
  );
};

export default GuidedDemoSystem;
