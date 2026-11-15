import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Check, Lightbulb, MessageCircle } from "lucide-react";
import { defaultLessonControls } from "./lessonControls";
import type { LessonControls } from "./lessonControls";
import { feedbackSound, useStoredState } from "./lessonUi";
import { getStrategy } from "./strategies";
import type { StrategyId } from "./strategies";

type LessonGuidanceValue = { controls: LessonControls; activeStrategyId: string; studentId?: string };

const LessonGuidanceContext = createContext<LessonGuidanceValue>({ controls: defaultLessonControls, activeStrategyId: "brainstorm" });

const strategyTasks: Record<StrategyId, {
  prompt: string;
  mode: "explore" | "single" | "multi";
  options: { id: string; label: string }[];
  correctIds?: string[];
  success: string;
  correction?: string;
}> = {
  brainstorm: {
    prompt: "أي جانب تريد استكشافه أولاً؟",
    mode: "explore",
    options: [
      { id: "identity", label: "من هو الملك عبدالعزيز؟" },
      { id: "qualities", label: "ما صفاته؟" },
      { id: "return", label: "كيف استرد الرياض؟" },
    ],
    success: "اختيار جميل. ابحث عن الإجابة وأنت تقرأ الصفحة والصفحات التالية.",
  },
  timeline: {
    prompt: "ما الذي جاء بعد التوجه من الشوكي إلى الرياض؟",
    mode: "single",
    options: [
      { id: "return", label: "العودة إلى الكويت" },
      { id: "siege", label: "حصار قصر المصمك" },
      { id: "campaign", label: "السير مع الحملة" },
    ],
    correctIds: ["siege"],
    success: "صحيح. جاء حصار المصمك بعد التوجه إلى الرياض.",
    correction: "راجع تسلسل الأحداث: جاء حصار قصر المصمك بعد التوجه إلى الرياض.",
  },
  map: {
    prompt: "أي موقع أقام فيه الملك عبدالعزيز ورجاله ٥٠ يوماً دون تحرك؟",
    mode: "single",
    options: [
      { id: "shuqayb", label: "الشقيب" },
      { id: "jafura", label: "الجافورة" },
      { id: "riyadh", label: "الرياض" },
    ],
    correctIds: ["jafura"],
    success: "أحسنت. تقع هذه المرحلة في صحراء الجافورة.",
    correction: "ابحث عن فترة الاختفاء في خريطة الرحلة؛ الإجابة هي الجافورة.",
  },
  cooperative: {
    prompt: "بعد مناقشة مجموعتك: كيف حرص الملك عبدالعزيز على سلامة السكان؟",
    mode: "single",
    options: [
      { id: "limited", label: "قصر المعركة على من سيواجههم" },
      { id: "residents", label: "عرّض السكان للأخطار" },
      { id: "ignored", label: "لم يضع سلامتهم في الحسبان" },
    ],
    correctIds: ["limited"],
    success: "إجابة موفقة. اقتصرت المعركة على من سيواجههم حرصاً على سلامة السكان.",
    correction: "ناقش الفقرة مع مجموعتك مرة أخرى: حرص على ألا يتعرض السكان لأي أخطار.",
  },
  "think-pair-share": {
    prompt: "اختر صفتين تستنتجهما من وصف رحلة الاسترداد.",
    mode: "multi",
    options: [
      { id: "patience", label: "الصبر" },
      { id: "haste", label: "التسرع" },
      { id: "resolve", label: "العزم" },
      { id: "surrender", label: "الاستسلام" },
    ],
    correctIds: ["patience", "resolve"],
    success: "رائع. يوحي النص بالصبر والعزم في رحلة الاسترداد.",
    correction: "تأمل طول الرحلة وصعوبتها؛ الصفتان هما الصبر والعزم.",
  },
  formative: {
    prompt: "قبل الاختبار النهائي: في أي عام استرد الملك عبدالعزيز الرياض؟",
    mode: "single",
    options: [
      { id: "1318", label: "١٣١٨هـ" },
      { id: "1319", label: "١٣١٩هـ" },
      { id: "1373", label: "١٣٧٣هـ" },
    ],
    correctIds: ["1319"],
    success: "صحيح. استرد الرياض في عام ١٣١٩هـ. أنت مستعد للاختبار.",
    correction: "راجع صفحة المحاولة الثانية: كان استرداد الرياض في عام ١٣١٩هـ.",
  },
};

export function LessonGuidanceProvider({ value, children }: { value: LessonGuidanceValue; children: ReactNode }) {
  return <LessonGuidanceContext.Provider value={value}>{children}</LessonGuidanceContext.Provider>;
}

