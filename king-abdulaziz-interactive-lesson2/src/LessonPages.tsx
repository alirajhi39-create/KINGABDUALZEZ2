import { useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  CircleHelp,
  Lightbulb,
  MapPin,
  Maximize2,
  RotateCcw,
  Search,
} from "lucide-react";
import { MatchingActivity, SortActivity } from "./Activities";
import { ActivityGate, StrategyActivity, useLessonGuidance } from "./LessonGuidance";
import { bookPages, images } from "./embeddedAssets";
import { assaultSteps, firstAttempt, participants, routeSteps, traits } from "./lessonData";
import {
  ActivityHeading,
  ar,
  feedbackSound,
  MapArtwork,
  MapStory,
  MediaFigure,
  normalized,
  PageHeading,
  useStoredState,
} from "./lessonUi";
import type { ZoomItem } from "./lessonUi";

type PageProps = { onZoom: (item: ZoomItem) => void; soundEnabled: boolean };

export function PageOne({ onZoom, soundEnabled }: PageProps) {
  const [activeTrait, setActiveTrait] = useStoredState("lesson-active-trait", "faith");
  const trait = traits.find((item) => item.id === activeTrait) ?? traits[0];

  return (
    <>
      <PageHeading page={1} title="الملك عبدالعزيز" />
      <p className="opening-question">
        <CircleHelp size={24} strokeWidth={1.8} aria-hidden="true" />
        <span>
          أعاد الملك عبدالعزيز تأسيس الدولة السعودية، ووحد أجزاءها باسم المملكة العربية السعودية. فمن هو الملك
          عبدالعزيز؟ وما صفاته؟ وكيف استرد الرياض؟
        </span>
      </p>
      <StrategyActivity id="brainstorm" soundEnabled={soundEnabled} />

      <div className="profile-layout">
        <div className="profile-copy">
          <h3 className="section-title">من هو الملك عبدالعزيز؟</h3>
          <p className="book-copy profile-lineage">
            هو عبدالعزيز بن عبدالرحمن بن فيصل بن تركي ابن عبدالله بن محمد بن سعود.
          </p>
          <ol className="life-timeline">
            <li>وُلد عام <strong>١٢٩٣هـ</strong> في الرياض.</li>
            <li>غادر الرياض إلى الكويت وعمره <strong>١٦ سنة</strong>.</li>
            <li>كان عمره <strong>٢٦ سنة</strong> عند استرداد الرياض.</li>
            <li>قضى <strong>٣٢ سنة</strong> في توحيد المملكة العربية السعودية.</li>
          </ol>
        </div>

        <div className="profile-images">
          <MediaFigure
            src={bookPages[0]}
            alt="صورة الملك عبدالعزيز كما تظهر في صفحة الكتاب الأصلية"
            caption="الملك عبدالعزيز بن عبدالرحمن آل سعود · من صفحة الكتاب الأصلية"
            className="king-color-figure original-scan-figure"
            crop={{ x: 133, y: 341, width: 260, height: 247, sourceWidth: 850 }}
            onZoom={onZoom}
          />
        </div>
      </div>

      <div className="traits-visual-layout">
        <div className="trait-explorer">
          <h3 className="section-title">من صفاته</h3>
          <p className="quiet-instruction">اضغط على كل صفة لتتعرف معناها.</p>
          <div className="trait-grid">
            {traits.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`trait-choice ${activeTrait === item.id ? "active" : ""}`}
                onClick={() => setActiveTrait(item.id)}
                aria-pressed={activeTrait === item.id}
              >
                {item.name}
              </button>
            ))}
          </div>
          <div className="trait-explanation" key={trait.id} aria-live="polite">
            <span>{trait.name}</span>
            <p>{trait.meaning}</p>
          </div>
        </div>
        <MediaFigure
          src={images.kingJourney}
          alt="رسم تخيلي للملك عبدالعزيز في تحركه لاسترداد الرياض"
          caption="رسم تخيلي للملك عبدالعزيز في تحركه لاسترداد الرياض"
          className="journey-figure"
          onZoom={onZoom}
        />
      </div>

      <ActivityGate id="trait-match"><MatchingActivity soundEnabled={soundEnabled} /></ActivityGate>
    </>
  );
}

