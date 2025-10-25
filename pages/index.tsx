import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function HomePage() {
  const router = useRouter();
  const [targetURL, setTargetURL] = useState('');
  const [narrativeStyle, setNarrativeStyle] = useState('explain5');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadingStage, setLoadingStage] = useState('');
  const [progress, setProgress] = useState(0);

  const styleOptions = [
    { value: 'explain5', label: "Explain Like I'm 5" },
    { value: 'frat', label: 'College Frat Guy' },
    { value: 'pizza', label: 'Pizza Restaurant Analogy' },
    { value: 'car', label: 'Car Factory Analogy' },
    { value: 'professional', label: 'Adult Professional' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!targetURL) {
      setError('Please enter a repository or website URL');
      return;
    }

    setLoading(true);
    setProgress(0);
    try {
      // 1. Analyzing content
      setLoadingStage('Analyzing content...');
      setProgress(10);
      const res = await fetch('/api/tutorial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetURL, style: narrativeStyle })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Server error: ${res.status}`);
      }

      const data = await res.json();
      const sessionId = data.sessionId;
      setProgress(30);

      // 2. Generating images
      setLoadingStage('Creating visual frames...');
      await fetch('/api/image-gen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
      setProgress(70);

      // 3. Generating audio
      setLoadingStage('Generating narration...');
      await fetch('/api/audio-gen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
      setProgress(95);

      // 4. Navigate to viewer
      setLoadingStage('Finalizing tutorial...');
      setProgress(100);
      setTimeout(() => router.push(`/tutorial/${sessionId}`), 500);
    } catch (err) {
      console.error('Generation failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate tutorial. Please try again.');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          {/* Pulsating loader */}
          <div className="mb-8 flex justify-center">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-gray-900 animate-pulse"></div>
              <div className="absolute inset-0 w-20 h-20 rounded-full bg-gray-900 animate-ping opacity-20"></div>
            </div>
          </div>
          
          {/* Loading text */}
          <h2 className="text-3xl font-light text-gray-900 mb-4">{loadingStage}</h2>
          
          {/* Progress bar */}
          <div className="w-80 h-1 bg-gray-200 rounded-full overflow-hidden mx-auto">
            <div 
              className="h-full bg-gray-900 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          
          <p className="text-gray-500 mt-4 text-sm">{progress}% complete</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="w-full max-w-2xl px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-light text-gray-900 mb-4" style={{ fontFamily: 'serif' }}>
            Tutorial Maker
          </h1>
          <p className="text-gray-600 text-lg">
            Transform any website into an interactive visual tutorial
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Website URL</label>
            <input
              type="url"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition"
              placeholder="https://example.com"
              value={targetURL}
              onChange={(e) => setTargetURL(e.target.value)}
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Explanation Style</label>
            <select
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition"
              value={narrativeStyle}
              onChange={(e) => setNarrativeStyle(e.target.value)}
            >
              {styleOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-gray-900 text-white py-4 px-6 rounded-lg hover:bg-gray-800 transition font-medium text-lg"
          >
            Start for free
          </button>
        </form>
      </div>
    </div>
  );
}
