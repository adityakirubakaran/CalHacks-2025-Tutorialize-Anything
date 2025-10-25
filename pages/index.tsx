import { useState } from 'react';
import { useRouter } from 'next/router';

export default function HomePage() {
  const router = useRouter();
  const [targetURL, setTargetURL] = useState('');
  const [narrativeStyle, setNarrativeStyle] = useState('explain5');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    try {
      // 1. Call the /api/tutorial endpoint to analyze content and get storyboard JSON
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

      // 2. Trigger image generation
      await fetch('/api/image-gen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });

      // 3. Trigger audio generation for each frame
      await fetch('/api/audio-gen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });

      // 4. Navigate to the viewer page to display the tutorial
      router.push(`/tutorial/${sessionId}`);
    } catch (err) {
      console.error('Generation failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate tutorial. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow-md w-full max-w-lg">
        <h1 className="text-2xl font-bold mb-4 text-center">Tutorial Generator</h1>

        <label className="block mb-2 font-medium">GitHub Repo or Website URL:</label>
        <input
          type="url"
          className="w-full p-2 border border-gray-300 rounded mb-4"
          placeholder="https://github.com/user/repo or https://example.com"
          value={targetURL}
          onChange={(e) => setTargetURL(e.target.value)}
          required
        />

        <label className="block mb-2 font-medium">Explanation Style:</label>
        <select
          className="w-full p-2 border border-gray-300 rounded mb-4"
          value={narrativeStyle}
          onChange={(e) => setNarrativeStyle(e.target.value)}
        >
          {styleOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        {error && <p className="text-red-600 mb-4">{error}</p>}

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Generating...' : 'Generate Tutorial'}
        </button>
      </form>
    </div>
  );
}
