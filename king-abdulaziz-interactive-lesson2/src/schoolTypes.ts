import type { LessonControls } from "./lessonControls";

export type SchoolRole = "student" | "teacher";
export type BackendMode = "live" | "demo";
export type ContestStatus = "lobby" | "live" | "finished";

export type SchoolSession = {
  token: string;
  mode: BackendMode;
  role: SchoolRole;
  name: string;
  studentId?: string;
};

export type StudentProgress = {
  currentPage: number;
  visited: number[];
  quizScore: number | null;
  quizTotal: number | null;
  updatedAt?: string;
};

export type Classroom = {
  name: string;
  accessCode?: string;
  activeStrategy: string;
  controls: LessonControls;
};

export type StudentRecord = {
  id: string;
  name: string;
  joinedAt: string;
  lastSeen: string;
  currentPage: number;
  visitedCount: number;
  quizScore: number | null;
  quizTotal: number | null;
};

export type ContestSummary = {
  id: string;
  code: string;
  title: string;
  status: ContestStatus;
  questionIndex: number;
  questionCount: number;
  secondsPerQuestion: number;
  participantCount: number;
  createdAt: string;
};

export type LeaderboardEntry = {
  studentId: string;
  name: string;
  points: number;
  correctCount: number;
};

export type BoardResult = {
  id: string;
  teamA: string;
  teamB: string;
  scoreA: number;
  scoreB: number;
  questionCount: number;
  createdAt: string;
};

export type ContestView = ContestSummary & {
  timeLeft: number;
  question?: {
    number: number;
    total: number;
    prompt: string;
    options: string[];
  };
  leaderboard: LeaderboardEntry[];
  answersCount: number;
  joined: boolean;
  myAnswer?: {
    optionIndex: number;
    correct: boolean;
    points: number;
    correctIndex: number;
  };
  correctIndex?: number;
};

export type TeacherOverview = {
  classroom: Classroom;
  students: StudentRecord[];
  contests: ContestSummary[];
  boardResults: BoardResult[];
};

export type StudentOverview = {
  classroom: Classroom;
  progress: StudentProgress;
  joinedContests: ContestSummary[];
};

export class SchoolError extends Error {
  constructor(message: string, public code = "request_failed") {
    super(message);
    this.name = "SchoolError";
  }
}