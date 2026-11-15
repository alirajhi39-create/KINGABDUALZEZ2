import { quizQuestions } from "./lessonData";

export type TeacherQuestion = { page: number; prompt: string };

export type LessonControls = {
  activityIds: string[];
  quizQuestionIds: number[];
  teacherQuestion: TeacherQuestion | null;
};

export const activityCatalog = [
  { id: "trait-match", page: 1, title: "وصل الصفات بمعانيها", kind: "مطابقة" },
  { id: "masmak-check", page: 2, title: "اكتشف قصر المصمك", kind: "اختيار من متعدد" },
  { id: "event-sort", page: 2, title: "ترتيب أحداث المحاولة الأولى", kind: "ترتيب" },
  { id: "route-challenge", page: 3, title: "تحدي المواقع على الخريطة", kind: "تحديد مواقع" },
  { id: "safety-check", page: 4, title: "سلامة السكان", kind: "صح أو خطأ" },
  { id: "reading-response", page: 5, title: "التفكير في النص القرائي", kind: "إجابة مفتوحة" },
  { id: "death-fill", page: 5, title: "أكمل معلومة الوفاة", kind: "أكمل الفراغ" },
] as const;

export const defaultLessonControls: LessonControls = {
  activityIds: activityCatalog.map((activity) => activity.id),
  quizQuestionIds: quizQuestions.map((question) => question.id),
  teacherQuestion: null,
};

export function normalizeLessonControls(input: unknown): LessonControls {
  if (typeof input === "string") {
    try { return normalizeLessonControls(JSON.parse(input) as unknown); } catch { return structuredClone(defaultLessonControls); }
  }
  if (!input || typeof input !== "object") return structuredClone(defaultLessonControls);
  const raw = input as Record<string, unknown>;
  const knownActivities = new Set<string>(activityCatalog.map((activity) => activity.id));
  const knownQuestions = new Set<number>(quizQuestions.map((question) => question.id));
  const activityIds = Array.isArray(raw.activityIds)
    ? [...new Set(raw.activityIds.filter((id): id is string => typeof id === "string" && knownActivities.has(id)))]
    : [...defaultLessonControls.activityIds];
  const quizQuestionIds = Array.isArray(raw.quizQuestionIds)
    ? [...new Set(raw.quizQuestionIds.map(Number).filter((id) => knownQuestions.has(id)))]
    : [...defaultLessonControls.quizQuestionIds];
  const question = raw.teacherQuestion;
  const teacherQuestion = question && typeof question === "object"
    && Number.isInteger(Number((question as TeacherQuestion).page))
    && Number((question as TeacherQuestion).page) >= 1
    && Number((question as TeacherQuestion).page) <= 5
    && typeof (question as TeacherQuestion).prompt === "string"
    && (question as TeacherQuestion).prompt.trim().length >= 8
    ? {
      page: Number((question as TeacherQuestion).page),
      prompt: (question as TeacherQuestion).prompt.trim().slice(0, 250),
    }
    : null;

  return { activityIds, quizQuestionIds: quizQuestionIds.length ? quizQuestionIds : [...defaultLessonControls.quizQuestionIds], teacherQuestion };
}