import { demoQuestions } from "./demoQuestions";
import { defaultLessonControls, normalizeLessonControls } from "./lessonControls";
import { teachingStrategies } from "./strategies";
import type {
  BoardResult,
  Classroom,
  ContestSummary,
  ContestView,
  SchoolSession,
  StudentProgress,
  StudentRecord,
} from "./schoolTypes";
import { SchoolError } from "./schoolTypes";

type DemoStudent = { id: string; name: string; pin: string; joinedAt: string; lastSeen: string };
type DemoContest = ContestSummary & { startedAt?: string };
type DemoAnswer = { contestId: string; studentId: string; questionIndex: number; optionIndex: number; correct: boolean; points: number };
type DemoState = {
  classroom: Classroom & { accessCode: string };
  students: DemoStudent[];
  progress: Record<string, StudentProgress>;
  contests: DemoContest[];
  participants: Record<string, string[]>;
  answers: DemoAnswer[];
  boardResults: BoardResult[];
};

const STORAGE_KEY = "lesson-school-demo-v1";

export function getDemoCode() {
  return readDemo().classroom.accessCode;
}

function readDemo(): DemoState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const state = JSON.parse(saved) as DemoState;
      state.classroom.name = "الفصل ٦ ب";
      state.classroom.controls = normalizeLessonControls(state.classroom.controls);
      state.boardResults ??= [];
      for (const progress of Object.values(state.progress)) progress.quizTotal ??= progress.quizScore === null ? null : 10;
      return state;
    }
  } catch {
    // A fresh local preview is enough if storage was cleared.
  }
  return {
    classroom: { name: "الفصل ٦ ب", accessCode: "CLASS6", activeStrategy: "brainstorm", controls: structuredClone(defaultLessonControls) },
    students: [],
    progress: {},
    contests: [],
    participants: {},
    answers: [],
    boardResults: [],
  };
}

function writeDemo(state: DemoState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function uid() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function roomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase().padEnd(6, "A");
}

function getStudent(state: DemoState, session?: SchoolSession) {
  const student = state.students.find((item) => item.id === session?.studentId);
  if (!student) throw new SchoolError("سجّل دخول الطالب من جديد.", "unauthorized");
  return student;
}

function requireTeacher(session?: SchoolSession) {
  if (session?.role !== "teacher") throw new SchoolError("هذا الإجراء للمعلم فقط.", "forbidden");
}

function summary(state: DemoState, contest: DemoContest): ContestSummary {
  return { ...contest, participantCount: (state.participants[contest.id] ?? []).length };
}

function contestView(state: DemoState, contest: DemoContest, session?: SchoolSession): ContestView {
  const participants = state.participants[contest.id] ?? [];
  const question = demoQuestions[contest.questionIndex];
  const timeLeft = contest.status === "live" && contest.startedAt
    ? Math.max(0, Math.ceil((new Date(contest.startedAt).getTime() + contest.secondsPerQuestion * 1000 - Date.now()) / 1000))
    : 0;
  const leaderboard = participants
    .map((studentId) => {
      const student = state.students.find((item) => item.id === studentId)!;
      const answers = state.answers.filter((item) => item.contestId === contest.id && item.studentId === studentId);
      return {
        studentId,
        name: student.name,
        points: answers.reduce((total, answer) => total + answer.points, 0),
        correctCount: answers.filter((answer) => answer.correct).length,
      };
    })
    .sort((first, second) => second.points - first.points);
  const answer = state.answers.find((item) => item.contestId === contest.id && item.studentId === session?.studentId && item.questionIndex === contest.questionIndex);
  return {
    ...summary(state, contest),
    timeLeft,
    question: contest.status === "live" ? { number: contest.questionIndex + 1, total: contest.questionCount, prompt: question.prompt, options: question.options } : undefined,
    leaderboard,
    answersCount: state.answers.filter((item) => item.contestId === contest.id && item.questionIndex === contest.questionIndex).length,
    joined: session?.role === "teacher" || participants.includes(session?.studentId ?? ""),
    myAnswer: answer ? { optionIndex: answer.optionIndex, correct: answer.correct, points: answer.points, correctIndex: question.correctIndex } : undefined,
    correctIndex: session?.role === "teacher" ? question.correctIndex : undefined,
  };
}

