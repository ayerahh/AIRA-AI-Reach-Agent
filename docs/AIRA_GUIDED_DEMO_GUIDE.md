# AIRA Guided Demo System - Developer Integration Guide

This document outlines the setup, architecture, and maintenance instructions for the AIRA Guided Demo System.

## Architecture Overview

The system consists of two main parts:
1. **`components/GuidedDemoSystem.tsx`**: A self-contained, data-driven React component that controls the spotlight overlay, tooltips, scrolling, keyboard navigation, and analytics dispatcher.
2. **`app/page.tsx`**: The main page integration that passes the welcome flow state triggers and specifies DOM targets using `data-tour` attributes.

```
+------------------+                   +--------------------+
| Welcome Modal    | --(starts tour)-->| GuidedDemoSystem   |
| (in app/page.ts) |                   | (in components/)   |
+------------------+                   +--------------------+
                                                |
                                      (reads data-tour tags)
                                                v
                                       +------------------+
                                       | Spotlight Box    |
                                       | & Tooltip Card   |
                                       +------------------+
```

## Tour Steps Configuration

Steps are configured in the `GUIDED_TOUR_STEPS` array inside `components/GuidedDemoSystem.tsx`. Each step has the following fields:

```typescript
interface TourStep {
  id: string;               // Unique identifier for analytics
  title: string;            // Title shown in the tooltip
  description: string;      // Body text of the tooltip (keep it short)
  target: string | null;    // CSS selector of target element (null for center overlay)
  position: 'center' | 'bottom' | 'top' | 'left'; // Tooltip alignment relative to target
  highlightPadding: number; // Pixels of padding inside the highlight spotlight box
}
```

### Current steps in the tour:
1. **🎉 Welcome to AIRA** (`null`, center): Initial greeting.
2. **🚀 AI-Native Landing Takeover** (`[data-tour="platform-takeover"]`, bottom): Branding screen explanation.
3. **📝 Campaign Goal Input** (`[data-tour="goal-input"]`, top): The natural language textarea.
4. **🛰️ Live Pipeline Simulation** (`[data-tour="pipeline-diagram"]`, top): Customer nodes and channel routing charts.
5. **📊 Telemetry & Snapshots** (`[data-tour="observability-stack"]`, top): The active campaign snapshot control database.
6. **🏆 Accomplishments & Roadmap** (`[data-tour="showcase-sections"]`, top): The showcase metrics cards.
7. **✨ Start Orchestrating!** (`null`, center): CTA to prompt user execution.

---

## Developer Guide: Adding a New Feature Tour Step

To add a new step when introducing new features:

### Step 1: Tag the new element in the JSX
Find your component in the code and add the `data-tour` attribute:
```tsx
<div data-tour="my-new-feature-card" className="...">
  {/* Feature content */}
</div>
```

### Step 2: Add the step configuration in `components/GuidedDemoSystem.tsx`
Add a new object inside the `GUIDED_TOUR_STEPS` array:
```typescript
{
  id: 'my-new-feature',
  title: '🌟 My New Feature Title',
  description: 'Highlight what this feature does. Keep description under two sentences.',
  target: '[data-tour="my-new-feature-card"]',
  position: 'top', // or 'bottom', 'left'
  highlightPadding: 16
}
```

---

## Telemetry & Analytics Dispatcher

The component features a unified analytics hook `trackDemoEvent` which logs to the console using premium styled text and delegates to external services if they are present on the client:

```typescript
const trackDemoEvent = (eventName: string, data: any) => {
  // Console logging
  console.log(`%c[AIRA Analytics] ${eventName}`, logStyle, data);

  // Automatic provider detection
  if (window.mixpanel) window.mixpanel.track(eventName, data);
  if (window.gtag) window.gtag('event', eventName, data);
  if (window.plausible) window.plausible(eventName, { props: data });
};
```

### Tracked Events:
- **`tour_started`**: Emitted when the tour begins.
  - Payload: `{ timestamp }`
- **`tour_step_viewed`**: Emitted on every step change.
  - Payload: `{ step_index, step_id, step_title, timestamp }`
- **`tour_skipped`**: Emitted if the user clicks "Skip tour" or exits via Escape key.
  - Payload: `{ duration_ms, last_step_index, last_step_id }`
- **`tour_completed`**: Emitted when the user finishes the last step.
  - Payload: `{ duration_ms, total_steps }`

---

## Styling & Theme Configurations

- **Primary Accent Gradients**: Matching AIRA's strawberry brand colors, using `from-[#ef4444] via-[#ec4899] to-indigo-500`.
- **Spotlight Pulse**: CSS Keyframe `@keyframes pulse-border` provides the pulsing highlight frame glow.
- **Auto-Scrolling**: Uses native `scrollIntoView({ behavior: 'smooth', block: 'center' })` to shift viewport focus smoothly.
- **Keyboard Navigation**:
  - `ArrowRight`: Next step.
  - `ArrowLeft`: Previous step.
  - `Escape`: Skip/Exit tour.
