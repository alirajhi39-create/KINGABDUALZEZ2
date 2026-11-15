import { Check, CheckCircle2, ChevronDown, ChevronLeft, RotateCcw, XCircle } from "lucide-react";
import { quizQuestions } from "./lessonData";
import type { QuizQuestion } from "./lessonData";
import { ar, feedbackSound, isQuizCorrect, useStoredState } from "./lessonUi";

export default function FinalQuiz({ soundEnabled, questionIds, onFinished }: { soundEnabled: boolean; questionIds: number[]; onFinished?: (score: number, total: number) => void }) {
  const selected = questionIds.map((id) => quizQuestions.find((item) => item.id === id)).filter((item): item is QuizQuestion => Boolean(item));
  const questions = selected.length ? selected : quizQuestions;
  const configuration = questions.map((item) => item.id).join("-");
  const [index, setIndex] = useStoredState(`lesson-quiz-index-${configuration}`, 0);
  const [answers, setAnswers] = useStoredState<Record<number, string>>(`lesson-quiz-answers-${configuration}`, {});
  const [submitted, setSubmitted] = useStoredState<Record<number, boolean>>(`lesson-quiz-submitted-${configuration}`, {});
  const [complete, setComplete] = useStoredState(`lesson-quiz-complete-${configuration}`, false);
  const question = questions[index] ?? questions[0];
  const answer = answers[index] ?? "";
  const checked = Boolean(submitted[index]);
  const correct = isQuizCorrect(question, answer);
  const score = questions.filter((item, questionIndex) => submitted[questionIndex] && isQuizCorrect(item, answers[questionIndex] ?? "")).length;
  const percentage = Math.round(score / questions.length * 100);
  const typeLabel = { choice: "اختيار من متعدد", boolean: "صح أم خطأ", fill: "أكمل الفراغ", order: "ترتيب أحداث" }[question.type];

  function submit(value?: string) {
    if (checked) return;
    const response = value ?? answer;
    if (!response.trim()) return;
    if (question.type === "order" && response.split(",").length !== question.options?.length) return;
    setAnswers((previous) => ({ ...previous, [index]: response }));
    setSubmitted((previous) => ({ ...previous, [index]: true }));
    feedbackSound(soundEnabled, isQuizCorrect(question, response));
  }

  function resetQuiz() {
    setIndex(0);
    setAnswers({});
    setSubmitted({});
    setComplete(false);
  }

  if (complete) {
    const message = percentage >= 90
      ? "ممتاز! أتقنت أحداث الدرس وتفاصيله."
      : percentage >= 70
        ? "أحسنت! راجع ما فاتك لتصبح أكثر إتقاناً."
        : "محاولة جيدة! أعد قراءة الدرس ثم جرّب مرة أخرى.";

    return (
      <div className="quiz-results">
        <div className="result-ornament" aria-hidden="true"><span /><span /><span /></div>
        <p className="page-eyebrow">نتيجة الاختبار النهائي</p>
        <div className="result-score">{ar(percentage)}<span>٪</span></div>
        <h2>{message}</h2>
        <p>أجبت إجابة صحيحة عن {ar(score)} من أصل {ar(questions.length)} أسئلة.</p>
        <button type="button" className="button-primary" onClick={resetQuiz}><RotateCcw size={18} /> إعادة الاختبار</button>
        <details className="result-review">
          <summary>راجع إجاباتك <ChevronDown size={18} /></summary>
          <ol>
            {questions.map((item, questionIndex) => {
              const wasCorrect = isQuizCorrect(item, answers[questionIndex] ?? "");
              return (
                <li key={item.id} className={wasCorrect ? "review-right" : "review-wrong"}>
                  {wasCorrect ? <CheckCircle2 size={19} /> : <XCircle size={19} />}
                  <span>{item.prompt}</span>
                  {!wasCorrect && <strong>الصحيح: {item.correctDisplay}</strong>}
                </li>
              );
            })}
          </ol>
        </details>
      </div>
    );
  }

  const orderedValues = answer ? answer.split(",").filter(Boolean) : [];

  return (
    <div className="final-quiz">
      <div className="page-heading quiz-heading">
        <p className="page-eyebrow"><span className="eyebrow-mark" /> بعد إكمال صفحات الدرس</p>
        <h2>الاختبار النهائي</h2>
        <p className="page-intro">{ar(questions.length)} أسئلة من أحداث الدرس. ستعرف صحة إجابتك فوراً، وتحصل على نتيجتك في النهاية.</p>
      </div>
      <div className="quiz-topline">
        <span>السؤال {ar(index + 1)} من {ar(questions.length)}</span>
        <span>{typeLabel}</span>
      </div>
      <div className="quiz-progress" aria-label={`تقدم الاختبار: السؤال ${ar(index + 1)} من ${ar(questions.length)}`}>
        {questions.map((item, questionIndex) => (
          <span key={item.id} className={`${questionIndex <= index ? "reached" : ""} ${submitted[questionIndex] ? "answered" : ""}`} />
        ))}
      </div>
      <div className="question-area" key={index}>
        <span className="question-number">{ar(index + 1).padStart(2, "٠")}</span>
        <h3>{question.prompt}</h3>

        {(question.type === "choice" || question.type === "boolean") && (
          <div className={`quiz-options ${question.type === "boolean" ? "boolean-options" : ""}`}>
            {question.options?.map((option) => (
              <button
                type="button"
                key={option.value}
                disabled={checked}
                onClick={() => submit(option.value)}
                className={`quiz-option ${answer === option.value ? "chosen" : ""} ${checked && option.value === question.correct ? "correct" : ""} ${checked && answer === option.value && !correct ? "incorrect" : ""}`}
              >
                <span className="quiz-option-circle">{checked && option.value === question.correct ? <Check size={16} /> : ""}</span>
                {option.label}
              </button>
            ))}
          </div>
        )}

        {question.type === "fill" && (
          <div className="quiz-fill">
            <label htmlFor={`quiz-answer-${index}`}>اكتب الكلمة المناسبة</label>
            <input
              id={`quiz-answer-${index}`}
              type="text"
              autoComplete="off"
              value={answer}
              disabled={checked}
              onChange={(event) => setAnswers((previous) => ({ ...previous, [index]: event.target.value }))}
              onKeyDown={(event) => { if (event.key === "Enter") submit(); }}
              placeholder="اكتب إجابتك هنا"
            />
            {!checked && <button type="button" className="button-primary" onClick={() => submit()} disabled={!answer.trim()}>تحقق من الإجابة <Check size={17} /></button>}
          </div>
        )}

        {question.type === "order" && (
          <div className="quiz-order">
            <p>اضغط على الأحداث بالترتيب الصحيح:</p>
            <div className="quiz-order-options">
              {question.options?.map((option) => {
                const orderIndex = orderedValues.indexOf(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={checked}
                    className={`quiz-option ${orderIndex >= 0 ? "chosen" : ""}`}
                    onClick={() => {
                      const next = orderIndex >= 0 ? orderedValues.filter((value) => value !== option.value) : [...orderedValues, option.value];
                      setAnswers((previous) => ({ ...previous, [index]: next.join(",") }));
                    }}
                  >
                    <span className="quiz-option-circle">{orderIndex >= 0 ? ar(orderIndex + 1) : ""}</span>
                    {option.label}
                  </button>
                );
              })}
            </div>
            {!checked && <button type="button" className="button-primary" onClick={() => submit()} disabled={orderedValues.length !== question.options?.length}>تحقق من الترتيب <Check size={17} /></button>}
          </div>
        )}

        {checked && (
          <div className={`quiz-feedback ${correct ? "correct" : "incorrect"}`} role="status">
            {correct ? <CheckCircle2 size={22} /> : <XCircle size={22} />}
            <div>
              <strong>{correct ? "إجابة صحيحة، أحسنت!" : "إجابة غير صحيحة"}</strong>
              {!correct && <p>الإجابة الصحيحة: {question.correctDisplay}.</p>}
            </div>
          </div>
        )}
      </div>
      <div className="quiz-footer">
        <span>{checked ? "تم تصحيح الإجابة" : "اختر إجابتك للمتابعة"}</span>
        {checked && (
          <button
            type="button"
            className="button-primary"
            onClick={() => {
              if (index === questions.length - 1) {
                setComplete(true);
                onFinished?.(score, questions.length);
              }
              else setIndex(index + 1);
            }}
          >
            {index === questions.length - 1 ? "عرض النتيجة" : "السؤال التالي"}
            <ChevronLeft size={18} />
          </button>
        )}
      </div>
    </div>
  );
}