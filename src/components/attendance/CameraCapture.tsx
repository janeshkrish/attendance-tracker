import React, { useRef, useEffect, useState } from 'react';
import { Camera, CameraOff, CheckCircle, PauseCircle, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
// ✅ Use named import unless you’ve set default in services/api.ts
import { apiService } from '../../services/api'

interface CameraCaptureProps {
  onCapture?: (imageData: string) => void;
  mode?: 'registration' | 'attendance';
  sessionId?: string | null;
  courseName?: string;
  onSessionEnd?: () => void;
}

export function CameraCapture({
  onCapture,
  mode = 'attendance',
  sessionId = null,
  courseName = 'Session',
  onSessionEnd
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState('');
  const [recognizedStudents, setRecognizedStudents] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCameraStarting, setIsCameraStarting] = useState(false);

  // Start camera
  const startCamera = async () => {
    setIsCameraStarting(true);
    setError('');
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 }
      });

      if (videoRef.current) {
        const videoElement = videoRef.current;
        // ✅ Only srcObject (no createObjectURL)
        videoElement.srcObject = mediaStream;
        videoElement.onloadedmetadata = () => {
          videoElement.play().catch(err =>
            console.error('Autoplay/metadata error:', err)
          );
        };
      }

      setStream(mediaStream);
    } catch (err) {
      console.error(err);
      setError(
        'Camera access denied. Please allow camera access in your browser settings.'
      );
    } finally {
      setIsCameraStarting(false);
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current || !stream) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    const imageData = canvas.toDataURL('image/jpeg', 0.8);

    if (mode === 'registration') {
      onCapture?.(imageData);
      return;
    }

    if (mode === 'attendance' && sessionId && !isProcessing) {
      setIsProcessing(true);
      try {
        const response = await apiService.recognizeFace(imageData, sessionId);
        if (response.results.length > 0) {
          const recognized = response.results[0];
          if (
            !recognizedStudents.some(s => s.studentId === recognized.studentId)
          ) {
            await apiService.markAttendance({
              sessionId,
              studentId: recognized.studentId,
              status: 'present'
            });
            setRecognizedStudents(prev => [recognized, ...prev]);
          }
        }
      } catch (err) {
        console.error('Recognition error:', err);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleEndSession = async () => {
    if (!sessionId) return;
    try {
      await apiService.endAttendanceSession(sessionId);
      onSessionEnd?.();
    } catch (err) {
      setError('Failed to end session.');
    }
  };

  if (error)
    return (
      <p className="text-red-500 p-4 bg-red-100 rounded-md">{error}</p>
    );

  return (
    <div className="space-y-4">
      {mode === 'attendance' && (
        <h2 className="text-2xl font-bold">
          Live Attendance: {courseName}
        </h2>
      )}

      <Card variant="elevated" padding="lg" className="relative">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-auto rounded-md object-cover"
        />
        {!stream && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
            {isCameraStarting ? (
              <>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-2"></div>
                <p>Starting Camera...</p>
              </>
            ) : (
              <>
                <CameraOff className="h-12 w-12 mb-2" />
                <p>Camera Disabled</p>
              </>
            )}
          </div>
        )}
        <canvas ref={canvasRef} className="hidden"></canvas>
      </Card>

      {/* Camera Controls */}
      <div className="flex justify-center space-x-4">
        {!stream ? (
          <Button onClick={startCamera} fullWidth>
            <Camera className="mr-2" /> Start Camera
          </Button>
        ) : (
          <Button onClick={stopCamera} fullWidth variant="secondary">
            <RefreshCw className="mr-2" /> Reset
          </Button>
        )}
      </div>

      {mode === 'registration' && (
        <Button onClick={handleCapture} fullWidth disabled={!stream}>
          <Camera className="mr-2" />
          Capture Image
        </Button>
      )}

      {mode === 'attendance' && (
        <Button
          onClick={handleEndSession}
          variant="danger"
          size="lg"
          fullWidth
        >
          <PauseCircle className="mr-2" /> End Session
        </Button>
      )}

      {mode === 'attendance' && (
        <Card variant="elevated" padding="lg">
          <h3 className="text-xl font-semibold mb-4">
            Recognized Students ({recognizedStudents.length})
          </h3>
          <div className="max-h-60 overflow-y-auto space-y-2">
            {recognizedStudents.map(student => (
              <div
                key={student.studentId}
                className="flex items-center p-2 bg-green-50 rounded-md"
              >
                <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                <p>
                  {student.name} ({student.studentIdNumber}) - Confidence:{' '}
                  {Math.round(student.confidence * 100)}%
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
