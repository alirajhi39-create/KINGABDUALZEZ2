import { useCallback, useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, Clock3, RefreshCw, Trophy, Users, XCircle } from "lucide-react";
import { ar } from "../lessonUi";
import { schoolAction } from "../schoolApi";
import type { ContestView, SchoolSession } from "../schoolTypes";
import { SchoolFrame } from "./SchoolFrame";

export function ContestRoom({
  session,
  contestId,
  onBack,
  onLogout,
}: {
  session: SchoolSession;
  contestId: string;
  onBack: () => void;
  onLogout: () => void;
}) {
  const [room, setRoom] = useState<ContestView | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [answering, setAnswering] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const result = await schoolAction<ContestView>(session.mode, "contest-state", { contestId }, session);
      setRoom(result);
      setSecondsLeft(result.timeLeft);
      setError("");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "تعذر تحديث المسابقة.");
    }
  }, [contestId, session]);

  useEffect(() => {
    void refresh();
    const polling = window.setInterval(() => void refresh(), 2500);
    return () => window.clearInterval(polling);
  }, [refresh]);

  useEffect(() => {
    if (room?.status !== "live") return;
    const clock = window.setInterval(() => setSecondsLeft((previous) => Math.max(0, previous - 1)), 1000);
    return () => window.clearInterval(clock);
  }, [room?.status, room?.questionIndex]);

  async function answer(optionIndex: number) {
    if (!room || answering || room.myAnswer || secondsLeft <= 0) return;
    setAnswering(true);
    try {
      await schoolAction(session.mode, "answer-contest", { contestId, optionIndex }, session);
      await refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "تعذر تسجيل الإجابة.");
      await refresh();
    } finally {
      setAnswering(false);
    }
  }

  const rank = room?.leaderboard.findIndex((entry) => entry.studentId === session.studentId) ?? -1;

  return (
    <SchoolFrame mode={session.mode} session={session} onLogout={onLogout}>
      <main className="school-main contest-main">
        <button type="button" className="school-back" onClick={onBack}><ArrowRight size={18} /> العودة إلى لوحتي</button>
        <div className="contest-page-header"><div><span className="school-section-label"><Trophy size={17} /> مسابقة الدرس</span><h1>{room?.title ?? "غرفة المسابقة"}</h1><p>{room?.status === "live" ? `السؤال ${ar(room.questionIndex + 1)} من ${ar(room.questionCount)}` : room?.status === "finished" ? "انتهت المسابقة، أحسنت المشاركة!" : "اجلس مستعداً. سيبدأ المعلم المسابقة قريباً."}</p></div><span className="contest-room-code">رمز الغرفة <strong dir="ltr">{room?.code ?? "......"}</strong></span></div>
        {error && <p className="school-inline-error" role="alert">{error}</p>}

        {!room && !error && <div className="contest-loading"><RefreshCw size={24} /> جارٍ تحميل المسابقة...</div>}
        {room && <div className="contest-layout">
          <section className="contest-play-area">
            {room.status === "lobby" && <div className="contest-waiting"><span className="waiting-symbol"><Users size={42} /></span><h2>بانتظار إشارة المعلم</h2><p>انضم {ar(room.participantCount)} من الطلاب. ستظهر الأسئلة هنا فور بدء المسابقة.</p><span className="waiting-dots"><i /><i /><i /></span></div>}
            {room.status === "live" && room.question && <>
              <div className="contest-question-top"><span>السؤال {ar(room.question.number)} / {ar(room.question.total)}</span><span className={`contest-clock ${secondsLeft <= 5 ? "urgent" : ""}`}><Clock3 size={19} /> {ar(secondsLeft)} ثانية</span></div>
              <div className="contest-round-progress"><span style={{ width: `${room.question.number / room.question.total * 100}%` }} /></div>
              <h2 className="contest-question-title">{room.question.prompt}</h2>
              <div className="contest-answer-grid">
                {room.question.options.map((option, index) => (
                  <button
                    key={`${room.questionIndex}-${index}`}
                    type="button"
                    disabled={Boolean(room.myAnswer) || answering || secondsLeft <= 0}
                    onClick={() => void answer(index)}
                    className={`contest-answer ${room.myAnswer?.optionIndex === index ? "chosen" : ""} ${room.myAnswer && room.myAnswer.correctIndex === index ? "correct" : ""} ${room.myAnswer?.optionIndex === index && !room.myAnswer.correct ? "wrong" : ""}`}
                  >
                    <span>{["أ", "ب", "ج", "د"][index]}</span>{option}
                  </button>
                ))}
              </div>
              {room.myAnswer ? <div className={`contest-answer-feedback ${room.myAnswer.correct ? "right" : "wrong"}`}>{room.myAnswer.correct ? <CheckCircle2 size={24} /> : <XCircle size={24} />}<div><strong>{room.myAnswer.correct ? "إجابة صحيحة!" : "إجابة غير صحيحة"}</strong><p>{room.myAnswer.correct ? `حصلت على ${ar(room.myAnswer.points)} نقطة.` : `الإجابة الصحيحة: ${room.question.options[room.myAnswer.correctIndex]}.`}</p></div></div> : secondsLeft === 0 ? <p className="contest-time-up">انتهى وقت هذا السؤال. انتظر السؤال التالي من المعلم.</p> : <p className="contest-answer-hint">اختر إجابة واحدة، وسيُحسب وقت إجابتك ضمن النقاط.</p>}
            </>}
            {room.status === "finished" && <div className="contest-finished"><span className="finished-medallion"><Trophy size={42} /></span><p>النتيجة النهائية</p><h2>{rank >= 0 ? `المركز ${ar(rank + 1)}` : "شكراً لمشاركتك"}</h2><strong>{ar(room.leaderboard.find((entry) => entry.studentId === session.studentId)?.points ?? 0)} نقطة</strong><button type="button" className="button-primary" onClick={onBack}>العودة إلى لوحتي <ArrowRight size={18} /></button></div>}
          </section>

          <aside className="contest-leaderboard"><div className="contest-leaderboard-title"><Trophy size={21} /><h2>ترتيب المتسابقين</h2></div><p>تتحدث النتائج تلقائياً أثناء المسابقة.</p>{room.leaderboard.length ? <ol>{room.leaderboard.map((entry, index) => <li key={entry.studentId} className={entry.studentId === session.studentId ? "mine" : ""}><span>{ar(index + 1)}</span><strong>{entry.name}</strong><b>{ar(entry.points)}</b></li>)}</ol> : <div className="leaderboard-empty">لم ينضم متسابقون بعد.</div>}</aside>
        </div>}
      </main>
    </SchoolFrame>
  );
}