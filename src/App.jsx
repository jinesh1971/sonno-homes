import { useState, useEffect, useMemo } from "react";

/* ═══════════════════════════════════════════════════════════════════════════
   SONNO HOMES — Investment Management Platform
   Italian short-term rental property investment platform
   ═══════════════════════════════════════════════════════════════════════════ */

// ── HELPERS ──────────────────────────────────────────────────────────────────
const euro = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
const pct = (n) => `${n.toFixed(1)}%`;
const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// Generate monthly distributions for an investor based on their investment
function generateDistributions(investment, startDate, monthsActive) {
  const dists = [];
  const baseMonthly = investment * 0.018; // ~1.8% monthly avg (some variance)
  const start = new Date(startDate);
  for (let i = 0; i < monthsActive; i++) {
    const d = new Date(start);
    d.setMonth(d.getMonth() + i);
    const variance = 0.85 + Math.random() * 0.35;
    const amount = Math.round(baseMonthly * variance);
    dists.push({
      month: monthNames[d.getMonth()],
      year: d.getFullYear(),
      date: `${monthNames[d.getMonth()]} ${d.getFullYear()}`,
      amount,
      status: i < monthsActive - 1 ? "Paid" : (Math.random() > 0.3 ? "Paid" : "Pending"),
    });
  }
  return dists;
}

// ── DUMMY DATA ───────────────────────────────────────────────────────────────
const PROPERTIES = [
  { id: 1, name: "Villa Serena", location: "Amalfi Coast, Campania", type: "Villa", bedrooms: 4, contractYears: 5, monthlyYield: 1.9, img: "🏡", status: "Active", acquired: "Mar 2022" },
  { id: 2, name: "Casa del Sole", location: "Lake Como, Lombardy", type: "Lakehouse", bedrooms: 3, contractYears: 5, monthlyYield: 1.7, img: "☀️", status: "Active", acquired: "Jun 2022" },
  { id: 3, name: "Palazzo Azzurro", location: "Florence, Tuscany", type: "Apartment", bedrooms: 2, contractYears: 5, monthlyYield: 2.1, img: "🏛️", status: "Active", acquired: "Sep 2021" },
  { id: 4, name: "Trullo Bianco", location: "Puglia", type: "Trullo", bedrooms: 2, contractYears: 5, monthlyYield: 2.3, img: "🏠", status: "Active", acquired: "Jan 2023" },
  { id: 5, name: "Residenza Colosseo", location: "Rome, Lazio", type: "Apartment", bedrooms: 1, contractYears: 5, monthlyYield: 1.8, img: "🏟️", status: "Active", acquired: "Nov 2022" },
  { id: 6, name: "Dimora sul Mare", location: "Positano, Campania", type: "Villa", bedrooms: 5, contractYears: 5, monthlyYield: 2.0, img: "🌊", status: "Active", acquired: "Apr 2023" },
  { id: 7, name: "Cascina Verde", location: "Piedmont", type: "Farmhouse", bedrooms: 6, contractYears: 5, monthlyYield: 1.6, img: "🍇", status: "Lease Renewal", acquired: "Feb 2021" },
  { id: 8, name: "Loft Navigli", location: "Milan, Lombardy", type: "Loft", bedrooms: 1, contractYears: 5, monthlyYield: 2.2, img: "✨", status: "Active", acquired: "Aug 2023" },
  { id: 9, name: "Masseria Antica", location: "Lecce, Puglia", type: "Masseria", bedrooms: 8, contractYears: 5, monthlyYield: 1.5, img: "🏰", status: "Active", acquired: "May 2022" },
  { id: 10, name: "Attico Duomo", location: "Milan, Lombardy", type: "Penthouse", bedrooms: 3, contractYears: 5, monthlyYield: 1.9, img: "🌇", status: "Active", acquired: "Oct 2023" },
];

const INVESTORS = [
  { id: 1, name: "Marco Bianchi", email: "m.bianchi@email.com", phone: "+39 338 123 4567", occupation: "Dentist", city: "London, UK", invested: 25000, propertyIds: [1, 3], startDate: "2022-03-01", monthsActive: 48, futureCommitment: true, notes: "Interested in 2 more units" },
  { id: 2, name: "Sarah Thompson", email: "s.thompson@email.com", phone: "+44 7700 900123", occupation: "Solicitor", city: "Manchester, UK", invested: 10000, propertyIds: [2], startDate: "2022-06-01", monthsActive: 45, futureCommitment: true, notes: "Referred 3 other investors" },
  { id: 3, name: "Ahmed Al-Rashid", email: "a.rashid@email.com", phone: "+971 50 123 4567", occupation: "Business Owner", city: "Dubai, UAE", invested: 50000, propertyIds: [1, 4, 6, 9], startDate: "2021-09-01", monthsActive: 54, futureCommitment: true, notes: "High net worth, wants luxury only" },
  { id: 4, name: "Elena Rossi", email: "e.rossi@email.com", phone: "+39 333 456 7890", occupation: "Architect", city: "Rome, Italy", invested: 15000, propertyIds: [5], startDate: "2022-11-01", monthsActive: 40, futureCommitment: false, notes: "" },
  { id: 5, name: "James O'Brien", email: "j.obrien@email.com", phone: "+353 87 123 4567", occupation: "Software Engineer", city: "Dublin, Ireland", invested: 20000, propertyIds: [3, 7], startDate: "2021-02-01", monthsActive: 60, futureCommitment: true, notes: "Contract fully matured, wants renewal" },
  { id: 6, name: "Priya Sharma", email: "p.sharma@email.com", phone: "+91 98765 43210", occupation: "Physician", city: "Mumbai, India", invested: 30000, propertyIds: [2, 4, 8], startDate: "2023-01-01", monthsActive: 38, futureCommitment: true, notes: "Exploring 50K package" },
  { id: 7, name: "Hans Muller", email: "h.muller@email.com", phone: "+49 170 123 4567", occupation: "Retired Engineer", city: "Munich, Germany", invested: 40000, propertyIds: [6, 9, 10], startDate: "2022-05-01", monthsActive: 46, futureCommitment: false, notes: "Prefers quarterly reports" },
  { id: 8, name: "Yuki Tanaka", email: "y.tanaka@email.com", phone: "+81 90 1234 5678", occupation: "Financial Analyst", city: "Tokyo, Japan", invested: 10000, propertyIds: [8], startDate: "2023-08-01", monthsActive: 31, futureCommitment: true, notes: "" },
  { id: 9, name: "Carlos Mendez", email: "c.mendez@email.com", phone: "+34 612 345 678", occupation: "Restaurant Owner", city: "Barcelona, Spain", invested: 35000, propertyIds: [1, 3, 5], startDate: "2022-09-01", monthsActive: 42, futureCommitment: true, notes: "Wants to visit properties" },
  { id: 10, name: "Fatima Hassan", email: "f.hassan@email.com", phone: "+44 7911 123456", occupation: "Pharmacist", city: "Birmingham, UK", invested: 12000, propertyIds: [4], startDate: "2023-04-01", monthsActive: 35, futureCommitment: false, notes: "May not renew" },
  { id: 11, name: "Luca Ferrari", email: "l.ferrari@email.com", phone: "+39 347 890 1234", occupation: "Lawyer", city: "Milan, Italy", invested: 60000, propertyIds: [2, 6, 7, 9, 10], startDate: "2021-05-01", monthsActive: 58, futureCommitment: true, notes: "Top investor, VIP" },
  { id: 12, name: "Emma Williams", email: "e.williams@email.com", phone: "+44 7456 789012", occupation: "Marketing Director", city: "London, UK", invested: 18000, propertyIds: [1, 5], startDate: "2023-06-01", monthsActive: 33, futureCommitment: true, notes: "" },
];

