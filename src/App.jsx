import { useState, useEffect, useMemo, useCallback } from "react";
import { DataProvider, useData } from "./DataContext.jsx";
import { Show, SignInButton, SignUpButton, UserButton, useUser, useAuth } from "@clerk/react";
import * as api from "./api.js";

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

// Dev mode flag — when true, skip Clerk auth entirely
const DEV_MODE = import.meta.env.DEV && !import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

function AuthLandingPage() {
  const [fadeIn, setFadeIn] = useState(false);
  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=Playfair+Display:wght@400;500;600;700&display=swap";
    link.rel = "stylesheet"; document.head.appendChild(link);
    const style = document.createElement("style");
    style.textContent = `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; } html, body, #root { width: 100%; height: 100%; margin: 0; padding: 0; }`;
    document.head.appendChild(style);
    setTimeout(() => setFadeIn(true), 80);
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(135deg, ${C.sidebar} 0%, #2A2420 50%, ${C.sidebar} 100%)`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT, opacity: fadeIn ? 1 : 0, transition: "opacity 0.6s ease" }}>
      <div style={{ textAlign: "center", maxWidth: 440, padding: 40 }}>
        <div style={{ width: 72, height: 72, borderRadius: 18, background: `linear-gradient(135deg, ${C.accent}, ${C.accentSoft})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 700, color: "#fff", margin: "0 auto 24px" }}>S</div>
        <h1 style={{ fontSize: 32, fontWeight: 700, color: "#fff", fontFamily: DISPLAY, marginBottom: 8, letterSpacing: "-0.02em" }}>Sonno Homes</h1>
        <p style={{ fontSize: 14, color: "#8A7E74", marginBottom: 36, lineHeight: 1.6 }}>Italian short-term rental investment platform.<br />Sign in to access your portfolio or explore offerings.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
          <SignInButton mode="modal">
            <button style={{ width: 260, padding: "13px 0", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${C.accent}, ${C.accentSoft})`, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: FONT, boxShadow: `0 4px 20px ${C.accent}50`, transition: "transform 0.2s" }} onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"} onMouseLeave={e => e.currentTarget.style.transform = "none"}>Sign In</button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button style={{ width: 260, padding: "13px 0", borderRadius: 10, border: `1px solid #3A3230`, background: "transparent", color: "#D4A96A", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: FONT, transition: "all 0.2s" }} onMouseEnter={e => { e.currentTarget.style.background = "#2A2420"; }} onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>Create Account</button>
          </SignUpButton>
        </div>
        <p style={{ fontSize: 11, color: "#6B5F55", marginTop: 28 }}>New investors can explore offerings after signing up.</p>
      </div>
    </div>
  );
}

export default function SonnoHomesApp() {
  // In dev mode without Clerk key, skip auth entirely
  if (DEV_MODE) {
    return (
      <DataProvider userRole="admin">
        <SonnoHomes userRole="admin" />
      </DataProvider>
    );
  }

  return (
    <Show when="signed-in" fallback={<AuthLandingPage />}>
      <AuthenticatedApp />
    </Show>
  );
}

