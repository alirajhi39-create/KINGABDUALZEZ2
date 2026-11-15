import { useEffect, useState } from "react";
import {
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  LayoutDashboard,
  RefreshCw,
  RotateCcw,
  Volume2,
  VolumeX,
} from "lucide-react";
import FinalQuiz from "./FinalQuiz";
import { PageFive, PageFour, PageOne, PageThree, PageTwo } from "./LessonPages";
import { bookPages } from "./embeddedAssets";
import { LessonGuidanceProvider, TeacherDiscussionQuestion } from "./LessonGuidance";
import { defaultLessonControls, normalizeLessonControls } from "./lessonControls";
import type { LessonControls } from "./lessonControls";
import { lessonTabs } from "./lessonData";
import { ar, Lightbox, useStoredState } from "./lessonUi";
import type { ZoomItem } from "./lessonUi";
import { detectConnection, schoolAction } from "./schoolApi";
import type { ConnectionState } from "./schoolApi";
import type { SchoolSession, StudentOverview, StudentProgress } from "./schoolTypes";
import { ContestRoom } from "./school/ContestRoom";
import { BoardContest } from "./school/BoardContest";
import { LoginPortal } from "./school/LoginPortal";
import { StudentDashboard } from "./school/StudentDashboard";
import { TeacherDashboard } from "./school/TeacherDashboard";