// Pre-compute distributions
const INVESTOR_DATA = INVESTORS.map(inv => {
  const dists = generateDistributions(inv.invested, inv.startDate, inv.monthsActive);
  const totalDist = dists.reduce((s, d) => s + d.amount, 0);
  const roiPct = (totalDist / inv.invested) * 100;
  const contractEnd = new Date(inv.startDate);
  contractEnd.setFullYear(contractEnd.getFullYear() + 5);
  const monthsRemaining = Math.max(0, 60 - inv.monthsActive);
  return { ...inv, distributions: dists, totalDistributed: totalDist, roiPct, contractEnd, monthsRemaining };
});

const TOTAL_INVESTED = INVESTOR_DATA.reduce((s, i) => s + i.invested, 0);
const TOTAL_DISTRIBUTED = INVESTOR_DATA.reduce((s, i) => s + i.totalDistributed, 0);
const AVG_ROI = INVESTOR_DATA.reduce((s, i) => s + i.roiPct, 0) / INVESTOR_DATA.length;

// ── PALETTE ──────────────────────────────────────────────────────────────────
const C = {
  bg: "#F4F2EE",
  sidebar: "#1A1612",
  sidebarHover: "#2A2420",
  sidebarActive: "#3A3230",
  accent: "#B8854F",
  accentSoft: "#D4A96A",
  accentBg: "#B8854F14",
  dark: "#1A1612",
  text: "#3D3530",
  textMid: "#7A6F65",
  textLight: "#A89E94",
  border: "#E2DDD6",
  card: "#FFFFFF",
  white: "#FFFFFF",
  green: "#2E7D4F",
  greenBg: "#E8F5EC",
  red: "#C0392B",
  redBg: "#FDECEB",
  blue: "#2563EB",
  blueBg: "#EFF6FF",
  warm: "#F9F6F2",
};

const FONT = `'DM Sans', system-ui, -apple-system, sans-serif`;
const DISPLAY = `'Playfair Display', Georgia, serif`;

// ── REUSABLE COMPONENTS ──────────────────────────────────────────────────────
function Card({ children, style, onClick, hover }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div onClick={onClick}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{
        background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, padding: 24,
        cursor: onClick ? "pointer" : "default",
        transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
        boxShadow: hover && hovered ? "0 12px 40px rgba(26,22,18,0.08)" : "0 1px 3px rgba(26,22,18,0.04)",
        transform: hover && hovered ? "translateY(-3px)" : "none",
        ...style,
      }}
    >{children}</div>
  );
}

function Badge({ label, variant = "default" }) {
  const styles = {
    green: { bg: C.greenBg, color: C.green, dot: C.green },
    red: { bg: C.redBg, color: C.red, dot: C.red },
    blue: { bg: C.blueBg, color: C.blue, dot: C.blue },
    orange: { bg: "#FFF8F0", color: "#B8854F", dot: "#B8854F" },
    default: { bg: "#F2F0EC", color: C.textMid, dot: C.textMid },
  };
  const s = styles[variant] || styles.default;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px 3px 8px", borderRadius: 999, background: s.bg, fontSize: 11, fontWeight: 600, color: s.color, letterSpacing: "0.01em" }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot }} />
      {label}
    </span>
  );
}

function KPICard({ label, value, sub, icon, trend }) {
  return (
    <Card hover>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>{label}</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: C.dark, letterSpacing: "-0.03em", fontFamily: DISPLAY }}>{value}</div>
          {sub && <div style={{ fontSize: 12, fontWeight: 600, color: trend === "up" ? C.green : trend === "down" ? C.red : C.textMid, marginTop: 6 }}>{trend === "up" ? "▲ " : trend === "down" ? "▼ " : ""}{sub}</div>}
        </div>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: C.accentBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{icon}</div>
      </div>
    </Card>
  );
}

function SortableTable({ columns, data, onRowClick }) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("desc");
  
  const sorted = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const av = typeof a[sortKey] === "string" ? a[sortKey].toLowerCase() : a[sortKey];
      const bv = typeof b[sortKey] === "string" ? b[sortKey].toLowerCase() : b[sortKey];
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [data, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col.key} onClick={() => col.sortable !== false && toggleSort(col.key)} style={{
                padding: "11px 16px", textAlign: "left", fontWeight: 600, color: C.textLight,
                fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.07em",
                borderBottom: `2px solid ${C.border}`, background: C.warm,
                cursor: col.sortable !== false ? "pointer" : "default",
                userSelect: "none", whiteSpace: "nowrap",
              }}>
                {col.label} {sortKey === col.key ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, ri) => (
            <tr key={ri} onClick={() => onRowClick && onRowClick(row)}
              style={{ cursor: onRowClick ? "pointer" : "default", transition: "background 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.background = C.warm}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              {columns.map(col => (
                <td key={col.key} style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, ...col.cellStyle }}>
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MiniBarChart({ data, height = 140, color = C.accent }) {
  const max = Math.max(...data.map(d => d.amount));
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height, padding: "0 2px" }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div style={{ fontSize: 8, color: C.textLight, fontWeight: 600, whiteSpace: "nowrap" }}>{euro(d.amount)}</div>
          <div style={{
            width: "100%", maxWidth: 24, minHeight: 4, borderRadius: "4px 4px 2px 2px",
            height: `${Math.max(8, (d.amount / max) * 100)}%`,
            background: d.status === "Pending" ? `${color}55` : `linear-gradient(180deg, ${color}, ${color}aa)`,
            transition: "height 0.5s cubic-bezier(0.4,0,0.2,1)",
          }} />
          <span style={{ fontSize: 8.5, color: C.textLight, fontWeight: 500 }}>{d.month}</span>
        </div>
      ))}
    </div>
  );
}