export function PageTwo({ onZoom, soundEnabled }: PageProps) {
  const [activeEvent, setActiveEvent] = useStoredState("lesson-first-attempt-event", 0);
  const [masmakAnswer, setMasmakAnswer] = useStoredState("lesson-masmak-answer", "");

  return (
    <>
      <PageHeading page={2} title="استرداد الرياض" subtitle="المحاولة الأولى" />
      <div className="story-layout">
        <div className="story-copy">
          <h3 className="section-title">كيف بدأت المحاولة؟</h3>
          <p className="book-copy">
            استثمر الملك عبدالعزيز فرصة تحرك الشيخ مبارك الصباح حاكم الكويت لمواجهة عبدالعزيز ابن رشيد في القصيم
            عام ١٣١٨هـ، فسار مع والده الإمام عبدالرحمن ضمن الحملة قاصداً التوجه نحو الرياض، وعند موقع (الشوكي)
            استأذن الملك عبدالعزيز والده واتجه إلى الرياض، وحاصر قصر المصمك فيها. وعندما بلغه خبر هزيمة الشيخ
            مبارك الصباح في معركة الصريف بالقصيم؛ اضطر إلى فك الحصار والعودة إلى الكويت.
          </p>
          <div className="story-step-list" aria-label="تسلسل أحداث المحاولة الأولى">
            {firstAttempt.map((step, index) => (
              <button
                key={step.id}
                type="button"
                className={`story-step ${activeEvent === index ? "active" : ""}`}
                onClick={() => setActiveEvent(index)}
                aria-pressed={activeEvent === index}
              >
                <span>{ar(index + 1)}</span>
                {step.title}
              </button>
            ))}
          </div>
          <div className="story-selected" key={activeEvent} aria-live="polite">
            <span>الحدث {ar(activeEvent + 1)}</span>
            <strong>{firstAttempt[activeEvent]?.title}</strong>
            <p>{firstAttempt[activeEvent]?.detail}</p>
          </div>
        </div>

        <aside className="heritage-aside">
          <MediaFigure
            src={images.masmakFort}
            alt="صورة قصر المصمك الواردة في الكتاب"
            caption="قصر المصمك (أو المسمك)"
            onZoom={onZoom}
          />
          <h3>قصر المصمك (أو المسمك)</h3>
          <p>
            هو البناء السميك، وقد بناه الإمام عبدالله بن فيصل بن تركي، وجعله جزءاً من قصر الحكم في الرياض، ثم
            تحول إلى حصن للحماية. والقصر اليوم معلم من معالم الرياض ويزوره السياح والمواطنون.
          </p>
        </aside>
      </div>

      <div className="source-gallery two-photos">
        <MediaFigure src={images.riders} alt="رسم تخيلي للملك عبدالعزيز يقود رجاله في إحدى المعارك" caption="رسم تخيلي: الملك عبدالعزيز يقود رجاله في إحدى المعارك" onZoom={onZoom} />
        <MediaFigure src={images.masmakDoor} alt="باب قصر المصمك كما ورد في الكتاب" caption="باب المصمك" onZoom={onZoom} />
      </div>

      <ActivityGate id="masmak-check"><section className="activity-block" aria-label="نشاط قصر المصمك">
        <ActivityHeading number={3} title="اكتشف قصر المصمك" description="اقرأ فقرة «للاطلاع» في الصفحة، ثم اختر الإجابة الصحيحة." />
        <p className="activity-question">ماذا تعني كلمة «المصمك»؟</p>
        <div className="answer-options">
          {["البناء السميك", "الساحة الواسعة", "الباب الخشبي"].map((answer) => (
            <button
              key={answer}
              type="button"
              className={`answer-option ${masmakAnswer === answer ? "selected" : ""} ${masmakAnswer && answer === "البناء السميك" ? "correct-choice" : ""}`}
              onClick={() => {
                setMasmakAnswer(answer);
                feedbackSound(soundEnabled, answer === "البناء السميك");
              }}
            >
              <span className="option-ring" /> {answer}
            </button>
          ))}
        </div>
        {masmakAnswer && (
          <p className={`inline-feedback ${masmakAnswer === "البناء السميك" ? "success" : "error"}`} role="status">
            {masmakAnswer === "البناء السميك" ? "إجابة صحيحة!" : "حاول مجدداً. الإجابة الصحيحة: البناء السميك."}
          </p>
        )}
      </section></ActivityGate>

      <StrategyActivity id="timeline" soundEnabled={soundEnabled} />
      <ActivityGate id="event-sort"><SortActivity soundEnabled={soundEnabled} /></ActivityGate>
    </>
  );
}

