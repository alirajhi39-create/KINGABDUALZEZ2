import { useEffect, useState } from "react";
import { ChevronLeft, Maximize2, X } from "lucide-react";
import type { MapStep, QuizQuestion } from "./lessonData";

export type ZoomItem = { src: string; alt: string; caption?: string };
export type SourceCrop = { x: number; y: number; width: number; height: number; sourceWidth: number };

const arabicDigits = "٠١٢٣٤٥٦٧٨٩";

export function ar(value: number | string) {
  return String(value).replace(/\d/g, (digit) => arabicDigits[Number(digit)]);
}

export function normalized(value: string) {
  return value
    .trim()
    .replace(/[٠-٩]/g, (digit) => String(arabicDigits.indexOf(digit)))
    .replace(/[ًٌٍَُِّْـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function isQuizCorrect(question: QuizQuestion, answer: string) {
  if (question.type === "fill") {
    return normalized(answer).replace(/^ال/, "") === normalized(question.correct).replace(/^ال/, "");
  }
  return answer === question.correct;
}

export function useStoredState<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const saved = window.localStorage.getItem(key);
      return saved === null ? initialValue : (JSON.parse(saved) as T);
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // The lesson remains usable when storage is unavailable.
    }
  }, [key, value]);

  return [value, setValue] as const;
}

export function feedbackSound(enabled: boolean, correct: boolean) {
  if (!enabled) return;
  try {
    const context = new window.AudioContext();
    const oscillator = context.createOscillator();
    const volume = context.createGain();
    const now = context.currentTime;
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(correct ? 523 : 260, now);
    oscillator.frequency.setValueAtTime(correct ? 659 : 190, now + 0.12);
    volume.gain.setValueAtTime(0.001, now);
    volume.gain.exponentialRampToValueAtTime(0.12, now + 0.025);
    volume.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    oscillator.connect(volume);
    volume.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.26);
    oscillator.onended = () => void context.close();
  } catch {
    // Sound is optional and must not block an answer.
  }
}

export function MediaFigure({
  src,
  alt,
  caption,
  className = "",
  crop,
  onZoom,
}: ZoomItem & { className?: string; crop?: SourceCrop; onZoom: (item: ZoomItem) => void }) {
  return (
    <figure className={`media-figure ${className}`}>
      <button
        type="button"
        className="media-image-button"
        onClick={() => onZoom({ src, alt, caption })}
        aria-label={`تكبير الصورة: ${alt}`}
      >
        {crop ? (
          <span className="original-image-window" style={{ aspectRatio: `${crop.width} / ${crop.height}` }}>
            <img
              src={src}
              alt={alt}
              loading="lazy"
              style={{
                width: `${crop.sourceWidth / crop.width * 100}%`,
                left: `-${crop.x / crop.width * 100}%`,
                top: `-${crop.y / crop.height * 100}%`,
              }}
            />
          </span>
        ) : <img src={src} alt={alt} loading="lazy" />}
      </button>
      {caption && (
        <figcaption>
          <span>{caption}</span>
          <button
            type="button"
            className="caption-zoom"
            onClick={() => onZoom({ src, alt, caption })}
            aria-label={`تكبير الصورة: ${alt}`}
          >
            <Maximize2 size={15} />
          </button>
        </figcaption>
      )}
    </figure>
  );
}

export function Lightbox({ item, onClose }: { item: ZoomItem; onClose: () => void }) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="lightbox-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="lightbox-dialog" role="dialog" aria-modal="true" aria-label={item.alt}>
        <button type="button" className="lightbox-close" onClick={onClose} aria-label="إغلاق الصورة">
          <X size={23} />
        </button>
        <img src={item.src} alt={item.alt} />
        {item.caption && <p>{item.caption}</p>}
      </div>
    </div>
  );
}

export function PageHeading({
  page,
  title,
  subtitle,
  intro,
}: {
  page: number;
  title: string;
  subtitle?: string;
  intro?: string;
}) {
  return (
    <div className="page-heading">
      <p className="page-eyebrow">
        <span className="eyebrow-mark" /> الصفحة {ar(page)} من ٥
        <span className="eyebrow-divider">/</span> من الكتاب ص {ar(75 + page)}
      </p>
      <h2>{title}</h2>
      {subtitle && <h3>{subtitle}</h3>}
      {intro && <p className="page-intro">{intro}</p>}
    </div>
  );
}

export function ActivityHeading({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="activity-heading">
      <span className="activity-index">{ar(number)}</span>
      <div>
        <span className="activity-kicker">تعلّم بالممارسة</span>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

export function MapArtwork({
  src,
  alt,
  steps,
  activeId,
  onSelect,
  onZoom,
  caption,
  variant,
}: {
  src: string;
  alt: string;
  steps: MapStep[];
  activeId: number;
  onSelect: (id: number) => void;
  onZoom: (item: ZoomItem) => void;
  caption: string;
  variant: "route" | "assault";
}) {
  return (
    <div className={`map-artwork ${variant}`}>
      <div className="map-canvas">
        <img src={src} alt={alt} />
        {steps.map((step) => (
          <button
            key={step.id}
            type="button"
            style={{ left: `${step.x}%`, top: `${step.y}%` }}
            className={`map-pin ${activeId === step.id ? "active" : ""}`}
            onClick={() => onSelect(step.id)}
            aria-label={`النقطة ${ar(step.id)}: ${step.place}، ${step.title}`}
            aria-pressed={activeId === step.id}
            title={`${step.place}: ${step.title}`}
          >
            {ar(step.id)}
          </button>
        ))}
      </div>
      <div className="map-caption">
        <span>{caption}</span>
        <button type="button" onClick={() => onZoom({ src, alt, caption })}>
          <Maximize2 size={16} /> تكبير الخريطة
        </button>
      </div>
    </div>
  );
}

export function MapStory({ steps, activeId, onSelect }: { steps: MapStep[]; activeId: number; onSelect: (id: number) => void }) {
  const active = steps.find((step) => step.id === activeId) ?? steps[0];
  return (
    <div className="map-story">
      <div className="map-story-highlight" key={active.id} aria-live="polite">
        <span className="map-story-kicker">المحطة {ar(active.id)} من {ar(steps.length)}</span>
        <span className="map-story-date">{active.date}</span>
        <h3>{active.title}</h3>
        <p>{active.detail}</p>
      </div>
      <div className="map-story-list" aria-label="اختر حدثاً من الخريطة">
        {steps.map((step) => (
          <button
            key={step.id}
            type="button"
            className={`map-story-step ${activeId === step.id ? "active" : ""}`}
            onClick={() => onSelect(step.id)}
            aria-pressed={activeId === step.id}
          >
            <span className="map-story-number">{ar(step.id)}</span>
            <span className="map-story-step-copy">
              <strong>{step.title}</strong>
              <small>{step.place}</small>
            </span>
            <ChevronLeft size={16} aria-hidden="true" />
          </button>
        ))}
      </div>
    </div>
  );
}