function ProgressRing({ value, max, size = 120, strokeWidth = 10, color = C.accent }) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const filled = Math.min(value / max, 1) * circ;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.border} strokeWidth={strokeWidth} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={`${filled} ${circ - filled}`} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1s ease" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: C.dark, fontFamily: DISPLAY }}>{pct(value)}</div>
        <div style={{ fontSize: 9, color: C.textLight, fontWeight: 500, marginTop: 2 }}>ROI returned</div>
      </div>
    </div>
  );
}

// CSV export
function exportCSV(filename, headers, rows) {
  const csv = [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═════════════════════════════════════════════════════════════════════════════
export default function SonnoHomes() {
  const [view, setView] = useState("admin"); // admin or investor
  const [page, setPage] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [selectedInvestor, setSelectedInvestor] = useState(null);
  const [notifications, setNotifications] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);
  const [investorLogin] = useState(INVESTOR_DATA[0]); // demo: first investor

  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=Playfair+Display:wght@400;500;600;700&display=swap";
    link.rel = "stylesheet"; document.head.appendChild(link);
    // Reset any default Vite/CSS margins and constraints
    const style = document.createElement("style");
    style.textContent = `
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      html, body, #root { width: 100%; height: 100%; margin: 0; padding: 0; overflow: hidden; }
    `;
    document.head.appendChild(style);
    setTimeout(() => setFadeIn(true), 80);
  }, []);

  useEffect(() => { setFadeIn(false); setTimeout(() => setFadeIn(true), 40); }, [page, view]);

  const adminNav = [
    { id: "dashboard", label: "Dashboard", icon: "◫" },
    { id: "investors", label: "Investors", icon: "◉" },
    { id: "properties", label: "Properties", icon: "⊞" },
    { id: "distributions", label: "Distributions", icon: "◈" },
    { id: "reports", label: "Reports & Export", icon: "▤" },
    { id: "settings", label: "Settings", icon: "⚙" },
  ];
  const investorNav = [
    { id: "overview", label: "My Overview", icon: "◫" },
    { id: "distributions", label: "My Distributions", icon: "◈" },
    { id: "properties", label: "My Properties", icon: "⊞" },
    { id: "documents", label: "Documents", icon: "▤" },
    { id: "profile", label: "My Profile", icon: "◉" },
  ];
  const nav = view === "admin" ? adminNav : investorNav;

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw", fontFamily: FONT, background: C.bg, color: C.text, overflow: "hidden" }}>
      {/* ── SIDEBAR ── */}
      <aside style={{ width: collapsed ? 68 : 256, background: C.sidebar, display: "flex", flexDirection: "column", transition: "width 0.3s ease", flexShrink: 0, zIndex: 10 }}>
        <div style={{ padding: collapsed ? "20px 10px" : "20px 22px", borderBottom: "1px solid #2E2822", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: `linear-gradient(135deg, ${C.accent}, ${C.accentSoft})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, fontWeight: 700, color: "#fff",
          }}>S</div>
          {!collapsed && (
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", fontFamily: DISPLAY, letterSpacing: "-0.01em" }}>Sonno Homes</div>
              <div style={{ fontSize: 10, color: "#8A7E74", fontWeight: 500 }}>Investment Platform</div>
            </div>
          )}
        </div>

        {/* View Toggle */}
        {!collapsed && (
          <div style={{ padding: "14px 16px 6px", display: "flex", gap: 4, background: "#141110" }}>
            {["admin", "investor"].map(v => (
              <button key={v} onClick={() => { setView(v); setPage(v === "admin" ? "dashboard" : "overview"); setSelectedInvestor(null); }}
                style={{
                  flex: 1, padding: "7px 0", borderRadius: 7, border: "none", fontSize: 11, fontWeight: 600,
                  background: view === v ? C.accent : "transparent", color: view === v ? "#fff" : "#8A7E74",
                  cursor: "pointer", fontFamily: FONT, textTransform: "capitalize", transition: "all 0.2s",
                }}>{v === "admin" ? "Admin View" : "Investor View"}</button>
            ))}
          </div>
        )}

        <nav style={{ flex: 1, padding: "12px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
          {nav.map(item => (
            <button key={item.id} onClick={() => { setPage(item.id); setSelectedInvestor(null); }}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: collapsed ? "11px" : "10px 14px", borderRadius: 9,
                background: page === item.id ? C.sidebarActive : "transparent",
                border: "none", color: page === item.id ? "#fff" : "#8A7E74",
                cursor: "pointer", fontSize: 13, fontWeight: page === item.id ? 600 : 400,
                fontFamily: FONT, transition: "all 0.2s",
                justifyContent: collapsed ? "center" : "flex-start", position: "relative",
              }}
              onMouseEnter={e => { if (page !== item.id) e.currentTarget.style.background = C.sidebarHover; }}
              onMouseLeave={e => { if (page !== item.id) e.currentTarget.style.background = "transparent"; }}
            >
              {page === item.id && <div style={{ position: "absolute", left: -8, top: "50%", transform: "translateY(-50%)", width: 3, height: 18, borderRadius: 2, background: C.accent }} />}
              <span style={{ fontSize: 15, width: 20, textAlign: "center" }}>{item.icon}</span>
              {!collapsed && item.label}
            </button>
          ))}
        </nav>
        <button onClick={() => setCollapsed(!collapsed)}
          style={{ margin: 10, padding: 9, borderRadius: 7, border: "1px solid #2E2822", background: "transparent", color: "#6B5F55", cursor: "pointer", fontSize: 11, fontFamily: FONT }}>
          {collapsed ? "→" : "← Collapse"}
        </button>
      </aside>

      {/* ── MAIN ── */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0, width: "100%" }}>
        {/* Topbar */}
        <header style={{ height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px", background: C.white, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: C.dark, margin: 0, fontFamily: DISPLAY }}>
            {nav.find(n => n.id === page)?.label}
            {view === "admin" && <span style={{ fontSize: 11, fontWeight: 500, color: C.textLight, marginLeft: 10, fontFamily: FONT }}>Admin Panel</span>}
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ position: "relative" }}>
              <button onClick={() => setNotifications(!notifications)}
                style={{ width: 36, height: 36, borderRadius: 9, border: `1px solid ${C.border}`, background: C.white, cursor: "pointer", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                🔔<span style={{ position: "absolute", top: 5, right: 5, width: 7, height: 7, borderRadius: "50%", background: C.red, border: "2px solid #fff" }} />
              </button>
              {notifications && (
                <div style={{ position: "absolute", top: 44, right: 0, width: 300, background: "#fff", borderRadius: 12, boxShadow: "0 16px 48px rgba(0,0,0,0.12)", border: `1px solid ${C.border}`, zIndex: 99 }}>
                  <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, fontWeight: 600, fontSize: 13 }}>Notifications</div>
                  {["Distribution processed for Villa Serena", "New investor sign-up: Emma Williams", "Lease renewal due: Cascina Verde"].map((n, i) => (
                    <div key={i} style={{ padding: "10px 16px", borderBottom: `1px solid ${C.border}`, fontSize: 12, color: C.text, cursor: "pointer" }}
                      onMouseEnter={e => e.currentTarget.style.background = C.warm}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      {n}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: `linear-gradient(135deg, ${C.accent}40, ${C.accent}15)`, display: "flex", alignItems: "center", justifyContent: "center", color: C.accent, fontWeight: 700, fontSize: 12 }}>
                {view === "admin" ? "SH" : investorLogin.name.split(" ").map(n => n[0]).join("")}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.dark }}>{view === "admin" ? "Sonno Admin" : investorLogin.name}</div>
                <div style={{ fontSize: 10, color: C.textLight }}>{view === "admin" ? "Management" : "Investor Portal"}</div>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div style={{ flex: 1, overflow: "auto", padding: 28, opacity: fadeIn ? 1 : 0, transform: fadeIn ? "translateY(0)" : "translateY(6px)", transition: "all 0.35s ease", minWidth: 0 }}>
          <div style={{ width: "100%", minWidth: 0 }}>
            {view === "admin" && page === "dashboard" && <AdminDashboard onViewInvestor={i => { setSelectedInvestor(i); setPage("investors"); }} />}
            {view === "admin" && page === "investors" && <AdminInvestors selected={selectedInvestor} onSelect={setSelectedInvestor} />}
            {view === "admin" && page === "properties" && <AdminProperties />}
            {view === "admin" && page === "distributions" && <AdminDistributions />}
            {view === "admin" && page === "reports" && <AdminReports />}
            {view === "admin" && page === "settings" && <AdminSettings />}
            {view === "investor" && page === "overview" && <InvestorOverview investor={investorLogin} />}
            {view === "investor" && page === "distributions" && <InvestorDistributions investor={investorLogin} />}
            {view === "investor" && page === "properties" && <InvestorProperties investor={investorLogin} />}
            {view === "investor" && page === "documents" && <InvestorDocuments />}
            {view === "investor" && page === "profile" && <InvestorProfile investor={investorLogin} />}
          </div>
        </div>
      </main>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// ADMIN PAGES
// ═════════════════════════════════════════════════════════════════════════════

function AdminDashboard({ onViewInvestor }) {
  const commitYes = INVESTOR_DATA.filter(i => i.futureCommitment).length;
  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, color: C.textMid }}>Portfolio overview across all investors and properties</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        <KPICard label="Total Invested" value={euro(TOTAL_INVESTED)} sub={`+${euro(45000)} this quarter`} trend="up" icon="💰" />
        <KPICard label="Total Distributed" value={euro(TOTAL_DISTRIBUTED)} sub="Across all investors" icon="📤" />
        <KPICard label="Active Investors" value={INVESTOR_DATA.length.toString()} sub={`${commitYes} future commitments`} trend="up" icon="👥" />
        <KPICard label="Avg. ROI Returned" value={pct(AVG_ROI)} sub="Target: breakeven 12-15mo" icon="📊" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "5fr 3fr", gap: 16, marginBottom: 24 }}>
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.dark }}>Investor Overview</div>
              <div style={{ fontSize: 11, color: C.textLight, marginTop: 2 }}>Click any row to view full profile</div>
            </div>
            <button onClick={() => exportCSV("sonno-investors.csv",
              ["Name","Invested","Distributed","ROI%","Commitment","Months Left"],
              INVESTOR_DATA.map(i => [i.name, i.invested, i.totalDistributed, i.roiPct.toFixed(1), i.futureCommitment ? "Yes" : "No", i.monthsRemaining])
            )} style={{ padding: "6px 14px", borderRadius: 7, border: `1px solid ${C.border}`, background: C.white, cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: FONT, color: C.text }}>
              Export CSV
            </button>
          </div>
          <SortableTable
            columns={[
              { key: "name", label: "Investor", render: r => <span style={{ fontWeight: 600, color: C.dark }}>{r.name}</span> },
              { key: "invested", label: "Invested", render: r => <span style={{ fontWeight: 600 }}>{euro(r.invested)}</span> },
              { key: "totalDistributed", label: "Distributed", render: r => <span style={{ fontWeight: 600, color: C.green }}>{euro(r.totalDistributed)}</span> },
              { key: "roiPct", label: "ROI %", render: r => <span style={{ fontWeight: 700, color: r.roiPct >= 100 ? C.green : C.accent }}>{pct(r.roiPct)}</span> },
              { key: "futureCommitment", label: "Future", render: r => <Badge label={r.futureCommitment ? "Yes" : "No"} variant={r.futureCommitment ? "green" : "red"} />, sortable: true },
            ]}
            data={INVESTOR_DATA}
            onRowClick={onViewInvestor}
          />
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.dark, marginBottom: 14 }}>Future Commitments</div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <ProgressRing value={commitYes / INVESTOR_DATA.length * 100} max={100} size={100} color={C.green} />
              <div>
                <div style={{ fontSize: 24, fontWeight: 700, color: C.dark, fontFamily: DISPLAY }}>{commitYes}/{INVESTOR_DATA.length}</div>
                <div style={{ fontSize: 11, color: C.textMid }}>investors committed to future investments</div>
              </div>
            </div>
          </Card>
          <Card>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.dark, marginBottom: 14 }}>Contract Timeline</div>
            {INVESTOR_DATA.slice(0, 5).map(inv => (
              <div key={inv.id} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, color: C.dark }}>{inv.name}</span>
                  <span style={{ color: C.textLight }}>{inv.monthsRemaining}mo left</span>
                </div>
                <div style={{ height: 6, background: C.border, borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(inv.monthsActive / 60) * 100}%`, background: inv.monthsActive >= 60 ? C.green : `linear-gradient(90deg, ${C.accent}, ${C.accentSoft})`, borderRadius: 3, transition: "width 0.8s ease" }} />
                </div>
              </div>
            ))}
          </Card>
          <Card>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.dark, marginBottom: 10 }}>Properties by Status</div>
            {[
              { label: "Active", count: PROPERTIES.filter(p => p.status === "Active").length, color: C.green },
              { label: "Lease Renewal", count: PROPERTIES.filter(p => p.status === "Lease Renewal").length, color: C.accent },
            ].map(s => (
              <div key={s.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 3, background: s.color }} />
                  <span style={{ fontSize: 13, color: C.text }}>{s.label}</span>
                </div>
                <span style={{ fontSize: 15, fontWeight: 700, color: C.dark }}>{s.count}</span>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </>
  );
}

