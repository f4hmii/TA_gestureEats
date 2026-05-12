import { useEffect, useRef, useState, useCallback } from 'react';
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

export const useHandTracking = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const smoothedCursorRef = useRef({ x: 0, y: 0 });
  const isPinchedRef = useRef(false);
  const isThumbsUpRef = useRef(false);
  const lastActivityTimeRef = useRef(0);

  const initHandTracking = useCallback(async () => {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );
      
      const handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numHands: 2,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5
      });
      
      handLandmarkerRef.current = handLandmarker;
      setIsModelLoaded(true);

      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: "user" }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.addEventListener('loadeddata', () => {
            if (videoRef.current) {
              videoRef.current.play();
              predictWebcam();
            }
          });
        }
      }
    } catch (error) {
      console.error("Error initializing hand tracking:", error);
    }
  }, []);

  let lastVideoTime = -1;
  const predictWebcam = () => {
    if (!videoRef.current || !handLandmarkerRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext("2d");
    
    if (!canvasCtx) return;

    if (video.currentTime !== lastVideoTime) {
      lastVideoTime = video.currentTime;
      const results = handLandmarkerRef.current.detectForVideo(video, performance.now());
      
      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
      
      if (results.landmarks && results.landmarks.length > 0) {
        // Use middle finger knuckle (landmark 9) as the stable cursor tracking point
        // This prevents the cursor from jumping wildly when the user transitions between open hand and fist
        const trackingPoint = results.landmarks[0][9];

        if (trackingPoint && cursorRef.current) {
          // Create an active tracking area in the center of the camera
          // This makes it so users don't have to move their hand to the very edge of the camera frame
          const xPadding = 0.2; // 20% padding left/right
          const yPadding = 0.2; // 20% padding top/bottom
          
          let normalizedX = (trackingPoint.x - xPadding) / (1 - 2 * xPadding);
          let normalizedY = (trackingPoint.y - yPadding) / (1 - 2 * yPadding);
          
          // Clamp values between 0 and 1 so the cursor stops at the screen edges
          normalizedX = Math.max(0, Math.min(1, normalizedX));
          normalizedY = Math.max(0, Math.min(1, normalizedY));

          // Calculate screen coordinates (mirrored horizontally)
          const targetX = (1 - normalizedX) * window.innerWidth;
          const targetY = normalizedY * window.innerHeight;
          
          // Exponential Moving Average (EMA) for smoothing
          const alpha = 0.2; // Adjust between 0.1 (very smooth, more lag) and 1.0 (no smoothing)
          
          if (smoothedCursorRef.current.x === 0 && smoothedCursorRef.current.y === 0) {
             smoothedCursorRef.current.x = targetX;
             smoothedCursorRef.current.y = targetY;
          } else {
             smoothedCursorRef.current.x += (targetX - smoothedCursorRef.current.x) * alpha;
             smoothedCursorRef.current.y += (targetY - smoothedCursorRef.current.y) * alpha;
          }

          // Throttle activity dispatch to prevent spamming
          const now = Date.now();
          if (now - lastActivityTimeRef.current > 500) {
            document.dispatchEvent(new Event('activity'));
            lastActivityTimeRef.current = now;
          }

          // Hand gesture detection
          const wrist = results.landmarks[0][0];
          const middleTip = results.landmarks[0][12];
          const indexTip = results.landmarks[0][8];
          const indexMCP = results.landmarks[0][5];
          const thumbTip = results.landmarks[0][4];
          const thumbIP = results.landmarks[0][3];
          const thumbMCP = results.landmarks[0][2];
          
          const dist = (p1: any, p2: any) => Math.sqrt((p1.x - p2.x)**2 + (p1.y - p2.y)**2 + (p1.z - p2.z)**2);
          
          // Check if fingers are curled (Fist)
          const dWristToTip = dist(wrist, middleTip);
          const dWristToKnuckle = dist(wrist, trackingPoint);
          const isMiddleCurled = dWristToTip < dWristToKnuckle * 1.3;
          
          const dWristToIndexTip = dist(wrist, indexTip);
          const dWristToIndexKnuckle = dist(wrist, indexMCP);
          const isIndexCurled = dWristToIndexTip < dWristToIndexKnuckle * 1.3;

          // Thumbs up logic: fingers curled, thumb pointing straight up (y is smaller at the top of the image)
          const isThumbUp = thumbTip.y < thumbIP.y && thumbIP.y < thumbMCP.y && thumbTip.y < indexMCP.y - 0.05;
          const isThumbsUpGesture = isMiddleCurled && isIndexCurled && isThumbUp;

          // Only consider it a fist (click) if it's not a thumbs up
          const isFist = isMiddleCurled && isIndexCurled && !isThumbsUpGesture;

          if (isThumbsUpGesture && !isThumbsUpRef.current) {
            isThumbsUpRef.current = true;
            document.dispatchEvent(new Event('thumbsup'));
          } else if (!isThumbsUpGesture && isThumbsUpRef.current) {
            isThumbsUpRef.current = false;
          }

          if (isFist && !isPinchedRef.current) {
            isPinchedRef.current = true;
            // Visual feedback
            if (cursorRef.current.firstElementChild) {
              (cursorRef.current.firstElementChild as HTMLElement).style.transform = 'scale(0.8)';
            }
            
            // Trigger click
            const el = document.elementFromPoint(smoothedCursorRef.current.x, smoothedCursorRef.current.y);
            if (el instanceof HTMLElement || el instanceof SVGElement) {
              el.click();
              cursorRef.current.style.filter = "brightness(0.5)";
            }
          } else if (!isFist && isPinchedRef.current) {
            isPinchedRef.current = false;
            // Reset visual feedback
            if (cursorRef.current.firstElementChild) {
              (cursorRef.current.firstElementChild as HTMLElement).style.transform = 'scale(1)';
            }
            cursorRef.current.style.filter = "brightness(1)";
          }
          
          cursorRef.current.style.transform = `translate(${smoothedCursorRef.current.x}px, ${smoothedCursorRef.current.y}px)`;
          cursorRef.current.style.opacity = '1';
        }

        for (const landmarks of results.landmarks) {
          // Draw dots for each landmark
          ctxDrawLandmarks(canvasCtx, landmarks);
        }
      } else if (cursorRef.current) {
        // Hide cursor if no hands detected
        cursorRef.current.style.opacity = '0';
        smoothedCursorRef.current = { x: 0, y: 0 }; // reset
      }
      canvasCtx.restore();
    }
    
    requestAnimationFrame(predictWebcam);
  };

  const ctxDrawLandmarks = (ctx: CanvasRenderingContext2D, landmarks: any[]) => {
    ctx.fillStyle = "#f97316"; // orange-500
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1;

    for (let i = 0; i < landmarks.length; i++) {
      const landmark = landmarks[i];
      const x = landmark.x * ctx.canvas.width;
      const y = landmark.y * ctx.canvas.height;
      
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    }
  };

  useEffect(() => {
    initHandTracking();
    return () => {
      if (handLandmarkerRef.current) {
        handLandmarkerRef.current.close();
      }
    };
  }, [initHandTracking]);

  return { videoRef, canvasRef, cursorRef, isModelLoaded };
};