function Participants({ onZoom }: { onZoom: (item: ZoomItem) => void }) {
  const [search, setSearch] = useState("");
  const filtered = participants
    .map((name, index) => ({ name, index }))
    .filter((item) => normalized(item.name).includes(normalized(search)));

  return (
    <details className="participants-section">
      <summary>
        <span className="participants-heading">
          <span className="participants-count">٦٣</span>
          <span>
            <strong>أسماء الرجال الذين دخلوا الرياض</strong>
            <small>وفق القائمة الواردة في صفحة الكتاب ٧٨</small>
          </span>
        </span>
        <ChevronDown size={22} className="details-chevron" aria-hidden="true" />
      </summary>
      <div className="participants-body">
        <p>بقيادة الملك عبدالعزيز بن عبدالرحمن بن فيصل آل سعود في ٥ شوال ١٣١٩هـ، الموافق ١٥ يناير ١٩٠٢م.</p>
        <div className="participants-tools">
          <label className="search-field">
            <Search size={18} aria-hidden="true" />
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث عن اسم" aria-label="ابحث في أسماء المشاركين" />
          </label>
          <button
            type="button"
            className="button-text"
            onClick={() => onZoom({ src: bookPages[2], alt: "صفحة الكتاب الأصلية وفيها قائمة الرجال المشاركين", caption: "القائمة الأصلية في صفحة الكتاب ٧٨" })}
          >
            <Maximize2 size={16} /> شاهد القائمة في الكتاب
          </button>
        </div>
        <ol className="participants-list">
          {filtered.map(({ name, index }) => (
            <li key={index}>
              <span>{ar(index + 1).padStart(2, "٠")}</span>
              {name}
            </li>
          ))}
        </ol>
        {filtered.length === 0 && <p className="empty-search">لم نعثر على اسم مطابق. جرّب كتابة جزء آخر من الاسم.</p>}
      </div>
    </details>
  );
}

