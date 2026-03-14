import { useState, useEffect, useMemo } from "react";
import { DataProvider, useData } from "./DataContext.jsx";

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
  { id: 1, name: "Marco Bianchi", email: "m.bianchi@email.com", phone: "+39 338 123 4567", occupation: "Dentist", city: "London, UK", invested: 25000, propertyIds: [1, 3], investments: { 1: 15000, 3: 10000 }, startDate: "2022-03-01", monthsActive: 48, futureCommitment: true, notes: "Interested in 2 more units" },
  { id: 2, name: "Sarah Thompson", email: "s.thompson@email.com", phone: "+44 7700 900123", occupation: "Solicitor", city: "Manchester, UK", invested: 10000, propertyIds: [2], investments: { 2: 10000 }, startDate: "2022-06-01", monthsActive: 45, futureCommitment: true, notes: "Referred 3 other investors" },
  { id: 3, name: "Ahmed Al-Rashid", email: "a.rashid@email.com", phone: "+971 50 123 4567", occupation: "Business Owner", city: "Dubai, UAE", invested: 50000, propertyIds: [1, 4, 6, 9], investments: { 1: 18000, 4: 8000, 6: 14000, 9: 10000 }, startDate: "2021-09-01", monthsActive: 54, futureCommitment: true, notes: "High net worth, wants luxury only" },
  { id: 4, name: "Elena Rossi", email: "e.rossi@email.com", phone: "+39 333 456 7890", occupation: "Architect", city: "Rome, Italy", invested: 15000, propertyIds: [5], investments: { 5: 15000 }, startDate: "2022-11-01", monthsActive: 40, futureCommitment: false, notes: "" },
  { id: 5, name: "James O'Brien", email: "j.obrien@email.com", phone: "+353 87 123 4567", occupation: "Software Engineer", city: "Dublin, Ireland", invested: 20000, propertyIds: [3, 7], investments: { 3: 12000, 7: 8000 }, startDate: "2021-02-01", monthsActive: 60, futureCommitment: true, notes: "Contract fully matured, wants renewal" },
  { id: 6, name: "Priya Sharma", email: "p.sharma@email.com", phone: "+91 98765 43210", occupation: "Physician", city: "Mumbai, India", invested: 30000, propertyIds: [2, 4, 8], investments: { 2: 10000, 4: 12000, 8: 8000 }, startDate: "2023-01-01", monthsActive: 38, futureCommitment: true, notes: "Exploring 50K package" },
  { id: 7, name: "Hans Muller", email: "h.muller@email.com", phone: "+49 170 123 4567", occupation: "Retired Engineer", city: "Munich, Germany", invested: 40000, propertyIds: [6, 9, 10], investments: { 6: 18000, 9: 12000, 10: 10000 }, startDate: "2022-05-01", monthsActive: 46, futureCommitment: false, notes: "Prefers quarterly reports" },
  { id: 8, name: "Yuki Tanaka", email: "y.tanaka@email.com", phone: "+81 90 1234 5678", occupation: "Financial Analyst", city: "Tokyo, Japan", invested: 10000, propertyIds: [8], investments: { 8: 10000 }, startDate: "2023-08-01", monthsActive: 31, futureCommitment: true, notes: "" },
  { id: 9, name: "Carlos Mendez", email: "c.mendez@email.com", phone: "+34 612 345 678", occupation: "Restaurant Owner", city: "Barcelona, Spain", invested: 35000, propertyIds: [1, 3, 5], investments: { 1: 15000, 3: 12000, 5: 8000 }, startDate: "2022-09-01", monthsActive: 42, futureCommitment: true, notes: "Wants to visit properties" },
  { id: 10, name: "Fatima Hassan", email: "f.hassan@email.com", phone: "+44 7911 123456", occupation: "Pharmacist", city: "Birmingham, UK", invested: 12000, propertyIds: [4], investments: { 4: 12000 }, startDate: "2023-04-01", monthsActive: 35, futureCommitment: false, notes: "May not renew" },
  { id: 11, name: "Luca Ferrari", email: "l.ferrari@email.com", phone: "+39 347 890 1234", occupation: "Lawyer", city: "Milan, Italy", invested: 60000, propertyIds: [2, 6, 7, 9, 10], investments: { 2: 15000, 6: 14000, 7: 8000, 9: 11000, 10: 12000 }, startDate: "2021-05-01", monthsActive: 58, futureCommitment: true, notes: "Top investor, VIP" },
  { id: 12, name: "Emma Williams", email: "e.williams@email.com", phone: "+44 7456 789012", occupation: "Marketing Director", city: "London, UK", invested: 18000, propertyIds: [1, 5], investments: { 1: 11000, 5: 7000 }, startDate: "2023-06-01", monthsActive: 33, futureCommitment: true, notes: "" },
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

// ── DUMMY PERFORMANCE REPORTS ────────────────────────────────────────────────
const INITIAL_REPORTS = [
  { id: 1, propertyId: 1, period: "Jan 2026", periodStart: "2026-01-01", periodEnd: "2026-01-31", nightsBooked: 28, nightsAvailable: 31, grossRevenue: 8400, expenses: [
    { category: "Rent", amount: 1200 }, { category: "Cleaning", amount: 560 }, { category: "Utilities", amount: 320 }, { category: "Maintenance", amount: 180 }, { category: "Platform Fees", amount: 420 },
  ], status: "Published", createdBy: "Sonno Admin", createdAt: "2026-02-03" },
  { id: 2, propertyId: 1, period: "Dec 2025", periodStart: "2025-12-01", periodEnd: "2025-12-31", nightsBooked: 26, nightsAvailable: 31, grossRevenue: 9100, expenses: [
    { category: "Rent", amount: 1200 }, { category: "Cleaning", amount: 520 }, { category: "Utilities", amount: 380 }, { category: "Maintenance", amount: 0 }, { category: "Platform Fees", amount: 455 },
  ], status: "Published", createdBy: "Sonno Admin", createdAt: "2026-01-04" },
  { id: 3, propertyId: 2, period: "Jan 2026", periodStart: "2026-01-01", periodEnd: "2026-01-31", nightsBooked: 22, nightsAvailable: 31, grossRevenue: 6600, expenses: [
    { category: "Rent", amount: 1000 }, { category: "Cleaning", amount: 440 }, { category: "Utilities", amount: 280 }, { category: "Maintenance", amount: 350 },
  ], status: "Published", createdBy: "Sonno Admin", createdAt: "2026-02-05" },
  { id: 4, propertyId: 3, period: "Jan 2026", periodStart: "2026-01-01", periodEnd: "2026-01-31", nightsBooked: 30, nightsAvailable: 31, grossRevenue: 7200, expenses: [
    { category: "Rent", amount: 900 }, { category: "Cleaning", amount: 600 }, { category: "Utilities", amount: 250 }, { category: "Platform Fees", amount: 360 },
  ], status: "Published", createdBy: "Sonno Admin", createdAt: "2026-02-02" },
  { id: 5, propertyId: 5, period: "Jan 2026", periodStart: "2026-01-01", periodEnd: "2026-01-31", nightsBooked: 25, nightsAvailable: 31, grossRevenue: 5000, expenses: [
    { category: "Rent", amount: 800 }, { category: "Cleaning", amount: 375 }, { category: "Utilities", amount: 200 },
  ], status: "Draft", createdBy: "Sonno Admin", createdAt: "2026-02-08" },
  { id: 6, propertyId: 4, period: "Jan 2026", periodStart: "2026-01-01", periodEnd: "2026-01-31", nightsBooked: 27, nightsAvailable: 31, grossRevenue: 5400, expenses: [
    { category: "Rent", amount: 700 }, { category: "Cleaning", amount: 405 }, { category: "Utilities", amount: 190 }, { category: "Maintenance", amount: 120 },
  ], status: "Published", createdBy: "Sonno Admin", createdAt: "2026-02-04" },
].map(r => {
  const totalExpenses = r.expenses.reduce((s, e) => s + e.amount, 0);
  const grossProfit = r.grossRevenue - totalExpenses;
  const managementFee = Math.round(grossProfit * 0.20);
  const netProfit = grossProfit - managementFee;
  const occupancy = Math.round((r.nightsBooked / r.nightsAvailable) * 100);
  return { ...r, totalExpenses, grossProfit, managementFee, netProfit, occupancy };
});

