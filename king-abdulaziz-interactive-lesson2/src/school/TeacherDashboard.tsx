import { useCallback, useEffect, useState } from "react";
import {
  BookOpen,
  Check,
  ChevronLeft,
  ClipboardCopy,
  FileDown,
  ListChecks,
  Lightbulb,
  MonitorPlay,
  Play,
  RefreshCw,
  RotateCcw,
  Square,
  Trophy,
  Users,
} from "lucide-react";
import { ar } from "../lessonUi";
import { defaultLessonControls } from "../lessonControls";
import { schoolAction } from "../schoolApi";
import type { ContestSummary, ContestView, SchoolSession, TeacherOverview } from "../schoolTypes";
import { teachingStrategies } from "../strategies";
import { SchoolFrame } from "./SchoolFrame";
import { TeacherContentControls } from "./TeacherContentControls";
import { TeacherReport } from "./TeacherReport";

type TeacherTab = "students" | "strategies" | "content" | "contest";

export function TeacherDashboard({ session, onLogout, onBoardContest }: { session: SchoolSession; onLogout: () => void; onBoardContest: () => void }) {
  const [tab, setTab] = useState<TeacherTab>("students");
  const [overview, setOverview] = useState<TeacherOverview | null>(null);
  const [selectedContestId, setSelectedContestId] = useState<string | null>(null);
  const [room, setRoom] = useState<ContestView | null>(null);
  const [title, setTitle] = useState("رحلة استرداد الرياض");
  const [questionCount, setQuestionCount] = useState(10);
  const [seconds, setSeconds] = useState(30);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const refreshOverview = useCallback(async () => {
    try {
      const data = await schoolAction<TeacherOverview>(session.mode, "teacher-overview", {}, session);
      setOverview(data);
      setError("");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "تعذر تحديث لوحة المعلم.");
    }
  }, [session]);

  const refreshRoom = useCallback(async (contestId: string) => {
    try {
      const data = await schoolAction<ContestView>(session.mode, "contest-state", { contestId }, session);
      setRoom(data);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "تعذر تحديث المسابقة.");
    }
  }, [session]);

  useEffect(() => {
    void refreshOverview();
    const timer = window.setInterval(() => void refreshOverview(), 9000);
    return () => window.clearInterval(timer);
  }, [refreshOverview]);

  const currentContest: ContestSummary | undefined = selectedContestId
    ? overview?.contests.find((contest) => contest.id === selectedContestId)
    : overview?.contests.find((contest) => contest.status !== "finished");

  useEffect(() => {
    if (!currentContest) { setRoom(null); return; }
    void refreshRoom(currentContest.id);
    const timer = window.setInterval(() => void refreshRoom(currentContest.id), 2500);
    return () => window.clearInterval(timer);
  }, [currentContest?.id, refreshRoom]);

  async function update(action: string, payload: Record<string, unknown>, message: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await schoolAction<Record<string, unknown>>(session.mode, action, payload, session);
      await refreshOverview();
      if (currentContest) await refreshRoom(currentContest.id);
      setNotice(message);
      return result;
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "تعذر تنفيذ الإجراء.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function create(event: React.FormEvent) {
    event.preventDefault();
    const result = await update("create-contest", { title, questionCount: session.mode === "demo" ? 5 : questionCount, secondsPerQuestion: seconds }, "تم إنشاء المسابقة. شارك رمزها مع الطلاب.");
    if (result?.contest) {
      const contest = result.contest as ContestSummary;
      setSelectedContestId(contest.id);
      await refreshRoom(contest.id);
    }
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setNotice(`الرمز: ${code}`);
    }
  }

  const strategiesActive = overview?.classroom.activeStrategy ?? "brainstorm";

  return (
    <SchoolFrame mode={session.mode} session={session} onLogout={onLogout}>
      <main className="school-main teacher-main">
        <p className="school-overline">إدارة الصف <span>/</span> {overview?.classroom.name ?? "الفصل ٦ ب"}</p>
        <div className="school-page-heading">
          <div><h1>لوحة المعلم</h1><p>تابع تقدم الطلاب، واضبط الأنشطة والأسئلة، وفعّل الاستراتيجيات واطبع تقرير الصف.</p></div>
          <button type="button" className="school-refresh" onClick={() => void refreshOverview()}><RefreshCw size={17} /> تحديث البيانات</button>
        </div>

        <div className="teacher-classbar">
          <div><span>رمز دخول الطلاب</span><strong dir="ltr">{overview?.classroom.accessCode ?? "......"}</strong><small>شاركه مع طلاب الصف فقط.</small></div>
          <div className="teacher-classbar-actions">
            <button type="button" className="button-outline" disabled={!overview?.classroom.accessCode} onClick={() => void copyCode(overview!.classroom.accessCode!)}>{copied ? <Check size={17} /> : <ClipboardCopy size={17} />}{copied ? "تم النسخ" : "نسخ الرمز"}</button>
            <button type="button" className="button-text" disabled={busy} onClick={() => { if (window.confirm("هل تريد إنشاء رمز صف جديد؟ لن يستطيع الطلاب الجدد استخدام الرمز القديم.")) void update("regenerate-code", {}, "تم تغيير رمز الصف."); }}><RotateCcw size={16} /> تغيير الرمز</button>
          </div>
        </div>

        <nav className="teacher-tabs" aria-label="أقسام لوحة المعلم">
          {([[
            "students", "الطلاب والتقدم", Users,
          ], ["strategies", "استراتيجيات الدرس", Lightbulb], ["content", "الأسئلة والأنشطة", ListChecks], ["contest", "المسابقات", Trophy]] as const).map(([id, label, Icon]) => (
            <button key={id} type="button" className={tab === id ? "active" : ""} onClick={() => { setTab(id); setError(""); setNotice(""); }} aria-current={tab === id ? "page" : undefined}><Icon size={19} />{label}</button>
          ))}
        </nav>
        {error && <p className="school-inline-error" role="alert">{error}</p>}
        {notice && <p className="school-inline-success" role="status">{notice}</p>}

        {tab === "students" && (
          <section className="teacher-tab-panel">
            <div className="teacher-panel-heading"><div><span className="school-section-label"><Users size={17} /> سجل الصف</span><h2>تقدم الطلاب</h2></div><div className="teacher-panel-actions"><span>{ar(overview?.students.length ?? 0)} طلاب</span><button type="button" className="button-outline" disabled={!overview} onClick={() => setReportOpen(true)}><FileDown size={17} /> تقرير PDF</button></div></div>
            {overview?.students.length ? (
              <div className="teacher-table-scroll"><table className="teacher-roster"><thead><tr><th>الطالب</th><th>الدرس</th><th>الصفحات المزارة</th><th>الاختبار النهائي</th><th>آخر حضور</th></tr></thead><tbody>
                {overview.students.map((student) => (
                  <tr key={student.id}><td><strong>{student.name}</strong></td><td>{student.currentPage === 5 ? "الاختبار" : `الصفحة ${ar(student.currentPage + 1)}`}</td><td><div className="roster-progress"><span style={{ width: `${student.visitedCount / 6 * 100}%` }} /></div><small>{ar(student.visitedCount)} / ٦</small></td><td>{student.quizScore == null ? <span className="muted">لم ينجزه بعد</span> : `${ar(student.quizScore)} / ${ar(student.quizTotal ?? 10)}`}</td><td className="muted">{new Date(student.lastSeen).toLocaleDateString("ar-SA")}</td></tr>
                ))}
              </tbody></table></div>
            ) : <div className="teacher-empty"><BookOpen size={28} /><h3>لم يدخل أي طالب بعد</h3><p>شارك رمز الصف أعلاه، وستظهر أسماء الطلاب وتقدمهم هنا تلقائياً.</p></div>}
          </section>
        )}

        {tab === "strategies" && (
          <section className="teacher-tab-panel">
            <div className="teacher-panel-heading"><div><span className="school-section-label"><Lightbulb size={17} /> التدريس النشط</span><h2>اختر استراتيجية للصف</h2></div><span>تظهر التعليمات للطلاب تلقائياً</span></div>
            <div className="teacher-strategy-list">
              {teachingStrategies.map((strategy, index) => (
                <button key={strategy.id} type="button" disabled={busy} className={`teacher-strategy ${strategiesActive === strategy.id ? "active" : ""}`} onClick={() => void update("set-strategy", { strategyId: strategy.id }, `تم تفعيل استراتيجية ${strategy.name}.`)}>
                  <span className="strategy-list-number">{ar(index + 1).padStart(2, "٠")}</span>
                  <span className="strategy-list-content"><small>{strategy.stage} · صفحة {ar(strategy.page)}</small><strong>{strategy.name}</strong><span>{strategy.teacherGuide}</span></span>
                  <span className="strategy-list-status">{strategiesActive === strategy.id ? "مفعّلة" : "تفعيل"}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {tab === "content" && (
          <section className="teacher-tab-panel">
            <TeacherContentControls
              controls={overview?.classroom.controls ?? defaultLessonControls}
              busy={busy || !overview}
              onChange={async (next, message) => { await update("update-lesson-controls", { controls: next }, message); }}
            />
          </section>
        )}

        {tab === "contest" && (
          <section className="teacher-tab-panel">
            <div className="board-mode-entry">
              <div><span className="school-section-label"><MonitorPlay size={18} /> للفصل ٦ ب · السبورة الذكية</span><h2>تحدي الفرق على السبورة</h2><p>يتناوب فريقان على اختيار الإجابة بلمسة واحدة أمام الصف. لا يحتاج الطلاب إلى أجهزة.</p></div>
              <button type="button" className="button-primary" onClick={onBoardContest}><MonitorPlay size={19} /> افتح مسابقة السبورة</button>
            </div>
            <div className="teacher-panel-heading"><div><span className="school-section-label"><Trophy size={17} /> تحدي الصف</span><h2>المسابقة المباشرة</h2></div><span>{session.mode === "demo" ? "تجربة بين تبويبات المتصفح نفسه" : "تتزامن النتائج بين أجهزة الطلاب"}</span></div>
            {!currentContest ? (
              <form className="create-contest-form" onSubmit={create}>
                <div className="create-form-copy"><h3>أنشئ غرفة مسابقة</h3><p>أسئلة من حقائق الدرس، وتصحيح تلقائي ولوحة ترتيب تتحدث أثناء اللعب.</p></div>
                <label>عنوان المسابقة<input value={title} onChange={(event) => setTitle(event.target.value)} minLength={3} maxLength={80} required /></label>
                <div className="create-form-fields"><label>عدد الأسئلة<select value={session.mode === "demo" ? 5 : questionCount} onChange={(event) => setQuestionCount(Number(event.target.value))} disabled={session.mode === "demo"}><option value={5}>٥ أسئلة</option><option value={10}>١٠ أسئلة</option></select></label><label>وقت السؤال<select value={seconds} onChange={(event) => setSeconds(Number(event.target.value))}>{[15, 20, 30, 45, 60].map((value) => <option key={value} value={value}>{ar(value)} ثانية</option>)}</select></label></div>
                <button className="button-primary" type="submit" disabled={busy}>{busy ? "جارٍ الإنشاء..." : "إنشاء المسابقة"}<ChevronLeft size={18} /></button>
              </form>
            ) : (
              <div className="teacher-room">
                <div className="teacher-room-head"><div><span className="school-section-label">{currentContest.status === "lobby" ? "غرفة الانتظار" : currentContest.status === "live" ? "المسابقة جارية الآن" : "نتائج المسابقة"}</span><h3>{currentContest.title}</h3></div><div className="room-code-block"><span>رمز الغرفة</span><strong dir="ltr">{currentContest.code}</strong><button type="button" onClick={() => void copyCode(currentContest.code)}><ClipboardCopy size={17} /> نسخ</button></div></div>
                <div className="teacher-room-meta"><span>المشاركون <strong>{ar(room?.participantCount ?? currentContest.participantCount)}</strong></span><span>السؤال <strong>{currentContest.status === "lobby" ? "لم يبدأ" : `${ar((room?.questionIndex ?? currentContest.questionIndex) + 1)} / ${ar(currentContest.questionCount)}`}</strong></span>{room?.status === "live" && <span>الإجابات <strong>{ar(room.answersCount)} / {ar(room.participantCount)}</strong></span>}</div>
                {room?.status === "live" && room.question && <div className="teacher-current-question"><div><strong>السؤال الحالي</strong><span>بقي {ar(room.timeLeft)} ثانية</span></div><h4>{room.question.prompt}</h4><div className="teacher-answer-key">{room.question.options.map((option, index) => <span key={option} className={index === room.correctIndex ? "is-answer" : ""}>{option}{index === room.correctIndex && <Check size={15} />}</span>)}</div></div>}
                {room?.status === "lobby" && <p className="room-waiting-note">شارك رمز الغرفة مع الطلاب. عندما ينضمون، ابدأ السؤال الأول.</p>}
                <div className="teacher-room-controls">
                  {room?.status === "lobby" && <button type="button" className="button-primary" disabled={busy || room.participantCount === 0} onClick={() => void update("control-contest", { contestId: room.id, command: "start" }, "بدأت المسابقة." )}><Play size={18} /> ابدأ المسابقة</button>}
                  {room?.status === "live" && <button type="button" className="button-primary" disabled={busy} onClick={() => void update("control-contest", { contestId: room.id, command: "next" }, "انتقلت إلى السؤال التالي أو عُرضت النتائج.")}><ChevronLeft size={18} /> {room.questionIndex + 1 >= room.questionCount ? "عرض النتائج" : "السؤال التالي"}</button>}
                  {room && room.status !== "finished" && <button type="button" className="button-outline danger-outline" disabled={busy} onClick={() => { if (window.confirm("هل تريد إنهاء المسابقة وعرض النتائج الآن؟")) void update("control-contest", { contestId: room.id, command: "finish" }, "انتهت المسابقة."); }}><Square size={15} /> إنهاء المسابقة</button>}
                  {room?.status === "finished" && <button type="button" className="button-outline" onClick={() => { setSelectedContestId(null); setRoom(null); }}>مسابقة جديدة <RotateCcw size={16} /></button>}
                </div>
                <div className="teacher-leaderboard"><h4><Trophy size={19} /> ترتيب الطلاب</h4>{room?.leaderboard.length ? <ol>{room.leaderboard.map((entry, index) => <li key={entry.studentId}><span className="rank-number">{ar(index + 1)}</span><strong>{entry.name}</strong><small>{ar(entry.correctCount)} إجابات صحيحة</small><b>{ar(entry.points)} نقطة</b></li>)}</ol> : <p>بانتظار انضمام الطلاب إلى الغرفة.</p>}</div>
              </div>
            )}
            {overview?.contests.some((contest) => contest.status === "finished") && <div className="teacher-contest-history"><h3>مسابقات سابقة</h3>{overview.contests.filter((contest) => contest.status === "finished").map((contest) => <button key={contest.id} type="button" onClick={() => setSelectedContestId(contest.id)}>{contest.title}<span>عرض النتائج <ChevronLeft size={16} /></span></button>)}</div>}
            {overview?.boardResults.length ? <div className="board-result-history"><h3>آخر نتائج السبورة</h3>{overview.boardResults.slice(0, 3).map((result) => <p key={result.id}><span>{result.teamA} {ar(result.scoreA)}</span><span>{result.teamB} {ar(result.scoreB)}</span><small>{new Date(result.createdAt).toLocaleDateString("ar-SA")}</small></p>)}</div> : null}
          </section>
        )}
      </main>
      {reportOpen && overview && <TeacherReport overview={overview} session={session} onClose={() => setReportOpen(false)} />}
    </SchoolFrame>
  );
}