import type { ReactNode } from "react";
import { BookOpen, LogOut, Wifi, WifiOff } from "lucide-react";
import type { BackendMode, SchoolSession } from "../schoolTypes";

export function SchoolFrame({
  mode,
  session,
  onLogout,
  children,
}: {
  mode: BackendMode;
  session?: SchoolSession | null;
  onLogout?: () => void;
  children: ReactNode;
}) {
  return (
    <div className="school-root" dir="rtl">
      <div className="top-rule" />
      <header className="school-header">
        <div className="school-header-inner">
          <div className="school-brand">
            <span className="school-brand-mark"><BookOpen size={26} strokeWidth={1.7} /></span>
            <span><strong>الدرس العاشر</strong><small>الملك عبدالعزيز واسترداد الرياض</small></span>
          </div>
          <div className="school-header-tools">
            <span className={`school-mode-badge ${mode === "demo" ? "demo" : ""}`}>
              {mode === "live" ? <Wifi size={15} /> : <WifiOff size={15} />}
              {mode === "live" ? "متصل بنيون" : "عرض تجريبي محلي"}
            </span>
            {session && <span className="school-header-name">{session.name}</span>}
            {session && onLogout && (
              <button type="button" className="school-logout" onClick={onLogout} aria-label="تسجيل الخروج">
                <LogOut size={18} /><span>خروج</span>
              </button>
            )}
          </div>
        </div>
      </header>
      {children}
      <footer className="school-site-footer">الدراسات الاجتماعية · الفصل ٦ ب · الوحدة الرابعة</footer>
    </div>
  );
}