// Mutable reference — will be replaced by React state in SonnoHomes
let PERFORMANCE_REPORTS = [...INITIAL_REPORTS];

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

function MiniBarChart({ data, height = 160, color = C.accent }) {
  const [hovered, setHovered] = useState(null);
  if (!data || data.length === 0) return null;

  const amounts = data.map(d => d.amount);
  const max = Math.max(...amounts);
  const min = Math.min(...amounts);
  const range = max - min || 1;
  const avg = amounts.reduce((s, a) => s + a, 0) / amounts.length;

  // Chart dimensions
  const W = 600, H = height, padTop = 24, padBot = 32, padLeft = 8, padRight = 8;
  const chartW = W - padLeft - padRight;
  const chartH = H - padTop - padBot;

  // Scale helpers — add 10% padding above/below
  const yMin = min - range * 0.15;
  const yMax = max + range * 0.15;
  const scaleY = (v) => padTop + chartH - ((v - yMin) / (yMax - yMin)) * chartH;
  const scaleX = (i) => padLeft + (i / (data.length - 1)) * chartW;

  // Build SVG path points
  const points = data.map((d, i) => ({ x: scaleX(i), y: scaleY(d.amount) }));

  // Smooth curve using cardinal spline
  const lineD = points.map((p, i) => {
    if (i === 0) return `M${p.x},${p.y}`;
    const p0 = points[Math.max(0, i - 2)];
    const p1 = points[i - 1];
    const p2 = p;
    const p3 = points[Math.min(points.length - 1, i + 1)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    return `C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }).join(" ");

  // Area fill path (line + close to bottom)
  const areaD = `${lineD} L${points[points.length - 1].x},${padTop + chartH} L${points[0].x},${padTop + chartH} Z`;

  // Horizontal grid lines (3 lines)
  const gridValues = [yMin + (yMax - yMin) * 0.25, yMin + (yMax - yMin) * 0.5, yMin + (yMax - yMin) * 0.75];

  // Average line Y
  const avgY = scaleY(avg);

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", overflow: "visible" }}>
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={color} stopOpacity="0.6" />
            <stop offset="50%" stopColor={color} stopOpacity="1" />
            <stop offset="100%" stopColor={color} stopOpacity="0.6" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Grid lines */}
        {gridValues.map((v, i) => (
          <line key={i} x1={padLeft} y1={scaleY(v)} x2={W - padRight} y2={scaleY(v)} stroke={C.border} strokeWidth="0.8" strokeDasharray="4,4" opacity="0.5" />
        ))}

        {/* Average line */}
        <line x1={padLeft} y1={avgY} x2={W - padRight} y2={avgY} stroke={C.accent} strokeWidth="1" strokeDasharray="6,4" opacity="0.4" />
        <text x={W - padRight - 2} y={avgY - 5} textAnchor="end" style={{ fontSize: 8, fill: C.accent, opacity: 0.6, fontWeight: 600 }}>avg {euro(Math.round(avg))}</text>

        {/* Area fill */}
        <path d={areaD} fill="url(#areaGrad)" />

        {/* Line */}
        <path d={lineD} fill="none" stroke="url(#lineGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Glow line underneath */}
        <path d={lineD} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" opacity="0.15" filter="url(#glow)" />

        {/* Data points + hover zones */}
        {points.map((p, i) => (
          <g key={i} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} style={{ cursor: "pointer" }}>
            {/* Invisible hit area */}
            <rect x={p.x - chartW / data.length / 2} y={padTop} width={chartW / data.length} height={chartH} fill="transparent" />

            {/* Vertical guide on hover */}
            {hovered === i && (
              <line x1={p.x} y1={padTop} x2={p.x} y2={padTop + chartH} stroke={color} strokeWidth="1" opacity="0.2" strokeDasharray="3,3" />
            )}

            {/* Dot */}
            <circle cx={p.x} cy={p.y} r={hovered === i ? 5 : 3} fill={data[i].status === "Pending" ? C.orange : color} stroke="#fff" strokeWidth="2"
              style={{ transition: "r 0.2s ease, filter 0.2s ease", filter: hovered === i ? `drop-shadow(0 0 4px ${color})` : "none" }} />

            {/* Tooltip on hover */}
            {hovered === i && (
              <g>
                <rect x={p.x - 42} y={p.y - 36} width={84} height={24} rx="6" fill={C.dark} opacity="0.92" />
                <text x={p.x} y={p.y - 20} textAnchor="middle" style={{ fontSize: 10, fill: "#fff", fontWeight: 700 }}>{euro(data[i].amount)}</text>
                <polygon points={`${p.x - 5},${p.y - 12} ${p.x + 5},${p.y - 12} ${p.x},${p.y - 6}`} fill={C.dark} opacity="0.92" />
              </g>
            )}

            {/* Month labels */}
            <text x={p.x} y={H - 8} textAnchor="middle" style={{ fontSize: 9, fill: hovered === i ? C.dark : C.textLight, fontWeight: hovered === i ? 700 : 500 }}>
              {data[i].month}
            </text>
          </g>
        ))}
      </svg>

      {/* Summary strip */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, padding: "8px 12px", background: `${color}08`, borderRadius: 8 }}>
        {[
          { label: "Highest", value: euro(max), color: C.green },
          { label: "Average", value: euro(Math.round(avg)), color: C.accent },
          { label: "Lowest", value: euro(min), color: C.textMid },
          { label: "Total", value: euro(amounts.reduce((s, a) => s + a, 0)), color: C.dark },
        ].map(s => (
          <div key={s.label} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 9, fontWeight: 600, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: s.color, marginTop: 2 }}>{s.value}</div>
          </div>
        ))}
      </div>
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
export default function SonnoHomesApp() {
  return (
    <DataProvider>
      <SonnoHomes />
    </DataProvider>
  );
}

function SonnoHomes() {
  const { properties: PROPERTIES_API, investorData: INVESTOR_DATA_API, reports, totalInvested: TOTAL_INVESTED_API, totalDistributed: TOTAL_DISTRIBUTED_API, avgROI: AVG_ROI_API, loading, error, addReport, refresh } = useData();
  const [view, setView] = useState("admin"); // admin or investor
  const [page, setPage] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [selectedInvestor, setSelectedInvestor] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [fadeIn, setFadeIn] = useState(false);
  const investorLogin = INVESTOR_DATA_API.find(i => i.name === "Marco Bianchi") || INVESTOR_DATA_API[0] || INVESTOR_DATA[0]; // Demo investor: Marco Bianchi

  // Keep module-level references in sync for components that read them directly
  useEffect(() => { PERFORMANCE_REPORTS = reports.length > 0 ? reports : INITIAL_REPORTS; }, [reports]);

  const handleAddReport = async (report) => {
    await addReport(report);
  };

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
    { id: "create-report", label: "Create Report", icon: "📋" },
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
            <button key={item.id} onClick={() => { setPage(item.id); setSelectedInvestor(null); setSelectedProperty(null); }}
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
            {(() => { const apiData = { investorData: INVESTOR_DATA_API, properties: PROPERTIES_API, totalInvested: TOTAL_INVESTED_API, totalDistributed: TOTAL_DISTRIBUTED_API, avgROI: AVG_ROI_API, refresh }; const reps = reports.length > 0 ? reports : INITIAL_REPORTS; return (<>
            {view === "admin" && page === "dashboard" && <AdminDashboard onViewInvestor={i => { setSelectedInvestor(i); setPage("investors"); }} apiData={apiData} />}
            {view === "admin" && page === "investors" && <AdminInvestors selected={selectedInvestor} onSelect={setSelectedInvestor} apiData={apiData} />}
            {view === "admin" && page === "properties" && <AdminProperties apiData={apiData} />}
            {view === "admin" && page === "distributions" && <AdminDistributions apiData={apiData} />}
            {view === "admin" && page === "create-report" && <AdminCreateReport reports={reps} onAddReport={handleAddReport} apiData={apiData} />}
            {view === "admin" && page === "reports" && <AdminReports apiData={apiData} />}
            {view === "admin" && page === "settings" && <AdminSettings />}
            {view === "investor" && page === "overview" && <InvestorOverview investor={investorLogin} onViewProperty={p => { setSelectedProperty(p); setPage("properties"); }} reports={reps} apiData={apiData} />}
            {view === "investor" && page === "distributions" && <InvestorDistributions investor={investorLogin} apiData={apiData} />}
            {view === "investor" && page === "properties" && <InvestorProperties investor={investorLogin} selectedProperty={selectedProperty} onSelectProperty={setSelectedProperty} reports={reps} apiData={apiData} />}
            {view === "investor" && page === "documents" && <InvestorDocuments investor={investorLogin} reports={reps} apiData={apiData} />}
            {view === "investor" && page === "profile" && <InvestorProfile investor={investorLogin} apiData={apiData} />}
            </>); })()}
          </div>
        </div>
      </main>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// ADMIN PAGES
// ═════════════════════════════════════════════════════════════════════════════

function AdminDashboard({ onViewInvestor, apiData }) {
  const investors = apiData?.investorData?.length > 0 ? apiData.investorData : INVESTOR_DATA;
  const totalInv = apiData?.totalInvested || TOTAL_INVESTED;
  const totalDist = apiData?.totalDistributed || TOTAL_DISTRIBUTED;
  const avgRoi = apiData?.avgROI || AVG_ROI;
  const props = apiData?.properties?.length > 0 ? apiData.properties : PROPERTIES;
  const commitYes = investors.filter(i => i.futureCommitment).length;
  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, color: C.textMid }}>Portfolio overview across all investors and properties</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        <KPICard label="Total Invested" value={euro(totalInv)} sub={`+${euro(45000)} this quarter`} trend="up" icon="💰" />
        <KPICard label="Total Distributed" value={euro(totalDist)} sub="Across all investors" icon="📤" />
        <KPICard label="Active Investors" value={investors.length.toString()} sub={`${commitYes} future commitments`} trend="up" icon="👥" />
        <KPICard label="Avg. ROI Returned" value={pct(avgRoi)} sub="Target: breakeven 12-15mo" icon="📊" />
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
              investors.map(i => [i.name, i.invested, i.totalDistributed, i.roiPct.toFixed(1), i.futureCommitment ? "Yes" : "No", i.monthsRemaining])
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
            data={investors}
            onRowClick={onViewInvestor}
          />
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.dark, marginBottom: 14 }}>Future Commitments</div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <ProgressRing value={investors.length > 0 ? commitYes / investors.length * 100 : 0} max={100} size={100} color={C.green} />
              <div>
                <div style={{ fontSize: 24, fontWeight: 700, color: C.dark, fontFamily: DISPLAY }}>{commitYes}/{investors.length}</div>
                <div style={{ fontSize: 11, color: C.textMid }}>investors committed to future investments</div>
              </div>
            </div>
          </Card>
          <Card>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.dark, marginBottom: 14 }}>Contract Timeline</div>
            {investors.slice(0, 5).map(inv => (
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
              { label: "Active", count: props.filter(p => p.status === "Active").length, color: C.green },
              { label: "Lease Renewal", count: props.filter(p => p.status === "Lease Renewal").length, color: C.accent },
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

function AdminInvestors({ selected, onSelect, apiData }) {
  const investors = apiData?.investorData?.length > 0 ? apiData.investorData : INVESTOR_DATA;
  const props = apiData?.properties?.length > 0 ? apiData.properties : PROPERTIES;
  const [showInvForm, setShowInvForm] = useState(false);
  const [invSaving, setInvSaving] = useState(false);
  const [invForm, setInvForm] = useState({ firstName: "", lastName: "", email: "", phone: "", occupation: "", city: "", country: "Italy", notes: "", futureCommitment: false });
  const updateInvField = (f, v) => setInvForm(prev => ({ ...prev, [f]: v }));

  const handleCreateInvestor = async () => {
    if (!invForm.firstName || !invForm.lastName || !invForm.email) return;
    setInvSaving(true);
    try {
      const { createUser } = await import("./api.js");
      await createUser(invForm);
      if (apiData?.refresh) await apiData.refresh();
      setShowInvForm(false);
      setInvForm({ firstName: "", lastName: "", email: "", phone: "", occupation: "", city: "", country: "Italy", notes: "", futureCommitment: false });
    } catch (err) {
      alert("Failed to create investor: " + err.message);
    } finally { setInvSaving(false); }
  };

  if (selected) {
    const inv = investors.find(i => i.id === selected.id) || selected;
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
              const p = props.find(pp => pp.id === pid);
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
        <div style={{ fontSize: 13, color: C.textMid }}>{investors.length} investors · {euro(investors.reduce((s, i) => s + i.invested, 0))} total capital</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => exportCSV("all-investors-full.csv",
            ["Name","Email","Phone","Occupation","City","Invested","Distributed","ROI%","Future Commitment","Months Active","Months Remaining","Notes"],
            investors.map(i => [i.name, i.email, i.phone, i.occupation, i.city, i.invested, i.totalDistributed, i.roiPct.toFixed(1), i.futureCommitment ? "Yes" : "No", i.monthsActive, i.monthsRemaining, i.notes])
          )} style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.white, cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: FONT }}>Export CSV</button>
          <button style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: C.accent, color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: FONT }} onClick={() => setShowInvForm(true)}>+ Add Investor</button>
        </div>
      </div>

      {showInvForm && (() => {
        const iStyle = { width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, fontFamily: FONT, color: C.dark, background: C.warm, boxSizing: "border-box" };
        const lStyle = { fontSize: 10.5, fontWeight: 600, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5, display: "block" };
        return (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }} onClick={() => setShowInvForm(false)}>
            <div onClick={e => e.stopPropagation()} style={{ background: C.white, borderRadius: 16, width: 520, maxHeight: "85vh", overflow: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.18)" }}>
              <div style={{ padding: "20px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: C.dark, fontFamily: DISPLAY }}>Add New Investor</div>
                  <div style={{ fontSize: 12, color: C.textMid, marginTop: 2 }}>Enter investor details below</div>
                </div>
                <button onClick={() => setShowInvForm(false)} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.border}`, background: C.white, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", color: C.textMid }}>×</button>
              </div>
              <div style={{ padding: 24 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div><label style={lStyle}>First Name *</label><input value={invForm.firstName} onChange={e => updateInvField("firstName", e.target.value)} placeholder="e.g. Marco" style={iStyle} /></div>
                  <div><label style={lStyle}>Last Name *</label><input value={invForm.lastName} onChange={e => updateInvField("lastName", e.target.value)} placeholder="e.g. Bianchi" style={iStyle} /></div>
                  <div style={{ gridColumn: "1 / -1" }}><label style={lStyle}>Email *</label><input type="email" value={invForm.email} onChange={e => updateInvField("email", e.target.value)} placeholder="e.g. marco@email.com" style={iStyle} /></div>
                  <div><label style={lStyle}>Phone</label><input value={invForm.phone} onChange={e => updateInvField("phone", e.target.value)} placeholder="+39 333 123 4567" style={iStyle} /></div>
                  <div><label style={lStyle}>Occupation</label><input value={invForm.occupation} onChange={e => updateInvField("occupation", e.target.value)} placeholder="e.g. Architect" style={iStyle} /></div>
                  <div><label style={lStyle}>City</label><input value={invForm.city} onChange={e => updateInvField("city", e.target.value)} placeholder="e.g. Rome" style={iStyle} /></div>
                  <div><label style={lStyle}>Country</label><input value={invForm.country} onChange={e => updateInvField("country", e.target.value)} style={iStyle} /></div>
                  <div style={{ gridColumn: "1 / -1" }}><label style={lStyle}>Notes</label><textarea value={invForm.notes} onChange={e => updateInvField("notes", e.target.value)} placeholder="Optional notes..." rows={2} style={{ ...iStyle, resize: "vertical" }} /></div>
                  <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 8 }}>
                    <input type="checkbox" id="futureCommit" checked={invForm.futureCommitment} onChange={e => updateInvField("futureCommitment", e.target.checked)} style={{ width: 16, height: 16, accentColor: C.accent }} />
                    <label htmlFor="futureCommit" style={{ fontSize: 13, color: C.dark, cursor: "pointer" }}>Future investment commitment</label>
                  </div>
                </div>
              </div>
              <div style={{ padding: "16px 24px", borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button onClick={() => setShowInvForm(false)} style={{ padding: "9px 20px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.white, cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: FONT, color: C.text }}>Cancel</button>
                <button onClick={handleCreateInvestor} disabled={!invForm.firstName || !invForm.lastName || !invForm.email || invSaving} style={{ padding: "9px 24px", borderRadius: 8, border: "none", background: !invForm.firstName || !invForm.lastName || !invForm.email || invSaving ? C.border : C.accent, color: "#fff", cursor: !invForm.firstName || !invForm.lastName || !invForm.email || invSaving ? "default" : "pointer", fontSize: 12, fontWeight: 600, fontFamily: FONT }}>{invSaving ? "Creating..." : "Create Investor"}</button>
              </div>
            </div>
          </div>
        );
      })()}
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
          data={investors}
          onRowClick={onSelect}
        />
      </Card>
    </>
  );
}

function AdminProperties({ apiData }) {
  const props = apiData?.properties?.length > 0 ? apiData.properties : PROPERTIES;
  const investors = apiData?.investorData?.length > 0 ? apiData.investorData : INVESTOR_DATA;
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", propertyType: "Villa", location: "", region: "", bedrooms: 2, propertyValue: "", contractYears: 5, monthlyYield: "", acquisitionDate: "", description: "" });

  const TYPES = ["Villa", "Apartment", "Lakehouse", "Trullo", "Farmhouse", "Loft", "Masseria", "Penthouse"];
  const REGIONS = ["Tuscany", "Puglia", "Lombardy", "Amalfi Coast", "Sicily", "Sardinia", "Umbria", "Veneto", "Lazio", "Liguria"];
  const updateField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    if (!form.name || !form.location) return;
    setSaving(true);
    try {
      const { createProperty } = await import("./api.js");
      await createProperty({
        name: form.name, propertyType: form.propertyType, location: form.location,
        region: form.region || undefined, bedrooms: parseInt(form.bedrooms) || 2,
        propertyValue: parseFloat(form.propertyValue) || undefined,
        contractYears: parseInt(form.contractYears) || 5,
        monthlyYield: parseFloat(form.monthlyYield) || undefined,
        acquisitionDate: form.acquisitionDate || undefined,
        description: form.description || undefined,
      });
      if (apiData?.refresh) await apiData.refresh();
      setShowForm(false);
      setForm({ name: "", propertyType: "Villa", location: "", region: "", bedrooms: 2, propertyValue: "", contractYears: 5, monthlyYield: "", acquisitionDate: "", description: "" });
    } catch (err) {
      alert("Failed to create property: " + err.message);
    } finally { setSaving(false); }
  };

  const inputStyle = { width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, fontFamily: FONT, color: C.dark, background: C.warm, boxSizing: "border-box" };
  const labelStyle = { fontSize: 10.5, fontWeight: 600, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5, display: "block" };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: C.textMid }}>{props.length} properties across Italy</div>
        <button onClick={() => setShowForm(true)} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: C.accent, color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: FONT }}>+ Add Property</button>
      </div>

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }} onClick={() => setShowForm(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: C.white, borderRadius: 16, width: 560, maxHeight: "85vh", overflow: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.18)" }}>
            <div style={{ padding: "20px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.dark, fontFamily: DISPLAY }}>Add New Property</div>
                <div style={{ fontSize: 12, color: C.textMid, marginTop: 2 }}>Enter the property details below</div>
              </div>
              <button onClick={() => setShowForm(false)} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.border}`, background: C.white, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", color: C.textMid }}>×</button>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                <div style={{ gridColumn: "1 / -1" }}><label style={labelStyle}>Property Name *</label><input value={form.name} onChange={e => updateField("name", e.target.value)} placeholder="e.g. Villa Serena" style={inputStyle} /></div>
                <div><label style={labelStyle}>Property Type</label><select value={form.propertyType} onChange={e => updateField("propertyType", e.target.value)} style={{ ...inputStyle, appearance: "auto" }}>{TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                <div><label style={labelStyle}>Region</label><select value={form.region} onChange={e => updateField("region", e.target.value)} style={{ ...inputStyle, appearance: "auto" }}><option value="">Select region...</option>{REGIONS.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                <div style={{ gridColumn: "1 / -1" }}><label style={labelStyle}>Location *</label><input value={form.location} onChange={e => updateField("location", e.target.value)} placeholder="e.g. Lake Como, Lombardy" style={inputStyle} /></div>
                <div><label style={labelStyle}>Bedrooms</label><input type="number" value={form.bedrooms} onChange={e => updateField("bedrooms", e.target.value)} min="0" style={inputStyle} /></div>
                <div><label style={labelStyle}>Property Value (€)</label><input type="number" value={form.propertyValue} onChange={e => updateField("propertyValue", e.target.value)} placeholder="e.g. 450000" style={inputStyle} /></div>
                <div><label style={labelStyle}>Contract (Years)</label><input type="number" value={form.contractYears} onChange={e => updateField("contractYears", e.target.value)} min="1" style={inputStyle} /></div>
                <div><label style={labelStyle}>Monthly Yield (%)</label><input type="number" step="0.1" value={form.monthlyYield} onChange={e => updateField("monthlyYield", e.target.value)} placeholder="e.g. 1.8" style={inputStyle} /></div>
                <div style={{ gridColumn: "1 / -1" }}><label style={labelStyle}>Acquisition Date</label><input type="date" value={form.acquisitionDate} onChange={e => updateField("acquisitionDate", e.target.value)} style={inputStyle} /></div>
                <div style={{ gridColumn: "1 / -1" }}><label style={labelStyle}>Description</label><textarea value={form.description} onChange={e => updateField("description", e.target.value)} placeholder="Optional notes about the property..." rows={3} style={{ ...inputStyle, resize: "vertical" }} /></div>
              </div>
            </div>
            <div style={{ padding: "16px 24px", borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={() => setShowForm(false)} style={{ padding: "9px 20px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.white, cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: FONT, color: C.text }}>Cancel</button>
              <button onClick={handleSubmit} disabled={!form.name || !form.location || saving} style={{ padding: "9px 24px", borderRadius: 8, border: "none", background: !form.name || !form.location || saving ? C.border : C.accent, color: "#fff", cursor: !form.name || !form.location || saving ? "default" : "pointer", fontSize: 12, fontWeight: 600, fontFamily: FONT }}>{saving ? "Creating..." : "Create Property"}</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {props.map(p => {
          const investorCount = investors.filter(i => i.propertyIds.includes(p.id)).length;
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

function AdminDistributions({ apiData }) {
  const investors = apiData?.investorData?.length > 0 ? apiData.investorData : INVESTOR_DATA;
  const totalDist = investors.reduce((s, i) => s + i.totalDistributed, 0);
  const allDists = investors.flatMap(inv => inv.distributions.map(d => ({ ...d, investor: inv.name, invested: inv.invested })));
  const recentDists = allDists.slice(-30).reverse();
  const totalThisMonth = allDists.filter(d => d.date === allDists[allDists.length - 1]?.date).reduce((s, d) => s + d.amount, 0);
  
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
        <KPICard label="Total Distributed (All Time)" value={euro(totalDist)} icon="📤" />
        <KPICard label="Latest Month" value={euro(totalThisMonth)} sub="Across all investors" icon="📅" />
        <KPICard label="Avg. Monthly / Investor" value={euro(investors.length > 0 ? Math.round(totalDist / investors.length / 12) : 0)} icon="👤" />
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

function AdminReports({ apiData }) {
  const investors = apiData?.investorData?.length > 0 ? apiData.investorData : INVESTOR_DATA;
  const props = apiData?.properties?.length > 0 ? apiData.properties : PROPERTIES;
  const reports = [
    { name: "Full Investor Report", desc: "All investors with investment details, distributions, ROI, and future commitments", icon: "📊", action: () => exportCSV("full-investor-report.csv",
      ["Name","Email","Phone","Occupation","City","Invested","Total Distributed","ROI%","Future Commitment","Months Active","Contract Remaining","Properties","Notes"],
      investors.map(i => [i.name, i.email, i.phone, i.occupation, i.city, i.invested, i.totalDistributed, i.roiPct.toFixed(1), i.futureCommitment?"Yes":"No", i.monthsActive, i.monthsRemaining, i.propertyIds.length, i.notes])
    )},
    { name: "Distribution History", desc: "Complete distribution log across all investors and months", icon: "💸", action: () => exportCSV("distribution-history.csv",
      ["Investor","Period","Amount","Status"],
      investors.flatMap(inv => inv.distributions.map(d => [inv.name, d.date, d.amount, d.status]))
    )},
    { name: "Property Summary", desc: "All properties with type, location, yield, and investor count", icon: "🏡", action: () => exportCSV("property-summary.csv",
      ["Property","Location","Type","Bedrooms","Monthly Yield","Status","Investors"],
      props.map(p => [p.name, p.location, p.type, p.bedrooms, p.monthlyYield + "%", p.status, investors.filter(i => i.propertyIds.includes(p.id)).length])
    )},
    { name: "Future Commitments Report", desc: "Investors who have committed vs declined future investments", icon: "🤝", action: () => exportCSV("future-commitments.csv",
      ["Name","Invested","Commitment","Months Remaining","Notes"],
      investors.map(i => [i.name, i.invested, i.futureCommitment?"Yes":"No", i.monthsRemaining, i.notes])
    )},
    { name: "ROI Breakdown", desc: "Per-investor ROI analysis with breakeven tracking", icon: "📈", action: () => exportCSV("roi-breakdown.csv",
      ["Investor","Invested","Distributed","ROI%","Breakeven Reached","Months to Breakeven"],
      investors.map(i => {
        const be = i.distributions.findIndex((d, idx) => i.distributions.slice(0, idx+1).reduce((s,dd)=>s+dd.amount,0) >= i.invested);
        return [i.name, i.invested, i.totalDistributed, i.roiPct.toFixed(1), i.roiPct >= 100 ? "Yes" : "No", be >= 0 ? be + 1 : "Not yet"];
      })
    )},
    { name: "Contract Expiry Report", desc: "Upcoming contract expirations and renewal status", icon: "📅", action: () => exportCSV("contract-expiry.csv",
      ["Investor","Start Date","Months Active","Months Remaining","Future Commitment"],
      investors.map(i => [i.name, i.startDate, i.monthsActive, i.monthsRemaining, i.futureCommitment?"Yes":"No"])
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

// ── ADMIN CREATE REPORT ──────────────────────────────────────────────────────
function AdminCreateReport({ reports, onAddReport, apiData }) {
  const props = apiData?.properties?.length > 0 ? apiData.properties : PROPERTIES;
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [period, setPeriod] = useState("2026-02");
  const [nightsBooked, setNightsBooked] = useState("");
  const [nightsAvailable, setNightsAvailable] = useState("28");
  const [grossRevenue, setGrossRevenue] = useState("");
  const [expenses, setExpenses] = useState([{ category: "Rent", amount: "" }, { category: "Cleaning", amount: "" }, { category: "Utilities", amount: "" }]);
  const [generated, setGenerated] = useState(null);
  const [viewingReport, setViewingReport] = useState(null);

  const addExpense = () => setExpenses([...expenses, { category: "", amount: "" }]);
  const removeExpense = (idx) => setExpenses(expenses.filter((_, i) => i !== idx));
  const updateExpense = (idx, field, val) => setExpenses(expenses.map((e, i) => i === idx ? { ...e, [field]: val } : e));

  const totalExpenses = expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const grossProfit = (parseFloat(grossRevenue) || 0) - totalExpenses;
  const managementFee = Math.round(grossProfit * 0.20);
  const netProfit = grossProfit - managementFee;

  const handleGenerate = () => {
    const prop = props.find(p => p.id === selectedPropertyId);
    if (!prop) return;
    const investors = apiData?.investorData?.length > 0 ? apiData.investorData : INVESTOR_DATA;
    const investorsLinked = investors.filter(i => i.propertyIds.includes(prop.id));
    const periodLabel = new Date(period + "-01").toLocaleDateString("en-US", { month: "short", year: "numeric" });
    const validExpenses = expenses.filter(e => e.category && e.amount).map(e => ({ category: e.category, amount: parseFloat(e.amount) || 0 }));
    const nb = parseInt(nightsBooked) || 0;
    const na = parseInt(nightsAvailable) || 28;
    const gr = parseFloat(grossRevenue) || 0;
    const te = validExpenses.reduce((s, e) => s + e.amount, 0);
    const gp = gr - te;
    const mf = Math.round(gp * 0.20);
    const np = gp - mf;
    const occ = Math.round((nb / na) * 100);

    const newReport = {
      propertyId: prop.id, period: periodLabel, periodStart: period + "-01", periodEnd: period + "-28",
      nightsBooked: nb, nightsAvailable: na, grossRevenue: gr, expenses: validExpenses,
      totalExpenses: te, grossProfit: gp, managementFee: mf, netProfit: np, occupancy: occ,
    };
    onAddReport(newReport);

    setGenerated({
      property: prop, period: periodLabel, nightsBooked: nb, nightsAvailable: na,
      grossRevenue: gr, expenses: validExpenses,
      totalExpenses: te, grossProfit: gp, managementFee: mf, netProfit: np, investorsLinked, occupancy: occ,
    });
  };

  // View existing report detail
  if (viewingReport) {
    const r = viewingReport;
    const prop = props.find(p => p.id === r.propertyId);
    const investors = apiData?.investorData?.length > 0 ? apiData.investorData : INVESTOR_DATA;
    const investorsLinked = investors.filter(i => i.propertyIds.includes(r.propertyId));
    return (
      <>
        <button onClick={() => setViewingReport(null)} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", fontSize: 12, color: C.accent, fontWeight: 600, marginBottom: 18, fontFamily: FONT }}>← Back to Reports</button>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 24 }}>
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.dark, fontFamily: DISPLAY }}>{prop?.name} — {r.period}</div>
                <div style={{ fontSize: 12, color: C.textMid, marginTop: 4 }}>{prop?.location} · Generated {r.createdAt}</div>
              </div>
              <Badge label={r.status} variant={r.status === "Published" ? "green" : "orange"} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
              {[
                { label: "Nights Booked", value: `${r.nightsBooked} / ${r.nightsAvailable}` },
                { label: "Occupancy", value: `${r.occupancy}%` },
                { label: "Gross Revenue", value: euro(r.grossRevenue) },
                { label: "Net to Investors", value: euro(r.netProfit), color: C.green },
              ].map(s => (
                <div key={s.label} style={{ padding: 14, background: C.warm, borderRadius: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{s.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: s.color || C.dark, fontFamily: DISPLAY }}>{s.value}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.dark, marginBottom: 12 }}>Expense Breakdown</div>
            {r.expenses.map((e, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: i < r.expenses.length - 1 ? `1px solid ${C.border}` : "none" }}>
                <span style={{ fontSize: 13, color: C.text }}>{e.category}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{euro(e.amount)}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", marginTop: 8, borderTop: `2px solid ${C.border}` }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>Total Expenses</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.red }}>{euro(r.totalExpenses)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
              <span style={{ fontSize: 13, color: C.text }}>Gross Profit</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{euro(r.grossProfit)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
              <span style={{ fontSize: 13, color: C.text }}>Sonno Homes Fee (20%)</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.accent }}>{euro(r.managementFee)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderTop: `2px solid ${C.border}`, marginTop: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>Net Profit to Investors</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: C.green }}>{euro(r.netProfit)}</span>
            </div>
          </Card>
          <Card>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.dark, marginBottom: 14 }}>Shared With Investors</div>
            <div style={{ fontSize: 11, color: C.textMid, marginBottom: 14 }}>This report is visible to all investors linked to {prop?.name}</div>
            {investorsLinked.map(inv => (
              <div key={inv.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: `${C.accent}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: C.accent }}>{inv.name.split(" ").map(n => n[0]).join("")}</div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.dark }}>{inv.name}</div>
                  <div style={{ fontSize: 10, color: C.textLight }}>{inv.email}</div>
                </div>
              </div>
            ))}
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "5fr 3fr", gap: 16, marginBottom: 24 }}>
        {/* Create Report Form */}
        <Card>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.dark, fontFamily: DISPLAY, marginBottom: 4 }}>Create Performance Report</div>
          <div style={{ fontSize: 12, color: C.textMid, marginBottom: 20 }}>Select a property, enter the period data, and generate a report for investors</div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>Property</div>
              <select value={selectedPropertyId} onChange={e => setSelectedPropertyId(e.target.value)} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, fontFamily: FONT, color: C.dark, background: C.warm, appearance: "auto" }}>
                <option value="">Select property...</option>
                {props.map(p => <option key={p.id} value={p.id}>{p.img} {p.name} — {p.location}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>Reporting Period</div>
              <input type="month" value={period} onChange={e => setPeriod(e.target.value)} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, fontFamily: FONT, color: C.dark, background: C.warm, boxSizing: "border-box" }} />
            </div>
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>Nights Booked</div>
              <input type="number" placeholder="e.g. 28" value={nightsBooked} onChange={e => setNightsBooked(e.target.value)} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, fontFamily: FONT, color: C.dark, background: C.warm, boxSizing: "border-box" }} />
            </div>
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>Nights Available</div>
              <input type="number" placeholder="e.g. 31" value={nightsAvailable} onChange={e => setNightsAvailable(e.target.value)} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, fontFamily: FONT, color: C.dark, background: C.warm, boxSizing: "border-box" }} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>Gross Revenue</div>
              <input type="number" placeholder="e.g. 8400" value={grossRevenue} onChange={e => setGrossRevenue(e.target.value)} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, fontFamily: FONT, color: C.dark, background: C.warm, boxSizing: "border-box" }} />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>Expenses</div>
            <button onClick={addExpense} style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.white, cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: FONT, color: C.accent }}>+ Add Line Item</button>
          </div>
          {expenses.map((exp, i) => (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "center" }}>
              <input placeholder="Category (e.g. Rent)" value={exp.category} onChange={e => updateExpense(i, "category", e.target.value)} style={{ flex: 2, padding: "8px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, fontFamily: FONT, color: C.dark, background: C.warm }} />
              <input type="number" placeholder="Amount" value={exp.amount} onChange={e => updateExpense(i, "amount", e.target.value)} style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, fontFamily: FONT, color: C.dark, background: C.warm }} />
              {expenses.length > 1 && <button onClick={() => removeExpense(i)} style={{ width: 32, height: 32, borderRadius: 6, border: `1px solid ${C.border}`, background: C.white, cursor: "pointer", fontSize: 14, color: C.red, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>×</button>}
            </div>
          ))}

          <button onClick={handleGenerate} disabled={!selectedPropertyId || !grossRevenue} style={{ marginTop: 18, padding: "10px 28px", borderRadius: 9, border: "none", background: !selectedPropertyId || !grossRevenue ? C.border : C.accent, color: "#fff", cursor: !selectedPropertyId || !grossRevenue ? "default" : "pointer", fontSize: 13, fontWeight: 600, fontFamily: FONT }}>
            Generate Report
          </button>
        </Card>

        {/* Live Preview */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.dark, marginBottom: 14 }}>Live Calculation</div>
            {[
              { label: "Gross Revenue", value: euro(parseFloat(grossRevenue) || 0), color: C.dark },
              { label: "Total Expenses", value: euro(totalExpenses), color: C.red },
              { label: "Gross Profit", value: euro(grossProfit), color: grossProfit >= 0 ? C.dark : C.red },
              { label: "Sonno Fee (20%)", value: euro(managementFee), color: C.accent },
              { label: "Net to Investors", value: euro(netProfit), color: C.green },
            ].map((s, i) => (
              <div key={s.label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: i < 4 ? `1px solid ${C.border}` : "none" }}>
                <span style={{ fontSize: 13, color: C.textMid }}>{s.label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: s.color }}>{s.value}</span>
              </div>
            ))}
          </Card>
          {selectedPropertyId && (
            <Card>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.dark, marginBottom: 10 }}>Will Be Shared With</div>
              <div style={{ fontSize: 11, color: C.textMid, marginBottom: 10 }}>Investors linked to this property</div>
              {(apiData?.investorData?.length > 0 ? apiData.investorData : INVESTOR_DATA).filter(i => i.propertyIds.includes(selectedPropertyId)).map(inv => (
                <div key={inv.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
                  <div style={{ width: 26, height: 26, borderRadius: 7, background: `${C.accent}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: C.accent }}>{inv.name.split(" ").map(n => n[0]).join("")}</div>
                  <span style={{ fontSize: 12, fontWeight: 500, color: C.dark }}>{inv.name}</span>
                </div>
              ))}
            </Card>
          )}
        </div>
      </div>

      {/* Generated Report Confirmation */}
      {generated && (
        <Card style={{ borderColor: C.green, background: `${C.greenBg}44` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 24 }}>✅</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.green }}>Report Generated Successfully</div>
              <div style={{ fontSize: 12, color: C.textMid }}>{generated.property.name} — {generated.period} · Shared with {generated.investorsLinked.length} investor(s)</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
            {[
              { label: "Nights", value: `${generated.nightsBooked}/${generated.nightsAvailable}` },
              { label: "Occupancy", value: `${generated.occupancy}%` },
              { label: "Revenue", value: euro(generated.grossRevenue) },
              { label: "Sonno Fee", value: euro(generated.managementFee) },
              { label: "Net to Investors", value: euro(generated.netProfit) },
            ].map(s => (
              <div key={s.label} style={{ padding: 10, background: C.white, borderRadius: 8 }}>
                <div style={{ fontSize: 9.5, fontWeight: 600, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.dark }}>{s.value}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Existing Reports Table */}
      <Card style={{ marginTop: 24, padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.dark }}>Generated Reports</div>
          <div style={{ fontSize: 11, color: C.textMid, marginTop: 2 }}>Click any report to view details</div>
        </div>
        <SortableTable
          columns={[
            { key: "propertyId", label: "Property", render: r => { const p = props.find(pp => pp.id === r.propertyId); return <span style={{ fontWeight: 600, color: C.dark }}>{p?.img} {p?.name}</span>; } },
            { key: "period", label: "Period" },
            { key: "occupancy", label: "Occupancy", render: r => <span style={{ fontWeight: 600 }}>{r.occupancy}%</span> },
            { key: "grossRevenue", label: "Revenue", render: r => <span style={{ fontWeight: 600 }}>{euro(r.grossRevenue)}</span> },
            { key: "netProfit", label: "Net to Investors", render: r => <span style={{ fontWeight: 600, color: C.green }}>{euro(r.netProfit)}</span> },
            { key: "status", label: "Status", render: r => <Badge label={r.status} variant={r.status === "Published" ? "green" : "orange"} /> },
            { key: "createdAt", label: "Created" },
          ]}
          data={reports}
          onRowClick={setViewingReport}
        />
      </Card>
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

function InvestorOverview({ investor, onViewProperty, reports, apiData }) {
  const investors = apiData?.investorData?.length > 0 ? apiData.investorData : INVESTOR_DATA;
  const props = apiData?.properties?.length > 0 ? apiData.properties : PROPERTIES;
  const inv = investors.find(i => i.id === investor.id) || investors[0];
  const recentDists = inv.distributions.slice(-12);
  const bestMonth = [...inv.distributions].sort((a, b) => b.amount - a.amount)[0];
  const breakeven = inv.distributions.findIndex((d, idx) => inv.distributions.slice(0, idx + 1).reduce((s, dd) => s + dd.amount, 0) >= inv.invested);
  const avgMonthly = inv.totalDistributed / inv.monthsActive;
  const remaining = inv.invested - inv.totalDistributed;
  const monthsToRecoup = remaining > 0 ? Math.ceil(remaining / avgMonthly) : 0;

  // Allocation data for pie chart — uses per-property investment amounts
  const allocations = inv.propertyIds.map(pid => {
    const p = props.find(pp => pp.id === pid);
    const amount = inv.investments?.[pid] || (inv.invested / inv.propertyIds.length);
    return { name: p?.name || "Unknown", amount, pct: (amount / inv.invested) * 100, color: p?.img };
  });

  // Per-property ROI — distribute total returns proportionally to investment weight
  const propertyROIs = inv.propertyIds.map((pid, idx) => {
    const p = props.find(pp => pp.id === pid);
    const propInvested = inv.investments?.[pid] || (inv.invested / inv.propertyIds.length);
    const weight = propInvested / inv.invested;
    const propDistributed = inv.totalDistributed * weight;
    // Add slight variance per property so they don't all look identical
    const variance = 0.85 + ((idx * 7 % 10) / 10) * 0.3;
    const roi = ((propDistributed * variance) / propInvested) * 100;
    return { name: p?.name || "Unknown", roi, img: p?.img, invested: propInvested, distributed: Math.round(propDistributed * variance) };
  });

  // Pie chart colors
  const PIE_COLORS = ["#B8854F", "#2E7D4F", "#2563EB", "#C0392B", "#7C3AED", "#D97706", "#059669", "#DC2626", "#4F46E5", "#0891B2"];
  const propCount = inv.propertyIds.length;
  
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
        <KPICard label="Time to Recoup" value={inv.roiPct >= 100 ? "Recouped" : `~${monthsToRecoup} months`} sub={inv.roiPct >= 100 ? `Reached at month ${breakeven + 1}` : `${inv.monthsRemaining}mo left on contract`} trend={inv.roiPct >= 100 ? "up" : undefined} icon="⏱️" />
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

      {/* NEW: Allocation Pie Chart + ROI Tracker */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <Card>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.dark, marginBottom: 16 }}>Investment Allocation</div>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            {/* SVG Pie Chart */}
            <svg viewBox="0 0 120 120" style={{ width: 140, height: 140, flexShrink: 0 }}>
              {allocations.reduce((acc, slice, i) => {
                const startAngle = acc.angle;
                const sliceAngle = (slice.pct / 100) * 360;
                const endAngle = startAngle + sliceAngle;
                const largeArc = sliceAngle > 180 ? 1 : 0;
                const rad = (a) => (a - 90) * (Math.PI / 180);
                const x1 = 60 + 50 * Math.cos(rad(startAngle));
                const y1 = 60 + 50 * Math.sin(rad(startAngle));
                const x2 = 60 + 50 * Math.cos(rad(endAngle));
                const y2 = 60 + 50 * Math.sin(rad(endAngle));
                const path = propCount === 1
                  ? <circle key={i} cx="60" cy="60" r="50" fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  : <path key={i} d={`M60,60 L${x1},${y1} A50,50 0 ${largeArc},1 ${x2},${y2} Z`} fill={PIE_COLORS[i % PIE_COLORS.length]} />;
                acc.paths.push(path);
                acc.angle = endAngle;
                return acc;
              }, { paths: [], angle: 0 }).paths}
              <circle cx="60" cy="60" r="28" fill={C.card} />
              <text x="60" y="57" textAnchor="middle" style={{ fontSize: 11, fontWeight: 700, fill: C.dark }}>{propCount}</text>
              <text x="60" y="70" textAnchor="middle" style={{ fontSize: 7, fill: C.textLight }}>properties</text>
            </svg>
            <div style={{ flex: 1 }}>
              {allocations.map((a, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: i < allocations.length - 1 ? `1px solid ${C.border}` : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: 500, color: C.dark }}>{a.name}</span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.dark }}>{euro(a.amount)}</span>
                    <span style={{ fontSize: 10, color: C.textLight, marginLeft: 6 }}>{pct(a.pct)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.dark, marginBottom: 16 }}>ROI by Property</div>
          {propertyROIs.map((pr, i) => (
            <div key={i} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
                <span style={{ fontWeight: 600, color: C.dark }}>{pr.img} {pr.name}</span>
                <span style={{ fontWeight: 700, color: pr.roi >= 100 ? C.green : C.accent }}>{pct(pr.roi)}</span>
              </div>
              <div style={{ height: 8, background: C.border, borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${Math.min(pr.roi, 200) / 2}%`, background: pr.roi >= 100 ? `linear-gradient(90deg, ${C.green}, #34D399)` : `linear-gradient(90deg, ${C.accent}, ${C.accentSoft})`, borderRadius: 4, transition: "width 0.8s ease" }} />
              </div>
            </div>
          ))}
          <div style={{ marginTop: 16, padding: 12, background: C.warm, borderRadius: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Overall ROI</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: inv.roiPct >= 100 ? C.green : C.accent, fontFamily: DISPLAY }}>{pct(inv.roiPct)}</div>
          </div>
        </Card>
      </div>

      <Card>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.dark, marginBottom: 4 }}>Your Properties</div>
        <div style={{ fontSize: 12, color: C.textMid, marginBottom: 16 }}>Click a property to view distributions and performance reports</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          {inv.propertyIds.map(pid => {
            const p = props.find(pp => pp.id === pid);
            return p ? (
              <div key={p.id} onClick={() => onViewProperty && onViewProperty(p)} style={{ padding: 16, background: C.warm, borderRadius: 12, cursor: "pointer", transition: "all 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "none"; }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 24 }}>{p.img}</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: C.textMid }}>{p.location}</div>
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Badge label={p.status} variant={p.status === "Active" ? "green" : "orange"} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: C.accent }}>View Details →</span>
                </div>
              </div>
            ) : null;
          })}
        </div>
      </Card>
    </>
  );
}

