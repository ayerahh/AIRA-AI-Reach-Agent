import React, { useState, useEffect } from 'react';
import { GuidedDemoSystem } from '@/components/GuidedDemoSystem';

/**
 * Complete example implementation showing:
 * 1. Welcome modal integration
 * 2. All data-tour attributes properly tagged
 * 3. State management
 * 4. Analytics tracking
 */

export default function AppWithGuidedDemo() {
  const [showWelcomeModal, setShowWelcomeModal] = useState(true);
  const [userPreferences, setUserPreferences] = useState({
    hasCompletedDemo: false,
    demoStartedAt: null as Date | null
  });

  // Track when demo starts
  const handleDemoStart = () => {
    setShowWelcomeModal(false);
    setUserPreferences(prev => ({
      ...prev,
      demoStartedAt: new Date()
    }));
    
    // Optional: Send analytics
    if (window.gtag) {
      window.gtag('event', 'guided_tour_started');
    }
  };

  // Track when demo completes
  const handleDemoComplete = () => {
    const duration = userPreferences.demoStartedAt 
      ? new Date().getTime() - userPreferences.demoStartedAt.getTime()
      : 0;

    setUserPreferences(prev => ({
      ...prev,
      hasCompletedDemo: true
    }));

    // Save to localStorage to not show again
    localStorage.setItem('demo_completed', 'true');
    localStorage.setItem('demo_completed_at', new Date().toISOString());

    // Optional: Send analytics with duration
    if (window.gtag) {
      window.gtag('event', 'guided_tour_completed', {
        duration_ms: duration
      });
    }

    console.log(`Demo completed in ${duration / 1000}s`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-black">
      {/* ===== WELCOME MODAL ===== */}
      {showWelcomeModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-slate-950 border border-purple-500/30 rounded-2xl p-8 max-w-md w-[90%]">
            <h2 className="text-3xl font-bold text-white mb-3">
              ✨ Welcome to AIRA
            </h2>
            <p className="text-slate-400 mb-2">
              Your AI-powered workflow companion
            </p>
            <p className="text-sm text-slate-500 mb-6">
              New here? We'll show you everything in 2 minutes.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowWelcomeModal(false)}
                className="flex-1 py-3 px-5 rounded-xl font-semibold text-sm border border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Skip for now
              </button>
              <button
                onClick={handleDemoStart}
                className="flex-1 py-3 px-5 rounded-xl font-semibold text-sm bg-gradient-to-r from-purple-600 to-rose-600 text-white hover:shadow-lg hover:shadow-purple-500/50 transition-all"
              >
                🚀 Show Me Around
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MAIN APP CONTENT ===== */}
      
      {/* Top Navigation - TAGGED */}
      <nav className="border-b border-slate-700/50 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center text-white font-bold">
              A
            </div>
            <span className="text-xl font-bold text-white">AIRA</span>
          </div>
          <div className="flex items-center gap-4">
            <button className="text-slate-400 hover:text-white transition">
              Help
            </button>
            <button className="text-slate-400 hover:text-white transition">
              Account
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section - TAGGED */}
      <section 
        data-tour="hero-section"
        className="max-w-7xl mx-auto px-6 py-20"
      >
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
              Automate Everything
            </h1>
            <p className="text-xl text-slate-400 mb-8">
              Build powerful workflows without writing a single line of code. Let AI handle the repetitive work.
            </p>
            <div className="flex gap-4">
              <button className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all">
                Get Started
              </button>
              <button className="px-6 py-3 rounded-xl border border-slate-700 text-white font-semibold hover:bg-slate-800 transition">
                Learn More
              </button>
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-2xl h-80 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-2">🤖</div>
              <p className="text-slate-500">Your automation workspace</p>
            </div>
          </div>
        </div>
      </section>

      {/* Search Bar - TAGGED */}
      <section className="max-w-7xl mx-auto px-6 py-10">
        <div
          data-tour="search-bar"
          className="relative"
        >
          <input
            type="text"
            placeholder="🔍 Search for features, automations, or docs..."
            className="w-full px-6 py-4 bg-slate-800/50 border border-slate-700 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
      </section>

      {/* Feature Cards - TAGGED */}
      <section 
        data-tour="feature-cards"
        className="max-w-7xl mx-auto px-6 py-16"
      >
        <h2 className="text-3xl font-bold text-white mb-12">
          Key Features
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: '⚡',
              title: 'Smart Automation',
              description: 'Create complex automations with our visual builder'
            },
            {
              icon: '🧠',
              title: 'AI Assistant',
              description: 'Get intelligent suggestions for your workflows'
            },
            {
              icon: '📊',
              title: 'Real-time Analytics',
              description: 'Monitor performance and get insights instantly'
            }
          ].map((feature, i) => (
            <div
              key={i}
              className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 hover:border-purple-500/50 transition group cursor-pointer"
            >
              <div className="text-4xl mb-3">{feature.icon}</div>
              <h3 className="text-lg font-bold text-white mb-2 group-hover:text-purple-400 transition">
                {feature.title}
              </h3>
              <p className="text-sm text-slate-400">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Settings Panel - TAGGED */}
      <section className="max-w-7xl mx-auto px-6 py-16 grid md:grid-cols-4 gap-8">
        <div className="md:col-span-1">
          <nav
            data-tour="settings-panel"
            className="space-y-2 bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 h-fit sticky top-20"
          >
            <h3 className="text-sm font-semibold text-slate-400 px-3 py-2">Settings</h3>
            {['Workspace', 'Integrations', 'Notifications', 'Billing'].map((item, i) => (
              <button
                key={i}
                className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-700/50 transition"
              >
                {item}
              </button>
            ))}
          </nav>
        </div>

        {/* Automation Builder - TAGGED */}
        <div className="md:col-span-3">
          <div
            data-tour="automation-builder"
            className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-8"
          >
            <h3 className="text-xl font-bold text-white mb-4">
              🤖 Build Your First Automation
            </h3>
            <div className="space-y-4">
              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50 flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                  1
                </div>
                <div>
                  <p className="font-semibold text-white">Choose a trigger</p>
                  <p className="text-xs text-slate-400">What event starts your automation?</p>
                </div>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50 flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                  2
                </div>
                <div>
                  <p className="font-semibold text-white">Add actions</p>
                  <p className="text-xs text-slate-400">What should happen when triggered?</p>
                </div>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50 flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                  3
                </div>
                <div>
                  <p className="font-semibold text-white">Test & deploy</p>
                  <p className="text-xs text-slate-400">Make sure everything works perfectly</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Analytics Dashboard - TAGGED */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div
          data-tour="analytics-dashboard"
          className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 rounded-2xl p-8"
        >
          <h3 className="text-2xl font-bold text-white mb-8">
            📊 Your Analytics at a Glance
          </h3>
          <div className="grid md:grid-cols-4 gap-4">
            {[
              { label: 'Automations', value: '12', icon: '⚙️' },
              { label: 'Executions Today', value: '486', icon: '▶️' },
              { label: 'Success Rate', value: '99.8%', icon: '✅' },
              { label: 'Time Saved', value: '14.5h', icon: '⏱️' }
            ].map((stat, i) => (
              <div key={i} className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50">
                <p className="text-3xl mb-2">{stat.icon}</p>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-slate-400">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="max-w-7xl mx-auto px-6 py-20 text-center">
        <h2 className="text-4xl font-bold text-white mb-4">
          Ready to Automate?
        </h2>
        <p className="text-xl text-slate-400 mb-8">
          Join thousands of teams saving hours every week
        </p>
        <button className="px-8 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all">
          Start Free Trial
        </button>
      </section>

      {/* ===== GUIDED DEMO SYSTEM ===== */}
      {/* This component:
          - Shows "🎯 Start Tour" button in bottom-right
          - Displays overlay when active
          - Highlights tagged elements
          - Provides next/prev navigation
          - Calls handleDemoComplete when done
      */}
      <GuidedDemoSystem onDemoComplete={handleDemoComplete} />
    </div>
  );
}
