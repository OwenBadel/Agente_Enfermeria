import React, { useState, useEffect } from "react";
import { Sidebar, NavTab } from "./components/Sidebar";
import { Header } from "./components/Header";
import { CapturaRapida } from "./components/CapturaRapida";
import { HistorialClinico } from "./components/HistorialClinico";
import { ClinicalPdfModal } from "./components/ClinicalPdfModal";
import { ClinicalRecord } from "./types";
import { INITIAL_RECORDS } from "./data/mockDatabase";

const STORAGE_KEY = "unicolombo_clinical_records_vault";

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>("captura");
  const [records, setRecords] = useState<ClinicalRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn("Could not load stored clinical records:", e);
    }
    return INITIAL_RECORDS;
  });
  const [activePdfRecord, setActivePdfRecord] = useState<ClinicalRecord | null>(null);

  // Load records from the Obsidian vault (backend) when the app starts.
  // Falls back to localStorage cache / demo data if the server is unreachable.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/vault/records");
        const data = await res.json();
        if (!cancelled && data?.success && Array.isArray(data.records) && data.records.length > 0) {
          setRecords(data.records);
        }
      } catch (e) {
        console.warn("Vault unavailable, using local cached records:", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep a localStorage cache as offline fallback
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch (e) {
      console.warn("Could not save clinical records to storage:", e);
    }
  }, [records]);

  // When a new multimodal record is created
  const handleRecordCreated = (newRecord: ClinicalRecord) => {
    setRecords((prev) => [newRecord, ...prev]);
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#191c1d] flex flex-col md:flex-row font-sans selection:bg-[#79f2f0] selection:text-[#00504f]">
      
      {/* Sidebar for Desktop */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Mobile Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Container */}
      <main
        id="main-app-content"
        className="flex-1 md:ml-64 p-4 sm:p-6 md:p-10 lg:p-12 flex flex-col gap-6 max-w-7xl mx-auto w-full pb-24 md:pb-12"
      >
        {activeTab === "captura" && (
          <CapturaRapida
            onRecordCreated={handleRecordCreated}
            onOpenPdfModal={(rec) => setActivePdfRecord(rec)}
          />
        )}

        {activeTab === "historial" && (
          <HistorialClinico
            records={records}
            onOpenPdfModal={(rec) => setActivePdfRecord(rec)}
            onNavigateToCapture={() => setActiveTab("captura")}
          />
        )}
      </main>

      {/* PDF & Clinical Record Inspection Modal */}
      {activePdfRecord && (
        <ClinicalPdfModal
          record={activePdfRecord}
          onClose={() => setActivePdfRecord(null)}
        />
      )}

    </div>
  );
}