function AuthenticatedApp() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const [userRole, setUserRole] = useState(null);
  const [syncing, setSyncing] = useState(true);

  // Sync Clerk user with our backend and determine role
  useEffect(() => {
    if (!isLoaded || !user) return;
    let cancelled = false;
    const syncRole = async () => {
      try {
        if (!cancelled && !userRole) setSyncing(true);
        const token = await getToken();
        const res = await fetch("/api/v1/auth/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            clerkId: user.id,
            email: user.primaryEmailAddress?.emailAddress || "",
            firstName: user.firstName || "",
            lastName: user.lastName || "",
            phone: user.primaryPhoneNumber?.phoneNumber || "",
          }),
        });
        const data = await res.json();
        if (!cancelled) {
          console.log("Auth sync response:", data);
          if (data.success) {
            setUserRole(data.data.role || "lead");
          } else {
            console.warn("Auth sync failed:", data);
            if (!userRole) setUserRole("lead");
          }
        }
      } catch (e) {
        console.error("Auth sync fetch failed:", e);
        if (!cancelled && !userRole) setUserRole("lead");
      } finally {
        if (!cancelled) setSyncing(false);
      }
    };
    syncRole();
    // Re-check role every 30s to pick up promotions
    const interval = setInterval(syncRole, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [isLoaded, user, getToken]);

  if (!isLoaded || syncing) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg, fontFamily: FONT }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: `linear-gradient(135deg, ${C.accent}, ${C.accentSoft})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, color: "#fff", margin: "0 auto 16px" }}>S</div>
          <div style={{ fontSize: 14, color: C.textMid }}>Loading your portal…</div>
        </div>
      </div>
    );
  }

  return (
    <DataProvider userRole={userRole}>
      <SonnoHomes userRole={userRole} clerkUser={user} />
    </DataProvider>
  );
}

function SonnoHomes({ userRole = "admin", clerkUser }) {
  const { properties: PROPERTIES_API, investorData: INVESTOR_DATA_API, reports, offerings: OFFERINGS_API, funds: FUNDS_API, totalInvested: TOTAL_INVESTED_API, totalDistributed: TOTAL_DISTRIBUTED_API, avgROI: AVG_ROI_API, loading, error, addReport, refresh } = useData();

  // Role-based view defaults
  const isAdmin = userRole === "admin";
  const isInvestor = userRole === "investor";
  const isLead = userRole === "lead";

  const defaultView = isAdmin ? "admin" : isInvestor ? "investor" : "lead";
  const defaultPage = isAdmin ? "dashboard" : isInvestor ? "overview" : "offerings";

  const [view, setView] = useState(defaultView);
  const [page, setPage] = useState(defaultPage);
  const [collapsed, setCollapsed] = useState(false);

  // React to role changes (e.g., lead promoted to investor)
  useEffect(() => {
    const newView = isAdmin ? "admin" : isInvestor ? "investor" : "lead";
    const newPage = isAdmin ? "dashboard" : isInvestor ? "overview" : "offerings";
    if (newView !== view) {
      setView(newView);
      setPage(newPage);
    }
  }, [userRole]);
  const [selectedInvestor, setSelectedInvestor] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [selectedOffering, setSelectedOffering] = useState(null);
  const [selectedFund, setSelectedFund] = useState(null);
  const [fadeIn, setFadeIn] = useState(false);
  const investorLogin = useMemo(() => {
    // For admin view, use the investorData array (fetched from admin endpoints)
    if (userRole === "admin") {
      return INVESTOR_DATA_API.find(i => i.name === "Marco Bianchi") || INVESTOR_DATA_API[0] || INVESTOR_DATA[0];
    }
    // For investor view, use the "me" record built from investorDashboard
    const meRecord = INVESTOR_DATA_API.find(i => i.id === "me") || INVESTOR_DATA_API[0];
    if (meRecord) {
      // Enrich with Clerk user info
      const clerkName = clerkUser ? `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() : "";
      const clerkEmail = clerkUser?.primaryEmailAddress?.emailAddress || "";
      return { ...meRecord, name: clerkName || meRecord.name, email: clerkEmail || meRecord.email };
    }
    // Fallback to demo data
    return INVESTOR_DATA[0];
  }, [userRole, INVESTOR_DATA_API, clerkUser]);

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
    { id: "offerings", label: "Offerings", icon: "📋" },
    { id: "distributions", label: "Distributions", icon: "◈" },
    { id: "create-report", label: "Create Report", icon: "✎" },
    { id: "reports", label: "Reports & Export", icon: "▤" },
    { id: "settings", label: "Settings", icon: "⚙" },
  ];
  const investorNav = [
    { id: "overview", label: "My Overview", icon: "◫" },
    { id: "offerings", label: "Offerings", icon: "📋" },
    { id: "distributions", label: "My Distributions", icon: "◈" },
    { id: "properties", label: "My Properties", icon: "⊞" },
    { id: "documents", label: "Documents", icon: "▤" },
    { id: "profile", label: "My Profile", icon: "◉" },
  ];
  const leadNav = [
    { id: "offerings", label: "Offerings", icon: "📋" },
    { id: "profile", label: "My Profile", icon: "◉" },
  ];
  const nav = view === "admin" ? adminNav : view === "investor" ? investorNav : leadNav;

  // Can this user toggle between views?
  const canToggleAdmin = isAdmin;

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

        {/* View Toggle — only for admins */}
        {!collapsed && canToggleAdmin && (
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
            {!DEV_MODE && <UserButton afterSignOutUrl="/" />}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: `linear-gradient(135deg, ${C.accent}40, ${C.accent}15)`, display: "flex", alignItems: "center", justifyContent: "center", color: C.accent, fontWeight: 700, fontSize: 12 }}>
                {view === "admin" ? "SH" : investorLogin.name.split(" ").map(n => n[0]).join("")}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.dark }}>{view === "admin" ? "Sonno Admin" : isLead ? "New Investor" : investorLogin.name}</div>
                <div style={{ fontSize: 10, color: C.textLight }}>{view === "admin" ? "Management" : isLead ? "Explore Offerings" : "Investor Portal"}</div>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div style={{ flex: 1, overflow: "auto", padding: 28, opacity: fadeIn ? 1 : 0, transform: fadeIn ? "translateY(0)" : "translateY(6px)", transition: "all 0.35s ease", minWidth: 0 }}>
          <div style={{ width: "100%", minWidth: 0 }}>
            {(() => { const apiData = { investorData: INVESTOR_DATA_API, properties: PROPERTIES_API, offerings: OFFERINGS_API, funds: FUNDS_API, totalInvested: TOTAL_INVESTED_API, totalDistributed: TOTAL_DISTRIBUTED_API, avgROI: AVG_ROI_API, refresh }; const reps = reports.length > 0 ? reports : INITIAL_REPORTS; return (<>
            {view === "admin" && page === "dashboard" && <><AdminDashboard onViewInvestor={i => { setSelectedInvestor(i); setPage("investors"); }} apiData={apiData} /><FundDashboardSection isAdmin={true} apiData={apiData} /></>}
            {view === "admin" && page === "investors" && <AdminInvestors selected={selectedInvestor} onSelect={setSelectedInvestor} apiData={apiData} />}
            {view === "admin" && page === "properties" && <AdminProperties apiData={apiData} />}
            {view === "admin" && page === "offerings" && <OfferingsListView apiData={apiData} isAdmin={true} onViewDetail={(o) => { setSelectedOffering(o); setPage("offering-detail"); }} onViewFund={(f) => { setSelectedFund(f); setPage("fund-detail"); }} />}
            {view === "admin" && page === "offering-detail" && selectedOffering && <OfferingDetailView offering={selectedOffering} apiData={apiData} isAdmin={true} onBack={() => setPage("offerings")} refresh={refresh} />}
            {view === "admin" && page === "fund-detail" && selectedFund && <FundDetailView fund={selectedFund} apiData={apiData} isAdmin={true} onBack={() => setPage("offerings")} refresh={refresh} />}
            {view === "admin" && page === "distributions" && <AdminDistributions apiData={apiData} />}
            {view === "admin" && page === "create-report" && <AdminCreateReport reports={reps} onAddReport={handleAddReport} apiData={apiData} />}
            {view === "admin" && page === "reports" && <AdminReports apiData={apiData} />}
            {view === "admin" && page === "settings" && <AdminSettings />}
            {view === "investor" && page === "overview" && <><InvestorOverview investor={investorLogin} onViewProperty={p => { setSelectedProperty(p); setPage("properties"); }} reports={reps} apiData={apiData} /><FundDashboardSection isAdmin={false} apiData={apiData} /></>}
            {view === "investor" && page === "offerings" && <OfferingsListView apiData={apiData} isAdmin={false} onViewDetail={(o) => { setSelectedOffering(o); setPage("offering-detail"); }} onViewFund={(f) => { setSelectedFund(f); setPage("fund-detail"); }} />}
            {view === "investor" && page === "offering-detail" && selectedOffering && <OfferingDetailView offering={selectedOffering} apiData={apiData} isAdmin={false} onBack={() => setPage("offerings")} refresh={refresh} />}
            {view === "investor" && page === "fund-detail" && selectedFund && <FundDetailView fund={selectedFund} apiData={apiData} isAdmin={false} onBack={() => setPage("offerings")} refresh={refresh} />}
            {view === "investor" && page === "distributions" && <InvestorDistributions investor={investorLogin} apiData={apiData} />}
            {view === "investor" && page === "properties" && <InvestorProperties investor={investorLogin} selectedProperty={selectedProperty} onSelectProperty={setSelectedProperty} reports={reps} apiData={apiData} />}
            {view === "investor" && page === "documents" && <InvestorDocuments investor={investorLogin} reports={reps} apiData={apiData} />}
            {view === "investor" && page === "profile" && <InvestorProfile investor={investorLogin} apiData={apiData} />}
            {view === "lead" && page === "offerings" && <OfferingsListView apiData={apiData} isAdmin={false} onViewDetail={(o) => { setSelectedOffering(o); setPage("offering-detail"); }} onViewFund={(f) => { setSelectedFund(f); setPage("fund-detail"); }} />}
            {view === "lead" && page === "offering-detail" && selectedOffering && <OfferingDetailView offering={selectedOffering} apiData={apiData} isAdmin={false} onBack={() => setPage("offerings")} refresh={refresh} />}
            {view === "lead" && page === "fund-detail" && selectedFund && <FundDetailView fund={selectedFund} apiData={apiData} isAdmin={false} onBack={() => setPage("offerings")} refresh={refresh} />}
            {view === "lead" && page === "profile" && <LeadProfile />}
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

    const handleDelete = async () => {
      if (!confirm(`Are you sure you want to permanently delete ${inv.name || inv.email}? This will remove ALL their data including investments, distributions, LOIs, and documents. This cannot be undone.`)) return;
      try {
        await api.deleteUser(inv.id);
        apiData?.refresh?.();
        onSelect(null);
      } catch (e) { alert("Failed to delete: " + e.message); }
    };

    return (
      <>
        <button onClick={() => onSelect(null)} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", fontSize: 12, color: C.accent, fontWeight: 600, marginBottom: 18, fontFamily: FONT }}>← Back to All Investors</button>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.dark, fontFamily: DISPLAY }}>{inv.name || inv.email}</div>
          <button onClick={handleDelete} style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${C.red}30`, background: `${C.red}08`, color: C.red, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: FONT }}>Delete Investor</button>
        </div>
        
        {inv._raw?.role === "lead" && (
          <div style={{ marginBottom: 18, padding: 14, background: C.blueBg, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.blue }}>This user is a prospective lead</div>
              <div style={{ fontSize: 11, color: C.textMid, marginTop: 2 }}>Promote them to investor to grant full dashboard access.</div>
            </div>
            <button onClick={async () => { try { await api.promoteUser(inv.id); apiData?.refresh?.(); } catch (e) { alert(e.message); } }} style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: C.blue, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: FONT }}>Promote to Investor</button>
          </div>
        )}
        
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
      <div style={{ marginBottom: 20, fontSize: 13, color: C.textMid }}>{inv.propertyIds.length} properties linked to your investment{inv.propertyIds.length > 0 ? " · Click to view details" : ""}</div>
      {inv.propertyIds.length === 0 ? (
        <Card><div style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🏡</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.dark, marginBottom: 6 }}>No Properties Yet</div>
          <div style={{ fontSize: 13, color: C.textMid, maxWidth: 360, margin: "0 auto" }}>Once your investment is funded through an offering, your properties will appear here with performance details and reports.</div>
        </div></Card>
      ) : (
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
      )}
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

// ═════════════════════════════════════════════════════════════════════════════
// OFFERINGS COMPONENTS
// ═════════════════════════════════════════════════════════════════════════════

function OfferingCard({ offering, onClick }) {
  const prop = offering.property || {};
  const isFunded = offering.status === "funded";
  const typeIcons = { Villa: "🏡", Lakehouse: "☀️", Apartment: "🏛️", Trullo: "🏠", Farmhouse: "🍇", Loft: "✨", Masseria: "🏰", Penthouse: "🌇" };
  const icon = typeIcons[prop.propertyType] || "🏠";

  return (
    <Card hover onClick={onClick} style={{ cursor: "pointer", position: "relative", overflow: "hidden" }}>
      {isFunded && (
        <div style={{ position: "absolute", top: 14, right: -28, background: C.green, color: "#fff", fontSize: 10, fontWeight: 700, padding: "4px 36px", transform: "rotate(45deg)", zIndex: 2, letterSpacing: "0.05em" }}>FUNDED</div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: `linear-gradient(135deg, ${C.accent}25, ${C.accent}08)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>{icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.dark, fontFamily: DISPLAY }}>{offering.title}</div>
          <div style={{ fontSize: 12, color: C.textMid }}>{prop.location || "—"}</div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.06em" }}>Min. Investment</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.dark }}>{euro(Number(offering.minimumInvestment))}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.06em" }}>Target Raise</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.dark }}>{euro(Number(offering.targetRaise))}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.06em" }}>Projected Return</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.green }}>{offering.projectedReturn ? `${offering.projectedReturn}%` : "—"}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.06em" }}>Status</div>
          <Badge label={offering.status} variant={offering.status === "open" ? "default" : offering.status === "funded" ? "green" : "muted"} />
        </div>
      </div>
      {offering.description && (
        <div style={{ fontSize: 12, color: C.textMid, lineHeight: 1.5, borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
          {offering.description.length > 120 ? offering.description.slice(0, 120) + "…" : offering.description}
        </div>
      )}
    </Card>
  );
}

