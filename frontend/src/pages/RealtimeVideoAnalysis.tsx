import React, { useState, useRef, useEffect } from 'react';
import api from '../lib/api';
import {
  Video,
  Play,
  Pause,
  Upload,
  Crosshair,
  Activity
} from 'lucide-react';

interface Detection {
  track_id: number;
  pixel_x: number;
  pixel_y: number;
  pitch_x: number;
  pitch_y: number;
  speed_mps: number;
  bbox: [number, number, number, number];
}

export default function RealtimeVideoAnalysis() {
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [fps, setFps] = useState(0);
  const [latencyMs, setLatencyMs] = useState(0);
  const [activeFrame, setActiveFrame] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pitchCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Handle Video File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoSrc(url);
      setDetections([]);
      setIsPlaying(false);
    }
  };

  // Real-time analysis pipeline loop
  const processFrame = async () => {
    if (!videoRef.current || !canvasRef.current || videoRef.current.paused || videoRef.current.ended) {
      if (isPlaying) {
        animationFrameRef.current = requestAnimationFrame(processFrame);
      }
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (ctx && video.videoWidth > 0) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw current video frame to hidden extraction buffer
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Extract image data for backend CV engine
      const frameBase64 = canvas.toDataURL('image/jpeg', 0.65);
      const startTime = performance.now();

      try {
        const res = await api.post('/video-jobs/analyze-frame/', {
          frame_base64: frameBase64,
          timestamp: video.currentTime,
          frame_number: activeFrame + 1,
        });

        const elapsed = Math.round(performance.now() - startTime);
        setLatencyMs(elapsed);
        setFps(Math.round(1000 / Math.max(1, elapsed)));
        setActiveFrame((prev) => prev + 1);

        if (res.data?.detections) {
          setDetections(res.data.detections);
          draw2DPitch(res.data.detections);
        }
      } catch (err) {
        // Continue stream without hard-crashing
      }
    }

    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(processFrame);
    }
  };

  // Draw Mini 2D Tactical Pitch
  const draw2DPitch = (currentDetections: Detection[]) => {
    const pitch = pitchCanvasRef.current;
    if (!pitch) return;
    const ctx = pitch.getContext('2d');
    if (!ctx) return;

    const w = pitch.width;
    const h = pitch.height;

    // Pitch Grass
    ctx.fillStyle = '#07160D';
    ctx.fillRect(0, 0, w, h);

    // Border line
    ctx.strokeStyle = '#1E3A2B';
    ctx.lineWidth = 2;
    ctx.strokeRect(4, 4, w - 8, h - 8);

    // Halfway line & Center Circle
    ctx.beginPath();
    ctx.moveTo(w / 2, 4);
    ctx.lineTo(w / 2, h - 4);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(w / 2, h / 2, h * 0.18, 0, Math.PI * 2);
    ctx.stroke();

    // Goal boxes
    ctx.strokeRect(4, h * 0.25, w * 0.14, h * 0.5);
    ctx.strokeRect(w - w * 0.14 - 4, h * 0.25, w * 0.14, h * 0.5);

    // Plot players via 0-100 pitch coordinates
    currentDetections.forEach((d) => {
      const px = (d.pitch_x / 100) * (w - 8) + 4;
      const py = (d.pitch_y / 100) * (h - 8) + 4;

      // Draw Player Beacon
      ctx.fillStyle = '#00FF87';
      ctx.beginPath();
      ctx.arc(px, py, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Velocity trail
      ctx.strokeStyle = 'rgba(0, 255, 135, 0.4)';
      ctx.beginPath();
      ctx.arc(px, py, 8, 0, Math.PI * 2);
      ctx.stroke();
    });
  };

  useEffect(() => {
    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(processFrame);
    } else if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying]);

  const togglePlayback = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  return (
    <div className="p-6 space-y-5 max-w-[1700px] mx-auto select-none">
      {/* Broadcast Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 panel-tactical p-4 bg-[#0B0F19] border-border-bright">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-accent text-black flex items-center justify-center font-black">
            <Video className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-widest uppercase font-mono text-white">
              REAL-TIME COMPUTER VISION INGESTION &amp; TRACKING
            </h1>
            <p className="text-[11px] text-text-secondary font-mono">
              DIRECT CAMERA / BROADCAST FEED &middot; 4-POINT CALIBRATED METRIC ESTIMATION
            </p>
          </div>
        </div>

        {/* Live Metrics Telemetry */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <div className="panel-tactical px-3 py-1.5 bg-[#07090E] border-border flex items-center gap-2">
            <span className="text-text-muted">CALIBRATION:</span>
            <span className="text-accent font-bold">4-PT HOMOGRAPHY</span>
          </div>
          <div className="panel-tactical px-3 py-1.5 bg-[#07090E] border-border flex items-center gap-2">
            <span className="text-text-muted">PIPELINE LATENCY:</span>
            <span className="text-white font-bold">{latencyMs} ms</span>
          </div>
          <div className="panel-tactical px-3 py-1.5 bg-[#07090E] border-border flex items-center gap-2">
            <span className="text-text-muted">THROUGHPUT:</span>
            <span className="text-accent font-bold">{fps} FPS</span>
          </div>
        </div>
      </div>

      {/* Main Dual Screen: Video Player & Realtime 2D Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Live Video Feed with Overlays (8 cols) */}
        <div className="lg:col-span-8 panel-tactical p-4 space-y-3 bg-[#0A0D15]">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-danger animate-pulse" />
              <span className="font-mono text-xs font-bold uppercase text-white tracking-wider">
                OPTICAL SENSOR FEED (RAW STREAM)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <label className="btn-tactical btn-secondary py-1 px-3 text-[10px] gap-1.5 cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                LOAD MATCH FOOTAGE
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Viewport Screen */}
          <div className="relative aspect-video bg-[#000000] border border-border flex items-center justify-center overflow-hidden">
            {videoSrc ? (
              <>
                <video
                  ref={videoRef}
                  src={videoSrc}
                  crossOrigin="anonymous"
                  playsInline
                  loop
                  muted
                  className="w-full h-full object-contain"
                />
                {/* Hidden processing canvas */}
                <canvas ref={canvasRef} className="hidden" />

                {/* Tactical SVG HUD Overlay */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  {detections.map((d) => (
                    <g key={d.track_id}>
                      {/* Bounding Box Boxy Target */}
                      <rect
                        x={`${(d.bbox[0] / 1280) * 100}%`}
                        y={`${(d.bbox[1] / 720) * 100}%`}
                        width={`${(d.bbox[2] / 1280) * 100}%`}
                        height={`${(d.bbox[3] / 720) * 100}%`}
                        fill="rgba(0, 255, 135, 0.08)"
                        stroke="#00FF87"
                        strokeWidth="1.5"
                      />
                      {/* Track Tag HUD */}
                      <rect
                        x={`${(d.bbox[0] / 1280) * 100}%`}
                        y={`${((d.bbox[1] - 16) / 720) * 100}%`}
                        width="70"
                        height="16"
                        fill="#00FF87"
                      />
                      <text
                        x={`${(d.bbox[0] / 1280) * 100 + 1}%`}
                        y={`${((d.bbox[1] - 4) / 720) * 100}%`}
                        fill="#000000"
                        fontSize="10"
                        fontWeight="900"
                        fontFamily="monospace"
                      >
                        ID#{d.track_id} {d.speed_mps}m/s
                      </text>
                    </g>
                  ))}
                </svg>
              </>
            ) : (
              <div className="text-center p-8 space-y-3 font-mono">
                <Crosshair className="w-12 h-12 text-border-bright mx-auto stroke-1" />
                <p className="text-sm font-bold text-white uppercase">NO OPTICAL FEED LOADED</p>
                <p className="text-xs text-text-muted max-w-md mx-auto">
                  Click 'LOAD MATCH FOOTAGE' above to feed high-res football video (.mp4/.mov).
                  The OpenCV homography engine will track players and project 2D tactical coordinates in real-time.
                </p>
              </div>
            )}
          </div>

          {/* Transport Controls (Hard Sharp Brutalist Buttons) */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <button
                onClick={togglePlayback}
                disabled={!videoSrc}
                className="btn-tactical btn-primary gap-2"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isPlaying ? 'PAUSE INGEST' : 'RUN REALTIME INGEST'}
              </button>

              <button
                onClick={() => {
                  if (videoRef.current) {
                    videoRef.current.currentTime = 0;
                  }
                }}
                disabled={!videoSrc}
                className="btn-tactical btn-secondary"
              >
                REWIND
              </button>
            </div>

            <div className="font-mono text-xs text-text-secondary">
              ACTIVE TRACKS: <span className="text-accent font-bold">{detections.length}</span>
            </div>
          </div>
        </div>

        {/* Right Column: 2D Radar & Live Physical Velocity Stream (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* 2D Calibrated Pitch Projection */}
          <div className="panel-tactical p-4 bg-[#0A0D15] space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <span className="font-mono text-xs font-bold uppercase text-white tracking-wider flex items-center gap-2">
                <Crosshair className="w-4 h-4 text-accent" />
                HOMOGRAPHY 2D RADAR (0-100m)
              </span>
              <span className="text-[10px] font-mono text-accent bg-accent/10 px-1.5 py-0.5 border border-accent/20">
                CALIBRATED
              </span>
            </div>

            {/* Tactical Pitch Canvas */}
            <div className="border border-border">
              <canvas
                ref={pitchCanvasRef}
                width={360}
                height={240}
                className="w-full h-auto block"
              />
            </div>
            <p className="text-[10px] text-text-muted font-mono text-center">
              TRUE HOMOGRAPHY REPROJECTION FROM PIXEL SPACE TO METRIC 2D
            </p>
          </div>

          {/* Real-time Velocity Telemetry Table */}
          <div className="panel-tactical p-4 bg-[#0A0D15] space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <span className="font-mono text-xs font-bold uppercase text-white tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-accent" />
                TELEMETRY DATA STREAM
              </span>
              <span className="text-[10px] font-mono text-text-muted">
                FRAME #{activeFrame}
              </span>
            </div>

            <div className="space-y-1 max-h-[220px] overflow-y-auto pr-1 font-mono text-xs">
              {detections.length === 0 ? (
                <div className="p-6 text-center text-text-muted text-xs">
                  Awaiting player tracking stream...
                </div>
              ) : (
                detections.map((d) => (
                  <div
                    key={d.track_id}
                    className="flex items-center justify-between p-2 bg-[#07090E] border border-border"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-accent" />
                      <span className="font-bold text-white">ID #{d.track_id}</span>
                    </div>

                    <div className="flex items-center gap-4 text-text-secondary text-[11px]">
                      <span>X:{d.pitch_x} Y:{d.pitch_y}</span>
                      <span className="text-accent font-bold">{d.speed_mps} m/s</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
