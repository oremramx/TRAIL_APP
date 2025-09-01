
export interface UserInput {
  raceName: string;
  distance: number;
  elevation: number;
  weeksToRace: number;
  estimatedTime: string;
  trainingDaysPerWeek: number;
  longRunDays: string[];
  normalDayDuration: number;
  longRunDayDuration: number;
  
  vamPace: string;
  maxHeartRate: number;
  uanPace: string;
  uanHeartRate: number;

  injuryHistory?: string;
  crossTraining: string[];
  raceProfileImage?: string; // Base64 encoded image
}

export interface CoachInput {
  raceType: 'Vertical' | 'Muy Corta' | 'Corta' | 'Media' | 'Larga' | 'Ultra';
  runnerLevel: 'Principiante' | 'Intermedio' | 'Avanzado';
  weeksToRace: number;
  trainingDaysPerWeek: number;
  longRunDays: string[];
  normalDayDuration: number;
  longRunDayDuration: number;
  distance?: number;
  elevation?: number;
  raceProfileImage?: string; // Base64 encoded image
}

export interface WorkoutStep {
    stepName: string; // e.g., "Calentamiento", "Serie 1/4", "Recuperación", "Enfriamiento"
    durationValue: number; // in seconds
    targetType: 'pace_zone' | 'hr_zone' | 'open'; // a zone or just 'go easy'
    targetValue: string; // e.g., "Z1-Z2", "Z3", "Recuperación activa"
}

export interface DailySession {
  day: string;
  method: string;
  duration: string;
  details: string;
  targetZone: string;
  trailElevation?: string;
  structuredSteps?: WorkoutStep[];
}

export interface WeeklySchedule {
  week: number;
  phase: string;
  focus: string;
  sessions: DailySession[];
  summary: string;
}

export interface ControlMetrics {
  elevationRatio: string; // m/km
  elevationRatioPerHour: string; // m/h
  weeklyVolume: string;
  accumulatedIntensity: string;
}

export interface TrainingZone {
  zone: string; // e.g., "Z1", "Z2"
  name: string; // e.g., "Recuperación", "Tempo"
  vamRange?: string; // e.g., "60% VAM"
  paceRange: string; // e.g., "6:15-5:45 min/km"
  fcRange: string; // e.g., "120-140 ppm"
  rpe: string; // e.g., "3-4"
}

export interface GlossaryTerm {
    term: string;
    definition: string;
}

export interface TrainingPlan {
  planSummary: string;
  runnerProfile: {
    level: string;
    needs?: string;
    raceType: string;
  };
  trainingZones: TrainingZone[];
  weeklySchedules: WeeklySchedule[];
  complementaryTasks: {
    strength: string;
    mobility: string;
  };
  raceProfileAdaptations: string;
  controlMetrics: ControlMetrics;
  glossary?: GlossaryTerm[];
}