export function PageThree({ onZoom, soundEnabled }: PageProps) {
  const [activeStop, setActiveStop] = useStoredState("lesson-route-stop", 1);
  const [challengeIndex, setChallengeIndex] = useState(-1);
  const [challengeSolved, setChallengeSolved] = useState(false);
  const [challengeFeedback, setChallengeFeedback] = useState("");
  const challenges = [
    { place: "الكويت", id: 1 },
    { place: "الجافورة", id: 5 },
    { place: "الرياض", id: 8 },
  ];

  function selectStop(id: number, fromMap: boolean) {
    setActiveStop(id);
    if (fromMap && challengeIndex >= 0 && challengeIndex < challenges.length && !challengeSolved) {
      const correct = id === challenges[challengeIndex].id;
      setChallengeSolved(correct);
      setChallengeFeedback(correct ? "أحسنت، هذه هي النقطة الصحيحة على الخريطة." : "ليست هذه النقطة. تأمل مسار الرحلة ثم حاول مرة أخرى.");
      feedbackSound(soundEnabled, correct);
    }
  }

  return (
    <>
      <PageHeading
        page={3}
        title="استرداد الرياض"
        subtitle="المحاولة الثانية"
        intro="تمكن الملك عبدالعزيز من استرداد الرياض في الخامس من شهر شوال عام ١٣١٩هـ، مع رجاله وعتاد قليل، بعد كفاح ونضال امتد إلى أكثر من ثلاثة أشهر، وكان عددهم ٦٣ رجلاً."
      />
      <div className="map-section-intro">
        <h3 className="section-title">تتبّع رحلة استرداد الرياض</h3>
        <p><MapPin size={17} /> انقر على النقاط المرقمة في خريطة الكتاب أو اختر حدثاً من القائمة.</p>
      </div>
      <div className="interactive-map-layout route-layout">
        <MapArtwork
          src={images.routeMap}
          alt="خريطة الحملة الثانية للملك عبدالعزيز من أجل استرداد الرياض عام ١٣١٩هـ من الكتاب"
          caption="خريطة الحملة الثانية لاسترداد الرياض، ١٣١٩هـ"
          steps={routeSteps}
          activeId={activeStop}
          onSelect={(id) => selectStop(id, true)}
          onZoom={onZoom}
          variant="route"
        />
        <MapStory steps={routeSteps} activeId={activeStop} onSelect={(id) => selectStop(id, false)} />
      </div>
      <StrategyActivity id="map" soundEnabled={soundEnabled} />

      <ActivityGate id="route-challenge"><section className="map-challenge activity-block" aria-label="تحدي تحديد المواقع على الخريطة">
        <div className="challenge-copy">
          <span className="challenge-icon"><MapPin size={22} /></span>
          <div>
            <h3>تحدي الخريطة</h3>
            <p>
              {challengeIndex === -1 && "هل تستطيع تحديد مواقع الرحلة بنفسك؟"}
              {challengeIndex >= 0 && challengeIndex < challenges.length && `انقر على نقطة ${challenges[challengeIndex].place} في الخريطة أعلاه.`}
              {challengeIndex === challenges.length && "رائع! حدّدت المواقع الثلاثة على الخريطة."}
            </p>
            {challengeFeedback && challengeIndex < challenges.length && (
              <span className={`inline-feedback ${challengeSolved ? "success" : "error"}`} role="status">{challengeFeedback}</span>
            )}
          </div>
        </div>
        {challengeIndex === -1 && (
          <button type="button" className="button-primary" onClick={() => setChallengeIndex(0)}>ابدأ التحدي <ChevronLeft size={17} /></button>
        )}
        {challengeIndex >= 0 && challengeIndex < challenges.length && challengeSolved && (
          <button
            type="button"
            className="button-primary"
            onClick={() => {
              setChallengeIndex((previous) => previous + 1);
              setChallengeSolved(false);
              setChallengeFeedback("");
            }}
          >
            {challengeIndex === challenges.length - 1 ? "إنهاء التحدي" : "الموقع التالي"} <ChevronLeft size={17} />
          </button>
        )}
        {challengeIndex === challenges.length && (
          <button
            type="button"
            className="button-text"
            onClick={() => {
              setChallengeIndex(0);
              setChallengeFeedback("");
            }}
          ><RotateCcw size={16} /> أعد التحدي</button>
        )}
      </section></ActivityGate>

      <Participants onZoom={onZoom} />
    </>
  );
}