export async function demoAction(action: string, payload: Record<string, unknown> = {}, session?: SchoolSession): Promise<unknown> {
  const state = readDemo();
  if (action === "teacher-login") {
    return { session: { token: "demo-teacher", mode: "demo", role: "teacher", name: "المعلم" } };
  }
  if (action === "student-login") {
    const name = String(payload.name ?? "").trim().replace(/\s+/g, " ");
    const pin = String(payload.pin ?? "").replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
    const code = String(payload.classroomCode ?? "").trim().toUpperCase();
    if (name.length < 2 || name.length > 40 || !/^\d{4,6}$/.test(pin)) throw new SchoolError("أدخل اسمك ورمزاً شخصياً من ٤ إلى ٦ أرقام.");
    if (code !== state.classroom.accessCode) throw new SchoolError("رمز الصف غير صحيح في العرض التجريبي.");
    let student = state.students.find((item) => item.name.toLowerCase() === name.toLowerCase());
    if (student && student.pin !== pin) throw new SchoolError("هذا الاسم مستخدم. أدخل الرمز الشخصي الذي سجلت به.");
    if (!student) {
      student = { id: uid(), name, pin, joinedAt: new Date().toISOString(), lastSeen: new Date().toISOString() };
      state.students.push(student);
      state.progress[student.id] = { currentPage: 0, visited: [0], quizScore: null, quizTotal: null };
    }
    student.lastSeen = new Date().toISOString();
    writeDemo(state);
    return { session: { token: `demo-${student.id}`, mode: "demo", role: "student", name: student.name, studentId: student.id } };
  }
  if (action === "logout") return { signedOut: true };

  if (action === "student-overview") {
    const student = getStudent(state, session);
    return {
      classroom: { name: state.classroom.name, activeStrategy: state.classroom.activeStrategy, controls: state.classroom.controls },
      progress: state.progress[student.id] ?? { currentPage: 0, visited: [0], quizScore: null, quizTotal: null },
      joinedContests: state.contests.filter((contest) => (state.participants[contest.id] ?? []).includes(student.id)).map((contest) => summary(state, contest)),
    };
  }
  if (action === "save-progress") {
    const student = getStudent(state, session);
    const current = state.progress[student.id] ?? { currentPage: 0, visited: [0], quizScore: null, quizTotal: null };
    state.progress[student.id] = {
      currentPage: Number(payload.currentPage ?? current.currentPage),
      visited: Array.isArray(payload.visited) ? payload.visited.map(Number) : current.visited,
      quizScore: payload.quizScore == null ? current.quizScore : Number(payload.quizScore),
      quizTotal: payload.quizTotal == null ? current.quizTotal : Number(payload.quizTotal),
      updatedAt: new Date().toISOString(),
    };
    writeDemo(state);
    return { saved: true };
  }
  if (action === "teacher-overview") {
    requireTeacher(session);
    const students: StudentRecord[] = state.students.map((student) => ({
      id: student.id,
      name: student.name,
      joinedAt: student.joinedAt,
      lastSeen: student.lastSeen,
      currentPage: state.progress[student.id]?.currentPage ?? 0,
      visitedCount: state.progress[student.id]?.visited?.length ?? 1,
      quizScore: state.progress[student.id]?.quizScore ?? null,
      quizTotal: state.progress[student.id]?.quizTotal ?? null,
    }));
    return { classroom: state.classroom, students, contests: state.contests.map((contest) => summary(state, contest)), boardResults: state.boardResults };
  }
  if (action === "save-board-result") {
    requireTeacher(session);
    const gameId = String(payload.gameId ?? "");
    const existing = state.boardResults.find((item) => item.id === gameId);
    if (existing) return { result: existing };
    const teamA = String(payload.teamA ?? "").trim();
    const teamB = String(payload.teamB ?? "").trim();
    const scoreA = Number(payload.scoreA);
    const scoreB = Number(payload.scoreB);
    const questionCount = Number(payload.questionCount);
    if (!gameId || teamA.length < 2 || teamB.length < 2 || ![5, 10].includes(questionCount)
      || !Number.isInteger(scoreA) || !Number.isInteger(scoreB)
      || scoreA < 0 || scoreB < 0 || scoreA > questionCount * 10 || scoreB > questionCount * 10) {
      throw new SchoolError("نتيجة مسابقة السبورة غير صحيحة.");
    }
    const result: BoardResult = { id: gameId, teamA, teamB, scoreA, scoreB, questionCount, createdAt: new Date().toISOString() };
    state.boardResults.unshift(result);
    writeDemo(state);
    return { result };
  }
  if (action === "set-strategy") {
    requireTeacher(session);
    const id = String(payload.strategyId);
    if (!teachingStrategies.some((strategy) => strategy.id === id)) throw new SchoolError("الاستراتيجية غير صحيحة.");
    state.classroom.activeStrategy = id;
    writeDemo(state);
    return { updated: true };
  }
  if (action === "update-lesson-controls") {
    requireTeacher(session);
    const input = payload.controls as Record<string, unknown> | undefined;
    if (!input || (Array.isArray(input.quizQuestionIds) && !input.quizQuestionIds.length)) throw new SchoolError("أبقِ سؤالاً واحداً على الأقل في الاختبار.");
    state.classroom.controls = normalizeLessonControls(input);
    writeDemo(state);
    return { updated: true, controls: state.classroom.controls };
  }
  if (action === "regenerate-code") {
    requireTeacher(session);
    state.classroom.accessCode = roomCode();
    writeDemo(state);
    return { accessCode: state.classroom.accessCode };
  }
  if (action === "create-contest") {
    requireTeacher(session);
    if (state.contests.some((contest) => contest.status !== "finished")) throw new SchoolError("أنهِ المسابقة الحالية قبل إنشاء واحدة جديدة.");
    const title = String(payload.title ?? "").trim();
    if (title.length < 3) throw new SchoolError("اكتب عنواناً للمسابقة.");
    const contest: DemoContest = {
      id: uid(), code: roomCode(), title, status: "lobby", questionIndex: 0,
      questionCount: demoQuestions.length,
      secondsPerQuestion: Number(payload.secondsPerQuestion ?? 30),
      participantCount: 0,
      createdAt: new Date().toISOString(),
    };
    state.contests.unshift(contest);
    state.participants[contest.id] = [];
    writeDemo(state);
    return { contest: summary(state, contest) };
  }
  if (action === "control-contest") {
    requireTeacher(session);
    const contest = state.contests.find((item) => item.id === payload.contestId);
    if (!contest) throw new SchoolError("لم يتم العثور على المسابقة.");
    if (payload.command === "start" && contest.status === "lobby") {
      contest.status = "live";
      contest.startedAt = new Date().toISOString();
    } else if (payload.command === "next" && contest.status === "live") {
      if (contest.questionIndex + 1 >= contest.questionCount) contest.status = "finished";
      else {
        contest.questionIndex += 1;
        contest.startedAt = new Date().toISOString();
      }
    } else if (payload.command === "finish" && contest.status !== "finished") contest.status = "finished";
    else throw new SchoolError("لا يمكن تنفيذ هذا الإجراء الآن.");
    writeDemo(state);
    return { updated: true };
  }
  if (action === "join-contest") {
    const student = getStudent(state, session);
    const contest = state.contests.find((item) => item.code === String(payload.code ?? "").trim().toUpperCase() && item.status !== "finished");
    if (!contest) throw new SchoolError("رمز المسابقة غير صحيح أو أن المسابقة انتهت.");
    state.participants[contest.id] ??= [];
    if (!state.participants[contest.id].includes(student.id)) state.participants[contest.id].push(student.id);
    writeDemo(state);
    return { contestId: contest.id };
  }
  if (action === "contest-state") {
    const contest = state.contests.find((item) => item.id === payload.contestId);
    if (!contest) throw new SchoolError("لم يتم العثور على المسابقة.");
    if (session?.role === "student" && !(state.participants[contest.id] ?? []).includes(session.studentId ?? "")) throw new SchoolError("انضم إلى المسابقة أولاً.");
    return contestView(state, contest, session);
  }
  if (action === "answer-contest") {
    const student = getStudent(state, session);
    const contest = state.contests.find((item) => item.id === payload.contestId);
    if (!contest || contest.status !== "live") throw new SchoolError("المسابقة غير متاحة الآن.");
    if (!(state.participants[contest.id] ?? []).includes(student.id)) throw new SchoolError("انضم إلى المسابقة أولاً.");
    const view = contestView(state, contest, session);
    if (view.timeLeft <= 0) throw new SchoolError("انتهى وقت الإجابة.");
    if (state.answers.some((item) => item.contestId === contest.id && item.studentId === student.id && item.questionIndex === contest.questionIndex)) throw new SchoolError("أجبت عن هذا السؤال بالفعل.");
    const optionIndex = Number(payload.optionIndex);
    const question = demoQuestions[contest.questionIndex];
    if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= question.options.length) throw new SchoolError("اختر إجابة صحيحة.");
    const correct = optionIndex === question.correctIndex;
    const points = correct ? 100 + Math.floor(view.timeLeft / contest.secondsPerQuestion * 50) : 0;
    state.answers.push({ contestId: contest.id, studentId: student.id, questionIndex: contest.questionIndex, optionIndex, correct, points });
    writeDemo(state);
    return { correct, points, correctIndex: question.correctIndex };
  }
  throw new SchoolError("إجراء غير متاح في العرض التجريبي.");
}