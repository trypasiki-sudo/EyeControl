export interface GazePoint {
  x: number;
  y: number;
  timestamp: number;
}

export interface CalibrationPoint {
  id: number;
  label: string;
  // Percentage coordinates on screen (0 to 100)
  x: number;
  y: number;
  clicks: number;
  maxClicks: number;
  calibrated: boolean;
}

export interface Bubble {
  id: number;
  x: number; // percentage width
  y: number; // percentage height
  radius: number;
  color: string;
  speed: number;
  popped: boolean;
  scoreValue: number;
}

export interface PaintLine {
  points: { x: number; y: number }[];
  color: string;
  size: number;
}

export type AppTab = 'calibrate' | 'bubble' | 'painter' | 'reader' | 'diagnostics';

export type TrackingMode = 'real' | 'simulated';

export interface TrackerStats {
  fps: number;
  stability: number; // 0 to 100
  totalPointsCount: number;
  calibrationAccuracy: number; // 0 to 100
  headPosition: 'aligned' | 'too-close' | 'too-far' | 'missing' | 'stable';
}
