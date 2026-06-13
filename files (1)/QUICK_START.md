# 🚀 Quick Start - Copy & Paste Implementation

## Step 1: Copy the Component
Copy the entire `GuidedDemoSystem.tsx` file to your project at:
```
src/components/GuidedDemoSystem.tsx
```

## Step 2: Add to Your Main App (3 lines)
```tsx
import { GuidedDemoSystem } from '@/components/GuidedDemoSystem';

export default function App() {
  return (
    <>
      {/* Your existing content */}
      <YourMainContent />
      
      {/* Add this one line */}
      <GuidedDemoSystem onDemoComplete={() => console.log('Done!')} />
    </>
  );
}
```

## Step 3: Tag Your Features
Add `data-tour` to the elements you want to highlight:

```tsx
{/* Hero Section */}
<section data-tour="hero-section" className="...">
  Your main hero content
</section>

{/* Search Bar */}
<input data-tour="search-bar" placeholder="Search..." />

{/* Features */}
<div data-tour="feature-cards" className="...">
  Your features here
</div>

{/* Settings */}
<aside data-tour="settings-panel" className="...">
  Settings
</aside>

{/* Automation Builder */}
<section data-tour="automation-builder" className="...">
  Builder
</section>

{/* Analytics */}
<section data-tour="analytics-dashboard" className="...">
  Dashboard
</section>
```

## Step 4: Customize Tour Steps
Edit these in `GuidedDemoSystem.tsx` - update the `GUIDED_TOUR_STEPS` array:

```tsx
const GUIDED_TOUR_STEPS = [
  {
    id: 'welcome',
    title: '🎉 Your Title Here',
    description: 'Your description here. Keep it 1-2 sentences.',
    target: null,                          // null for center overlay
    position: 'center',                    // 'center' | 'top' | 'bottom' | 'left'
    highlightPadding: 16                   // Space around highlight
  },
  {
    id: 'my-feature',
    title: '✨ Feature Name',
    description: 'What does this feature do? Why is it cool?',
    target: '[data-tour="my-feature"]',    // Must match the data-tour attribute
    position: 'bottom',                    // Where tooltip appears
    highlightPadding: 16
  },
  // Add more steps...
];
```

## Step 5: (Optional) Integrate with Welcome Modal

Replace your existing demo button:

```tsx
// BEFORE
<button onClick={() => setGuidedDemo(true)}>
  Show Me Demo
</button>

// AFTER - Just close the modal, user clicks the floating button
<button onClick={() => setShowWelcomeModal(false)}>
  Skip
</button>
```

Or modify the button to hide the modal:

```tsx
<button
  onClick={() => {
    setShowWelcomeModal(false);
    // User will see the floating "🎯 Start Tour" button
  }}
  className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white"
>
  🚀 Show Me Around
</button>
```

---

## Common Customizations

### Change Colors
In `GuidedDemoSystem.tsx`, find these lines and modify:

```tsx
// Progress bar gradient
className="... from-amber-400 via-purple-500 to-pink-500 ..."
// Change to:
className="... from-blue-400 via-cyan-500 to-teal-500 ..."

// Button gradient
className="bg-gradient-to-r from-purple-600 to-pink-600"
// Change to:
className="bg-gradient-to-r from-blue-600 to-cyan-600"

// Highlight border
border-amber-400/80
// Change to:
border-blue-400/80
```

### Change Button Position
The floating "🎯 Start Tour" button is positioned bottom-right:

```tsx
// Current
className="fixed bottom-6 right-6 z-50 ..."

// Move to top-left:
className="fixed top-6 left-6 z-50 ..."

// Move to bottom-left:
className="fixed bottom-6 left-6 z-50 ..."
```

### Change Animation Speed
Find and modify these values:

```tsx
// Fast animations (0.15s instead of 0.3s)
style={{
  animation: 'slide-up 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)'
}}

// Slower highlight pulse (3s instead of 2s)
@keyframes pulse-border {
  animation: 'pulse-border 3s cubic-bezier(0.4, 0, 0.6, 1) infinite'
}
```

### Hide the Floating Button
If you want to trigger the demo differently:

```tsx
{/* Comment out or remove this section in the component */}
{/* {!isActive && (
  <button onClick={() => setIsActive(true)} className="...">
    🎯 Start Tour
  </button>
)}  */}

// Then trigger manually from your modal:
<button onClick={() => demoRef.current?.startDemo()}>
  Start Tour
</button>
```

---

## How It Works (Simple Explanation)

1. **User clicks** "🎯 Start Tour" button
2. **Component finds** elements with matching `data-tour` attributes
3. **Highlight box** draws around that element
4. **Tooltip appears** with title, description, and next/prev buttons
5. **User navigates** through tour with buttons
6. **On completion**, demo closes and `onDemoComplete` callback fires

That's it! No complicated state management needed from you.

---

## Troubleshooting

### Highlight not showing for my element?
1. Check the `data-tour` attribute name - it must match exactly
2. Make sure the element is visible (not hidden with `display: none`)
3. Inspect in DevTools - does the element actually exist?

### Tooltip in wrong position?
- Try changing `position` from `'bottom'` to `'top'` or `'left'`
- Increase `highlightPadding` to give more space
- Check if parent elements have `position: relative` or `transform` CSS

### Can't click buttons in the tooltip?
- Increase z-index of tooltip (currently 50)
- Make sure demo isn't disabled
- Check for conflicting CSS

### Demo doesn't scroll to element?
- Make sure parent containers allow scrolling
- Try adding explicit scroll behavior to parent
- Use browser DevTools to see if element is scrollable

---

## What You Get Immediately

✅ Working guided demo system  
✅ 8 pre-built steps (customize as needed)  
✅ Smooth animations and transitions  
✅ Mobile responsive  
✅ Progress indicator  
✅ Next/Previous navigation  
✅ Skip option  
✅ Professional styling  

---

## Next Steps

1. Copy the component ✓
2. Add to your app ✓
3. Tag your features ✓
4. Customize the steps ✓
5. Test in browser
6. Deploy! 🎉

That's literally all you need to do. Everything else is optional customization.

**Estimated time to get working: 10 minutes**

---

## Want More?

- See `EXAMPLE_COMPLETE_IMPLEMENTATION.tsx` for full working example
- See `INTEGRATION_GUIDE.md` for detailed explanations
- See `ADVANCED_CUSTOMIZATION.md` for advanced features
- Check `GuidedDemoSystem.tsx` comments for inline docs

Good luck! 🚀
