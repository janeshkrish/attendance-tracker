import React, { useRef, useEffect, useState } from 'react';
import { Camera, CameraOff, RefreshCw, CheckCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import apiService from '../../services/api';

export function CameraCapture({ 
  onCapture, 
  onFaceDetected, 
  isActive = false,
  mode = 'attendance',
  sessionId = null
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [captureCount, setCaptureCount] = useState(0);
  const [error, setError] = useState('');
  const [recognitionResults, setRecognitionResults] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const startCamera = async () => {
    try {
      setError('');
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });
      
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
        setIsStreaming(true);
      }
    } catch (err) {
      let errorMessage = 'Unable to access camera. Please check your camera connection and browser permissions.';
      
      if (err.name === 'NotAllowedError') {
        errorMessage = 'Camera access denied. Please allow camera access in your browser settings to use this feature.';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'No camera found. Please connect a camera and try again.';
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'Camera is already in use by another application. Please close other apps using the camera.';
      } else if (err.name === 'OverconstrainedError') {
        errorMessage = 'Camera does not support the required settings. Please try with a different camera.';
      }
      
      setError(errorMessage);
      console.error('Camera access error:', err);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsStreaming(false);
      setFaceDetected(false);
      setRecognitionResults([]);
    }
  };

  const captureImage = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');

    if (context) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);
      
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      
      if (mode === 'registration') {
        onCapture?.(imageData);
        setCaptureCount(prev => prev + 1);
        
        // Simulate face detection for registration
        setTimeout(() => {
          setFaceDetected(true);
          onFaceDetected?.({
            confidence: 0.95,
            boundingBox: { x: 150, y: 100, width: 200, height: 250 }
          });
        }, 500);
      } else if (mode === 'attendance' && sessionId) {
        // Process for attendance recognition
        await processAttendanceRecognition(imageData);
      }
    }
  };

  const processAttendanceRecognition = async (imageData) => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    try {
      const response = await apiService.recognizeFace(imageData, sessionId);
      setRecognitionResults(response.results || []);
      setFaceDetected(response.results && response.results.length > 0);
      
      // Auto-mark attendance if confident recognition
      if (response.results && response.results.length > 0) {
        const bestMatch = response.results[0];
        if (bestMatch.confidence > 0.9) {
          await apiService.markAttendance({
            sessionId,
            studentId: bestMatch.studentId,
            status: 'present',
            confidence: bestMatch.confidence,
            recognitionMethod: 'face_recognition'
          });
        }
      }
    } catch (error) {
      console.error('Face recognition error:', error);
      setError('Face recognition failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Auto-capture for attendance mode
  useEffect(() => {
    if (mode === 'attendance' && isStreaming && !isProcessing) {
      const interval = setInterval(() => {
        captureImage();
      }, 3000); // Capture every 3 seconds

      return () => clearInterval(interval);
    }
  }, [mode, isStreaming, isProcessing, sessionId]);

  useEffect(() => {
    if (isActive) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => stopCamera();
  }, [isActive]);

  return (
    <Card variant="elevated" padding="lg" className="w-full max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          {mode === 'registration' ? 'Face Registration' : 'Live Attendance'}
        </h3>
        <p className="text-gray-600">
          {mode === 'registration' 
            ? 'Position your face in the center of the frame and capture multiple angles'
            : 'Look directly at the camera for attendance marking'
          }
        </p>
      </div>

      <div className="relative">
        {/* Video Stream */}
        <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
          {isStreaming ? (
            <>
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
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
                      Face Detected (95%)
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
              <CameraOff className="h-16 w-16 mb-4" />
              <p className="text-lg font-medium">Camera Disabled</p>
              {error && <p className="text-red-400 text-sm mt-2 max-w-xs text-center">{error}</p>}
            </div>
          )}
        </div>

        {/* Hidden Canvas for Capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Controls */}
      <div className="flex justify-center space-x-4 mt-6">
        {!isStreaming ? (
          <Button onClick={startCamera} variant="primary" size="lg">
            <Camera className="h-5 w-5 mr-2" />
            Start Camera
          </Button>
        ) : (
          <>
            <Button onClick={stopCamera} variant="outline" size="lg">
              <CameraOff className="h-5 w-5 mr-2" />
              Stop Camera
            </Button>
            
            {mode === 'registration' && (
              <Button 
                onClick={captureImage} 
                variant="primary" 
                size="lg"
                disabled={!faceDetected}
              >
                <Camera className="h-5 w-5 mr-2" />
                Capture Face
              </Button>
            )}
          </>
        )}
        
        <Button onClick={() => window.location.reload()} variant="ghost" size="lg">
          <RefreshCw className="h-5 w-5 mr-2" />
          Reset
        </Button>
      </div>

      {/* Recognition Results (for attendance mode) */}
      {mode === 'attendance' && isStreaming && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-3">Recognition Results</h4>
          <div className="space-y-2">
            {recognitionResults.length > 0 ? (
              recognitionResults.map((result, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-white rounded border border-green-200">
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                    <div>
                      <p className="font-medium text-gray-900">{result.name} (ID: {result.studentIdNumber})</p>
                      <p className="text-sm text-gray-600">Confidence: {(result.confidence * 100).toFixed(1)}%</p>
                    </div>
                  </div>
                  <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                    PRESENT
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center p-6 text-gray-500">
                <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Looking for faces...</p>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}