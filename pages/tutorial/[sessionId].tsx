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
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white border-b">
        <button
          onClick={() => router.push('/')}
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Input
        </button>
        
        <div className="flex items-center space-x-4">
          <div className="text-center">
            <div className="text-sm text-gray-500">{sessionId?.toString().substring(0, 15) || 'Tutorial'}</div>
            <div className="text-xs text-gray-400">Explained as: Tutorial</div>
          </div>
          <button
            onClick={handlePlayPause}
            disabled={!currentFrame.audioUrl}
            className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50"
          >
            {isPlaying ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-5xl">
          {/* Content Card */}
          <div className="relative bg-white rounded-lg border-4 border-blue-500 shadow-lg overflow-hidden">
            {/* Frame Counter */}
            <div className="absolute top-4 right-4 bg-white px-3 py-1 rounded border border-gray-300 text-sm z-10">
              Frame <span className="font-semibold">{currentIndex + 1}</span> of <span className="font-semibold">{frames.length}</span>
            </div>

            {/* Image Area */}
            <div className="relative bg-gray-900 flex items-center justify-center" style={{ minHeight: '500px' }}>
              {currentFrame.imageUrl ? (
                <img
                  src={currentFrame.imageUrl}
                  alt={`Frame ${currentIndex + 1}`}
                  className="max-w-full max-h-[500px] object-contain"
                />
              ) : (
                <div className="text-gray-500 text-center">
                  <svg className="mx-auto h-16 w-16 text-gray-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-gray-400">Image unavailable</p>
                </div>
              )}
            </div>

            {/* Text and Rephrase Button */}
            <div className="relative p-6 bg-white">
              <p className="text-gray-700 text-center text-lg leading-relaxed mb-4">
                {currentFrame.text}
              </p>
              
              <button
                onClick={handleRephrase}
                disabled={loadingFrame}
                className="absolute bottom-4 left-4 flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>{loadingFrame ? '⏳ Confusing? Rephrase' : '🤔 Confusing? Rephrase'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Hotbar */}
      <div className="bg-white border-t py-6">
        <div className="flex items-center justify-center space-x-4">
          <button
            onClick={() => setCurrentIndex(i => i - 1)}
            disabled={isFirst || loadingFrame}
            className="w-12 h-12 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <button
            onClick={handlePlayPause}
            disabled={!currentFrame.audioUrl || loadingFrame}
            className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition-all"
          >
            {isPlaying ? (
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          <button
            onClick={() => setCurrentIndex(i => i + 1)}
            disabled={isLast || loadingFrame}
            className="w-12 h-12 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
