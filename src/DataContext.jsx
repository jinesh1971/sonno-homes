import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/react";
import * as api from "./api.js";
import { setTokenGetter } from "./api.js";

const DataContext = createContext(null);

export function useData() {
  return useContext(DataContext);
}

// Map emoji icons to properties by type
const typeIcons = {
  Villa: "🏡", Lakehouse: "☀️", Apartment: "🏛️", Trullo: "🏠",
  Farmhouse: "🍇", Loft: "✨", Masseria: "🏰", Penthouse: "🌇",
};

const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// Generate synthetic distributions for demo (until real distributions are seeded)
export function generateDistributions(investment, startDate, monthsActive) {
  const dists = [];
  const baseMonthly = investment * 0.018;
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

// Transform API property to frontend shape
function transformProperty(p) {
  const acqDate = p.acquisitionDate ? new Date(p.acquisitionDate) : null;
  return {
    id: p.id,
    name: p.name,
    location: p.location,
    type: p.propertyType,
    bedrooms: p.bedrooms,
    contractYears: p.contractYears || 5,
    monthlyYield: Number(p.monthlyYield || 0),
    img: typeIcons[p.propertyType] || "🏠",
    status: p.status === "active" ? "Active" : p.status === "lease_renewal" ? "Lease Renewal" : p.status,
    acquired: acqDate ? `${monthNames[acqDate.getMonth()]} ${acqDate.getFullYear()}` : "N/A",
    propertyValue: Number(p.propertyValue || 0),
    _raw: p,
  };
}

// Transform API user+investments to frontend investor shape
function transformInvestor(user, investments, profile) {
  const inv = investments.filter(i => i.investorId === user.id);
  const totalInvested = inv.reduce((s, i) => s + Number(i.amount), 0);
  const propertyIds = inv.map(i => i.propertyId);
  const investmentMap = {};
  inv.forEach(i => { investmentMap[i.propertyId] = Number(i.amount); });

  const startDate = inv.length > 0
    ? inv.reduce((earliest, i) => new Date(i.startDate) < new Date(earliest) ? i.startDate : earliest, inv[0].startDate)
    : new Date().toISOString();
  const start = new Date(startDate);
  const monthsActive = Math.max(1, Math.round((Date.now() - start.getTime()) / (30.44 * 24 * 60 * 60 * 1000)));

  const dists = generateDistributions(totalInvested, startDate, monthsActive);
  const totalDist = dists.reduce((s, d) => s + d.amount, 0);
  const roiPct = totalInvested > 0 ? (totalDist / totalInvested) * 100 : 0;
  const contractEnd = new Date(start);
  contractEnd.setFullYear(contractEnd.getFullYear() + 5);
  const monthsRemaining = Math.max(0, 60 - monthsActive);

  return {
    id: user.id,
    name: `${(user.firstName || "").charAt(0).toUpperCase() + (user.firstName || "").slice(1)} ${(user.lastName || "").charAt(0).toUpperCase() + (user.lastName || "").slice(1)}`.trim(),
    email: user.email,
    phone: user.phone || "",
    occupation: profile?.occupation || "",
    city: profile?.city ? `${profile.city}${profile.country ? `, ${profile.country}` : ""}` : "",
    invested: totalInvested,
    propertyIds,
    investments: investmentMap,
    startDate,
    monthsActive,
    futureCommitment: profile?.futureCommitment || false,
    notes: profile?.notes || "",
    distributions: dists,
    totalDistributed: totalDist,
    roiPct,
    contractEnd,
    monthsRemaining,
    _raw: user,
  };
}

// Transform API report to frontend shape
function transformReport(r) {
  const totalExpenses = Number(r.totalExpenses || 0);
  const grossRevenue = Number(r.grossRevenue || 0);
  const grossProfit = grossRevenue - totalExpenses;
  const managementFee = Number(r.managementFee || Math.round(grossProfit * 0.20));
  const netProfit = grossProfit - managementFee;
  const nightsBooked = r.nightsBooked || 0;
  const nightsAvailable = r.nightsAvailable || 31;
  const occupancy = nightsAvailable > 0 ? Math.round((nightsBooked / nightsAvailable) * 100) : 0;
  const periodStart = new Date(r.periodStart);
  const period = `${monthNames[periodStart.getMonth()]} ${periodStart.getFullYear()}`;

  return {
    id: r.id,
    propertyId: r.propertyId,
    period,
    periodStart: r.periodStart?.slice?.(0, 10) || new Date(r.periodStart).toISOString().slice(0, 10),
    periodEnd: r.periodEnd?.slice?.(0, 10) || new Date(r.periodEnd).toISOString().slice(0, 10),
    nightsBooked,
    nightsAvailable,
    grossRevenue,
    expenses: (r.expenses || []).map(e => ({ category: e.category, amount: Number(e.amount) })),
    totalExpenses,
    grossProfit,
    managementFee,
    netProfit,
    occupancy,
    status: r.status === "published" ? "Published" : r.status === "draft" ? "Draft" : r.status,
    createdBy: r.creator ? `${(r.creator.firstName || "").charAt(0).toUpperCase() + (r.creator.firstName || "").slice(1)} ${(r.creator.lastName || "").charAt(0).toUpperCase() + (r.creator.lastName || "").slice(1)}`.trim() : "Sonno Admin",
    createdAt: r.createdAt?.slice?.(0, 10) || new Date(r.createdAt).toISOString().slice(0, 10),
    property: r.property,
  };
}

export function DataProvider({ children, userRole }) {
  // Wire Clerk token into the API client (synchronously, before any effects)
  const { getToken } = useAuth();
  setTokenGetter(() => getToken());

  const [properties, setProperties] = useState([]);
  const [investorData, setInvestorData] = useState([]);
  const [reports, setReports] = useState([]);
  const [offerings, setOfferings] = useState([]);
  const [funds, setFunds] = useState([]);
  const [investorDashboard, setInvestorDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isAdmin = userRole === "admin";

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // All roles can fetch offerings; only admin fetches users/investments/reports
      const offeringsPromise = api.fetchOfferings().catch(() => []);
      const fundsPromise = api.fetchFunds().catch(() => []);
      const propsPromise = api.fetchProperties().catch(() => ({ properties: [] }));

      if (isAdmin) {
        const [propRes, userRes, invRes, reportRes, offeringsRes, fundsRes] = await Promise.all([
          propsPromise,
          api.fetchUsers().catch(() => ({ users: [] })),
          api.fetchInvestments().catch(() => ({ investments: [] })),
          api.fetchReports().catch(() => ({ reports: [] })),
          offeringsPromise,
          fundsPromise,
        ]);

        const props = (propRes.properties || []).map(transformProperty);
        setProperties(props);

        const investors = (userRes.users || []).filter(u => u.role === "investor");
        const allInvestments = invRes.investments || [];
        const investorList = investors.map(u =>
          transformInvestor(u, allInvestments, u.investorProfile)
        );
        setInvestorData(investorList);

        const reps = (reportRes.reports || []).map(transformReport);
        setReports(reps);

        setOfferings(Array.isArray(offeringsRes) ? offeringsRes : (offeringsRes || []));
        setFunds(Array.isArray(fundsRes) ? fundsRes : (fundsRes?.data || fundsRes || []));
      } else {
        // Investor or lead — only fetch what they can access
        const isInvestor = userRole === "investor";
        const [propRes, offeringsRes, fundsRes, dashRes, reportRes] = await Promise.all([
          propsPromise,
          offeringsPromise,
          fundsPromise,
          isInvestor ? api.fetchInvestorDashboard().catch(() => null) : Promise.resolve(null),
          isInvestor ? api.fetchReports().catch(() => ({ reports: [] })) : Promise.resolve({ reports: [] }),
        ]);

        const props = (propRes.properties || []).map(transformProperty);
        setProperties(props);
        setOfferings(Array.isArray(offeringsRes) ? offeringsRes : (offeringsRes || []));
        setFunds(Array.isArray(fundsRes) ? fundsRes : (fundsRes?.data || fundsRes || []));

        // Set reports for investor (backend filters to published reports for their properties)
        if (isInvestor) {
          const reps = (reportRes.reports || []).map(transformReport);
          setReports(reps);
        }

        // Build investorData from dashboard response for the logged-in investor
        if (dashRes) {
          setInvestorDashboard(dashRes);
          const alloc = dashRes.allocation || [];
          const totalInv = Number(dashRes.totalInvested || 0);
          const totalDist = Number(dashRes.totalDistributed || 0);
          const propertyIds = alloc.map(a => a.propertyId);
          const investmentMap = {};
          alloc.forEach(a => { investmentMap[a.propertyId] = Number(a.invested); });
          const roiPct = totalInv > 0 ? (totalDist / totalInv) * 100 : 0;
          // Use real data — no fake distributions
          const distributions = []; // Will be populated when admin creates actual distributions
          const contractEnd = new Date();
          contractEnd.setFullYear(contractEnd.getFullYear() + 5);
          setInvestorData([{
            id: "me",
            name: "Investor",
            email: "",
            phone: "",
            occupation: "",
            city: "",
            invested: totalInv,
            propertyIds,
            investments: investmentMap,
            startDate: new Date().toISOString(),
            monthsActive: 0,
            futureCommitment: false,
            notes: "",
            distributions,
            totalDistributed: totalDist,
            roiPct,
            contractEnd,
            monthsRemaining: 60,
          }]);
        }
      }

    } catch (err) {
      console.error("Failed to load data from API:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => { loadData(); }, [loadData]);

  // Computed aggregates
  const totalInvested = investorData.reduce((s, i) => s + i.invested, 0);
  const totalDistributed = investorData.reduce((s, i) => s + i.totalDistributed, 0);
  const avgROI = investorData.length > 0
    ? investorData.reduce((s, i) => s + i.roiPct, 0) / investorData.length
    : 0;

  // Add report handler (creates via API then refreshes)
  const addReport = useCallback(async (reportInput) => {
    try {
      // Create the report
      const created = await api.createReport({
        propertyId: reportInput.propertyId,
        periodStart: reportInput.periodStart,
        periodEnd: reportInput.periodEnd,
        nightsBooked: reportInput.nightsBooked,
        nightsAvailable: reportInput.nightsAvailable,
        grossRevenue: reportInput.grossRevenue,
      });

      // Add expenses
      if (reportInput.expenses?.length > 0) {
        for (const exp of reportInput.expenses) {
          await api.createExpense(created.id, {
            category: exp.category,
            amount: exp.amount,
          });
        }
      }

      // Publish it
      await api.publishReport(created.id);

      // Refresh reports
      const reportRes = await api.fetchReports();
      setReports((reportRes.reports || []).map(transformReport));

      return true;
    } catch (err) {
      console.error("Failed to create report:", err);
      // Fall back to local state
      const totalExpenses = (reportInput.expenses || []).reduce((s, e) => s + e.amount, 0);
      const grossProfit = reportInput.grossRevenue - totalExpenses;
      const managementFee = Math.round(grossProfit * 0.20);
      const netProfit = grossProfit - managementFee;
      const occupancy = reportInput.nightsAvailable > 0
        ? Math.round((reportInput.nightsBooked / reportInput.nightsAvailable) * 100) : 0;
      const periodStart = new Date(reportInput.periodStart);
      const period = `${monthNames[periodStart.getMonth()]} ${periodStart.getFullYear()}`;

      const newReport = {
        ...reportInput,
        id: `local-${Date.now()}`,
        period,
        totalExpenses,
        grossProfit,
        managementFee,
        netProfit,
        occupancy,
        status: "Published",
        createdBy: "Sonno Admin",
        createdAt: new Date().toISOString().split("T")[0],
      };
      setReports(prev => [newReport, ...prev]);
      return true;
    }
  }, []);

  const value = {
    properties,
    investorData,
    reports,
    offerings,
    funds,
    investorDashboard,
    totalInvested,
    totalDistributed,
    avgROI,
    loading,
    error,
    addReport,
    refresh: loadData,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
