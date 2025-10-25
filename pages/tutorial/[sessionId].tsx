import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';

interface FrameData {
  text: string;
  imageUrl?: string;
  audioUrl?: string;
}

export default function TutorialViewer() {
  const router = useRouter();
  const { sessionId } = router.query;
  const [frames, setFrames] = useState<FrameData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadingFrame, setLoadingFrame] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!sessionId || typeof sessionId !== 'string') return;

    const fetchData = async () => {
      try {
        const res = await fetch(`/api/tutorial?sessionId=${sessionId}`);
        if (!res.ok) {
          throw new Error('Failed to load tutorial data');
        }
        const data = await res.json();
        console.log('Loaded tutorial data:', data);
        console.log('Frames with audio URLs:', data.frames?.map((f: FrameData, i: number) => ({
          frame: i + 1,
          hasAudio: !!f.audioUrl,
          audioUrl: f.audioUrl
        })));
        setFrames(data.frames || []);
        setLoading(false);
      } catch (err) {
        console.error('Failed to load tutorial data', err);
        setError('Failed to load tutorial. Please try again.');
        setLoading(false);
      }
    };

    fetchData();
  }, [sessionId]);

  const handlePlayPause = async () => {
    if (!audioRef.current) {
      console.warn('Audio ref is not available');
      return;
    }

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
        console.log('Audio paused');
      } else {
        console.log('Attempting to play audio:', currentFrame.audioUrl);
        await audioRef.current.play();
        setIsPlaying(true);
        console.log('Audio playback started successfully');
      }
    } catch (err) {
      console.error('Audio playback failed:', err);
      alert(`Audio playback failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleRephrase = async () => {
    if (!frames[currentIndex] || !sessionId) return;

    setLoadingFrame(true);
    try {
      const res = await fetch('/api/rephrase-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, frameIndex: currentIndex })
      });

      if (!res.ok) {
        throw new Error('Failed to rephrase');
      }

      const data = await res.json();
      if (data.newAudioUrl) {
        setFrames(prev => prev.map((f, idx) => {
          if (idx === currentIndex) {
            return { ...f, audioUrl: data.newAudioUrl, text: data.newText || f.text };
          }
          return f;
        }));

        if (audioRef.current) {
          audioRef.current.load();
          audioRef.current.play();
          setIsPlaying(true);
        }
      }
    } catch (err) {
      console.error('Rephrase failed', err);
      alert('Sorry, failed to rephrase the audio.');
    } finally {
      setLoadingFrame(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-xl font-semibold mb-2">Loading tutorial...</div>
          <div className="text-gray-500">Please wait while we prepare your content</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-xl font-semibold text-red-600 mb-2">{error}</div>
          <button
            onClick={() => router.push('/')}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Go Back Home
          </button>
        </div>
      </div>
    );
  }

  if (!frames || frames.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-xl font-semibold mb-2">No frames available</div>
          <button
            onClick={() => router.push('/')}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Go Back Home
          </button>
        </div>
      </div>
    );
  }

  const currentFrame = frames[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === frames.length - 1;

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
      {/* Top Header */}
      <div className="bg-white border-b border-gray-200 py-3 px-6">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <h1 className="text-xl font-light text-gray-900">Tutorial Maker</h1>
          <div className="text-sm text-gray-500">
            Frame <span className="font-medium text-gray-900">{currentIndex + 1}</span> of <span className="font-medium text-gray-900">{frames.length}</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
        <div className="w-full max-w-4xl h-full flex flex-col justify-center">
          {/* Content Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Image Area - Optimized for no scroll */}
            <div className="relative bg-gray-900 flex items-center justify-center w-full" style={{ height: '55vh', maxHeight: '450px' }}>
              {currentFrame.imageUrl ? (
                <img
                  src={currentFrame.imageUrl}
                  alt={`Frame ${currentIndex + 1}`}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    console.error('Image failed to load:', currentFrame.imageUrl);
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className="text-gray-500 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-700 animate-pulse"></div>
                  <p className="text-gray-400 text-sm">Generating image...</p>
                </div>
              )}
            </div>

            {/* Text Area - Compact */}
            <div className="relative px-6 py-3 bg-white max-h-32 overflow-y-auto">
              <p className="text-gray-700 text-center text-xs leading-relaxed max-w-2xl mx-auto pr-16">
                {currentFrame.text}
              </p>
              
              <button
                onClick={handleRephrase}
                disabled={loadingFrame}
                className="absolute top-2 right-3 flex items-center space-x-1 text-xs text-gray-500 hover:text-gray-900 disabled:opacity-50 transition"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>{loadingFrame ? 'Rephrasing...' : 'Rephrase'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="bg-white border-t border-gray-200 py-4">
        <div className="flex items-center justify-center space-x-6 max-w-7xl mx-auto">
          <button
            onClick={() => setCurrentIndex(i => i - 1)}
            disabled={isFirst || loadingFrame}
            className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <button
            onClick={handlePlayPause}
            disabled={!currentFrame.audioUrl || loadingFrame}
            className="w-14 h-14 rounded-full bg-gray-900 flex items-center justify-center hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {isPlaying ? (
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          <button
            onClick={() => setCurrentIndex(i => i + 1)}
            disabled={isLast || loadingFrame}
            className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Hidden audio element */}
      {currentFrame.audioUrl && (
        <audio
          key={currentFrame.audioUrl}
          ref={audioRef}
          src={currentFrame.audioUrl}
          className="hidden"
          onLoadedData={() => console.log('Audio loaded:', currentFrame.audioUrl)}
          onError={(e) => console.error('Audio load error:', e, currentFrame.audioUrl)}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
        >
          Your browser does not support the audio element.
        </audio>
      )}
    </div>
  );
}