function AdminInvestors({ selected, onSelect }) {
  if (selected) {
    const inv = INVESTOR_DATA.find(i => i.id === selected.id) || selected;
    const recentDists = inv.distributions ? inv.distributions.slice(-12) : [];
    return (
      <>
        <button onClick={() => onSelect(null)} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", fontSize: 12, color: C.accent, fontWeight: 600, marginBottom: 18, fontFamily: FONT }}>← Back to All Investors</button>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
          <Card style={{ gridColumn: "1 / 2" }}>
            <div style={{ textAlign: "center", marginBottom: 18 }}>
              <div style={{ width: 60, height: 60, borderRadius: 16, background: `linear-gradient(135deg, ${C.accent}30, ${C.accent}10)`, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 700, color: C.accent, marginBottom: 10 }}>
                {inv.name.split(" ").map(n => n[0]).join("")}
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.dark, fontFamily: DISPLAY }}>{inv.name}</div>
              <Badge label={inv.futureCommitment ? "Future Commitment: Yes" : "Future Commitment: No"} variant={inv.futureCommitment ? "green" : "red"} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: "Email", value: inv.email },
                { label: "Phone", value: inv.phone },
                { label: "Occupation", value: inv.occupation },
                { label: "City", value: inv.city },
                { label: "Member Since", value: new Date(inv.startDate).toLocaleDateString("en-GB", { month: "short", year: "numeric" }) },
                { label: "Notes", value: inv.notes || "—" },
              ].map(f => (
                <div key={f.label}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.06em" }}>{f.label}</div>
                  <div style={{ fontSize: 13, color: C.dark, fontWeight: 500, marginTop: 2 }}>{f.value}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card style={{ gridColumn: "2 / 4" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.dark, marginBottom: 18 }}>Investment Summary</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 20 }}>
              {[
                { label: "Total Invested", value: euro(inv.invested), color: C.dark },
                { label: "Total Distributed", value: euro(inv.totalDistributed), color: C.green },
                { label: "ROI Returned", value: pct(inv.roiPct), color: inv.roiPct >= 100 ? C.green : C.accent },
                { label: "Months Active", value: `${inv.monthsActive} / 60`, color: C.dark },
                { label: "Months Remaining", value: inv.monthsRemaining.toString(), color: inv.monthsRemaining <= 6 ? C.red : C.dark },
                { label: "Properties", value: inv.propertyIds.length.toString(), color: C.dark },
              ].map(s => (
                <div key={s.label} style={{ padding: 14, background: C.warm, borderRadius: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{s.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: s.color, fontFamily: DISPLAY }}>{s.value}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.dark, marginBottom: 10 }}>Last 12 Months Distributions</div>
            <MiniBarChart data={recentDists} height={120} />
          </Card>
        </div>

        <Card>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.dark, marginBottom: 16 }}>Linked Properties</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            {inv.propertyIds.map(pid => {
              const p = PROPERTIES.find(pp => pp.id === pid);
              return p ? (
                <div key={p.id} style={{ padding: 16, background: C.warm, borderRadius: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 22 }}>{p.img}</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: C.textMid }}>{p.location}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 12, fontSize: 11 }}>
                    <span style={{ color: C.textLight }}>{p.type}</span>
                    <span style={{ color: C.textLight }}>{p.bedrooms} bed</span>
                    <span style={{ color: C.green, fontWeight: 600 }}>~{p.monthlyYield}%/mo</span>
                  </div>
                </div>
              ) : null;
            })}
          </div>
        </Card>
      </>
    );
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: C.textMid }}>{INVESTOR_DATA.length} investors · {euro(TOTAL_INVESTED)} total capital</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => exportCSV("all-investors-full.csv",
            ["Name","Email","Phone","Occupation","City","Invested","Distributed","ROI%","Future Commitment","Months Active","Months Remaining","Notes"],
            INVESTOR_DATA.map(i => [i.name, i.email, i.phone, i.occupation, i.city, i.invested, i.totalDistributed, i.roiPct.toFixed(1), i.futureCommitment ? "Yes" : "No", i.monthsActive, i.monthsRemaining, i.notes])
          )} style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.white, cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: FONT }}>Export CSV</button>
          <button style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: C.accent, color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: FONT }}>+ Add Investor</button>
        </div>
      </div>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <SortableTable
          columns={[
            { key: "name", label: "Name", render: r => <span style={{ fontWeight: 600, color: C.dark }}>{r.name}</span> },
            { key: "occupation", label: "Occupation" },
            { key: "city", label: "Location" },
            { key: "invested", label: "Invested", render: r => <span style={{ fontWeight: 600 }}>{euro(r.invested)}</span> },
            { key: "totalDistributed", label: "Distributed", render: r => <span style={{ fontWeight: 600, color: C.green }}>{euro(r.totalDistributed)}</span> },
            { key: "roiPct", label: "ROI %", render: r => (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 50, height: 5, background: C.border, borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.min(r.roiPct, 200) / 2}%`, background: r.roiPct >= 100 ? C.green : C.accent, borderRadius: 3 }} />
                </div>
                <span style={{ fontWeight: 700, fontSize: 12, color: r.roiPct >= 100 ? C.green : C.accent }}>{pct(r.roiPct)}</span>
              </div>
            )},
            { key: "monthsRemaining", label: "Contract Left", render: r => <span style={{ color: r.monthsRemaining <= 6 ? C.red : C.text }}>{r.monthsRemaining}mo</span> },
            { key: "futureCommitment", label: "Future?", render: r => <Badge label={r.futureCommitment ? "Yes" : "No"} variant={r.futureCommitment ? "green" : "red"} /> },
          ]}
          data={INVESTOR_DATA}
          onRowClick={onSelect}
        />
      </Card>
    </>
  );
}

function AdminProperties() {
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: C.textMid }}>{PROPERTIES.length} properties across Italy</div>
        <button style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: C.accent, color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: FONT }}>+ Add Property</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {PROPERTIES.map(p => {
          const investorCount = INVESTOR_DATA.filter(i => i.propertyIds.includes(p.id)).length;
          return (
            <Card key={p.id} hover>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 28 }}>{p.img}</span>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: C.dark }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: C.textMid }}>{p.location}</div>
                  </div>
                </div>
                <Badge label={p.status} variant={p.status === "Active" ? "green" : "orange"} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                {[
                  { label: "Type", value: p.type },
                  { label: "Bedrooms", value: p.bedrooms },
                  { label: "Mo. Yield", value: `~${p.monthlyYield}%` },
                  { label: "Contract", value: `${p.contractYears}yr` },
                  { label: "Investors", value: investorCount },
                  { label: "Acquired", value: p.acquired },
                ].map(s => (
                  <div key={s.label}>
                    <div style={{ fontSize: 9.5, fontWeight: 600, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.dark, marginTop: 2 }}>{s.value}</div>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}

function AdminDistributions() {
  const allDists = INVESTOR_DATA.flatMap(inv => inv.distributions.map(d => ({ ...d, investor: inv.name, invested: inv.invested })));
  const recentDists = allDists.slice(-30).reverse();
  const totalThisMonth = allDists.filter(d => d.date === allDists[allDists.length - 1]?.date).reduce((s, d) => s + d.amount, 0);
  
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
        <KPICard label="Total Distributed (All Time)" value={euro(TOTAL_DISTRIBUTED)} icon="📤" />
        <KPICard label="Latest Month" value={euro(totalThisMonth)} sub="Across all investors" icon="📅" />
        <KPICard label="Avg. Monthly / Investor" value={euro(Math.round(TOTAL_DISTRIBUTED / INVESTOR_DATA.length / 12))} icon="👤" />
      </div>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.dark }}>Recent Distributions</div>
          <button onClick={() => exportCSV("distributions.csv",
            ["Investor","Month","Amount","Status"],
            recentDists.map(d => [d.investor, d.date, d.amount, d.status])
          )} style={{ padding: "6px 14px", borderRadius: 7, border: `1px solid ${C.border}`, background: C.white, cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: FONT }}>Export CSV</button>
        </div>
        <SortableTable
          columns={[
            { key: "investor", label: "Investor", render: r => <span style={{ fontWeight: 600, color: C.dark }}>{r.investor}</span> },
            { key: "date", label: "Period" },
            { key: "amount", label: "Amount", render: r => <span style={{ fontWeight: 600, color: C.green }}>{euro(r.amount)}</span> },
            { key: "status", label: "Status", render: r => <Badge label={r.status} variant={r.status === "Paid" ? "green" : "orange"} /> },
          ]}
          data={recentDists.slice(0, 20)}
        />
      </Card>
    </>
  );
}

function AdminReports() {
  const reports = [
    { name: "Full Investor Report", desc: "All investors with investment details, distributions, ROI, and future commitments", icon: "📊", action: () => exportCSV("full-investor-report.csv",
      ["Name","Email","Phone","Occupation","City","Invested","Total Distributed","ROI%","Future Commitment","Months Active","Contract Remaining","Properties","Notes"],
      INVESTOR_DATA.map(i => [i.name, i.email, i.phone, i.occupation, i.city, i.invested, i.totalDistributed, i.roiPct.toFixed(1), i.futureCommitment?"Yes":"No", i.monthsActive, i.monthsRemaining, i.propertyIds.length, i.notes])
    )},
    { name: "Distribution History", desc: "Complete distribution log across all investors and months", icon: "💸", action: () => exportCSV("distribution-history.csv",
      ["Investor","Period","Amount","Status"],
      INVESTOR_DATA.flatMap(inv => inv.distributions.map(d => [inv.name, d.date, d.amount, d.status]))
    )},
    { name: "Property Summary", desc: "All properties with type, location, yield, and investor count", icon: "🏡", action: () => exportCSV("property-summary.csv",
      ["Property","Location","Type","Bedrooms","Monthly Yield","Status","Investors"],
      PROPERTIES.map(p => [p.name, p.location, p.type, p.bedrooms, p.monthlyYield + "%", p.status, INVESTOR_DATA.filter(i => i.propertyIds.includes(p.id)).length])
    )},
    { name: "Future Commitments Report", desc: "Investors who have committed vs declined future investments", icon: "🤝", action: () => exportCSV("future-commitments.csv",
      ["Name","Invested","Commitment","Months Remaining","Notes"],
      INVESTOR_DATA.map(i => [i.name, i.invested, i.futureCommitment?"Yes":"No", i.monthsRemaining, i.notes])
    )},
    { name: "ROI Breakdown", desc: "Per-investor ROI analysis with breakeven tracking", icon: "📈", action: () => exportCSV("roi-breakdown.csv",
      ["Investor","Invested","Distributed","ROI%","Breakeven Reached","Months to Breakeven"],
      INVESTOR_DATA.map(i => {
        const be = i.distributions.findIndex((d, idx) => i.distributions.slice(0, idx+1).reduce((s,dd)=>s+dd.amount,0) >= i.invested);
        return [i.name, i.invested, i.totalDistributed, i.roiPct.toFixed(1), i.roiPct >= 100 ? "Yes" : "No", be >= 0 ? be + 1 : "Not yet"];
      })
    )},
    { name: "Contract Expiry Report", desc: "Upcoming contract expirations and renewal status", icon: "📅", action: () => exportCSV("contract-expiry.csv",
      ["Investor","Start Date","Months Active","Months Remaining","Future Commitment"],
      INVESTOR_DATA.map(i => [i.name, i.startDate, i.monthsActive, i.monthsRemaining, i.futureCommitment?"Yes":"No"])
    )},
  ];
  
  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: C.textMid }}>Generate and export reports as CSV. Click any card to download.</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {reports.map((r, i) => (
          <Card key={i} hover style={{ cursor: "pointer" }} onClick={r.action}>
            <span style={{ fontSize: 32, display: "block", marginBottom: 12 }}>{r.icon}</span>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.dark, marginBottom: 4 }}>{r.name}</div>
            <div style={{ fontSize: 12, color: C.textMid, marginBottom: 14, lineHeight: 1.5 }}>{r.desc}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.accent }}>Download CSV →</div>
          </Card>
        ))}
      </div>
    </>
  );
}

function AdminSettings() {
  return (
    <>
      <Card style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.dark, marginBottom: 18, fontFamily: DISPLAY }}>Company Details</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {[
            { label: "Company Name", value: "Sonno Homes Ltd" },
            { label: "Registration", value: "IT-2021-SH-4892" },
            { label: "Primary Email", value: "admin@sonnohomes.com" },
            { label: "Phone", value: "+39 06 1234 5678" },
            { label: "Registered Address", value: "Via Roma 42, Milan" },
            { label: "Country", value: "Italy" },
          ].map(f => (
            <div key={f.label}>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>{f.label}</div>
              <input defaultValue={f.value} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, fontFamily: FONT, color: C.dark, boxSizing: "border-box", background: C.warm }} />
            </div>
          ))}
        </div>
        <button style={{ marginTop: 18, padding: "9px 22px", borderRadius: 9, border: "none", background: C.accent, color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: FONT }}>Save Changes</button>
      </Card>
      <Card style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.dark, marginBottom: 16, fontFamily: DISPLAY }}>Investment Terms</div>
        {[
          { label: "Standard Contract Length", value: "5 years" },
          { label: "Target Breakeven Period", value: "12-15 months" },
          { label: "Lease Extension Policy", value: "Auto-extend at no cost if owner continues" },
          { label: "Termination", value: "Contract ends at 5 years if owner declines renewal" },
        ].map((t, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "11px 0", borderBottom: i < 3 ? `1px solid ${C.border}` : "none" }}>
            <span style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>{t.label}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{t.value}</span>
          </div>
        ))}
      </Card>
      <Card>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.dark, marginBottom: 16, fontFamily: DISPLAY }}>Team Access</div>
        {[
          { name: "Admin", role: "Owner", email: "admin@sonnohomes.com" },
          { name: "Giulia Conti", role: "Investor Relations", email: "giulia@sonnohomes.com" },
          { name: "Marco DeLuca", role: "Finance", email: "marco@sonnohomes.com" },
        ].map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < 2 ? `1px solid ${C.border}` : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: `${C.accent}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: C.accent }}>{m.name.split(" ").map(n=>n[0]).join("")}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{m.name}</div>
                <div style={{ fontSize: 11, color: C.textLight }}>{m.email}</div>
              </div>
            </div>
            <Badge label={m.role} variant="blue" />
          </div>
        ))}
      </Card>
    </>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// INVESTOR PAGES