function LessonWorkspace({ session, onExit, initialControls, initialStrategyId }: { session: SchoolSession; onExit: () => void; initialControls: LessonControls; initialStrategyId: string }) {
  const [page, setPage] = useStoredState("lesson-current-page", 0);
  const [visited, setVisited] = useStoredState<number[]>("lesson-visited-pages", [0]);
  const [soundEnabled, setSoundEnabled] = useStoredState("lesson-sound-enabled", false);
  const [zoomItem, setZoomItem] = useState<ZoomItem | null>(null);
  const [controls, setControls] = useState(initialControls);
  const [activeStrategyId, setActiveStrategyId] = useState(initialStrategyId);
  const safePage = Math.min(Math.max(Number(page) || 0, 0), 5);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const overview = await schoolAction<StudentOverview>(session.mode, "student-overview", {}, session);
        if (active) {
          if (safePage !== 5) setControls(normalizeLessonControls(overview.classroom.controls));
          setActiveStrategyId(overview.classroom.activeStrategy);
        }
      } catch {
        // Keep the last known teacher settings during a temporary outage.
      }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 8000);
    return () => { active = false; window.clearInterval(timer); };
  }, [safePage, session]);

  useEffect(() => {
    setVisited((previous) => previous.includes(safePage) ? previous : [...previous, safePage]);
  }, [safePage, setVisited]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void schoolAction(session.mode, "save-progress", { currentPage: safePage, visited }, session).catch(() => {
        // Local reading remains available during a temporary connection loss.
      });
    }, 450);
    return () => window.clearTimeout(timer);
  }, [safePage, visited, session]);

  function navigate(nextPage: number) {
    const destination = Math.min(Math.max(nextPage, 0), 5);
    setPage(destination);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function exitLesson() {
    try {
      await schoolAction(session.mode, "save-progress", {
        currentPage: safePage,
        visited: [...new Set([...visited, safePage])],
      }, session);
    } catch {
      // Reading progress remains in local storage until the next successful sync.
    }
    onExit();
  }

  const pages = [
    <PageOne onZoom={setZoomItem} soundEnabled={soundEnabled} />,
    <PageTwo onZoom={setZoomItem} soundEnabled={soundEnabled} />,
    <PageThree onZoom={setZoomItem} soundEnabled={soundEnabled} />,
    <PageFour onZoom={setZoomItem} soundEnabled={soundEnabled} />,
    <PageFive onZoom={setZoomItem} soundEnabled={soundEnabled} />,
    <FinalQuiz
      soundEnabled={soundEnabled}
      questionIds={controls.quizQuestionIds}
      onFinished={(score, total) => {
        void schoolAction(session.mode, "save-progress", { currentPage: 5, visited: [...new Set([...visited, 5])], quizScore: score, quizTotal: total }, session).catch(() => undefined);
      }}
    />,
  ];

  const progress = Math.round((new Set(visited).size / 6) * 100);

  return (
    <div className="app-shell" dir="rtl">
      <div className="top-rule" />
      <header className="site-header">
        <div className="header-inner">
          <div className="brand">
            <div className="brand-icon"><BookOpen size={28} strokeWidth={1.8} /></div>
            <div>
              <strong>الدرس الرقمي</strong>
              <span>الدراسات الاجتماعية · السادس الابتدائي</span>
            </div>
          </div>
          <div className="header-actions">
            <button type="button" className="lesson-dashboard-link" onClick={() => void exitLesson()}><LayoutDashboard size={17} /> لوحتي</button>
            <span className="save-indicator"><Check size={15} /> تقدمك محفوظ · {ar(progress)}٪</span>
            <button
              type="button"
              className={`icon-button ${soundEnabled ? "sound-on" : ""}`}
              onClick={() => setSoundEnabled((previous) => !previous)}
              aria-label={soundEnabled ? "إيقاف أصوات الإجابات" : "تشغيل أصوات الإجابات"}
              title={soundEnabled ? "إيقاف الصوت" : "تشغيل الصوت"}
            >
              {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>
            {safePage < 5 && (
              <button
                type="button"
                className="source-page-button"
                onClick={() => setZoomItem({
                  src: bookPages[safePage],
                  alt: `صورة صفحة الكتاب ${ar(76 + safePage)}`,
                  caption: `صفحة ${ar(76 + safePage)} من كتاب الدراسات الاجتماعية`,
                })}
              ><BookOpen size={18} /> صفحة الكتاب الأصلية</button>
            )}
          </div>
        </div>
      </header>

      <main className="main-wrap">
        <div className={`lesson-intro ${safePage > 0 ? "compact" : ""}`}>
          <div>
            <p className="unit-label">الوحدة الرابعة <span>/</span> المملكة العربية السعودية</p>
            <h1><span>الدرس العاشر</span> الملك عبدالعزيز بن عبدالرحمن بن فيصل آل سعود</h1>
          </div>
        </div>

        <nav className="lesson-navigation" aria-label="صفحات الدرس">
          {lessonTabs.map((tab, index) => (
            <button
              key={tab}
              type="button"
              className={`lesson-tab ${safePage === index ? "active" : ""}`}
              onClick={() => navigate(index)}
              aria-current={safePage === index ? "step" : undefined}
            >
              <span className="tab-index">{index === 5 ? <CircleHelp size={17} /> : ar(index + 1).padStart(2, "٠")}</span>
              <span className="tab-label">{tab}</span>
              {visited.includes(index) && safePage !== index && <Check size={13} className="visited-check" aria-label="تمت الزيارة" />}
            </button>
          ))}
        </nav>
        <div className="lesson-progress" aria-label={`تقدمك في الدرس ${ar(progress)} بالمئة`}>
          <div style={{ width: `${progress}%` }} />
        </div>

        <LessonGuidanceProvider value={{ controls, activeStrategyId, studentId: session.studentId }}>
        <article key={safePage} className="paper-page page-enter">
          <svg className="paper-corner-pattern" width="178" height="140" viewBox="0 0 178 140" fill="none" aria-hidden="true">
            <g stroke="#D9E2DF" strokeWidth="1.2">
              <rect x="97" y="-21" width="35" height="35" transform="rotate(22 97 -21)" />
              <rect x="145" y="-10" width="35" height="35" transform="rotate(22 145 -10)" />
              <rect x="81" y="27" width="32" height="32" transform="rotate(22 81 27)" />
              <rect x="127" y="40" width="32" height="32" transform="rotate(22 127 40)" />
              <rect x="69" y="76" width="29" height="29" transform="rotate(22 69 76)" />
              <rect x="109" y="86" width="29" height="29" transform="rotate(22 109 86)" />
            </g>
          </svg>
          {pages[safePage]}
          <TeacherDiscussionQuestion page={safePage + 1} />
          <div className="paper-endmark" aria-hidden="true"><span /><span /><span /><span /><span /></div>
          <footer className="paper-footer">
            <span>الدراسات الاجتماعية · الوحدة الرابعة · الدرس العاشر</span>
            <span>{safePage === 5 ? "اختبار الدرس" : `صفحة الكتاب ${ar(76 + safePage)}`}</span>
          </footer>
        </article>
        </LessonGuidanceProvider>

        <div className="bottom-navigation">
          <button type="button" className="button-outline" disabled={safePage === 0} onClick={() => navigate(safePage - 1)}>
            <ChevronRight size={20} /> الصفحة السابقة
          </button>
          <span className="bottom-page-count">{safePage === 5 ? "الاختبار النهائي" : `الصفحة ${ar(safePage + 1)} من ٥`}</span>
          {safePage < 5 ? (
            <button type="button" className="button-primary" onClick={() => navigate(safePage + 1)}>
              {safePage === 4 ? "ابدأ الاختبار" : "الصفحة التالية"} <ChevronLeft size={20} />
            </button>
          ) : (
            <button type="button" className="button-outline" onClick={() => navigate(0)}>
              العودة إلى بداية الدرس <RotateCcw size={17} />
            </button>
          )}
        </div>
        <p className="site-credit">المحتوى والصور من صفحات الدرس المرفقة في كتاب الدراسات الاجتماعية للصف السادس الابتدائي.</p>
      </main>
      {zoomItem && <Lightbox item={zoomItem} onClose={() => setZoomItem(null)} />}
    </div>
  );
}

function clearLessonState() {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("lesson-") && key !== "lesson-school-demo-v1") localStorage.removeItem(key);
    }
  } catch {
    // Progress remains available in the active lesson session.
  }
}

