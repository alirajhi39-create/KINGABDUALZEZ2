import { useState } from "react";
import type { DragEvent } from "react";
import { ArrowDown, ArrowUp, Check, GripVertical, RotateCcw } from "lucide-react";
import { firstAttempt, traits } from "./lessonData";
import { ActivityHeading, ar, feedbackSound, useStoredState } from "./lessonUi";

export function MatchingActivity({ soundEnabled }: { soundEnabled: boolean }) {
  const [matches, setMatches] = useStoredState<Record<string, string>>("lesson-trait-matches", {});
  const [selectedTrait, setSelectedTrait] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [needsMore, setNeedsMore] = useState(false);
  const meaningOrder = ["wisdom", "patience", "faith", "resolve", "citizenship", "courage"];
  const allFilled = meaningOrder.every((id) => Boolean(matches[id]));
  const allCorrect = meaningOrder.every((id) => matches[id] === id);

  function assign(target: string, trait: string) {
    if (!traits.some((item) => item.id === trait)) return;
    setMatches((previous) => {
      const next = { ...previous };
      Object.keys(next).forEach((key) => {
        if (next[key] === trait) delete next[key];
      });
      next[target] = trait;
      return next;
    });
    setSelectedTrait(null);
    setChecked(false);
    setNeedsMore(false);
  }

  function onDrop(event: DragEvent<HTMLButtonElement>, target: string) {
    event.preventDefault();
    assign(target, event.dataTransfer.getData("text/plain"));
  }

  function checkAnswers() {
    if (!allFilled) {
      setNeedsMore(true);
      return;
    }
    setChecked(true);
    feedbackSound(soundEnabled, allCorrect);
  }

  return (
    <section className="activity-block matching-activity" aria-label="نشاط وصل الصفات بمعانيها">
      <ActivityHeading number={1} title="صِل الصفة بمعناها" description="اسحب الصفة إلى معناها، أو اضغط الصفة ثم مكانها." />
      <div className="matching-layout">
        <div className="trait-bank">
          <span className="small-column-title">الصفات</span>
          <div className="trait-bank-items">
            {traits.map((trait) => (
              <button
                key={trait.id}
                type="button"
                draggable
                onDragStart={(event) => event.dataTransfer.setData("text/plain", trait.id)}
                onClick={() => setSelectedTrait(trait.id === selectedTrait ? null : trait.id)}
                className={`trait-token ${selectedTrait === trait.id ? "is-picked" : ""}`}
                aria-pressed={selectedTrait === trait.id}
              >
                {trait.name}
              </button>
            ))}
          </div>
        </div>
        <div className="meaning-bank">
          <span className="small-column-title">المعاني</span>
          <div className="meaning-rows">
            {meaningOrder.map((id) => {
              const trait = traits.find((item) => item.id === id)!;
              const assigned = traits.find((item) => item.id === matches[id]);
              return (
                <button
                  key={id}
                  type="button"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => onDrop(event, id)}
                  onClick={() => {
                    if (selectedTrait) assign(id, selectedTrait);
                    else if (assigned) {
                      setMatches((previous) => {
                        const next = { ...previous };
                        delete next[id];
                        return next;
                      });
                      setChecked(false);
                    }
                  }}
                  className={`meaning-row ${checked ? (matches[id] === id ? "is-right" : "is-wrong") : ""}`}
                  aria-label={`${trait.meaning}، ${assigned ? `الصفة المختارة ${assigned.name}` : "اختر صفة"}`}
                >
                  <span>{trait.meaning}</span>
                  <span className="meaning-slot">{assigned ? assigned.name : "ضع الصفة هنا"}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="activity-actions">
        <button type="button" className="button-primary" onClick={checkAnswers}><Check size={18} /> تحقق من الإجابات</button>
        <button
          type="button"
          className="button-text"
          onClick={() => {
            setMatches({});
            setChecked(false);
            setNeedsMore(false);
          }}
        ><RotateCcw size={16} /> ابدأ من جديد</button>
        {needsMore && <span className="inline-feedback caution">أكمل توصيل الصفات الست أولاً.</span>}
        {checked && (
          <span className={`inline-feedback ${allCorrect ? "success" : "error"}`} role="status">
            {allCorrect ? "أحسنت! جميع الصفات في مكانها الصحيح." : "راجع الصفات المحددة باللون الأحمر وحاول مرة أخرى."}
          </span>
        )}
      </div>
    </section>
  );
}

export function SortActivity({ soundEnabled }: { soundEnabled: boolean }) {
  const [order, setOrder] = useStoredState<string[]>("lesson-first-attempt-order", ["retreat", "campaign", "siege", "shuki"]);
  const [checked, setChecked] = useState(false);
  const correctOrder = firstAttempt.map((step) => step.id);
  const correct = order.join(",") === correctOrder.join(",");

  function move(from: number, to: number) {
    if (to < 0 || to >= order.length || from === to) return;
    setOrder((previous) => {
      const next = [...previous];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
    setChecked(false);
  }

  function onDrop(event: DragEvent<HTMLDivElement>, to: number) {
    event.preventDefault();
    const dragged = event.dataTransfer.getData("text/plain");
    if (!dragged) return;
    const from = Number(dragged);
    if (Number.isInteger(from)) move(from, to);
  }

  return (
    <section className="activity-block sort-activity" aria-label="نشاط ترتيب أحداث المحاولة الأولى">
      <ActivityHeading number={2} title="رتّب أحداث المحاولة الأولى" description="اسحب الأحداث لترتيبها، أو استخدم السهمين بجوار كل حدث." />
      <div className="sortable-list">
        {order.map((id, index) => {
          const step = firstAttempt.find((item) => item.id === id)!;
          return (
            <div
              key={id}
              className={`sortable-row ${checked ? (id === correctOrder[index] ? "is-right" : "is-wrong") : ""}`}
              draggable
              onDragStart={(event) => event.dataTransfer.setData("text/plain", String(index))}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => onDrop(event, index)}
            >
              <span className="sort-number">{ar(index + 1)}</span>
              <span className="sort-label">{step.title}</span>
              <GripVertical className="grip-icon" size={18} aria-hidden="true" />
              <div className="sort-controls">
                <button type="button" onClick={() => move(index, index - 1)} disabled={index === 0} aria-label={`تحريك ${step.title} لأعلى`}><ArrowUp size={16} /></button>
                <button type="button" onClick={() => move(index, index + 1)} disabled={index === order.length - 1} aria-label={`تحريك ${step.title} لأسفل`}><ArrowDown size={16} /></button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="activity-actions">
        <button
          type="button"
          className="button-primary"
          onClick={() => {
            setChecked(true);
            feedbackSound(soundEnabled, correct);
          }}
        ><Check size={18} /> تحقق من الترتيب</button>
        {checked && (
          <span className={`inline-feedback ${correct ? "success" : "error"}`} role="status">
            {correct ? "ترتيب صحيح!" : "ليس بعد. تذكر: الحملة، ثم الشوكي، ثم الحصار، ثم العودة."}
          </span>
        )}
      </div>
    </section>
  );
}