function OfferingsListView({ apiData, isAdmin, onViewDetail, onViewFund }) {
  const offerings = apiData?.offerings || [];
  const funds = apiData?.funds || [];
  const properties = apiData?.properties || [];
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState({ propertyId: "", title: "", description: "", minimumInvestment: "", targetRaise: "", projectedReturn: "" });
  const [error, setError] = useState("");

  // Split offerings by product type
  const propertyOfferings = offerings.filter(o => !o.fundId);
  const fundOfferings = offerings.filter(o => o.fundId);
  const hasFunds = fundOfferings.length > 0 || funds.length > 0;

  // Apply filter
  const filteredOfferings = filter === "fund" ? fundOfferings : filter === "property" ? propertyOfferings : offerings;

  // Build fund lookup for fund offerings
  const fundMap = {};
  funds.forEach(f => { fundMap[f.id] = f; });

  const handleCreate = async () => {
    setError("");
    if (!form.propertyId || !form.title || !form.minimumInvestment || !form.targetRaise) {
      setError("Please fill in all required fields"); return;
    }
    const min = Number(form.minimumInvestment), target = Number(form.targetRaise);
    if (min > target) { setError("Minimum investment cannot exceed target raise"); return; }
    try {
      setCreating(true);
      await api.createOffering({
        propertyId: form.propertyId, title: form.title, description: form.description,
        minimumInvestment: min, targetRaise: target,
        projectedReturn: form.projectedReturn ? Number(form.projectedReturn) : undefined,
      });
      setShowCreate(false);
      setForm({ propertyId: "", title: "", description: "", minimumInvestment: "", targetRaise: "", projectedReturn: "" });
      apiData.refresh?.();
    } catch (e) { setError(e.message); } finally { setCreating(false); }
  };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ fontSize: 13, color: C.textMid }}>{filteredOfferings.length} offering{filteredOfferings.length !== 1 ? "s" : ""}</div>
          {hasFunds && <FundFilterToggle value={filter} onChange={setFilter} />}
        </div>
        {isAdmin && (
          <button onClick={() => setShowCreate(true)} style={{ padding: "9px 20px", borderRadius: 9, border: "none", background: C.accent, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: FONT }}>+ New Offering</button>
        )}
      </div>

      {filteredOfferings.length === 0 ? (
        <Card><div style={{ textAlign: "center", padding: 40, color: C.textMid }}>No offerings available yet.</div></Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 18 }}>
          {filteredOfferings.map(o => {
            if (o.fundId && fundMap[o.fundId]) {
              return <FundCard key={o.id} fund={fundMap[o.fundId]} onClick={() => onViewFund?.(fundMap[o.fundId])} />;
            }
            return <OfferingCard key={o.id} offering={o} onClick={() => onViewDetail(o)} />;
          })}
        </div>
      )}

      {/* Create Offering Modal */}
      {showCreate && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setShowCreate(false)}>
          <div style={{ background: C.white, borderRadius: 16, padding: 28, width: 480, maxHeight: "80vh", overflow: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.dark, fontFamily: DISPLAY, marginBottom: 20 }}>Create New Offering</div>
            {error && <div style={{ background: C.redBg, color: C.red, padding: "8px 12px", borderRadius: 8, fontSize: 12, marginBottom: 14 }}>{error}</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4, display: "block" }}>Property *</label>
                <select value={form.propertyId} onChange={e => setForm(f => ({ ...f, propertyId: e.target.value }))} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, fontFamily: FONT, background: C.white }}>
                  <option value="">Select property…</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.name} — {p.location}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4, display: "block" }}>Title *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Villa Serena Investment Package" style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, fontFamily: FONT, boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4, display: "block" }}>Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, fontFamily: FONT, resize: "vertical", boxSizing: "border-box" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4, display: "block" }}>Min. Investment ($) *</label>
                  <input type="number" value={form.minimumInvestment} onChange={e => setForm(f => ({ ...f, minimumInvestment: e.target.value }))} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, fontFamily: FONT, boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4, display: "block" }}>Target Raise ($) *</label>
                  <input type="number" value={form.targetRaise} onChange={e => setForm(f => ({ ...f, targetRaise: e.target.value }))} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, fontFamily: FONT, boxSizing: "border-box" }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4, display: "block" }}>Projected Return (%)</label>
                <input type="number" step="0.1" value={form.projectedReturn} onChange={e => setForm(f => ({ ...f, projectedReturn: e.target.value }))} placeholder="e.g. 8.5" style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, fontFamily: FONT, boxSizing: "border-box" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
              <button onClick={() => setShowCreate(false)} style={{ padding: "9px 20px", borderRadius: 9, border: `1px solid ${C.border}`, background: "transparent", color: C.textMid, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: FONT }}>Cancel</button>
              <button onClick={handleCreate} disabled={creating} style={{ padding: "9px 20px", borderRadius: 9, border: "none", background: C.accent, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: FONT, opacity: creating ? 0.6 : 1 }}>{creating ? "Creating…" : "Create Offering"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function LOIFormModal({ offering, onClose, onSuccess }) {
  const { user: clerkUser } = useUser();
  const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
  const clerkName = clerkUser ? `${capitalize(clerkUser.firstName || "")} ${capitalize(clerkUser.lastName || "")}`.trim() : "";
  const clerkEmail = clerkUser?.primaryEmailAddress?.emailAddress || "";
  const [form, setForm] = useState({ fullName: clerkName, email: clerkEmail, phone: "", occupation: "", city: "", intendedAmount: "", signatureAcknowledged: false });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setError("");
    if (!form.fullName || !form.email || !form.intendedAmount) { setError("Please fill in all required fields"); return; }
    if (!form.signatureAcknowledged) { setError("You must acknowledge the signature to proceed"); return; }
    const amount = Number(form.intendedAmount);
    if (amount < Number(offering.minimumInvestment)) { setError(`Minimum investment is ${euro(Number(offering.minimumInvestment))}`); return; }
    try {
      setSubmitting(true);
      await api.submitLOI(offering.id, { fullName: form.fullName, email: form.email, phone: form.phone || undefined, occupation: form.occupation || undefined, city: form.city || undefined, intendedAmount: amount, signatureAcknowledged: true });
      setSuccess(true);
      setTimeout(() => { onSuccess?.(); onClose(); }, 2000);
    } catch (e) { setError(e.message); } finally { setSubmitting(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={onClose}>
      <div style={{ background: C.white, borderRadius: 16, padding: 28, width: 460, maxHeight: "80vh", overflow: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 18, fontWeight: 700, color: C.dark, fontFamily: DISPLAY, marginBottom: 6 }}>Letter of Intent</div>
        <div style={{ fontSize: 13, color: C.textMid, marginBottom: 20 }}>{offering.title}</div>

        {success ? (
          <div style={{ textAlign: "center", padding: 30 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.green }}>LOI Submitted Successfully</div>
            <div style={{ fontSize: 13, color: C.textMid, marginTop: 8 }}>Our team will review your submission and be in touch shortly.</div>
          </div>
        ) : (
          <>
            {error && <div style={{ background: C.redBg, color: C.red, padding: "8px 12px", borderRadius: 8, fontSize: 12, marginBottom: 14 }}>{error}</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4, display: "block" }}>Full Name *</label>
                <input value={form.fullName} readOnly style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, fontFamily: FONT, boxSizing: "border-box", background: C.warm, color: C.textMid }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4, display: "block" }}>Email *</label>
                <input type="email" value={form.email} readOnly style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, fontFamily: FONT, boxSizing: "border-box", background: C.warm, color: C.textMid }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4, display: "block" }}>Phone</label>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, fontFamily: FONT, boxSizing: "border-box" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4, display: "block" }}>Occupation</label>
                  <input value={form.occupation} onChange={e => setForm(f => ({ ...f, occupation: e.target.value }))} placeholder="e.g. Architect" style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, fontFamily: FONT, boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4, display: "block" }}>City</label>
                  <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="e.g. New York" style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, fontFamily: FONT, boxSizing: "border-box" }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4, display: "block" }}>Intended Investment ($) *</label>
                <input type="number" value={form.intendedAmount} onChange={e => setForm(f => ({ ...f, intendedAmount: e.target.value }))} placeholder={`Min: ${euro(Number(offering.minimumInvestment))}`} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, fontFamily: FONT, boxSizing: "border-box" }} />
              </div>
              <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", padding: "10px 12px", borderRadius: 8, background: C.warm, border: `1px solid ${form.signatureAcknowledged ? C.accent : C.border}` }}>
                <input type="checkbox" checked={form.signatureAcknowledged} onChange={e => setForm(f => ({ ...f, signatureAcknowledged: e.target.checked }))} style={{ marginTop: 2 }} />
                <span style={{ fontSize: 12, color: C.text, lineHeight: 1.5 }}>I acknowledge that this Letter of Intent represents my genuine interest in investing in this offering. I understand this is not a binding commitment and that Sonno Homes will contact me to finalize the investment.</span>
              </label>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
              <button onClick={onClose} style={{ padding: "9px 20px", borderRadius: 9, border: `1px solid ${C.border}`, background: "transparent", color: C.textMid, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: FONT }}>Cancel</button>
              <button onClick={handleSubmit} disabled={submitting} style={{ padding: "9px 20px", borderRadius: 9, border: "none", background: C.accent, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: FONT, opacity: submitting ? 0.6 : 1 }}>{submitting ? "Submitting…" : "Submit LOI"}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function AdminLOITable({ offeringId }) {
  const [lois, setLois] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.fetchOfferingLOIs(offeringId).then(setLois).catch(() => setLois([])).finally(() => setLoading(false));
  }, [offeringId]);

  const updateStatus = async (loiId, newStatus) => {
    try {
      await api.updateLOIStatus(offeringId, loiId, { status: newStatus });
      setLois(prev => prev.map(l => l.id === loiId ? { ...l, status: newStatus, ...(newStatus === "reviewed" ? { reviewedAt: new Date().toISOString() } : {}), ...(newStatus === "funded" ? { fundedAt: new Date().toISOString() } : {}) } : l));
    } catch (e) { console.error("Failed to update LOI:", e); alert(e.message || "Failed to update status"); }
  };

  const totalAmount = lois.reduce((s, l) => s + Number(l.intendedAmount), 0);

  if (loading) return <div style={{ padding: 20, color: C.textMid, fontSize: 13 }}>Loading LOIs…</div>;

  const statusVariant = (s) => ({ submitted: "default", reviewed: "blue", approved: "orange", funded: "green", rejected: "red", withdrawn: "default" }[s] || "default");

  // Next action buttons per status
  const renderActions = (l) => {
    const btn = (label, status, color = C.accent) => (
      <button onClick={() => updateStatus(l.id, status)} style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${color}30`, background: `${color}10`, color, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: FONT, marginRight: 4 }}>{label}</button>
    );
    const rejectBtn = btn("Reject", "rejected", C.red);

    switch (l.status) {
      case "submitted": return <>{btn("Review", "reviewed")}{rejectBtn}</>;
      case "reviewed": return <>{btn("Approve", "approved")}{rejectBtn}</>;
      case "approved": return <>{btn("Mark Funded", "funded", C.green)}{rejectBtn}</>;
      default: return null;
    }
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 20, marginBottom: 16, padding: "12px 16px", background: C.warm, borderRadius: 10 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.06em" }}>Total LOIs</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.dark }}>{lois.length}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.06em" }}>Total Intended</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.accent }}>{euro(totalAmount)}</div>
        </div>
      </div>

      {lois.length === 0 ? (
        <div style={{ textAlign: "center", padding: 24, color: C.textMid, fontSize: 13 }}>No LOIs submitted yet.</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${C.border}` }}>
                {["Investor", "Email", "Phone", "Amount", "Date", "Status", "Actions"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "8px 10px", fontSize: 10.5, fontWeight: 600, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lois.map(l => (
                <tr key={l.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: "10px" }}>{l.fullName}</td>
                  <td style={{ padding: "10px", color: C.textMid }}>{l.email}</td>
                  <td style={{ padding: "10px", color: C.textMid }}>{l.phone || "—"}</td>
                  <td style={{ padding: "10px", fontWeight: 600 }}>{euro(Number(l.intendedAmount))}</td>
                  <td style={{ padding: "10px", color: C.textMid }}>{new Date(l.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                  <td style={{ padding: "10px" }}><Badge label={l.status} variant={statusVariant(l.status)} /></td>
                  <td style={{ padding: "10px", whiteSpace: "nowrap" }}>{renderActions(l)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function OfferingDetailView({ offering, apiData, isAdmin, onBack, refresh }) {
  const [showLOI, setShowLOI] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const prop = offering.property || {};
  const isFunded = offering.status === "funded";
  const typeIcons = { Villa: "🏡", Lakehouse: "☀️", Apartment: "🏛️", Trullo: "🏠", Farmhouse: "🍇", Loft: "✨", Masseria: "🏰", Penthouse: "🌇" };
  const icon = typeIcons[prop.propertyType] || "🏠";

  const handleStatusChange = async (newStatus) => {
    try {
      setStatusUpdating(true);
      await api.updateOffering(offering.id, { status: newStatus });
      refresh?.();
      onBack();
    } catch (e) { alert(e.message); } finally { setStatusUpdating(false); }
  };

  return (
    <>
      <button onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.textMid, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: FONT, marginBottom: 18 }}>← Back to Offerings</button>

      <Card style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: `linear-gradient(135deg, ${C.accent}25, ${C.accent}08)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>{icon}</div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: C.dark, fontFamily: DISPLAY }}>{offering.title}</div>
              <div style={{ fontSize: 13, color: C.textMid }}>{prop.name} — {prop.location || "—"}</div>
            </div>
          </div>
          <Badge label={offering.status} variant={offering.status === "open" ? "default" : offering.status === "funded" ? "green" : "muted"} />
        </div>

        {offering.description && (
          <div style={{ fontSize: 13, color: C.text, lineHeight: 1.7, marginBottom: 20, padding: "14px 16px", background: C.warm, borderRadius: 10 }}>{offering.description}</div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
          {[
            { label: "Minimum Investment", value: euro(Number(offering.minimumInvestment)) },
            { label: "Target Raise", value: euro(Number(offering.targetRaise)) },
            { label: "Projected Return", value: offering.projectedReturn ? `${offering.projectedReturn}%` : "—" },
            { label: "Property Type", value: prop.propertyType || "—" },
            { label: "Bedrooms", value: prop.bedrooms || "—" },
            { label: "Created", value: new Date(offering.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) },
          ].map(item => (
            <div key={item.label}>
              <div style={{ fontSize: 10, fontWeight: 600, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.dark }}>{item.value}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Actions */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
        {!isAdmin && !isFunded && offering.status === "open" && (
          <button onClick={() => setShowLOI(true)} style={{ padding: "11px 28px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${C.accent}, ${C.accentSoft})`, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: FONT, boxShadow: `0 4px 14px ${C.accent}40` }}>Invest Now</button>
        )}
        {isAdmin && offering.status === "draft" && (
          <button onClick={() => handleStatusChange("open")} disabled={statusUpdating} style={{ padding: "10px 22px", borderRadius: 9, border: "none", background: C.green, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: FONT, opacity: statusUpdating ? 0.6 : 1 }}>Publish (Open)</button>
        )}
        {isAdmin && offering.status === "open" && (
          <button onClick={() => handleStatusChange("funded")} disabled={statusUpdating} style={{ padding: "10px 22px", borderRadius: 9, border: "none", background: C.blue, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: FONT, opacity: statusUpdating ? 0.6 : 1 }}>Mark as Funded</button>
        )}
      </div>

      {/* Admin LOI Table */}
      {isAdmin && (
        <Card>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.dark, fontFamily: DISPLAY, marginBottom: 16 }}>Letters of Intent</div>
          <AdminLOITable offeringId={offering.id} />
        </Card>
      )}

      {/* LOI Modal */}
      {showLOI && <LOIFormModal offering={offering} onClose={() => setShowLOI(false)} onSuccess={() => refresh?.()} />}
    </>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// FUND COMPONENTS