function InvestorDistributions({ investor, apiData }) {
  const investors = apiData?.investorData?.length > 0 ? apiData.investorData : INVESTOR_DATA;
  const inv = investors.find(i => i.id === investor.id) || investors[0];
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

function InvestorProperties({ investor, selectedProperty, onSelectProperty, reports, apiData }) {
  const investors = apiData?.investorData?.length > 0 ? apiData.investorData : INVESTOR_DATA;
  const props = apiData?.properties?.length > 0 ? apiData.properties : PROPERTIES;
  const inv = investors.find(i => i.id === investor.id) || investors[0];

  // Property Detail View
  if (selectedProperty) {
    const p = selectedProperty;
    const propReports = reports.filter(r => r.propertyId === p.id && r.status === "Published");
    const propDists = inv.distributions.slice(-12); // simulated per-property distributions
    const perPropInvested = inv.investments?.[p.id] || (inv.invested / inv.propertyIds.length);
    const weight = perPropInvested / inv.invested;
    const perPropDist = Math.round(inv.totalDistributed * weight);
    const propROI = (perPropDist / perPropInvested) * 100;

    return (
      <>
        <button onClick={() => onSelectProperty(null)} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", fontSize: 12, color: C.accent, fontWeight: 600, marginBottom: 18, fontFamily: FONT }}>← Back to My Properties</button>

        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: C.warm, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 }}>{p.img}</div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.dark, fontFamily: DISPLAY }}>{p.name}</div>
            <div style={{ fontSize: 13, color: C.textMid }}>{p.location} · {p.type} · {p.bedrooms} bedrooms</div>
          </div>
          <Badge label={p.status} variant={p.status === "Active" ? "green" : "orange"} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
          <KPICard label="My Investment" value={euro(perPropInvested)} icon="💰" />
          <KPICard label="Distributed" value={euro(perPropDist)} sub={`${pct(propROI)} ROI`} trend="up" icon="📤" />
          <KPICard label="Occupancy" value={propReports.length > 0 ? `${propReports[0].occupancy}%` : `~${Math.round(85 + Math.random() * 10)}%`} icon="🏠" />
          <KPICard label="Monthly Yield" value={`~${p.monthlyYield}%`} icon="📊" />
        </div>

        {/* Performance Reports */}
        <Card style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.dark, marginBottom: 4 }}>Performance Reports</div>
          <div style={{ fontSize: 12, color: C.textMid, marginBottom: 16 }}>Monthly reports generated by Sonno Homes for this property</div>
          {propReports.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: C.textLight, fontSize: 13 }}>No performance reports available yet for this property.</div>
          ) : (
            propReports.map((r, i) => (
              <div key={r.id} style={{ padding: 16, background: C.warm, borderRadius: 12, marginBottom: i < propReports.length - 1 ? 12 : 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>{r.period}</div>
                    <div style={{ fontSize: 11, color: C.textMid }}>Generated {r.createdAt}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Badge label={r.status} variant="green" />
                    <button style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.white, cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: FONT }}>Download</button>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
                  {[
                    { label: "Nights Booked", value: `${r.nightsBooked}/${r.nightsAvailable}` },
                    { label: "Occupancy", value: `${r.occupancy}%` },
                    { label: "Revenue", value: euro(r.grossRevenue) },
                    { label: "Expenses", value: euro(r.totalExpenses) },
                    { label: "Net to Investors", value: euro(r.netProfit), color: C.green },
                  ].map(s => (
                    <div key={s.label}>
                      <div style={{ fontSize: 9.5, fontWeight: 600, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: s.color || C.dark, marginTop: 2 }}>{s.value}</div>
                    </div>
                  ))}
                </div>
                {/* Expense breakdown expandable */}
                <details style={{ marginTop: 10 }}>
                  <summary style={{ fontSize: 11, fontWeight: 600, color: C.accent, cursor: "pointer" }}>View Expense Breakdown</summary>
                  <div style={{ marginTop: 8, padding: 12, background: C.white, borderRadius: 8 }}>
                    {r.expenses.map((e, ei) => (
                      <div key={ei} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: ei < r.expenses.length - 1 ? `1px solid ${C.border}` : "none" }}>
                        <span style={{ fontSize: 12, color: C.text }}>{e.category}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: C.dark }}>{euro(e.amount)}</span>
                      </div>
                    ))}
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", marginTop: 4, borderTop: `2px solid ${C.border}` }}>
                      <span style={{ fontSize: 12, fontWeight: 700 }}>Sonno Fee (20%)</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: C.accent }}>{euro(r.managementFee)}</span>
                    </div>
                  </div>
                </details>
              </div>
            ))
          )}
        </Card>

        {/* Distribution History for this property */}
        <Card>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.dark, marginBottom: 4 }}>Distribution History</div>
          <div style={{ fontSize: 12, color: C.textMid, marginBottom: 16 }}>Your distributions from this property</div>
          <MiniBarChart data={propDists} height={140} color={C.green} />
        </Card>
      </>
    );
  }

  return (
    <>
      <div style={{ marginBottom: 20, fontSize: 13, color: C.textMid }}>{inv.propertyIds.length} properties linked to your investment · Click to view details</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
        {inv.propertyIds.map(pid => {
          const p = props.find(pp => pp.id === pid);
          const propReports = reports.filter(r => r.propertyId === pid && r.status === "Published");
          const latestOccupancy = propReports.length > 0 ? propReports[0].occupancy : null;
          return p ? (
            <Card key={p.id} hover onClick={() => onSelectProperty(p)} style={{ cursor: "pointer" }}>
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
                      { label: "Occupancy", value: latestOccupancy ? `${latestOccupancy}%` : "—" },
                    ].map(s => (
                      <div key={s.label}>
                        <div style={{ fontSize: 9.5, fontWeight: 600, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.dark, marginTop: 2 }}>{s.value}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 8, fontSize: 11, fontWeight: 600, color: C.accent }}>
                    {propReports.length > 0 ? `${propReports.length} report(s) available` : "No reports yet"} · View Details →
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

function InvestorDocuments({ investor, reports, apiData }) {
  const investors = apiData?.investorData?.length > 0 ? apiData.investorData : INVESTOR_DATA;
  const props = apiData?.properties?.length > 0 ? apiData.properties : PROPERTIES;
  const inv = investors.find(i => i.id === investor?.id) || investors[0];
  // Auto-generated report documents for this investor's properties
  const reportDocs = reports
    .filter(r => r.status === "Published" && inv.propertyIds.includes(r.propertyId))
    .map(r => {
      const p = props.find(pp => pp.id === r.propertyId);
      return { name: `Performance Report — ${p?.name} — ${r.period}`, type: "Performance Report", date: r.createdAt, size: "280 KB", auto: true };
    });

  const docs = [
    { name: "Investment Agreement", type: "Contract", date: "Mar 2022", size: "2.4 MB" },
    { name: "Monthly Statement - Feb 2026", type: "Statement", date: "Mar 1, 2026", size: "340 KB" },
    { name: "Annual Tax Summary 2025", type: "Tax", date: "Feb 15, 2026", size: "1.8 MB" },
    ...reportDocs,
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

function InvestorProfile({ investor, apiData }) {
  const investors = apiData?.investorData?.length > 0 ? apiData.investorData : INVESTOR_DATA;
  const inv = investors.find(i => i.id === investor.id) || investors[0];
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
