import React, { useRef, useEffect, useState } from 'react';
import { Camera as CameraIcon, RefreshCw, VideoOff } from 'lucide-react';

const Camera = ({ onCapture, disabled }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null); // Use ref for stream to avoid stale closure
  const [error, setError] = useState(null);
  const [facingMode, setFacingMode] = useState('environment');
  const [isLoading, setIsLoading] = useState(true);

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const startCamera = async (mode) => {
    stopStream();
    setIsLoading(true);
    setError(null);

    try {
      // Try with facing mode first, fall back to any camera
      let mediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: mode }
        });
      } catch {
        // Fallback: try without facing mode constraint
        mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      streamRef.current = mediaStream;

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setError(null);
    } catch (err) {
      console.warn('Camera access failed:', err.name, err.message);
      setError('No camera found. Please allow camera access or check your device.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    startCamera(facingMode);
    return () => stopStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  const toggleCamera = () => {
    setFacingMode(prev => (prev === 'user' ? 'environment' : 'user'));
  };

  const handleCapture = () => {
    if (disabled || !videoRef.current || !canvasRef.current || !streamRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    const MAX_DIM = 800;
    let width = video.videoWidth || 640;
    let height = video.videoHeight || 480;

    if (width > height) {
      if (width > MAX_DIM) { height = Math.round(height * MAX_DIM / width); width = MAX_DIM; }
    } else {
      if (height > MAX_DIM) { width = Math.round(width * MAX_DIM / height); height = MAX_DIM; }
    }

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, width, height);

    const base64Image = canvas.toDataURL('image/jpeg', 0.8);
    onCapture(base64Image);
  };

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      borderRadius: '16px',
      overflow: 'hidden',
      backgroundColor: '#111',
      minHeight: '240px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      {isLoading && !error && (
        <div style={{ color: '#aaa', textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📷</div>
          <p>Starting camera...</p>
        </div>
      )}

      {error && (
        <div style={{ color: '#fff', textAlign: 'center', padding: '2rem' }}>
          <VideoOff size={40} style={{ marginBottom: '1rem', opacity: 0.6 }} />
          <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>{error}</p>
          <button
            onClick={() => startCamera(facingMode)}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              background: 'var(--primary)',
              color: 'var(--dark)',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Retry
          </button>
        </div>
      )}

      {!error && (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            onLoadedMetadata={() => setIsLoading(false)}
            style={{ width: '100%', display: 'block', borderRadius: '16px' }}
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {/* Switch Camera */}
          <button
            onClick={toggleCamera}
            disabled={disabled}
            style={{
              position: 'absolute', top: '12px', right: '12px',
              width: '40px', height: '40px', borderRadius: '50%',
              backgroundColor: 'rgba(0,0,0,0.55)', border: '2px solid rgba(255,255,255,0.7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'white', zIndex: 10
            }}
            title="Switch Camera"
          >
            <RefreshCw size={18} />
          </button>

          {/* Capture Button */}
          <button
            onClick={handleCapture}
            disabled={disabled}
            style={{
              position: 'absolute', bottom: '16px', left: '50%',
              transform: 'translateX(-50%)',
              width: '64px', height: '64px', borderRadius: '50%',
              backgroundColor: disabled ? '#888' : 'var(--secondary)',
              border: '4px solid white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: disabled ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
              color: 'white', zIndex: 10,
              transition: 'all 0.2s ease'
            }}
          >
            <CameraIcon size={26} />
          </button>
        </>
      )}
    </div>
  );
};

export default Camera;
