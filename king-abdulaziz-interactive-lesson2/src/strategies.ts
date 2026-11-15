export const teachingStrategies = [
  {
    id: "brainstorm",
    name: "العصف الذهني",
    stage: "التهيئة",
    page: 1,
    studentPrompt: "تأمل السؤال التمهيدي، واختر الجانب الذي تريد استكشافه قبل قراءة التعريف.",
    teacherGuide: "ابدأ بالسؤال التمهيدي في الصفحة الأولى، ودع الطلبة يختارون ما يريدون استكشافه قبل قراءة النص.",
  },
  {
    id: "timeline",
    name: "الخط الزمني",
    stage: "فهم التسلسل",
    page: 2,
    studentPrompt: "بعد قراءة المحاولة الأولى، اختر الحدث التالي ثم جرّب ترتيب الأحداث.",
    teacherGuide: "بعد شرح المحاولة الأولى، ابدأ بسؤال التسلسل الاختياري ثم نشاط ترتيب الأحداث.",
  },
  {
    id: "map",
    name: "قراءة الخريطة",
    stage: "الاستكشاف",
    page: 3,
    studentPrompt: "تتبّع نقاط خريطة الرحلة، ثم اختر موقع المرحلة المطلوبة دون كتابة.",
    teacherGuide: "اعرض خريطة الصفحة الثالثة، ثم استخدم سؤال الموقع الاختياري وتحدي النقاط بعد قراءتها.",
  },
  {
    id: "cooperative",
    name: "التعلم التعاوني",
    stage: "التحليل",
    page: 4,
    studentPrompt: "ناقش مع مجموعتك خطة الاقتحام وسلامة السكان، ثم اختر إجابة المجموعة.",
    teacherGuide: "وزّع مجموعات لقراءة خريطة الاقتحام، ثم اطلب من كل مجموعة اختيار استنتاجها المشترك.",
  },
  {
    id: "think-pair-share",
    name: "فكّر، زاوج، شارك",
    stage: "التفكير والاستنتاج",
    page: 5,
    studentPrompt: "اقرأ النص، وفكّر وحدك، ثم اختر صفتين وناقش اختيارك مع زميلك.",
    teacherGuide: "بعد قراءة النص، امنح وقتاً للتفكير الفردي ثم النقاش الثنائي واختيار صفتين من النص.",
  },
  {
    id: "formative",
    name: "التقويم التكويني",
    stage: "التحقق من الفهم",
    page: 5,
    studentPrompt: "اختر إجابة مراجعة سريعة في نهاية الدرس، ثم انتقل إلى الاختبار النهائي.",
    teacherGuide: "استخدم سؤال المراجعة الاختياري في نهاية الصفحة الخامسة قبل الاختبار النهائي.",
  },
] as const;

export type StrategyId = (typeof teachingStrategies)[number]["id"];

export function getStrategy(id: string) {
  return teachingStrategies.find((strategy) => strategy.id === id) ?? teachingStrategies[0];
}