import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, Users, CheckCircle, XCircle, AlertTriangle, Activity } from 'lucide-react';

const LiveFaceRecognition = ({ sessionId, courseId, onAttendanceMarked, isActive = false }) => {
  // State management
  const [isStreaming, setIsStreaming] = useState(false);
  const [detectionResults, setDetectionResults] = useState([]);
  const [statistics, setStatistics] = useState({
    totalDetections: 0,
    recognizedFaces: 0,
    liveFaces: 0,
    spoofAttempts: 0
  });
  const [currentFrame, setCurrentFrame] = useState(null);
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const processingIntervalRef = useRef(null);

  // Configuration
  const config = {
    video: {
      width: 640,
      height: 480,
      facingMode: 'user'
    },
    processing: {
      interval: 1000, // Process every 1 second
      maxRetries: 3,
      timeout: 5000
    },
    display: {
      showBoundingBoxes: true,
      showConfidence: true,
      showLivenessStatus: true
    }
  };

  // Start camera stream
  const startStream = useCallback(async () => {
    try {
      setError(null);
      setIsStreaming(true);

      const constraints = {
        video: {
          width: config.video.width,
          height: config.video.height,
          facingMode: config.video.facingMode
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          startProcessing();
        };
      }

    } catch (err) {
      console.error('Error starting camera stream:', err);
      setError('Unable to access camera. Please check permissions.');
      setIsStreaming(false);
    }
  }, []);

  // Stop camera stream
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (processingIntervalRef.current) {
      clearInterval(processingIntervalRef.current);
      processingIntervalRef.current = null;
    }
    
    setIsStreaming(false);
    setDetectionResults([]);
    setCurrentFrame(null);
  }, []);

  // Start face recognition processing
  const startProcessing = useCallback(() => {
    if (processingIntervalRef.current) {
      clearInterval(processingIntervalRef.current);
    }

    processingIntervalRef.current = setInterval(async () => {
      if (videoRef.current && videoRef.current.readyState === 4 && !isProcessing && isActive) {
        await processCurrentFrame();
      }
    }, config.processing.interval);
  }, [isActive, isProcessing]);

  // Process current video frame
  const processCurrentFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || isProcessing) {
      return;
    }

    setIsProcessing(true);

    try {
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      // Set canvas size to match video
      canvas.width = config.video.width;
      canvas.height = config.video.height;
      
      // Draw video frame to canvas
      context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      
      // Convert canvas to base64
      const imageBase64 = canvas.toDataURL('image/jpeg', 0.8);
      setCurrentFrame(imageBase64);
      
      // Send to face recognition API
      await recognizeFaces(imageBase64);
      
    } catch (err) {
      console.error('Error processing frame:', err);
      setError('Error processing video frame');
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, sessionId, courseId]);

  // Recognize faces using the enhanced API
  const recognizeFaces = useCallback(async (imageBase64) => {
    try {
      const response = await fetch('/api/face/recognize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_base64: imageBase64.split(',')[1], // Remove data URL prefix
          session_id: sessionId,
          course_id: courseId
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();
      
      // Update detection results
      if (result.success && result.student_id) {
        const newResult = {
          id: Date.now(),
          studentId: result.student_id,
          studentName: result.student_name,
          confidence: result.confidence,
          isLive: result.is_live,
          livenessConfidence: result.liveness_confidence,
          attendanceMarked: result.attendance_marked,
          timestamp: new Date(result.timestamp),
          bbox: result.bbox
        };

        setDetectionResults(prev => {
          const updated = [newResult, ...prev.slice(0, 9)]; // Keep last 10 results
          return updated;
        });

        // Update statistics
        setStatistics(prev => ({
          totalDetections: prev.totalDetections + 1,
          recognizedFaces: prev.recognizedFaces + (result.success ? 1 : 0),
          liveFaces: prev.liveFaces + (result.is_live ? 1 : 0),
          spoofAttempts: prev.spoofAttempts + (!result.is_live ? 1 : 0)
        }));

        // Notify parent component if attendance was marked
        if (result.attendance_marked && onAttendanceMarked) {
          onAttendanceMarked({
            studentId: result.student_id,
            studentName: result.student_name,
            timestamp: result.timestamp,
            confidence: result.confidence
          });
        }
      }

    } catch (err) {
      console.error('Error in face recognition:', err);
      setError('Face recognition service unavailable');
    }
  }, [sessionId, courseId, onAttendanceMarked]);

  // Check liveness only (utility function)
  const checkLiveness = useCallback(async (imageBase64) => {
    try {
      const response = await fetch('/api/face/liveness', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_base64: imageBase64.split(',')[1]
        }),
      });

      if (!response.ok) {
        throw new Error(`Liveness API error: ${response.status}`);
      }

      const result = await response.json();
      return result;

    } catch (err) {
      console.error('Error checking liveness:', err);
      return { is_live: false, confidence: 0 };
    }
  }, []);

  // Effect to handle stream start/stop based on isActive prop
  useEffect(() => {
    if (isActive && !isStreaming) {
      startStream();
    } else if (!isActive && isStreaming) {
      stopStream();
    }
  }, [isActive, isStreaming, startStream, stopStream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stopStream]);

  // Render bounding boxes on current frame
  const renderFrameWithDetections = () => {
    if (!currentFrame || detectionResults.length === 0) {
      return currentFrame;
    }

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      context.drawImage(img, 0, 0);
      
      // Draw bounding boxes for recent detections
      detectionResults.slice(0, 1).forEach((result) => {
        if (result.bbox && config.display.showBoundingBoxes) {
          const [x1, y1, x2, y2] = result.bbox;
          
          // Choose color based on recognition and liveness status
          let color = '#ff4444'; // Red (default)
          if (result.isLive) {
            if (result.studentId) {
              color = result.attendanceMarked ? '#44ff44' : '#ffff44'; // Green or Yellow
            } else {
              color = '#4444ff'; // Blue (live but unknown)
            }
          }
          
          // Draw bounding box
          context.strokeStyle = color;
          context.lineWidth = 3;
          context.strokeRect(x1, y1, x2 - x1, y2 - y1);
          
          // Draw labels
          const labels = [];
          if (result.studentName) {
            labels.push(result.studentName);
          }
          if (config.display.showLivenessStatus) {
            labels.push(`${result.isLive ? 'LIVE' : 'SPOOF'}: ${(result.livenessConfidence * 100).toFixed(0)}%`);
          }
          if (config.display.showConfidence && result.studentId) {
            labels.push(`Conf: ${(result.confidence * 100).toFixed(0)}%`);
          }
          if (result.attendanceMarked) {
            labels.push('ATTENDANCE MARKED');
          }
          
          // Draw label background and text
          let yOffset = y1 - 10;
          labels.forEach((label) => {
            const metrics = context.measureText(label);
            context.fillStyle = color;
            context.fillRect(x1, yOffset - 20, metrics.width + 10, 25);
            context.fillStyle = '#000000';
            context.font = '14px Arial';
            context.fillText(label, x1 + 5, yOffset - 5);
            yOffset -= 30;
          });
        }
      });
      
      setCurrentFrame(canvas.toDataURL('image/jpeg', 0.8));
    };
    
    img.src = currentFrame;
  };

  // Trigger frame rendering when detection results change
  useEffect(() => {
    if (config.display.showBoundingBoxes) {
      renderFrameWithDetections();
    }
  }, [detectionResults, currentFrame]);

  return (
    <div className="w-full max-w-4xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Camera className="w-6 h-6" />
            <h2 className="text-xl font-bold">Live Face Recognition</h2>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <Activity className="w-4 h-4" />
              <span className="text-sm">
                {isActive ? (isStreaming ? 'Active' : 'Starting...') : 'Inactive'}
              </span>
            </div>
            {isProcessing && (
              <div className="animate-pulse">
                <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Video Feed */}
          <div className="lg:col-span-2">
            <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
              {/* Hidden video element for camera stream */}
              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover"
                style={{ display: 'none' }}
                muted
                playsInline
              />
              
              {/* Hidden canvas for frame processing */}
              <canvas
                ref={canvasRef}
                className="absolute inset-0"
                style={{ display: 'none' }}
              />
              
              {/* Display current frame with detections */}
              {currentFrame ? (
                <img
                  src={currentFrame}
                  alt="Live video feed"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-white">
                  <div className="text-center">
                    <Camera className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">
                      {isStreaming ? 'Initializing camera...' : 'Camera not active'}
                    </p>
                  </div>
                </div>
              )}
              
              {/* Error overlay */}
              {error && (
                <div className="absolute inset-0 bg-red-900 bg-opacity-75 flex items-center justify-center">
                  <div className="text-center text-white">
                    <AlertTriangle className="w-16 h-16 mx-auto mb-4" />
                    <p className="text-lg font-semibold">{error}</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Statistics */}
            <div className="mt-4 grid grid-cols-4 gap-2">
              <div className="bg-blue-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600">{statistics.totalDetections}</div>
                <div className="text-sm text-blue-500">Total Detections</div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">{statistics.recognizedFaces}</div>
                <div className="text-sm text-green-500">Recognized</div>
              </div>
              <div className="bg-yellow-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-yellow-600">{statistics.liveFaces}</div>
                <div className="text-sm text-yellow-500">Live Faces</div>
              </div>
              <div className="bg-red-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-red-600">{statistics.spoofAttempts}</div>
                <div className="text-sm text-red-500">Spoof Attempts</div>
              </div>
            </div>
          </div>
          
          {/* Detection Results Panel */}
          <div className="lg:col-span-1">
            <div className="bg-gray-50 rounded-lg p-4 h-96 overflow-y-auto">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
                <Users className="w-4 h-4 mr-2" />
                Recent Detections
              </h3>
              
              {detectionResults.length === 0 ? (
                <div className="text-center text-gray-500 mt-8">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No detections yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {detectionResults.map((result) => (
                    <div
                      key={result.id}
                      className={`p-3 rounded-lg border-l-4 ${
                        result.attendanceMarked
                          ? 'bg-green-50 border-green-500'
                          : result.studentId
                          ? 'bg-blue-50 border-blue-500'
                          : 'bg-gray-50 border-gray-400'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-800">
                            {result.studentName || 'Unknown Person'}
                          </div>
                          <div className="text-sm text-gray-600">
                            {result.studentId || 'No ID'}
                          </div>
                        </div>
                        <div className="ml-2">
                          {result.attendanceMarked ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : result.isLive ? (
                            <CheckCircle className="w-5 h-5 text-blue-500" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-500" />
                          )}
                        </div>
                      </div>
                      
                      <div className="mt-2 text-xs text-gray-500">
                        <div>Confidence: {(result.confidence * 100).toFixed(1)}%</div>
                        <div>
                          Liveness: {result.isLive ? 'Live' : 'Spoof'} 
                          ({(result.livenessConfidence * 100).toFixed(1)}%)
                        </div>
                        <div>
                          {result.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveFaceRecognition;