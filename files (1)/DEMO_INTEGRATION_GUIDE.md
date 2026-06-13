# Guided Demo System - Integration Guide

## Quick Start

### 1. Add the Component to Your App
```tsx
import { GuidedDemoSystem } from '@/components/GuidedDemoSystem';

function App() {
  return (
    <>
      <YourMainContent />
      <GuidedDemoSystem onDemoComplete={() => console.log('Tour completed!')} />
    </>
  );
}
```

### 2. Tag Your Features
Add `data-tour` attributes to the elements you want to highlight:

```tsx
{/* Dashboard */}
<div data-tour="hero-section" className="...">
  Your main content
</div>

{/* Search Bar */}
<input data-tour="search-bar" placeholder="Search..." />

{/* Feature Cards */}
<div data-tour="feature-cards" className="grid ...">
  {/* Cards here */}
</div>

{/* Settings */}
<aside data-tour="settings-panel" className="...">
  {/* Settings */}
</aside>

{/* Automation */}
<section data-tour="automation-builder" className="...">
  {/* Builder */}
</section>

{/* Analytics */}
<section data-tour="analytics-dashboard" className="...">
  {/* Dashboard */}
</section>
```

### 3. Integrate with Welcome Modal
Replace your existing demo button with this in your welcome modal:

```tsx
<button
  onClick={() => {
    setShowWelcomeModal(false);
    // The GuidedDemoSystem will start automatically when user clicks its button
  }}
  className="flex-1 py-3 px-5 rounded-xl font-semibold text-sm bg-gradient-to-r from-purple-600 to-rose-600 text-white"
>
  🚀 Yes, Start Guided Tour
</button>
```

Or if you want to trigger it programmatically, add a ref to the component:

```tsx
const demoRef = useRef<any>(null);

const startDemoFromWelcome = () => {
  setShowWelcomeModal(false);
  // The demo button will be visible for them to click
};
```

---

## Customization

### Add/Edit Steps
Modify the `GUIDED_TOUR_STEPS` array in the component:

```tsx
const GUIDED_TOUR_STEPS = [
  {
    id: 'your-feature-id',
    title: '✨ Feature Title',
    description: 'Clear explanation of what this feature does and why they should care.',
    target: '[data-tour="your-feature-selector"]', // Leave as null for center overlay
    position: 'bottom', // 'bottom' | 'top' | 'left' | 'center'
    highlightPadding: 16 // Space around the highlight box
  },
  // ... more steps
];
```

### Customize Styling
The component uses Tailwind classes. Customize colors:

- Progress bar: `from-amber-400 via-purple-500 to-pink-500` → your gradient
- Highlight border: `border-amber-400/80` → your color
- Buttons: `from-purple-600 to-pink-600` → your colors

### Positioning Tips
- **bottom**: Tooltip appears below the element (good for header items)
- **top**: Tooltip appears above (good for lower elements)
- **left**: Tooltip appears to the left (good for right sidebar items)
- **center**: Overlay at screen center (good for welcome/final steps)

---

## Advanced Features

### Conditional Steps
Show different steps based on user state:

```tsx
const getTourSteps = () => {
  const baseSteps = [/* ... */];
  if (userHasRole('admin')) {
    baseSteps.push({
      id: 'admin-panel',
      title: 'Admin Controls',
      description: 'Manage workspace settings',
      target: '[data-tour="admin-panel"]',
      position: 'left',
      highlightPadding: 12
    });
  }
  return baseSteps;
};
```

### Analytics Integration
Track which steps users complete:

```tsx
const handleStepChange = (stepId: string) => {
  // Send to analytics
  analytics.track('demo_step_viewed', {
    step_id: stepId,
    timestamp: new Date().toISOString()
  });
};
```

### Auto-Start on First Visit
```tsx
useEffect(() => {
  const hasSeenDemo = localStorage.getItem('demo_completed');
  if (!hasSeenDemo) {
    setTimeout(() => setIsActive(true), 1000); // Start after 1 second
  }
}, []);
```

---

## Styling Customization

### Change Button Position
The start button is positioned `bottom-6 right-6`. Change in the component:
```tsx
className="fixed bottom-6 right-6 z-50 ..." // Adjust bottom/right values
```

### Change Highlight Color
The pulsing border is `border-amber-400/80`. Change to:
```tsx
border-purple-500/80 // or your brand color
```

### Adjust Backdrop Darkness
Current: `bg-black/40` - change the number to 30-70 for lighter/darker:
```tsx
bg-black/60 // darker
bg-black/30 // lighter
```

### Customize Animation Speed
- Highlight pulse: `2s` in `pulse-border` animation
- Slide-up: `0.3s` in tooltip animation
- Scroll: `600ms` in handleNextStep function

---

## Mobile Considerations

The component is mobile-responsive and will:
- Show tooltips centered on mobile
- Adjust padding automatically
- Use viewport-aware positioning
- Stack buttons vertically if needed

For mobile-specific adjustments:

```tsx
const isMobile = window.innerWidth < 640;

const getTooltipPosition = () => {
  if (isMobile) {
    return {
      bottom: '80px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '90vw',
      maxWidth: '500px'
    };
  }
  // ... desktop positioning
};
```

---

## Troubleshooting

### Highlight Not Showing
- Ensure `data-tour` attribute matches exactly: `[data-tour="search-bar"]`
- Check z-index of target element (highlight needs z-40, should be lower)
- Verify element is visible and not hidden

### Tooltip Position Wrong
- Adjust `highlightPadding` value (currently 12-16)
- Try different `position` values
- Check if parent elements have `transform` CSS (can affect positioning)

### Scroll Not Working
- Element must be scrollable into view
- Try removing `position: fixed` from parent elements
- Use `block: 'center'` in scrollIntoView for better centering

### Elements Clipping
- Increase `maxWidth` in getTooltipPosition
- Use `left: 'auto'` and `right: 'value'` for right-side tooltips
- Check parent container overflow properties

---

## Best Practices

1. **Keep Descriptions Short** - 1-2 sentences max
2. **Use Emojis** - Makes steps more memorable and scannable
3. **Highlight Key Actions** - Show what the user can DO, not just what exists
4. **Progressive Disclosure** - Start simple, show advanced features later
5. **Mobile First** - Test on mobile, then desktop
6. **Track Completion** - Know which steps users skip
7. **A/B Test** - Try different descriptions, positions, speeds
8. **Update Regularly** - Keep tour in sync with feature changes

---

## Example: Complete Integration

```tsx
// In your main app component
import { GuidedDemoSystem } from '@/components/GuidedDemoSystem';

export default function Dashboard() {
  const handleDemoComplete = () => {
    localStorage.setItem('demo_completed', 'true');
    // Trigger welcome flow
    showWelcomeNotification('Great! Now explore on your own.');
  };

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Your dashboard content */}
      
      {/* Hero - tagged for demo */}
      <div data-tour="hero-section" className="...">
        Main content here
      </div>

      {/* Search - tagged for demo */}
      <input data-tour="search-bar" className="..." />

      {/* Demo system - renders start button and overlay */}
      <GuidedDemoSystem onDemoComplete={handleDemoComplete} />
    </div>
  );
}
```

That's it! Your demo is now fully functional and customizable.
