# Advanced Customization Guide

## Key Improvements Over Basic Version

### What Your Basic Version Did:
- ❌ Static overlay at bottom
- ❌ Fixed position (didn't follow features)
- ❌ Manual step definitions
- ❌ No smooth transitions
- ❌ Limited positioning options

### What the New Version Does:
- ✅ **Dynamic highlighting** - Spotlight follows the feature
- ✅ **Smart positioning** - Tooltip moves based on element location
- ✅ **Auto-scroll** - Scrolls to each feature automatically
- ✅ **Smooth animations** - Pulsing border, fade-in/slide-up effects
- ✅ **Mobile responsive** - Works perfectly on all devices
- ✅ **Progress tracking** - Visual progress bar with step counter
- ✅ **Data-driven** - Uses `data-tour` attributes (easier to maintain)
- ✅ **Flexible positioning** - Bottom, top, left, or center
- ✅ **Accessibility** - Proper z-index management, keyboard-friendly

---

## Code Structure Breakdown

```
GuidedDemoSystem.tsx
├── State Management
│   ├── isActive - whether demo is running
│   ├── currentStep - current step index
│   ├── highlightPos - position of highlighted element
│   └── isScrolling - debounce scrolling
│
├── Effects
│   └── Update highlight position on step change
│
├── Handlers
│   ├── handleNextStep - navigate forward
│   ├── handlePrevStep - navigate backward
│   └── handleCompleteTour - cleanup and finish
│
└── Render
    ├── Start button (visible when inactive)
    ├── Overlay (when active)
    ├── Highlight box (when element exists)
    └── Tooltip card (with navigation)
```

---

## Customization Recipes

### Recipe 1: Custom Colors (Brand Colors)
```tsx
// Change in GUIDED_TOUR_STEPS progress bar:
className="bg-gradient-to-r from-blue-400 via-cyan-500 to-teal-500"

// Change border color in highlight:
style={{
  boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.8)' // blue instead of amber
}}

// Change button gradients:
className="bg-gradient-to-r from-blue-600 to-cyan-600"
```

### Recipe 2: Change Highlight Animation
```tsx
// Make it pulse faster:
animation: 'pulse-border 1s cubic-bezier(0.4, 0, 0.6, 1) infinite'

// Make it glow instead of pulse:
@keyframes glow-border {
  0%, 100% { 
    box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.6), 0 0 20px 4px rgba(251, 191, 36, 0.6); 
  }
  50% { 
    box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.6), 0 0 30px 8px rgba(251, 191, 36, 0.3); 
  }
}
```

### Recipe 3: Add Sound Effects
```tsx
const handleNextStep = () => {
  // Play "click" sound
  new Audio('/sounds/click.mp3').play();
  
  if (currentStep < GUIDED_TOUR_STEPS.length - 1) {
    setCurrentStep(currentStep + 1);
  }
};

const handleCompleteTour = () => {
  // Play "success" sound
  new Audio('/sounds/success.mp3').play();
  setIsActive(false);
  setCurrentStep(0);
  onDemoComplete?.();
};
```

### Recipe 4: Track User Behavior
```tsx
// Add to your component:
const trackTourEvent = (eventName: string, data?: any) => {
  if (window.plausible) {
    window.plausible(eventName, { props: { ...data } });
  }
  if (window.gtag) {
    window.gtag('event', eventName, data);
  }
};

// In handlers:
const handleNextStep = () => {
  trackTourEvent('tour_step_next', {
    from_step: currentStep,
    to_step: currentStep + 1
  });
  // ... rest of code
};

const handleDemoComplete = () => {
  trackTourEvent('tour_completed', {
    total_steps: GUIDED_TOUR_STEPS.length,
    duration_ms: Date.now() - startTime
  });
  // ... rest of code
};
```

### Recipe 5: Conditional Steps Based on User Type
```tsx
const getToursForUser = () => {
  const baseTours = GUIDED_TOUR_STEPS;
  
  // Only show advanced features to premium users
  if (userTier === 'premium') {
    baseTours.push({
      id: 'api-integration',
      title: '🔌 API Integration',
      description: 'Connect external services to your automations',
      target: '[data-tour="api-integration"]',
      position: 'bottom',
      highlightPadding: 16
    });
  }
  
  // Show team management only to admins
  if (userRole === 'admin') {
    baseTours.push({
      id: 'team-management',
      title: '👥 Manage Your Team',
      description: 'Invite members and assign permissions',
      target: '[data-tour="team-management"]',
      position: 'left',
      highlightPadding: 12
    });
  }
  
  return baseTours;
};
```

### Recipe 6: Multi-Tour System (Different Tours for Different Pages)
```tsx
// Create separate tour configs
const DASHBOARD_TOUR = [/* steps */];
const AUTOMATION_BUILDER_TOUR = [/* steps */];
const ANALYTICS_TOUR = [/* steps */];

// Pass correct tour to component
<GuidedDemoSystem 
  steps={location.pathname === '/builder' ? AUTOMATION_BUILDER_TOUR : DASHBOARD_TOUR}
  onDemoComplete={handleDemoComplete} 
/>
```

### Recipe 7: Keyboard Navigation
```tsx
useEffect(() => {
  const handleKeyPress = (e: KeyboardEvent) => {
    if (!isActive) return;
    
    if (e.key === 'ArrowRight' || e.key === 'n') {
      handleNextStep();
    } else if (e.key === 'ArrowLeft' || e.key === 'p') {
      handlePrevStep();
    } else if (e.key === 'Escape') {
      handleCompleteTour();
    }
  };
  
  window.addEventListener('keydown', handleKeyPress);
  return () => window.removeEventListener('keydown', handleKeyPress);
}, [isActive, currentStep]);
```

### Recipe 8: Show Demo Based on Feature Flag
```tsx
import { useFeatureFlag } from '@/hooks/useFeatureFlags';

export default function App() {
  const demoEnabled = useFeatureFlag('guided_demo_enabled');
  
  return (
    <>
      {/* Your app content */}
      {demoEnabled && <GuidedDemoSystem onDemoComplete={handleComplete} />}
    </>
  );
}
```

### Recipe 9: Interactive Demo (User Input)
```tsx
// Modify step to trigger actions
const INTERACTIVE_STEPS = [
  {
    id: 'create-automation',
    title: 'Create Your First Automation',
    description: 'Click the button below to get started',
    target: '[data-tour="create-btn"]',
    position: 'bottom',
    highlightPadding: 12,
    action: () => {
      // Trigger the actual create modal
      document.querySelector('[data-tour="create-btn"]')?.click();
    }
  }
];

// In component, call action before showing tooltip:
useEffect(() => {
  const step = INTERACTIVE_STEPS[currentStep];
  if (step?.action) {
    step.action();
  }
}, [currentStep]);
```

### Recipe 10: A/B Testing Different Tours
```tsx
const getTourForUser = () => {
  const variant = localStorage.getItem('tour_variant') || 
                 (Math.random() > 0.5 ? 'v1' : 'v2');
  
  if (variant === 'v2') {
    return GUIDED_TOUR_STEPS_V2; // Shorter, more aggressive
  }
  return GUIDED_TOUR_STEPS; // Original
};

// Track which version user saw
const handleDemoComplete = () => {
  const variant = localStorage.getItem('tour_variant');
  analytics.track('demo_completed', { variant });
};
```

---

## Performance Tips

### 1. Lazy Load Demo Component
```tsx
const GuidedDemoSystem = React.lazy(() => 
  import('@/components/GuidedDemoSystem')
);

export default function App() {
  return (
    <Suspense fallback={null}>
      <GuidedDemoSystem />
    </Suspense>
  );
}
```

### 2. Debounce Highlight Updates
```tsx
useEffect(() => {
  let timeout: NodeJS.Timeout;
  
  const updateHighlight = () => {
    const target = document.querySelector(GUIDED_TOUR_STEPS[currentStep].target);
    if (target) {
      const rect = target.getBoundingClientRect();
      setHighlightPos({/* ... */});
    }
  };
  
  // Debounce resize updates (default 200ms)
  const handleResize = () => {
    clearTimeout(timeout);
    timeout = setTimeout(updateHighlight, 200);
  };
  
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, [currentStep]);
```

### 3. Preload Demo Images
```tsx
useEffect(() => {
  if (isActive) {
    // Preload any images referenced in tour
    GUIDED_TOUR_STEPS.forEach(step => {
      if (step.image) {
        const img = new Image();
        img.src = step.image;
      }
    });
  }
}, [isActive]);
```

---

## Mobile-Specific Customizations

### Mobile-First Tooltip Positioning
```tsx
const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

const getMobileTooltipPosition = () => {
  if (!isMobile) return getDesktopTooltipPosition();
  
  return {
    position: 'fixed' as const,
    bottom: '24px',
    left: '12px',
    right: '12px',
    width: 'auto',
    maxWidth: 'none'
  };
};
```

### Mobile-Friendly Button Layout
```tsx
<div className="flex flex-col-reverse gap-3 sm:flex-row">
  {/* Buttons stack vertically on mobile */}
  {demoStep > 0 && (
    <button className="w-full sm:flex-1">← Back</button>
  )}
  <button className="w-full sm:flex-1">Next →</button>
</div>
```

---

## Testing Your Demo

```tsx
// __tests__/GuidedDemo.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GuidedDemoSystem from '@/components/GuidedDemoSystem';

describe('GuidedDemoSystem', () => {
  it('should show start button initially', () => {
    render(<GuidedDemoSystem />);
    expect(screen.getByText('🎯 Start Tour')).toBeInTheDocument();
  });

  it('should navigate steps correctly', async () => {
    const user = userEvent.setup();
    render(<GuidedDemoSystem />);
    
    await user.click(screen.getByText('🎯 Start Tour'));
    expect(screen.getByText('Next →')).toBeInTheDocument();
    
    await user.click(screen.getByText('Next →'));
    expect(screen.getByText('← Back')).toBeInTheDocument();
  });

  it('should call onDemoComplete when finished', async () => {
    const handleComplete = jest.fn();
    render(<GuidedDemoSystem onDemoComplete={handleComplete} />);
    
    // ... navigate to last step ...
    
    expect(handleComplete).toHaveBeenCalled();
  });
});
```

---

## Deployment Checklist

- [ ] All `data-tour` attributes added to elements
- [ ] GUIDED_TOUR_STEPS configured correctly
- [ ] Tested on mobile and desktop
- [ ] Analytics integrated
- [ ] Skip button works
- [ ] No console errors
- [ ] Highlight doesn't cover important buttons
- [ ] Scroll positioning is smooth
- [ ] Welcome modal integrated
- [ ] localStorage saved correctly
- [ ] Performance is acceptable (no jank)
- [ ] Accessibility checked (keyboard navigation)
- [ ] RTL/internationalization tested (if needed)

---

That's it! You now have a enterprise-grade guided demo system. 🚀