// ═════════════════════════════════════════════════════════════════════════════

function InvestorOverview({ investor }) {
  const inv = INVESTOR_DATA.find(i => i.id === investor.id) || INVESTOR_DATA[0];
  const recentDists = inv.distributions.slice(-12);
  const bestMonth = [...inv.distributions].sort((a, b) => b.amount - a.amount)[0];
  const breakeven = inv.distributions.findIndex((d, idx) => inv.distributions.slice(0, idx + 1).reduce((s, dd) => s + dd.amount, 0) >= inv.invested);
  
  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: C.dark, fontFamily: DISPLAY }}>Welcome back, {inv.name.split(" ")[0]}</div>
        <div style={{ fontSize: 13, color: C.textMid, marginTop: 4 }}>Here is your investment at a glance</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        <KPICard label="My Investment" value={euro(inv.invested)} icon="💰" />
        <KPICard label="Total Received" value={euro(inv.totalDistributed)} sub={`${pct(inv.roiPct)} of investment returned`} trend="up" icon="📤" />
        <KPICard label="Best Month" value={bestMonth ? euro(bestMonth.amount) : "—"} sub={bestMonth ? bestMonth.date : ""} icon="⭐" />
        <KPICard label="Contract Remaining" value={`${inv.monthsRemaining} months`} sub={`${inv.monthsActive}/60 months completed`} icon="📅" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "5fr 3fr", gap: 16, marginBottom: 24 }}>
        <Card>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.dark, marginBottom: 14 }}>Monthly Distributions (Last 12 Months)</div>
          <MiniBarChart data={recentDists} height={160} color={C.green} />
        </Card>
        <Card>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
            <ProgressRing value={inv.roiPct} max={200} size={140} color={inv.roiPct >= 100 ? C.green : C.accent} />
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>Investment Recovery</div>
            <div style={{ fontSize: 12, color: C.textMid, marginTop: 4 }}>
              {inv.roiPct >= 100
                ? `You have fully recovered your investment! Breakeven reached at month ${breakeven + 1}.`
                : `${pct(100 - inv.roiPct)} remaining to breakeven. On track for 12-15 month recovery.`}
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.dark, marginBottom: 4 }}>Your Properties</div>
        <div style={{ fontSize: 12, color: C.textMid, marginBottom: 16 }}>Properties linked to your investment</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          {inv.propertyIds.map(pid => {
            const p = PROPERTIES.find(pp => pp.id === pid);
            return p ? (
              <div key={p.id} style={{ padding: 16, background: C.warm, borderRadius: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 24 }}>{p.img}</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: C.textMid }}>{p.location}</div>
                  </div>
                </div>
                <Badge label={p.status} variant={p.status === "Active" ? "green" : "orange"} />
              </div>
            ) : null;
          })}
        </div>
      </Card>
    </>
  );
}