// ═════════════════════════════════════════════════════════════════════════════

function FundCard({ fund, onClick }) {
  const isClosed = fund.status === "closed";
  const propCount = fund.fundProperties?.filter(fp => !fp.removedAt)?.length || fund.propertyCount || 0;
  return (
    <Card hover onClick={onClick} style={{ cursor: "pointer", position: "relative", overflow: "hidden" }}>
      {isClosed && (
        <div style={{ position: "absolute", top: 14, right: -28, background: C.textMid, color: "#fff", fontSize: 10, fontWeight: 700, padding: "4px 36px", transform: "rotate(45deg)", zIndex: 2, letterSpacing: "0.05em" }}>CLOSED</div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: `linear-gradient(135deg, ${C.blue}25, ${C.blue}08)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🏦</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.dark, fontFamily: DISPLAY }}>{fund.name}</div>
            <Badge label="Fund" variant="blue" />
          </div>
          <div style={{ fontSize: 12, color: C.textMid }}>{propCount} propert{propCount !== 1 ? "ies" : "y"} · Q{fund.quarterNumber} {fund.quarterYear}</div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.06em" }}>Min. Investment</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.dark }}>{fund.minimumInvestment ? euro(Number(fund.minimumInvestment)) : "—"}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.06em" }}>Target Raise</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.dark }}>{fund.targetRaise ? euro(Number(fund.targetRaise)) : "—"}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.06em" }}>Projected Return</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.green }}>{fund.projectedReturn ? `${Number(fund.projectedReturn)}%` : "—"}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.06em" }}>Status</div>
          <Badge label={fund.status} variant={fund.status === "open" ? "default" : fund.status === "closed" ? "muted" : "orange"} />
        </div>
      </div>
      {fund.description && (
        <div style={{ fontSize: 12, color: C.textMid, lineHeight: 1.5, borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
          {fund.description.length > 120 ? fund.description.slice(0, 120) + "…" : fund.description}
        </div>
      )}
    </Card>
  );
}

function FundFilterToggle({ value, onChange }) {
  const options = [
    { key: "all", label: "All" },
    { key: "property", label: "Properties" },
    { key: "fund", label: "Funds" },
  ];
  return (
    <div style={{ display: "flex", gap: 4, background: C.warm, borderRadius: 9, padding: 3 }}>
      {options.map(o => (
        <button key={o.key} onClick={() => onChange(o.key)} style={{
          padding: "6px 14px", borderRadius: 7, border: "none", fontSize: 12, fontWeight: 600,
          background: value === o.key ? C.white : "transparent",
          color: value === o.key ? C.dark : C.textMid,
          cursor: "pointer", fontFamily: FONT, transition: "all 0.2s",
          boxShadow: value === o.key ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
        }}>{o.label}</button>
      ))}
    </div>
  );
}

function FundDetailView({ fund: initialFund, apiData, isAdmin, onBack, refresh }) {
  const [fundDetail, setFundDetail] = useState(null);
  const [investments, setInvestments] = useState([]);
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showLOI, setShowLOI] = useState(false);
  const [loading, setLoading] = useState(true);

  const fund = fundDetail || initialFund;
  const fundProps = (fund.fundProperties || []).filter(fp => !fp.removedAt);
  const offering = (apiData?.offerings || []).find(o => o.fundId === fund.id);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [detail, invs, reps] = await Promise.all([
          api.fetchFund(initialFund.id),
          isAdmin ? api.fetchFundInvestments(initialFund.id).catch(() => []) : Promise.resolve([]),
          api.fetchFundReports(initialFund.id).catch(() => []),
        ]);
        setFundDetail(detail);
        setInvestments(Array.isArray(invs) ? invs : (invs?.data || []));
        setReports(Array.isArray(reps) ? reps : (reps?.data || []));
      } catch (e) { console.error("Failed to load fund detail:", e); }
      finally { setLoading(false); }
    })();
  }, [initialFund.id, isAdmin]);

  if (loading) return <Card><div style={{ textAlign: "center", padding: 40, color: C.textMid }}>Loading fund details…</div></Card>;

  return (
    <>
      <button onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.textMid, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: FONT, marginBottom: 18 }}>← Back to Offerings</button>

      <Card style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: `linear-gradient(135deg, ${C.blue}25, ${C.blue}08)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>🏦</div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: C.dark, fontFamily: DISPLAY }}>{fund.name}</div>
                <Badge label="Fund" variant="blue" />
              </div>
              <div style={{ fontSize: 13, color: C.textMid }}>Q{fund.quarterNumber} {fund.quarterYear} · {fundProps.length} propert{fundProps.length !== 1 ? "ies" : "y"}</div>
            </div>
          </div>
          <Badge label={fund.status} variant={fund.status === "open" ? "default" : fund.status === "closed" ? "muted" : "orange"} />
        </div>

        {fund.description && (
          <div style={{ fontSize: 13, color: C.text, lineHeight: 1.7, marginBottom: 20, padding: "14px 16px", background: C.warm, borderRadius: 10 }}>{fund.description}</div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
          {[
            { label: "Minimum Investment", value: fund.minimumInvestment ? euro(Number(fund.minimumInvestment)) : "—" },
            { label: "Target Raise", value: fund.targetRaise ? euro(Number(fund.targetRaise)) : "—" },
            { label: "Projected Return", value: fund.projectedReturn ? `${Number(fund.projectedReturn)}%` : "—" },
            { label: "Properties", value: fundProps.length },
            { label: "Status", value: fund.status },
            { label: "Created", value: new Date(fund.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) },
          ].map(item => (
            <div key={item.label}>
              <div style={{ fontSize: 10, fontWeight: 600, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.dark }}>{item.value}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Constituent Properties */}
      {fundProps.length > 0 && (
        <Card style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.dark, fontFamily: DISPLAY, marginBottom: 16 }}>Constituent Properties</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
            {fundProps.map(fp => {
              const p = fp.property || {};
              const typeIcons = { Villa: "🏡", Lakehouse: "☀️", Apartment: "🏛️", Trullo: "🏠", Farmhouse: "🍇", Loft: "✨", Masseria: "🏰", Penthouse: "🌇" };
              return (
                <div key={fp.id} style={{ padding: 14, background: C.warm, borderRadius: 10, display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 24 }}>{typeIcons[p.propertyType] || "🏠"}</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>{p.name || "Property"}</div>
                    <div style={{ fontSize: 11, color: C.textMid }}>{p.location || "—"} · {p.propertyType || "—"}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Invest Now for investors */}
      {!isAdmin && fund.status === "open" && offering && (
        <div style={{ marginBottom: 18 }}>
          <button onClick={() => setShowLOI(true)} style={{ padding: "11px 28px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${C.accent}, ${C.accentSoft})`, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: FONT, boxShadow: `0 4px 14px ${C.accent}40` }}>Invest Now</button>
        </div>
      )}

      {/* Admin: LOIs for this fund offering */}
      {isAdmin && offering && (
        <Card style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.dark, fontFamily: DISPLAY, marginBottom: 16 }}>Letters of Intent</div>
          <AdminLOITable offeringId={offering.id} />
        </Card>
      )}

      {/* Admin: Fund Investments */}
      {isAdmin && investments.length > 0 && (
        <Card style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.dark, fontFamily: DISPLAY, marginBottom: 16 }}>Fund Investments</div>
          <SortableTable
            columns={[
              { key: "investor", label: "Investor", render: r => { const fn = r.investor?.firstName || ""; const ln = r.investor?.lastName || ""; return <span style={{ fontWeight: 600, color: C.dark }}>{fn.charAt(0).toUpperCase() + fn.slice(1)} {ln.charAt(0).toUpperCase() + ln.slice(1)}</span>; } },
              { key: "amount", label: "Amount", render: r => <span style={{ fontWeight: 600 }}>{euro(Number(r.amount))}</span> },
              { key: "equityShare", label: "Equity Share", render: r => <span style={{ fontWeight: 700, color: C.accent }}>{r.equityShare ? pct(Number(r.equityShare) * 100) : "—"}</span> },
              { key: "startDate", label: "Start Date", render: r => new Date(r.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) },
              { key: "status", label: "Status", render: r => <Badge label={r.status} variant={r.status === "active" ? "green" : "muted"} /> },
            ]}
            data={investments}
          />
        </Card>
      )}

      {/* Admin: Fund Reports */}
      {isAdmin && (
        <Card style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.dark, fontFamily: DISPLAY }}>Fund Reports</div>
          </div>
          {reports.length === 0 ? (
            <div style={{ textAlign: "center", padding: 20, color: C.textMid, fontSize: 13 }}>No fund reports yet.</div>
          ) : (
            <SortableTable
              columns={[
                { key: "quarter", label: "Quarter", render: r => <span style={{ fontWeight: 600, color: C.dark }}>Q{r.quarterNumber} {r.quarterYear}</span> },
                { key: "status", label: "Status", render: r => <Badge label={r.status} variant={r.status === "published" ? "green" : "orange"} /> },
                { key: "publishedAt", label: "Published", render: r => r.publishedAt ? new Date(r.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—" },
              ]}
              data={reports}
              onRowClick={(r) => setSelectedReport(r)}
            />
          )}
        </Card>
      )}

      {/* Fund Report Detail Modal */}
      {selectedReport && <FundReportView report={selectedReport} fundId={fund.id} fund={fund} onClose={() => setSelectedReport(null)} />}

      {/* LOI Modal */}
      {showLOI && offering && <LOIFormModal offering={offering} onClose={() => setShowLOI(false)} onSuccess={() => refresh?.()} />}
    </>
  );
}

function FundReportView({ report, fundId, fund, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const d = await api.fetchFundReport(fundId, report.id);
        setDetail(d);
      } catch (e) { console.error("Failed to load fund report:", e); }
      finally { setLoading(false); }
    })();
  }, [fundId, report.id]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={onClose}>
      <div style={{ background: C.white, borderRadius: 16, padding: 28, width: 680, maxHeight: "85vh", overflow: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.dark, fontFamily: DISPLAY }}>Fund Report — Q{report.quarterNumber} {report.quarterYear}</div>
            <div style={{ fontSize: 12, color: C.textMid, marginTop: 2 }}>{fund?.name || "Fund"}</div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", cursor: "pointer", fontSize: 16, color: C.textMid }}>×</button>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: C.textMid }}>Loading report…</div>
        ) : detail ? (
          <>
            {/* Aggregate Metrics */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
              {[
                { label: "Total Revenue", value: euro(Number(detail.totalGrossRevenue || 0)), color: C.green },
                { label: "Total Expenses", value: euro(Number(detail.totalExpenses || 0)), color: C.red },
                { label: "Avg Occupancy", value: detail.averageOccupancy != null ? pct(Number(detail.averageOccupancy)) : "—", color: C.blue },
                { label: "Nights Booked", value: detail.totalNightsBooked || 0, color: C.accent },
                { label: "Nights Available", value: detail.totalNightsAvailable || 0, color: C.textMid },
                { label: "Management Fee", value: euro(Number(detail.managementFee || 0)), color: C.accent },
              ].map(m => (
                <div key={m.label} style={{ padding: 14, background: C.warm, borderRadius: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{m.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: m.color, fontFamily: DISPLAY }}>{m.value}</div>
                </div>
              ))}
            </div>

            {/* Net Returns */}
            <div style={{ padding: 16, background: `linear-gradient(135deg, ${C.green}10, ${C.green}05)`, borderRadius: 12, marginBottom: 20, border: `1px solid ${C.green}20` }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Net Returns (After Fees)</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: C.green, fontFamily: DISPLAY }}>
                {euro(Number(detail.totalGrossRevenue || 0) - Number(detail.totalExpenses || 0) - Number(detail.managementFee || 0))}
              </div>
            </div>

            {/* Per-Property Breakdown */}
            {detail.propertyBreakdown && detail.propertyBreakdown.length > 0 && (
              <>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.dark, marginBottom: 12 }}>Per-Property Breakdown</div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: `2px solid ${C.border}` }}>
                        {["Property", "Revenue", "Expenses", "Occupancy", "Nights"].map(h => (
                          <th key={h} style={{ textAlign: "left", padding: "8px 10px", fontSize: 10, fontWeight: 600, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {detail.propertyBreakdown.map((pb, i) => (
                        <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                          <td style={{ padding: "10px", fontWeight: 600, color: C.dark }}>{pb.propertyName || "Property"}</td>
                          <td style={{ padding: "10px", fontWeight: 600, color: C.green }}>{euro(Number(pb.grossRevenue || 0))}</td>
                          <td style={{ padding: "10px", color: C.red }}>{euro(Number(pb.totalExpenses || 0))}</td>
                          <td style={{ padding: "10px" }}>{pb.occupancy != null ? pct(Number(pb.occupancy)) : "—"}</td>
                          <td style={{ padding: "10px" }}>{pb.nightsBooked || 0}/{pb.nightsAvailable || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Warnings */}
            {detail.warnings && detail.warnings.length > 0 && (
              <div style={{ marginTop: 16, padding: 12, background: C.redBg, borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.red, marginBottom: 4 }}>Warnings</div>
                {detail.warnings.map((w, i) => <div key={i} style={{ fontSize: 12, color: C.red }}>{w}</div>)}
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign: "center", padding: 40, color: C.textMid }}>Failed to load report details.</div>
        )}
      </div>
    </div>
  );
}

function FundDashboardSection({ isAdmin, apiData }) {
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const data = isAdmin ? await api.fetchAdminDashboard() : await api.fetchInvestorDashboard();
        setMetrics(data);
      } catch (e) { console.error("Failed to load fund dashboard metrics:", e); }
    })();
  }, [isAdmin]);

  if (!metrics) return null;

  if (isAdmin) {
    const fundAUM = Number(metrics.totalFundAUM || 0);
    const activeFunds = Number(metrics.activeFundCount || 0);
    const fundInvestors = Number(metrics.fundInvestorCount || 0);
    if (fundAUM === 0 && activeFunds === 0 && fundInvestors === 0) return null;
    return (
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <span style={{ fontSize: 16 }}>🏦</span>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.dark }}>Fund Overview</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          <KPICard label="Fund AUM" value={euro(fundAUM)} icon="💼" />
          <KPICard label="Active Funds" value={activeFunds.toString()} icon="🏦" />
          <KPICard label="Fund Investors" value={fundInvestors.toString()} icon="👥" />
        </div>
      </div>
    );
  }

  // Investor view
  const fundInvested = Number(metrics.totalFundInvested || 0);
  const fundDist = Number(metrics.totalFundDistributions || 0);
  const fundROI = Number(metrics.fundROI || 0);
  if (fundInvested === 0 && fundDist === 0) return null;
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 16 }}>🏦</span>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.dark }}>Fund Investments</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        <KPICard label="Fund Invested" value={euro(fundInvested)} icon="💼" />
        <KPICard label="Fund Distributions" value={euro(fundDist)} icon="📤" />
        <KPICard label="Fund ROI" value={pct(fundROI)} icon="📊" />
      </div>
    </div>
  );
}

function LeadProfile() {
  return (
    <Card>
      <div style={{ textAlign: "center", padding: 40 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🏠</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: C.dark, fontFamily: DISPLAY, marginBottom: 8 }}>Welcome to Sonno Homes</div>
        <div style={{ fontSize: 13, color: C.textMid, lineHeight: 1.7, maxWidth: 400, margin: "0 auto", marginBottom: 24 }}>
          You currently have access to browse our investment offerings. Once you submit a Letter of Intent and your investment is funded, you will gain full access to your investor dashboard with portfolio tracking, distributions, and reports.
        </div>
        <div style={{ padding: 16, background: C.warm, borderRadius: 12, display: "inline-block" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Your Status</div>
          <Badge label="Prospective Investor" variant="orange" />
        </div>
      </div>
    </Card>
  );
}