export default function App() {
  const [connection, setConnection] = useState<ConnectionState>("checking");
  const [session, setSession] = useState<SchoolSession | null>(() => {
    try {
      return JSON.parse(sessionStorage.getItem("school-session-v1") ?? "null") as SchoolSession | null;
    } catch {
      return null;
    }
  });
  const [screen, setScreen] = useState<"dashboard" | "lesson" | "contest" | "board">("dashboard");
  const [contestId, setContestId] = useState<string | null>(null);
  const [lessonControls, setLessonControls] = useState<LessonControls>(defaultLessonControls);
  const [lessonStrategyId, setLessonStrategyId] = useState("brainstorm");

  useEffect(() => {
    void detectConnection().then(setConnection);
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem("school-session-v1", JSON.stringify(session));
    } catch {
      // The preview still works if browser storage is restricted.
    }
  }, [session]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [screen, contestId, session?.token]);

  if (connection === "checking") {
    return <div className="portal-loading" dir="rtl"><BookOpen size={34} /><strong>الدرس العاشر</strong><span>جارٍ إعداد مساحة التعلم...</span></div>;
  }

  if (connection === "unavailable") {
    return (
      <div className="portal-loading portal-unavailable" dir="rtl">
        <BookOpen size={34} /><strong>تعذر الاتصال بقاعدة البيانات</strong>
        <span>الخادم مُعد للاتصال بنيون لكنه لا يستجيب الآن. يمكنك إعادة المحاولة أو فتح عرض محلي مؤقت.</span>
        <div><button type="button" className="button-primary" onClick={() => { setConnection("checking"); void detectConnection().then(setConnection); }}><RefreshCw size={17} /> إعادة المحاولة</button><button type="button" className="button-outline" onClick={() => setConnection("demo")}>عرض محلي مؤقت</button></div>
      </div>
    );
  }

  const activeSession = session?.mode === connection ? session : null;

  function logout() {
    if (session) void schoolAction(session.mode, "logout", {}, session).catch(() => undefined);
    clearLessonState();
    setSession(null);
    setScreen("dashboard");
    setContestId(null);
  }

  if (!activeSession) return <LoginPortal mode={connection} onLogin={(newSession) => { clearLessonState(); setSession(newSession); setScreen("dashboard"); }} />;
  if (activeSession.role === "teacher") {
    return screen === "board"
      ? <BoardContest session={activeSession} onBack={() => setScreen("dashboard")} />
      : <TeacherDashboard session={activeSession} onLogout={logout} onBoardContest={() => setScreen("board")} />;
  }
  if (screen === "contest" && contestId) return <ContestRoom session={activeSession} contestId={contestId} onBack={() => setScreen("dashboard")} onLogout={logout} />;
  if (screen === "lesson") return <LessonWorkspace session={activeSession} onExit={() => setScreen("dashboard")} initialControls={lessonControls} initialStrategyId={lessonStrategyId} />;

  return (
    <StudentDashboard
      session={activeSession}
      onLogout={logout}
      onEnterLesson={(progress: StudentProgress, desiredPage?: number, strategyId?: string, classroomControls?: LessonControls) => {
        localStorage.setItem("lesson-current-page", JSON.stringify(desiredPage ?? progress.currentPage));
        localStorage.setItem("lesson-visited-pages", JSON.stringify(progress.visited));
        setLessonControls(normalizeLessonControls(classroomControls));
        setLessonStrategyId(strategyId ?? "brainstorm");
        setScreen("lesson");
      }}
      onContest={(id) => { setContestId(id); setScreen("contest"); }}
    />
  );
}
