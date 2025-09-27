import React, { useRef, useEffect, useState } from 'react';
import { Camera, CameraOff, CheckCircle, PauseCircle, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import apiService from '../../services/api';
import faceApi from "../../services/faceApi";

interface CameraCaptureProps {
  onCapture?: (imageData: string) => void;
  mode?: 'registration' | 'attendance';
  sessionId?: string | null;
  courseName?: string;
  onSessionEnd?: () => void;
  isActive?: boolean;
}

export function CameraCapture({
  onCapture,
  mode = 'attendance',
  sessionId = null,
  courseName = 'Session',
  onSessionEnd,
  isActive = true
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState('');
  const [recognizedStudents, setRecognizedStudents] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCameraStarting, setIsCameraStarting] = useState(false);
  const [captureCount, setCaptureCount] = useState(0);
  const [faceDetected, setFaceDetected] = useState(false);

  // Start camera
  const startCamera = async () => {
    setIsCameraStarting(true);
    setError('');
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });

      if (videoRef.current) {
        const videoElement = videoRef.current;
        videoElement.srcObject = mediaStream;
        
        videoElement.onloadedmetadata = async () => {
          try {
            await videoElement.play();
            setFaceDetected(true); // Simulate face detection
          } catch (err) {
            console.error('Video play error:', err);
            setError('Failed to start video playback');
          }
        };
      }

      setStream(mediaStream);
    } catch (err) {
      console.error(err);
      let errorMessage = 'Unable to access camera. Please check your camera connection and browser permissions.';
      
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          errorMessage = 'Camera access denied. Please allow camera access in your browser settings to use this feature.';
        } else if (err.name === 'NotFoundError') {
          errorMessage = 'No camera found. Please connect a camera and try again.';
        } else if (err.name === 'NotReadableError') {
          errorMessage = 'Camera is already in use by another application. Please close other apps using the camera.';
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsCameraStarting(false);
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setFaceDetected(false);
      setRecognizedStudents([]);
    }
  };

  // Auto-start camera when component mounts and isActive is true
  useEffect(() => {
    if (isActive && !stream) {
      startCamera();
    } else if (!isActive && stream) {
      stopCamera();
    }

    return () => stopCamera();
  }, [isActive]);

  // Auto-capture for attendance mode
  useEffect(() => {
    if (mode === 'attendance' && stream && sessionId && !isProcessing) {
      const interval = setInterval(() => {
        handleCapture();
      }, 3000); // Capture every 3 seconds

      return () => clearInterval(interval);
    }
  }, [mode, stream, sessionId, isProcessing]);

  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current || !stream) return;
    
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);
    const imageData = canvas.toDataURL('image/jpeg', 0.8);

    if (mode === 'registration') {
      onCapture?.(imageData);
      setCaptureCount(prev => prev + 1);
      return;
    }

    if (mode === 'attendance' && sessionId && !isProcessing) {
      setIsProcessing(true);
      try {
        const response = await faceApi.recognizeFace(imageData);
        if (response.results.length > 0) {
          for (const recognized of response.results) {
            if (!recognizedStudents.some(s => s.studentId === recognized.studentId)) {
              setRecognizedStudents(prev => [recognized, ...prev]);
            }
          }
        }
      } catch (err) {
        console.error('Recognition error:', err);
        setError('Face recognition failed. Please try again.');
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

  return (
    <div className="space-y-4">
      {mode === 'attendance' && (
        <h2 className="text-2xl font-bold">
          Live Attendance: {courseName}
        </h2>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      <Card variant="elevated" padding="lg" className="relative">
        <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
          {stream ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              
              {/* Face Detection Overlay */}
              {faceDetected && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="border-2 border-green-400 rounded-lg" 
                       style={{
                         width: '200px',
                         height: '250px',
                         boxShadow: '0 0 0 2px rgba(34, 197, 94, 0.3)'
                       }}>
                    <div className="absolute -top-6 left-0 bg-green-500 text-white px-2 py-1 rounded text-sm font-medium">
                      Face Detected
                    </div>
                  </div>
                </div>
              )}

              {/* Status Indicators */}
              <div className="absolute top-4 left-4 flex space-x-2">
                <div className="flex items-center bg-black/50 backdrop-blur-sm rounded-full px-3 py-1">
                  <div className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse" />
                  <span className="text-white text-sm">LIVE</span>
                </div>
                {mode === 'registration' && (
                  <div className="bg-black/50 backdrop-blur-sm rounded-full px-3 py-1">
                    <span className="text-white text-sm">Captured: {captureCount}/10</span>
                  </div>
                )}
                {isProcessing && (
                  <div className="bg-black/50 backdrop-blur-sm rounded-full px-3 py-1">
                    <span className="text-white text-sm">Processing...</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
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
        </div>
        <canvas ref={canvasRef} className="hidden"></canvas>
      </Card>

      {/* Camera Controls */}
      <div className="flex justify-center space-x-4">
        {!stream ? (
          <Button onClick={startCamera} fullWidth disabled={isCameraStarting}>
            <Camera className="mr-2" /> Start Camera
          </Button>
        ) : (
          <>
            <Button onClick={stopCamera} variant="outline" size="lg">
              <CameraOff className="h-5 w-5 mr-2" />
              Stop Camera
            </Button>
            <Button onClick={() => window.location.reload()} variant="ghost" size="lg">
            <RefreshCw className="mr-2" /> Reset
          </Button>
          </>
        )}
      </div>

      {mode === 'registration' && (
        <Button 
          onClick={handleCapture} 
          fullWidth 
          disabled={!stream || !faceDetected}
        >
          <Camera className="mr-2" />
          Capture Image
        </Button>
      )}

      {mode === 'attendance' && (
        <Button
          onClick={handleEndSession}
          variant="outline"
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
            {recognizedStudents.length > 0 ? recognizedStudents.map((student, index) => (
              <div
                key={`${student.studentId}-${index}`}
                className="flex items-center justify-between p-3 bg-green-50 rounded border border-green-200"
              >
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">{student.name} (ID: {student.studentIdNumber})</p>
                    <p className="text-sm text-gray-600">Confidence: {(student.confidence * 100).toFixed(1)}%</p>
                  </div>
                </div>
                <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  PRESENT
                </span>
              </div>
            )) : (
              <div className="text-center p-6 text-gray-500">
                <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Looking for faces...</p>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}