import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, BookOpen, ChevronLeft, Compass, MapPin, RefreshCw, Trophy } from "lucide-react";
import { lessonTabs } from "../lessonData";
import type { LessonControls } from "../lessonControls";
import { ar } from "../lessonUi";
import { schoolAction } from "../schoolApi";
import type { SchoolSession, StudentOverview, StudentProgress } from "../schoolTypes";
import { getStrategy } from "../strategies";
import { SchoolFrame } from "./SchoolFrame";

export function StudentDashboard({
  session,
  onLogout,
  onEnterLesson,
  onContest,
}: {
  session: SchoolSession;
  onLogout: () => void;
  onEnterLesson: (progress: StudentProgress, page?: number, strategyId?: string, controls?: LessonControls) => void;
  onContest: (contestId: string) => void;
}) {
  const [overview, setOverview] = useState<StudentOverview | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const result = await schoolAction<StudentOverview>(session.mode, "student-overview", {}, session);
      setOverview(result);
      setError("");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "تعذر تحديث البيانات.");
    }
  }, [session]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 6000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  async function join(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await schoolAction<{ contestId: string }>(session.mode, "join-contest", { code: joinCode }, session);
      onContest(result.contestId);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "تعذر الانضمام للمسابقة.");
    } finally {
      setBusy(false);
    }
  }

  const progress = overview?.progress ?? { currentPage: 0, visited: [0], quizScore: null, quizTotal: null };
  const strategy = getStrategy(overview?.classroom.activeStrategy ?? "brainstorm");
  const visited = Math.min(progress.visited.length, 6);

  return (
    <SchoolFrame mode={session.mode} session={session} onLogout={onLogout}>
      <main className="school-main student-main">
        <p className="school-overline">لوحة الطالب <span>/</span> {overview?.classroom.name ?? "الفصل ٦ ب"}</p>
        <div className="school-page-heading">
          <div><h1>أهلاً يا {session.name}</h1><p>رحلتك مع الملك عبدالعزيز تبدأ من حيث توقفت.</p></div>
          <button type="button" className="school-refresh" onClick={() => void refresh()} aria-label="تحديث بياناتي"><RefreshCw size={18} /> تحديث</button>
        </div>

        <section className="student-overview-grid" aria-label="متابعة التعلم">
          <div className="student-primary-action">
            <span className="school-section-label"><BookOpen size={17} /> الدرس التفاعلي</span>
            <h2>اكتشف رحلة<br />استرداد الرياض</h2>
            <p>اقرأ الصفحات الخمس، تفاعل مع الخريطتين، ثم اختبر فهمك.</p>
            <button type="button" className="button-primary" onClick={() => onEnterLesson(progress, undefined, overview?.classroom.activeStrategy, overview?.classroom.controls)}>
              {visited > 1 ? "متابعة من حيث توقفت" : "ابدأ الدرس"}<ArrowLeft size={18} />
            </button>
          </div>
          <div className="student-progress-area">
            <span className="school-section-label"><Compass size={17} /> تقدّمك في الدرس</span>
            <div className="student-progress-number"><strong>{ar(visited)}</strong><span>من ٦ خطوات</span></div>
            <div className="student-progress-track"><span style={{ width: `${visited / 6 * 100}%` }} /></div>
            <p>آخر ما وصلت إليه: <strong>{lessonTabs[progress.currentPage] ?? lessonTabs[0]}</strong></p>
            {progress.quizScore !== null && <p>نتيجة اختبار الدرس: <strong>{ar(progress.quizScore)} من {ar(progress.quizTotal ?? 10)}</strong></p>}
          </div>
        </section>

        <section className="student-join-section" aria-label="الانضمام إلى المسابقة">
          <div className="student-join-intro"><span className="join-icon"><Trophy size={25} /></span><div><span className="school-section-label">المسابقة المباشرة</span><h2>تحدّ زملاءك في الصف</h2><p>أدخل رمز الغرفة الذي يعرضه المعلم لتشارك من جهازك.</p></div></div>
          <form onSubmit={join} className="join-form">
            <label htmlFor="contest-code">رمز المسابقة</label>
            <div><input id="contest-code" required minLength={6} maxLength={6} value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} placeholder="اكتب الرمز" dir="ltr" /><button type="submit" className="button-primary" disabled={busy}>{busy ? "جارٍ الدخول" : "انضم الآن"}<ChevronLeft size={18} /></button></div>
          </form>
        </section>
        {error && <p className="school-inline-error" role="alert">{error}</p>}

        <section className="student-strategy-section">
          <span className="school-section-label"><MapPin size={17} /> استراتيجية التعلم الحالية</span>
          <div className="strategy-feature-line"><div><span>{strategy.stage}</span><h2>{strategy.name}</h2><p>{strategy.studentPrompt}</p></div><button type="button" className="button-outline" onClick={() => onEnterLesson(progress, strategy.page - 1, strategy.id, overview?.classroom.controls)}>اذهب إلى النشاط <ChevronLeft size={18} /></button></div>
        </section>

        {overview && overview.joinedContests.length > 0 && (
          <section className="joined-contests">
            <h2 className="school-list-title">مسابقات انضممت إليها</h2>
            {overview.joinedContests.map((contest) => (
              <button key={contest.id} type="button" onClick={() => onContest(contest.id)}>
                <span><strong>{contest.title}</strong><small>{contest.status === "lobby" ? "بانتظار البداية" : contest.status === "live" ? "مباشرة الآن" : "انتهت"}</small></span>
                <ChevronLeft size={19} />
              </button>
            ))}
          </section>
        )}
      </main>
    </SchoolFrame>
  );
}