export function PageFour({ onZoom, soundEnabled }: PageProps) {
  const [activeStep, setActiveStep] = useStoredState("lesson-assault-step", 1);
  const [safetyAnswer, setSafetyAnswer] = useStoredState<string>("lesson-safety-answer", "");

  return (
    <>
      <PageHeading page={4} title="اقتحام قصر المصمك" intro="توضح خريطة الكتاب خطة الملك عبدالعزيز ورجاله لدخول الرياض واقتحام المصمك في شوال ١٣١٩هـ." />
      <div className="map-section-intro">
        <h3 className="section-title">خطة الاقتحام</h3>
        <p><MapPin size={17} /> اختر إحدى النقاط الثلاث لتتبع ما حدث.</p>
      </div>
      <div className="interactive-map-layout assault-layout">
        <MapArtwork
          src={images.masmakPlan}
          alt="خريطة من الكتاب تبيّن اقتحام الملك عبدالعزيز ورجاله المصمك واسترداد الرياض"
          caption="اقتحام المصمك واسترداد الرياض في شوال ١٣١٩هـ"
          steps={assaultSteps}
          activeId={activeStep}
          onSelect={setActiveStep}
          onZoom={onZoom}
          variant="assault"
        />
        <MapStory steps={assaultSteps} activeId={activeStep} onSelect={setActiveStep} />
      </div>

      <div className="assault-aftermath">
        <div>
          <h3 className="section-title">حرصه على سلامة السكان</h3>
          <p className="book-copy">
            قاد الملك عبدالعزيز معركة اقتحام المصمك لاسترداد الرياض، ونجح في أن تكون المعركة مقتصرة على من
            سيواجههم دون تعريض السكان لأي أخطار، وذلك حرصاً على سلامتهم.
          </p>
          <div className="safety-highlight"><Lightbulb size={21} /> كانت سلامة السكان جزءاً من حرصه أثناء المعركة.</div>
        </div>
        <MediaFigure
          src={images.masmakAssault}
          alt="رسم تخيلي للملك عبدالعزيز في أثناء اقتحام المصمك"
          caption="رسم تخيلي: الملك عبدالعزيز في أثناء اقتحام المصمك"
          onZoom={onZoom}
        />
      </div>
      <StrategyActivity id="cooperative" soundEnabled={soundEnabled} />

      <ActivityGate id="safety-check"><section className="activity-block" aria-label="سؤال صح أو خطأ عن سلامة السكان">
        <ActivityHeading number={4} title="فكّر وأجب" description="استعن بالنص الذي قرأته عن اقتحام المصمك." />
        <p className="activity-question">حرص الملك عبدالعزيز على ألا يتعرض سكان الرياض للأخطار أثناء المعركة.</p>
        <div className="answer-options compact-options">
          {[{ value: "true", label: "صح" }, { value: "false", label: "خطأ" }].map((option) => (
            <button
              key={option.value}
              type="button"
              className={`answer-option ${safetyAnswer === option.value ? "selected" : ""} ${safetyAnswer && option.value === "true" ? "correct-choice" : ""}`}
              onClick={() => {
                setSafetyAnswer(option.value);
                feedbackSound(soundEnabled, option.value === "true");
              }}
            ><span className="option-ring" /> {option.label}</button>
          ))}
        </div>
        {safetyAnswer && (
          <p className={`inline-feedback ${safetyAnswer === "true" ? "success" : "error"}`} role="status">
            {safetyAnswer === "true" ? "صحيح. حرص على سلامة السكان." : "الإجابة الصحيحة: صح؛ لم يُعرّض السكان لأي أخطار."}
          </p>
        )}
      </section></ActivityGate>
    </>
  );
}

