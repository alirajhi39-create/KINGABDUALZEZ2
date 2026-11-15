import { useEffect, useState } from "react";
import { ArrowLeft, BookOpen, CheckCircle2, KeyRound, LockKeyhole, Users } from "lucide-react";
import { images } from "../embeddedAssets";
import { schoolAction } from "../schoolApi";
import { getDemoCode } from "../schoolDemo";
import type { BackendMode, SchoolRole, SchoolSession } from "../schoolTypes";
import { SchoolFrame } from "./SchoolFrame";

export function LoginPortal({ mode, onLogin }: { mode: BackendMode; onLogin: (session: SchoolSession) => void }) {
  const [role, setRole] = useState<SchoolRole>("student");
  const [name, setName] = useState("");
  const [classroomCode, setClassroomCode] = useState("");
  const [pin, setPin] = useState("");
  const [teacherCode, setTeacherCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (mode === "demo") setClassroomCode(getDemoCode());
  }, [mode]);

  async function login(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await schoolAction<{ session: SchoolSession }>(
        mode,
        role === "student" ? "student-login" : "teacher-login",
        role === "student" ? { name, classroomCode, pin } : { code: teacherCode },
      );
      onLogin({ ...result.session, mode });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "تعذر تسجيل الدخول.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SchoolFrame mode={mode}>
      <main className="auth-stage">
        <section className="auth-editorial">
          <p className="auth-overline">الوحدة الرابعة <span>/</span> الدراسات الاجتماعية</p>
          <h1>الملك عبدالعزيز <span>واسترداد الرياض</span></h1>
          <p className="auth-description">درس من صفحات الكتاب يتحول إلى رحلة تفاعلية، من أول محاولة لاسترداد الرياض حتى اقتحام المصمك.</p>
          <div className="auth-visual">
            <img src={images.kingJourney} alt="رسم تخيلي للملك عبدالعزيز في رحلة استرداد الرياض من الكتاب" />
            <span>الدرس العاشر · الفصل ٦ ب</span>
          </div>
        </section>

        <section className="auth-panel" aria-label="دخول المنصة">
          <div className="auth-panel-top">
            <span className="auth-small-label">مساحة التعلم</span>
            <h2>مرحباً بك في الدرس</h2>
            <p>اختر طريقة الدخول المناسبة لك للبدء.</p>
          </div>
          <div className="auth-role-switch" role="tablist" aria-label="نوع الدخول">
            <button type="button" role="tab" aria-selected={role === "student"} className={role === "student" ? "active" : ""} onClick={() => { setRole("student"); setError(""); }}><Users size={19} /> دخول الطالب</button>
            <button type="button" role="tab" aria-selected={role === "teacher"} className={role === "teacher" ? "active" : ""} onClick={() => { setRole("teacher"); setError(""); }}><BookOpen size={19} /> دخول المعلم</button>
          </div>
          <form className="auth-form" onSubmit={login}>
            {role === "student" ? (
              <>
                <label>اسم الطالب<input required minLength={2} maxLength={40} value={name} onChange={(event) => setName(event.target.value)} placeholder="اكتب اسمك هنا" autoComplete="name" /></label>
                <label>رمز الفصل ٦ ب<input required maxLength={6} value={classroomCode} onChange={(event) => setClassroomCode(event.target.value.toUpperCase())} placeholder="الرمز الذي أعطاك إياه المعلم" autoCapitalize="characters" dir="ltr" /></label>
                <label>الرمز الشخصي<input required minLength={4} maxLength={6} inputMode="numeric" value={pin} onChange={(event) => setPin(event.target.value)} placeholder="٤ إلى ٦ أرقام تحفظها للعودة" type="password" autoComplete="off" dir="ltr" /></label>
                <p className="auth-field-hint"><KeyRound size={15} /> في دخولك الأول اختر رمزاً شخصياً، واستخدمه نفسه في المرات القادمة.</p>
              </>
            ) : mode === "live" ? (
              <>
                <label>رمز دخول المعلم<input required type="password" value={teacherCode} onChange={(event) => setTeacherCode(event.target.value)} placeholder="الرمز السري الخاص بالمعلم" autoComplete="current-password" /></label>
                <p className="auth-field-hint"><LockKeyhole size={15} /> رمز المعلم محفوظ في إعدادات Vercel، ولا يظهر للطلاب.</p>
              </>
            ) : (
              <p className="demo-teacher-note">هذه معاينة محلية للوحة المعلم. بياناتها تظهر في هذا المتصفح فقط، وليست مسابقة عبر الإنترنت.</p>
            )}
            {error && <p className="auth-error" role="alert">{error}</p>}
            <button type="submit" className="button-primary auth-submit" disabled={busy}>
              {busy ? "جارٍ الدخول..." : role === "teacher" && mode === "demo" ? "عرض لوحة المعلم" : "الدخول إلى المنصة"}
              {!busy && <ArrowLeft size={19} />}
            </button>
          </form>
          {mode === "demo" && (
            <div className="auth-demo-info"><CheckCircle2 size={17} /><span>وضع تجربة محلية. رمز الصف الحالي: <strong dir="ltr">{getDemoCode()}</strong>. للمسابقة بين أجهزة مختلفة اربط Neon وانشر التطبيق على Vercel.</span></div>
          )}
        </section>
      </main>
    </SchoolFrame>
  );
}