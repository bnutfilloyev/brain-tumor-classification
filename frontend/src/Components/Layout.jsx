import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  Users,
  ScanLine,
  BarChart3,
  ShieldCheck,
  FileBadge,
  Info,
  Brain,
  Globe,
  Menu,
  X,
} from "lucide-react";
import { Toaster } from "./Toast";

const NAV = [
  { to: "/", key: "dashboard", icon: LayoutDashboard, end: true },
  { to: "/patients", key: "patients", icon: Users },
  { to: "/analyze", key: "analyze", icon: ScanLine },
  { to: "/metrics", key: "metrics", icon: BarChart3 },
  { to: "/validation", key: "validation", icon: ShieldCheck },
  { to: "/model-card", key: "modelCard", icon: FileBadge },
  { to: "/about", key: "about", icon: Info },
];

export default function Layout({ children }) {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const activeKey =
    (NAV.find((n) => (n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)))
      || NAV[0]).key;
  const today = new Date().toLocaleDateString(i18n.language === "uz" ? "uz" : "en", {
    weekday: "short", year: "numeric", month: "short", day: "numeric",
  });

  const toggleLang = () => {
    const next = i18n.language === "en" ? "uz" : "en";
    i18n.changeLanguage(next);
    localStorage.setItem("lang", next);
  };

  const closeSidebar = () => setSidebarOpen(false);

  const SidebarContent = () => (
    <>
      <div className="px-6 py-5 flex items-center gap-3 border-b border-slate-100">
        <div className="h-10 w-10 rounded-xl bg-brand-600 grid place-items-center text-white shrink-0">
          <Brain size={22} />
        </div>
        <div className="min-w-0">
          <div className="font-extrabold text-slate-800 leading-tight truncate">
            {t("app.name")}
          </div>
          <div className="text-[11px] text-slate-400 leading-tight">
            MRI Diagnostics
          </div>
        </div>
        <button
          className="ml-auto lg:hidden text-slate-400 hover:text-slate-600 p-1"
          onClick={closeSidebar}
        >
          <X size={20} />
        </button>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV.map(({ to, key, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={closeSidebar}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? "bg-brand-50 text-brand-700"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              }`
            }
          >
            <Icon size={19} />
            {t(`nav.${key}`)}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-slate-100">
        <button onClick={toggleLang} className="btn-ghost w-full justify-start">
          <Globe size={18} />
          {i18n.language === "en" ? "O'zbekcha" : "English"}
        </button>
        <p className="text-[10px] text-slate-400 mt-3 px-1 leading-relaxed">
          {t("disclaimer")}
        </p>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar — drawer on mobile, fixed on desktop */}
      <aside
        className={`fixed top-0 left-0 z-50 h-screen w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0`}
      >
        <SidebarContent />
      </aside>

      {/* Content */}
      <main className="flex-1 min-h-screen flex flex-col lg:ml-64">
        {/* Topbar */}
        <header className="sticky top-0 z-30 h-16 bg-white/80 backdrop-blur border-b border-slate-200 flex items-center justify-between px-4 sm:px-8">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              className="lg:hidden p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-400 hidden sm:block">{t("app.name")}</span>
              <span className="text-slate-300 hidden sm:block">/</span>
              <span className="font-semibold text-slate-700">{t(`nav.${activeKey}`)}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-5">
            <span className="hidden md:block text-xs text-slate-400">{today}</span>
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-full bg-brand-100 text-brand-700 grid place-items-center text-sm font-bold shrink-0">
                DR
              </div>
              <div className="hidden sm:block leading-tight">
                <div className="text-sm font-semibold text-slate-700">Dr. Radiologist</div>
                <div className="text-[11px] text-slate-400">Neuro-Oncology</div>
              </div>
            </div>
          </div>
        </header>

        <div key={location.pathname} className="max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 sm:py-8 fade-in">
          {children}
        </div>
      </main>
      <Toaster />
    </div>
  );
}