export function PageFive({ onZoom, soundEnabled }: PageProps) {
  const { controls } = useLessonGuidance();
  const [lessonAnswer, setLessonAnswer] = useStoredState("lesson-open-answer-one", "");
  const [characterAnswer, setCharacterAnswer] = useStoredState("lesson-open-answer-two", "");
  const [city, setCity] = useStoredState("lesson-death-city", "");
  const [year, setYear] = useStoredState("lesson-death-year", "");
  const [fillChecked, setFillChecked] = useState(false);
  const fillCorrect = normalized(city).replace(/^ال/, "") === normalized("الطائف").replace(/^ال/, "") && normalized(year) === "1373";

  return (
    <>
      <PageHeading page={5} title="الحكم لله ثم لعبدالعزيز" />
      <div className="victory-layout">
        <div className="victory-copy">
          <p className="book-copy">
            انتهت المواجهة بانتصار الملك عبدالعزيز، وصعد أحد رجالاته إلى أعلى قصر المصمك ليعلنها في أرجاء المدينة،
            أن حلم العودة قد تحقق:
          </p>
          <blockquote className="victory-quote">«المُلْك لله ثم لعبدالعزيز بن عبدالرحمن آل سعود»</blockquote>
        </div>
        <MediaFigure
          src={bookPages[4]}
          alt="صورة الملك عبدالعزيز بالأبيض والأسود كما تظهر في صفحة الكتاب الأصلية"
          caption="الملك عبدالعزيز بن عبدالرحمن آل سعود · من صفحة الكتاب الأصلية"
          className="original-scan-figure"
          crop={{ x: 129, y: 198, width: 270, height: 210, sourceWidth: 850 }}
          onZoom={onZoom}
        />
      </div>

      <section className="reading-activity activity-block" aria-label="النشاط القرائي من الكتاب">
        <ActivityHeading number={5} title={controls.activityIds.includes("reading-response") ? "نشاط قرائي: تأمل النص" : "نص رحلة استرداد الرياض"} description={controls.activityIds.includes("reading-response") ? "اقرأ كلمات الملك عبدالعزيز ثم عبّر عن رأيك. تُحفظ إجاباتك تلقائياً." : "اقرأ النص الوارد في صفحة الكتاب."} />
        <p className="quote-intro">قال الملك عبدالعزيز يصف رحلته لاسترداد الرياض:</p>
        <blockquote className="reading-quote">
          «أخذنا أرزاقنا وسرنا وسط الربع الخالي ولم يدر أحد عنا أين كنا، فجلسنا شعبان بطوله إلى عشرين من رمضان،
          ثم سرنا إلى العارض، كانت رواحلنا رديّة».
        </blockquote>
        <StrategyActivity id="think-pair-share" soundEnabled={soundEnabled} />
        {controls.activityIds.includes("reading-response") && <p className="optional-writing-note">يكفي اختيار الإجابات أعلاه لتطبيق الاستراتيجية. الأسئلة الكتابية التالية للتوسع فقط.</p>}
        <ActivityGate id="reading-response"><div className="open-questions">
          <label>
            <span>أ. ما الدروس والحِكَم التي نتعلمها من هذا النص؟</span>
            <textarea value={lessonAnswer} onChange={(event) => setLessonAnswer(event.target.value)} placeholder="اكتب ما استنتجته من النص هنا..." rows={3} />
          </label>
          <label>
            <span>ب. صِف شخصية الملك عبدالعزيز.</span>
            <textarea value={characterAnswer} onChange={(event) => setCharacterAnswer(event.target.value)} placeholder="صف شخصية الملك عبدالعزيز بأسلوبك..." rows={3} />
          </label>
        </div></ActivityGate>
      </section>

      <section className="death-section">
        <h3 className="section-title">وفاة الملك عبدالعزيز</h3>
        <p className="book-copy">
          كانت حياة الملك عبدالعزيز حافلة بالكفاح والبناء، وقد أثمر ذلك بروز المملكة العربية السعودية بين دول العالم
          في الجوانب السياسية والاقتصادية والتنموية، وقد توفي بعد هذا العمل الجاد الطويل الخالد في مدينة الطائف سنة
          ١٣٧٣هـ، ونُقل جثمانه إلى الرياض، ودُفن في مقبرة العود، وخلفه في الحكم ولي عهده الأمير سعود بن عبدالعزيز.
        </p>
      </section>

      <ActivityGate id="death-fill"><section className="activity-block fill-activity" aria-label="نشاط أكمل الفراغ">
        <ActivityHeading number={6} title="أكمل المعلومة" description="راجع الفقرة السابقة وأكمل الفراغين." />
        <div className="fill-sentence">
          توفي الملك عبدالعزيز في مدينة
          <input type="text" value={city} onChange={(event) => { setCity(event.target.value); setFillChecked(false); }} aria-label="اسم المدينة" placeholder="المدينة" />
          سنة
          <input type="text" inputMode="numeric" value={year} onChange={(event) => { setYear(event.target.value); setFillChecked(false); }} aria-label="سنة الوفاة الهجرية" placeholder="السنة" />
          هـ.
        </div>
        <div className="activity-actions">
          <button
            type="button"
            className="button-primary"
            onClick={() => {
              if (city.trim() && year.trim()) {
                setFillChecked(true);
                feedbackSound(soundEnabled, fillCorrect);
              }
            }}
          ><Check size={18} /> تحقق من الإجابة</button>
          {fillChecked && (
            <span className={`inline-feedback ${fillCorrect ? "success" : "error"}`} role="status">
              {fillCorrect ? "إجابة صحيحة!" : "الإجابة الصحيحة: الطائف سنة ١٣٧٣هـ."}
            </span>
          )}
        </div>
      </section></ActivityGate>
      <StrategyActivity id="formative" soundEnabled={soundEnabled} />
    </>
  );
}