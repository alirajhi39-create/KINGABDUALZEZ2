import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { ArrowDown, ArrowUp, Check, MessageCircle, RotateCcw } from "lucide-react";
import { activityCatalog, defaultLessonControls } from "../lessonControls";
import type { LessonControls } from "../lessonControls";
import { quizQuestions } from "../lessonData";
import { ar } from "../lessonUi";

export function TeacherContentControls({
  controls,
  busy,
  onChange,
}: {
  controls: LessonControls;
  busy: boolean;
  onChange: (next: LessonControls, message: string) => Promise<void>;
}) {
  const [page, setPage] = useState(controls.teacherQuestion?.page ?? 3);
  const [prompt, setPrompt] = useState(controls.teacherQuestion?.prompt ?? "");
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    setPage(controls.teacherQuestion?.page ?? 3);
    setPrompt(controls.teacherQuestion?.prompt ?? "");
  }, [controls.teacherQuestion?.page, controls.teacherQuestion?.prompt]);

  const orderedQuestions = [
    ...controls.quizQuestionIds.map((id) => quizQuestions.find((question) => question.id === id)).filter((item) => item !== undefined),
    ...quizQuestions.filter((question) => !controls.quizQuestionIds.includes(question.id)),
  ];

  function toggleActivity(id: string) {
    const active = controls.activityIds.includes(id);
    const activityIds = active ? controls.activityIds.filter((item) => item !== id) : [...controls.activityIds, id];
    void onChange({ ...controls, activityIds }, active ? "تم إخفاء النشاط عن الطلاب." : "أصبح النشاط متاحاً للطلاب.");
  }

  function toggleQuestion(id: number) {
    const active = controls.quizQuestionIds.includes(id);
    if (active && controls.quizQuestionIds.length === 1) {
      setLocalError("يجب إبقاء سؤال واحد على الأقل في الاختبار.");
      return;
    }
    setLocalError("");
    const quizQuestionIds = active ? controls.quizQuestionIds.filter((item) => item !== id) : [...controls.quizQuestionIds, id];
    void onChange({ ...controls, quizQuestionIds }, active ? "أُخفي السؤال من الاختبار النهائي." : "أُضيف السؤال إلى الاختبار النهائي.");
  }

  function moveQuestion(id: number, direction: -1 | 1) {
    const index = controls.quizQuestionIds.indexOf(id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= controls.quizQuestionIds.length) return;
    const quizQuestionIds = [...controls.quizQuestionIds];
    [quizQuestionIds[index], quizQuestionIds[nextIndex]] = [quizQuestionIds[nextIndex], quizQuestionIds[index]];
    void onChange({ ...controls, quizQuestionIds }, "حُفظ ترتيب أسئلة الاختبار.");
  }

  function saveQuestion(event: FormEvent) {
    event.preventDefault();
    if (prompt.trim().length < 8) {
      setLocalError("اكتب سؤالاً من ٨ أحرف على الأقل.");
      return;
    }
    setLocalError("");
    void onChange({ ...controls, teacherQuestion: { page, prompt: prompt.trim() } }, "أُضيف سؤال النقاش إلى صفحة الدرس المختارة.");
  }

  return (
    <div className="content-controls">
      <section className="content-control-section">
        <div className="teacher-panel-heading"><div><span className="school-section-label">إدارة الممارسة</span><h2>الأنشطة التفاعلية</h2></div><span>{ar(controls.activityIds.length)} من {ar(activityCatalog.length)} مفعّلة</span></div>
        <p className="content-control-description">اختر الأنشطة التي تظهر للطلاب. تبقى نصوص الكتاب والصور والخرائط متاحة دائماً.</p>
        <div className="content-control-list">
          {activityCatalog.map((activity) => (
            <label key={activity.id} className="content-control-row">
              <span className="control-row-copy"><small>الصفحة {ar(activity.page)} · {activity.kind}</small><strong>{activity.title}</strong></span>
              <span className="control-toggle"><input type="checkbox" checked={controls.activityIds.includes(activity.id)} disabled={busy} onChange={() => toggleActivity(activity.id)} aria-label={`إظهار نشاط ${activity.title}`} /><span aria-hidden="true" /></span>
            </label>
          ))}
        </div>
      </section>

      <section className="content-control-section">
        <div className="teacher-panel-heading"><div><span className="school-section-label">بنك أسئلة الدرس</span><h2>أسئلة الاختبار النهائي</h2></div><span>{ar(controls.quizQuestionIds.length)} من {ar(quizQuestions.length)} أسئلة</span></div>
        <p className="content-control-description">فعّل الأسئلة المناسبة، واستخدم السهمين لتغيير ترتيب ظهورها. التصحيح والدرجة يتكيفان مع عدد الأسئلة المختار.</p>
        <div className="content-control-list quiz-control-list">
          {orderedQuestions.map((question) => {
            const enabled = controls.quizQuestionIds.includes(question.id);
            const position = controls.quizQuestionIds.indexOf(question.id);
            return (
              <div key={question.id} className={`content-control-row ${enabled ? "" : "is-muted"}`}>
                <span className="question-order-number">{enabled ? ar(position + 1) : "·"}</span>
                <span className="control-row-copy"><small>{question.type === "choice" ? "اختيار من متعدد" : question.type === "boolean" ? "صح أو خطأ" : question.type === "fill" ? "أكمل الفراغ" : "ترتيب"}</small><strong>{question.prompt}</strong></span>
                <span className="question-order-actions">
                  <button type="button" disabled={busy || !enabled || position === 0} onClick={() => moveQuestion(question.id, -1)} aria-label={`تقديم السؤال ${question.id}`}><ArrowUp size={16} /></button>
                  <button type="button" disabled={busy || !enabled || position === controls.quizQuestionIds.length - 1} onClick={() => moveQuestion(question.id, 1)} aria-label={`تأخير السؤال ${question.id}`}><ArrowDown size={16} /></button>
                </span>
                <label className="control-toggle"><input type="checkbox" checked={enabled} disabled={busy} onChange={() => toggleQuestion(question.id)} aria-label={`إظهار السؤال ${question.id}`} /><span aria-hidden="true" /></label>
              </div>
            );
          })}
        </div>
      </section>

      <section className="content-control-section teacher-custom-question">
        <div className="teacher-panel-heading"><div><span className="school-section-label"><MessageCircle size={17} /> سؤال من المعلم</span><h2>سؤال نقاش مفتوح</h2></div></div>
        <p className="content-control-description">أضف سؤالاً واحداً في صفحة تختارها. يجيب الطلاب بأسلوبهم وتُحفظ الإجابة على أجهزتهم، ولا تدخل في التصحيح الآلي.</p>
        <form onSubmit={saveQuestion}>
          <label>صفحة الدرس<select value={page} onChange={(event) => setPage(Number(event.target.value))}>{[1, 2, 3, 4, 5].map((item) => <option key={item} value={item}>الصفحة {ar(item)}</option>)}</select></label>
          <label>نص السؤال<textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={3} maxLength={250} placeholder="اكتب سؤالاً يعتمد على محتوى الدرس..." /></label>
          <div className="content-form-actions"><button type="submit" className="button-primary" disabled={busy || prompt.trim().length < 8}><Check size={17} /> حفظ السؤال</button>{controls.teacherQuestion && <button type="button" className="button-outline" disabled={busy} onClick={() => void onChange({ ...controls, teacherQuestion: null }, "حُذف سؤال النقاش من الدرس.")}><RotateCcw size={16} /> حذف السؤال</button>}</div>
        </form>
      </section>
      {localError && <p className="school-inline-error" role="alert">{localError}</p>}
      <button type="button" className="button-text controls-reset" disabled={busy} onClick={() => { if (window.confirm("هل تريد إعادة جميع إعدادات الأنشطة والأسئلة إلى وضعها الأصلي؟")) void onChange(structuredClone(defaultLessonControls), "عادت إعدادات الدرس إلى الوضع الأصلي."); }}><RotateCcw size={16} /> إعادة إعدادات الدرس الأصلية</button>
    </div>
  );
}