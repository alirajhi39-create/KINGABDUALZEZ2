import { useEffect, useRef, useState } from "react";
import { ArrowRight, CheckCircle2, Maximize2, Minimize2, Play, RotateCcw, Trophy, Volume2, VolumeX, XCircle } from "lucide-react";
import { boardQuestions } from "../boardQuestions";
import { ar, feedbackSound, useStoredState } from "../lessonUi";
import { schoolAction } from "../schoolApi";
import type { SchoolSession } from "../schoolTypes";

type BoardGame = {
  id: string;
  phase: "setup" | "playing" | "finished";
  teams: [string, string];
  count: 5 | 10;
  questionOrder: number[];
  index: number;
  turn: 0 | 1;
  scores: [number, number];
  selectedOption: number | null;
  saved: boolean;
};

const initialGame: BoardGame = {
  id: "",
  phase: "setup",
  teams: ["الفريق الأول", "الفريق الثاني"],
  count: 5,
  questionOrder: [],
  index: 0,
  turn: 0,
  scores: [0, 0],
  selectedOption: null,
  saved: false,
};

function gameId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (letter) => {
    const value = Math.floor(Math.random() * 16);
    return (letter === "x" ? value : (value & 3) | 8).toString(16);
  });
}

export function BoardContest({ session, onBack }: { session: SchoolSession; onBack: () => void }) {
  const screenRef = useRef<HTMLDivElement>(null);
  const [game, setGame] = useStoredState<BoardGame>("school-board-game-6b-v1", initialGame);
  const [names, setNames] = useState<[string, string]>(game.teams);
  const [count, setCount] = useState<5 | 10>(game.count);
  const [soundEnabled, setSoundEnabled] = useStoredState("school-board-sound-6b", true);
  const [fullscreen, setFullscreen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const updateFullscreen = () => setFullscreen(document.fullscreenElement === screenRef.current);
    document.addEventListener("fullscreenchange", updateFullscreen);
    return () => document.removeEventListener("fullscreenchange", updateFullscreen);
  }, []);

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await screenRef.current?.requestFullscreen();
    } catch {
      setError("تعذر ملء الشاشة. يمكنك تكبير نافذة المتصفح يدوياً.");
    }
  }

  function start() {
    const first = names[0].trim().replace(/\s+/g, " ");
    const second = names[1].trim().replace(/\s+/g, " ");
    if (first.length < 2 || second.length < 2 || first === second) {
      setError("اكتب اسمين مختلفين للفريقين، لا يقل كل اسم عن حرفين.");
      return;
    }
    setError("");
    setGame({ id: gameId(), phase: "playing", teams: [first, second], count, questionOrder: count === 5 ? [0, 3, 5, 7, 9] : boardQuestions.map((_, index) => index), index: 0, turn: 0, scores: [0, 0], selectedOption: null, saved: false });
  }

  function answer(optionIndex: number) {
    if (game.phase !== "playing" || game.selectedOption !== null) return;
    const correct = optionIndex === boardQuestions[game.questionOrder?.[game.index] ?? game.index].correctIndex;
    const scores: [number, number] = [...game.scores];
    if (correct) scores[game.turn] += 10;
    setGame({ ...game, scores, selectedOption: optionIndex });
    feedbackSound(soundEnabled, correct);
  }

  async function saveResult(finished: BoardGame) {
    if (saving || finished.saved) return;
    setSaving(true);
    setError("");
    try {
      await schoolAction(session.mode, "save-board-result", {
        gameId: finished.id,
        teamA: finished.teams[0],
        teamB: finished.teams[1],
        scoreA: finished.scores[0],
        scoreB: finished.scores[1],
        questionCount: finished.count,
      }, session);
      setGame((previous) => previous.id === finished.id ? { ...previous, saved: true } : previous);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "تعذر حفظ النتيجة. أعد المحاولة.");
    } finally {
      setSaving(false);
    }
  }

  function next() {
    if (game.selectedOption === null) return;
    if (game.index + 1 >= game.count) {
      const finished: BoardGame = { ...game, phase: "finished" };
      setGame(finished);
      void saveResult(finished);
      return;
    }
    setGame({ ...game, index: game.index + 1, turn: game.turn === 0 ? 1 : 0, selectedOption: null });
  }

  function reset() {
    if (game.phase === "playing" && !window.confirm("هل تريد إنهاء الجولة الحالية والبدء من جديد؟")) return;
    setNames(game.teams);
    setCount(game.count);
    setGame({ ...initialGame, teams: game.teams, count: game.count });
    setError("");
  }

  function back() {
    if (document.fullscreenElement) void document.exitFullscreen();
    onBack();
  }

  const question = boardQuestions[game.questionOrder?.[game.index] ?? game.index];
  const winner = game.scores[0] === game.scores[1] ? null : game.scores[0] > game.scores[1] ? 0 : 1;

  return (
    <div className="board-contest-screen" ref={screenRef} dir="rtl">
      <header className="board-contest-header">
        <div className="board-contest-brand"><span>الفصل ٦ ب</span><strong>مسابقة السبورة</strong></div>
        <div className="board-contest-actions">
          <button type="button" onClick={() => setSoundEnabled((previous) => !previous)} aria-label={soundEnabled ? "إيقاف صوت الإجابات" : "تشغيل صوت الإجابات"}>{soundEnabled ? <Volume2 size={22} /> : <VolumeX size={22} />}</button>
          <button type="button" onClick={() => void toggleFullscreen()} aria-label={fullscreen ? "الخروج من ملء الشاشة" : "ملء الشاشة"}>{fullscreen ? <Minimize2 size={22} /> : <Maximize2 size={22} />}</button>
          <button type="button" className="board-exit" onClick={back}><ArrowRight size={20} /> لوحة المعلم</button>
        </div>
      </header>

      <main className={`board-contest-main ${game.phase === "setup" ? "is-setup" : game.phase === "finished" ? "is-finished" : ""}`}>
        {game.phase === "setup" && (
          <div className="board-setup">
            <p className="board-overline">الدرس العاشر · الملك عبدالعزيز واسترداد الرياض</p>
            <h1>تحدي الفرق على السبورة</h1>
            <p className="board-setup-description">فريقان من الفصل ٦ ب يتناوبان اختيار الإجابة بلمسة واحدة. كل إجابة صحيحة تمنح الفريق ١٠ نقاط.</p>
            <div className="board-setup-inputs">
              <label>الفريق الأول<input value={names[0]} maxLength={30} onChange={(event) => setNames([event.target.value, names[1]])} /></label>
              <label>الفريق الثاني<input value={names[1]} maxLength={30} onChange={(event) => setNames([names[0], event.target.value])} /></label>
            </div>
            <div className="board-count-selection"><span>عدد الأسئلة</span><button type="button" className={count === 5 ? "active" : ""} onClick={() => setCount(5)}>٥ أسئلة</button><button type="button" className={count === 10 ? "active" : ""} onClick={() => setCount(10)}>١٠ أسئلة</button></div>
            <button type="button" className="board-big-button" onClick={start}><Play size={27} /> ابدأ المسابقة</button>
            {error && <p className="board-error" role="alert">{error}</p>}
            <p className="board-storage-note">يمكن إكمال الجولة بعد تحديث الصفحة. تُحفظ نتيجتها في لوحة المعلم عند انتهائها.</p>
          </div>
        )}

        {game.phase !== "setup" && (
          <>
            <div className="board-scoreboard" aria-label="نقاط الفريقين">
              {game.teams.map((name, index) => (
                <button key={index} type="button" className={`board-team ${game.turn === index && game.phase === "playing" ? "active" : ""}`} onClick={() => { if (game.phase === "playing" && game.selectedOption === null) setGame({ ...game, turn: index as 0 | 1 }); }} aria-pressed={game.turn === index && game.phase === "playing"}>
                  <span>{name}</span><strong>{ar(game.scores[index])}</strong><small>{game.turn === index && game.phase === "playing" ? "الدور الآن" : "نقطة"}</small>
                </button>
              ))}
            </div>

            {game.phase === "playing" && (
              <div className="board-round" key={game.index}>
                <div className="board-round-meta"><span>السؤال {ar(game.index + 1)} من {ar(game.count)}</span><span>دور {game.teams[game.turn]}</span></div>
                <div className="board-round-progress"><span style={{ width: `${(game.index + 1) / game.count * 100}%` }} /></div>
                <h1>{question.prompt}</h1>
                <div className="board-answer-grid">
                  {question.options.map((option, index) => (
                    <button key={option} type="button" disabled={game.selectedOption !== null} onClick={() => answer(index)} className={`${game.selectedOption !== null && question.correctIndex === index ? "correct" : ""} ${game.selectedOption === index && index !== question.correctIndex ? "wrong" : ""}`}>
                      <span>{["أ", "ب", "ج", "د"][index]}</span>{option}
                    </button>
                  ))}
                </div>
                {game.selectedOption !== null && <div className={`board-feedback ${game.selectedOption === question.correctIndex ? "right" : "wrong"}`} role="status">{game.selectedOption === question.correctIndex ? <CheckCircle2 size={29} /> : <XCircle size={29} />}<span>{game.selectedOption === question.correctIndex ? `إجابة صحيحة! ١٠ نقاط لـ${game.teams[game.turn]}.` : `الإجابة الصحيحة: ${question.options[question.correctIndex]}.`}</span></div>}
                <div className="board-round-controls"><button type="button" className="board-big-button" disabled={game.selectedOption === null} onClick={next}>{game.index + 1 === game.count ? "عرض النتيجة" : "السؤال التالي"}<ArrowRight size={26} /></button><button type="button" className="board-text-button" onClick={reset}><RotateCcw size={18} /> بدء جولة جديدة</button></div>
              </div>
            )}

            {game.phase === "finished" && <div className="board-finished"><Trophy size={57} /><span>نتيجة الفصل ٦ ب</span><h1>{winner === null ? "تعادل الفريقان!" : `فاز ${game.teams[winner]}!`}</h1><p>{game.teams[0]}: {ar(game.scores[0])} نقطة <span>·</span> {game.teams[1]}: {ar(game.scores[1])} نقطة</p><div className="board-finished-actions"><button type="button" className="board-big-button" onClick={reset}><RotateCcw size={22} /> مسابقة جديدة</button><button type="button" className="board-text-button" onClick={back}>العودة إلى لوحة المعلم</button></div><small>{game.saved ? "حُفظت النتيجة في لوحة المعلم وتقرير الصف." : saving ? "جارٍ حفظ النتيجة..." : "لم تُحفظ النتيجة بعد."}</small>{!game.saved && !saving && <button type="button" className="board-retry" onClick={() => void saveResult(game)}>إعادة محاولة حفظ النتيجة</button>}{error && <p className="board-error" role="alert">{error}</p>}</div>}
          </>
        )}
      </main>
    </div>
  );
}