export function useLessonGuidance() {
  return useContext(LessonGuidanceContext);
}

export function ActivityGate({ id, children }: { id: string; children: ReactNode }) {
  const { controls } = useLessonGuidance();
  return controls.activityIds.includes(id) ? <>{children}</> : null;
}

export function StrategyActivity({ id, soundEnabled }: { id: StrategyId; soundEnabled: boolean }) {
  const { activeStrategyId, studentId } = useLessonGuidance();
  const strategy = getStrategy(id);
  const task = strategyTasks[id];
  const selectedByTeacher = activeStrategyId === id;
  const key = `lesson-strategy-${studentId ?? "local"}-${id}`;
  const [selected, setSelected] = useStoredState<string[]>(`${key}-selected`, []);
  const [checked, setChecked] = useStoredState(`${key}-checked`, false);
  const correct = Boolean(task.correctIds && selected.length === task.correctIds.length && task.correctIds.every((option) => selected.includes(option)));

  function choose(optionId: string) {
    if (task.mode === "multi") {
      setSelected((previous) => previous.includes(optionId)
        ? previous.filter((item) => item !== optionId)
        : previous.length < (task.correctIds?.length ?? 2) ? [...previous, optionId] : previous);
      setChecked(false);
      return;
    }
    setSelected([optionId]);
    setChecked(true);
    if (task.mode === "single") feedbackSound(soundEnabled, task.correctIds?.includes(optionId) ?? false);
  }

  return (
    <section className={`strategy-learning strategy-${id} ${selectedByTeacher ? "teacher-selected" : ""}`} aria-label={`استراتيجية ${strategy.name}`}>
      <div className="strategy-learning-heading">
        <Lightbulb size={23} aria-hidden="true" />
        <div><span>{selectedByTeacher ? "استراتيجية اختارها المعلم" : `${strategy.stage} · استراتيجية هذه الصفحة`}</span><h3>{strategy.name}</h3><p>{strategy.studentPrompt}</p></div>
      </div>
      <div className="strategy-learning-task">
        <strong>{task.prompt}</strong>
        <div className="strategy-learning-options">
          {task.options.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`${selected.includes(option.id) ? "picked" : ""} ${checked && task.correctIds?.includes(option.id) ? "right" : ""} ${checked && selected.includes(option.id) && task.correctIds && !task.correctIds.includes(option.id) ? "wrong" : ""}`}
              onClick={() => choose(option.id)}
              aria-pressed={selected.includes(option.id)}
            >
              <span className="strategy-option-indicator">{selected.includes(option.id) ? <Check size={15} /> : null}</span>{option.label}
            </button>
          ))}
        </div>
        {task.mode === "multi" && <button type="button" className="button-primary strategy-check" disabled={selected.length !== task.correctIds?.length} onClick={() => { setChecked(true); feedbackSound(soundEnabled, correct); }}>تحقق من الاختيار <Check size={16} /></button>}
        {checked && <p className={`strategy-learning-feedback ${task.mode === "explore" || correct ? "success" : "error"}`} role="status">{task.mode === "explore" || correct ? task.success : task.correction}</p>}
      </div>
    </section>
  );
}

function QuestionAnswer({ page, prompt }: { page: number; prompt: string }) {
  const key = `lesson-teacher-question-${page}-${prompt.split("").reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) | 0, 0)}`;
  const [answer, setAnswer] = useState(() => {
    try { return localStorage.getItem(key) ?? ""; } catch { return ""; }
  });

  useEffect(() => {
    try { localStorage.setItem(key, answer); } catch { /* Writing remains possible in the current session. */ }
  }, [key, answer]);

  return (
    <section className="activity-block lesson-teacher-question" aria-label="سؤال المعلم">
      <div className="teacher-question-title"><MessageCircle size={21} /><span>سؤال من المعلم</span></div>
      <h3>{prompt}</h3>
      <label htmlFor={`teacher-answer-${page}`}>إجابتك</label>
      <textarea id={`teacher-answer-${page}`} value={answer} onChange={(event) => setAnswer(event.target.value)} rows={3} placeholder="اكتب فكرتك بأسلوبك هنا..." />
      <small>تُحفظ كتابتك على هذا الجهاز.</small>
    </section>
  );
}

export function TeacherDiscussionQuestion({ page }: { page: number }) {
  const { controls } = useLessonGuidance();
  const question = controls.teacherQuestion;
  if (!question || question.page !== page || page > 5) return null;
  return <QuestionAnswer key={`${page}-${question.prompt}`} page={page} prompt={question.prompt} />;
}