function InvestorDistributions({ investor }) {
  const inv = INVESTOR_DATA.find(i => i.id === investor.id) || INVESTOR_DATA[0];
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("desc");

  const distsWithRunning = inv.distributions.map((d, idx) => {
    const cumulative = inv.distributions.slice(0, idx + 1).reduce((s, dd) => s + dd.amount, 0);
    return { ...d, cumulative, pctReturned: (cumulative / inv.invested) * 100, index: idx + 1 };
  });

  const sorted = useMemo(() => {
    if (!sortKey) return [...distsWithRunning].reverse();
    return [...distsWithRunning].sort((a, b) => {
      if (a[sortKey] < b[sortKey]) return sortDir === "asc" ? -1 : 1;
      if (a[sortKey] > b[sortKey]) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [distsWithRunning, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
        <KPICard label="Total Distributions" value={euro(inv.totalDistributed)} icon="💸" />
        <KPICard label="Investment Returned" value={pct(inv.roiPct)} sub={inv.roiPct >= 100 ? "Breakeven reached!" : "On track"} trend="up" icon="📊" />
        <KPICard label="Avg. Monthly" value={euro(Math.round(inv.totalDistributed / inv.monthsActive))} icon="📅" />
      </div>

      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.dark }}>Distribution History</div>
            <div style={{ fontSize: 11, color: C.textMid }}>Click any column header to sort</div>
          </div>
          <button onClick={() => exportCSV(`${inv.name.replace(/ /g, "-")}-distributions.csv`,
            ["#", "Period", "Amount", "Cumulative", "% Returned", "Status"],
            distsWithRunning.map(d => [d.index, d.date, d.amount, d.cumulative, d.pctReturned.toFixed(1) + "%", d.status])
          )} style={{ padding: "6px 14px", borderRadius: 7, border: `1px solid ${C.border}`, background: C.white, cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: FONT }}>Export CSV</button>
        </div>
        <div style={{ overflowX: "auto", maxHeight: 500, overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead style={{ position: "sticky", top: 0, zIndex: 2 }}>
              <tr>
                {[
                  { key: "index", label: "#" },
                  { key: "date", label: "Period" },
                  { key: "amount", label: "Amount" },
                  { key: "cumulative", label: "Cumulative" },
                  { key: "pctReturned", label: "% Returned" },
                  { key: "status", label: "Status" },
                ].map(col => (
                  <th key={col.key} onClick={() => toggleSort(col.key)} style={{
                    padding: "11px 16px", textAlign: "left", fontWeight: 600, color: C.textLight,
                    fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.07em",
                    borderBottom: `2px solid ${C.border}`, background: C.warm,
                    cursor: "pointer", userSelect: "none",
                  }}>
                    {col.label} {sortKey === col.key ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((d, ri) => (
                <tr key={ri} onMouseEnter={e => e.currentTarget.style.background = C.warm} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <td style={{ padding: "10px 16px", borderBottom: `1px solid ${C.border}`, color: C.textLight, fontSize: 12 }}>{d.index}</td>
                  <td style={{ padding: "10px 16px", borderBottom: `1px solid ${C.border}`, fontWeight: 500 }}>{d.date}</td>
                  <td style={{ padding: "10px 16px", borderBottom: `1px solid ${C.border}`, fontWeight: 600, color: C.green }}>{euro(d.amount)}</td>
                  <td style={{ padding: "10px 16px", borderBottom: `1px solid ${C.border}`, fontWeight: 600 }}>{euro(d.cumulative)}</td>
                  <td style={{ padding: "10px 16px", borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 60, height: 5, background: C.border, borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${Math.min(d.pctReturned, 100)}%`, background: d.pctReturned >= 100 ? C.green : C.accent, borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: d.pctReturned >= 100 ? C.green : C.text }}>{pct(d.pctReturned)}</span>
                    </div>
                  </td>
                  <td style={{ padding: "10px 16px", borderBottom: `1px solid ${C.border}` }}><Badge label={d.status} variant={d.status === "Paid" ? "green" : "orange"} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

function InvestorProperties({ investor }) {
  const inv = INVESTOR_DATA.find(i => i.id === investor.id) || INVESTOR_DATA[0];
  return (
    <>
      <div style={{ marginBottom: 20, fontSize: 13, color: C.textMid }}>{inv.propertyIds.length} properties linked to your investment</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
        {inv.propertyIds.map(pid => {
          const p = PROPERTIES.find(pp => pp.id === pid);
          return p ? (
            <Card key={p.id}>
              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ width: 80, height: 80, borderRadius: 12, background: C.warm, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, flexShrink: 0 }}>{p.img}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 17, fontWeight: 700, color: C.dark, fontFamily: DISPLAY }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: C.textMid }}>{p.location}</div>
                    </div>
                    <Badge label={p.status} variant={p.status === "Active" ? "green" : "orange"} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
                    {[
                      { label: "Type", value: p.type },
                      { label: "Bedrooms", value: p.bedrooms },
                      { label: "Yield", value: `~${p.monthlyYield}%/mo` },
                      { label: "Contract", value: `${p.contractYears} years` },
                    ].map(s => (
                      <div key={s.label}>
                        <div style={{ fontSize: 9.5, fontWeight: 600, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.dark, marginTop: 2 }}>{s.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          ) : null;
        })}
      </div>
    </>
  );
}

function InvestorDocuments() {
  const docs = [
    { name: "Investment Agreement", type: "Contract", date: "Mar 2022", size: "2.4 MB" },
    { name: "Monthly Statement - Feb 2026", type: "Statement", date: "Mar 1, 2026", size: "340 KB" },
    { name: "Annual Tax Summary 2025", type: "Tax", date: "Feb 15, 2026", size: "1.8 MB" },
    { name: "Property Portfolio Overview", type: "Report", date: "Jan 10, 2026", size: "5.2 MB" },
    { name: "Distribution Schedule 2026", type: "Schedule", date: "Dec 20, 2025", size: "180 KB" },
    { name: "Lease Extension Policy", type: "Policy", date: "Nov 5, 2025", size: "420 KB" },
  ];
  return (
    <>
      <div style={{ marginBottom: 20, fontSize: 13, color: C.textMid }}>Your documents and statements</div>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        {docs.map((d, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: i < docs.length - 1 ? `1px solid ${C.border}` : "none", cursor: "pointer" }}
            onMouseEnter={e => e.currentTarget.style.background = C.warm}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: C.warm, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>📄</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{d.name}</div>
                <div style={{ fontSize: 11, color: C.textLight }}>{d.date} · {d.size}</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Badge label={d.type} variant="blue" />
              <button style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.white, cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: FONT }}>Download</button>
            </div>
          </div>
        ))}
      </Card>
    </>
  );
}

function InvestorProfile({ investor }) {
  const inv = INVESTOR_DATA.find(i => i.id === investor.id) || INVESTOR_DATA[0];
  return (
    <>
      <Card style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: `linear-gradient(135deg, ${C.accent}30, ${C.accent}10)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 700, color: C.accent }}>
            {inv.name.split(" ").map(n => n[0]).join("")}
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.dark, fontFamily: DISPLAY }}>{inv.name}</div>
            <div style={{ fontSize: 13, color: C.textMid }}>Investor since {new Date(inv.startDate).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {[
            { label: "Full Name", value: inv.name },
            { label: "Email", value: inv.email },
            { label: "Phone", value: inv.phone },
            { label: "Occupation", value: inv.occupation },
            { label: "City", value: inv.city },
            { label: "Member Since", value: new Date(inv.startDate).toLocaleDateString("en-GB", { month: "short", year: "numeric" }) },
          ].map(f => (
            <div key={f.label}>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>{f.label}</div>
              <input defaultValue={f.value} readOnly style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, fontFamily: FONT, color: C.dark, boxSizing: "border-box", background: C.warm }} />
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.dark, fontFamily: DISPLAY, marginBottom: 16 }}>Investment Terms</div>
        {[
          { label: "Contract Duration", value: "5 years" },
          { label: "Monthly Distribution", value: "Variable, based on property performance" },
          { label: "Target Breakeven", value: "12-15 months" },
          { label: "Lease Extension", value: "Auto-extends at no cost if property owner continues" },
          { label: "Contract Termination", value: "Ends at 5 years if owner declines renewal" },
          { label: "Your Status", value: `${inv.monthsActive} months active, ${inv.monthsRemaining} months remaining` },
        ].map((t, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: i < 5 ? `1px solid ${C.border}` : "none" }}>
            <span style={{ fontSize: 13, color: C.textMid }}>{t.label}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.dark, textAlign: "right", maxWidth: "55%" }}>{t.value}</span>
          </div>
        ))}
      </Card>
    </>
  );
}
