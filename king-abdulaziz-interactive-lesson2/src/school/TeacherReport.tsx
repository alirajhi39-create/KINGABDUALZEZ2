import { useEffect, useRef, useState } from "react";
import { FileDown, Printer, X } from "lucide-react";
import html2pdf from "html2pdf.js";
import { activityCatalog } from "../lessonControls";
import { ar } from "../lessonUi";
import { schoolAction } from "../schoolApi";
import type { ContestView, SchoolSession, TeacherOverview } from "../schoolTypes";
import { getStrategy } from "../strategies";

export function TeacherReport({ overview, session, onClose }: { overview: TeacherOverview; session: SchoolSession; onClose: () => void }) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [contests, setContests] = useState<ContestView[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", escape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", escape);
    };
  }, [onClose]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const rooms = await Promise.all(overview.contests.slice(0, 4).map(async (contest) => {
        try {
          return await schoolAction<ContestView>(session.mode, "contest-state", { contestId: contest.id }, session);
        } catch {
          return null;
        }
      }));
      if (active) {
        setContests(rooms.filter((room): room is ContestView => room !== null));
        setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [overview.contests, session]);

  async function downloadPdf() {
    const sheet = reportRef.current;
    if (!sheet || exporting) return;
    setExporting(true);
    setError("");
    try {
      await document.fonts.ready;
      await html2pdf()
        .set({
          margin: 8,
          filename: `lesson-10-class-report-${new Date().toISOString().slice(0, 10)}.pdf`,
          image: { type: "jpeg", quality: 0.96 },
          html2canvas: { scale: 2, backgroundColor: "#ffffff", useCORS: true, logging: false },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .from(sheet)
        .save();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "تعذر إنشاء ملف PDF.");
    } finally {
      setExporting(false);
    }
  }

  const completed = overview.students.filter((student) => student.quizScore !== null);
  const average = completed.length
    ? Math.round(completed.reduce((sum, student) => sum + (student.quizScore! / (student.quizTotal ?? 10)) * 100, 0) / completed.length)
    : null;
  const strategy = getStrategy(overview.classroom.activeStrategy);
  const activeActivities = activityCatalog.filter((item) => overview.classroom.controls.activityIds.includes(item.id));

  return (
    <div className="report-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="report-dialog" role="dialog" aria-modal="true" aria-label="تقرير الصف">
        <div className="report-toolbar">
          <div><strong>معاينة تقرير الصف</strong><span>يتضمن أسماء الطلاب. احتفظ بالملف في مكان آمن.</span></div>
          <div className="report-toolbar-actions">
            <button type="button" className="button-primary" disabled={exporting || loading} onClick={() => void downloadPdf()}><FileDown size={17} /> {exporting ? "جارٍ إنشاء الملف..." : "تنزيل PDF"}</button>
            <button type="button" className="button-outline" onClick={() => window.print()} disabled={loading}><Printer size={17} /> طباعة</button>
            <button type="button" className="report-close" onClick={onClose} aria-label="إغلاق التقرير"><X size={21} /></button>
          </div>
        </div>
        {error && <p className="school-inline-error" role="alert">{error}</p>}
        <p className="report-scroll-hint">اسحب التقرير أفقياً لمعاينة صفحة A4 كاملة.</p>
        <div className="report-scroll">
          <div className="report-sheet" ref={reportRef} dir="rtl">
            <header className="report-cover"><span>الدراسات الاجتماعية · الفصل ٦ ب · الوحدة الرابعة</span><h1>تقرير الدرس العاشر</h1><p>الملك عبدالعزيز بن عبدالرحمن بن فيصل آل سعود</p><div><strong>{overview.classroom.name}</strong><span>تاريخ التقرير: {new Date().toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" })}</span></div></header>
            <section className="report-section"><h2>ملخص تقدم الصف</h2><p>عدد الطلاب: <strong>{ar(overview.students.length)}</strong> · أكملوا الاختبار: <strong>{ar(completed.length)}</strong> · متوسط نتائج المكتملين: <strong>{average === null ? "لا توجد نتائج بعد" : `${ar(average)}٪`}</strong></p></section>
            <section className="report-section"><h2>الطلاب ونتائجهم</h2><table><thead><tr><th>الطالب</th><th>آخر صفحة</th><th>الصفحات المزارة</th><th>درجة الاختبار</th></tr></thead><tbody>{overview.students.length ? overview.students.map((student) => <tr key={student.id}><td>{student.name}</td><td>{student.currentPage === 5 ? "الاختبار" : `الصفحة ${ar(student.currentPage + 1)}`}</td><td>{ar(student.visitedCount)} / ٦</td><td>{student.quizScore === null ? "لم ينجزه" : `${ar(student.quizScore)} / ${ar(student.quizTotal ?? 10)}`}</td></tr>) : <tr><td colSpan={4}>لا يوجد طلاب مسجلون بعد.</td></tr>}</tbody></table></section>
            <section className="report-section"><h2>الاستراتيجية والأنشطة</h2><p>الاستراتيجية التي اختارها المعلم: <strong>{strategy.name}</strong>.</p><p>الأنشطة المفعلة: {activeActivities.length ? activeActivities.map((item) => item.title).join("، ") : "لا توجد أنشطة مفعلة"}.</p><p>عدد أسئلة الاختبار: <strong>{ar(overview.classroom.controls.quizQuestionIds.length)}</strong>.</p>{overview.classroom.controls.teacherQuestion && <p>سؤال النقاش في الصفحة {ar(overview.classroom.controls.teacherQuestion.page)}: <strong>{overview.classroom.controls.teacherQuestion.prompt}</strong></p>}</section>
            <section className="report-section"><h2>المسابقات الصفية</h2>{loading ? <p>جارٍ جمع نتائج المسابقات...</p> : contests.length ? contests.map((contest) => <div className="report-contest" key={contest.id}><h3>{contest.title} <span>({contest.status === "finished" ? "انتهت" : contest.status === "live" ? "جارية" : "لم تبدأ"})</span></h3><p>المشاركون: {ar(contest.participantCount)} · الأسئلة: {ar(contest.questionCount)}</p>{contest.leaderboard.length ? <table><thead><tr><th>المركز</th><th>الطالب</th><th>الإجابات الصحيحة</th><th>النقاط</th></tr></thead><tbody>{contest.leaderboard.map((entry, index) => <tr key={entry.studentId}><td>{ar(index + 1)}</td><td>{entry.name}</td><td>{ar(entry.correctCount)}</td><td>{ar(entry.points)}</td></tr>)}</tbody></table> : <p>لا توجد نتائج مشاركين بعد.</p>}</div>) : <p>لا توجد مسابقات مسجلة بعد.</p>}</section>
            <section className="report-section"><h2>تحديات السبورة للفصل ٦ ب</h2>{overview.boardResults.length ? <table><thead><tr><th>التاريخ</th><th>الفريق الأول</th><th>نقاطه</th><th>الفريق الثاني</th><th>نقاطه</th></tr></thead><tbody>{overview.boardResults.slice(0, 5).map((result) => <tr key={result.id}><td>{new Date(result.createdAt).toLocaleDateString("ar-SA")}</td><td>{result.teamA}</td><td>{ar(result.scoreA)}</td><td>{result.teamB}</td><td>{ar(result.scoreB)}</td></tr>)}</tbody></table> : <p>لا توجد نتائج لمسابقات السبورة بعد.</p>}</section>
            <footer>تقرير تعليمي خاص بالمعلم · الدرس العاشر · يُنشأ من بيانات الصف الحالية</footer>
          </div>
        </div>
      </div>
    </div>
  );
}