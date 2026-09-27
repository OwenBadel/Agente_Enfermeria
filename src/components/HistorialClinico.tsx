import React, { useState } from "react";
import {
  Search,
  Filter,
  FileText,
  Download,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  User,
  Mic,
  Camera,
  Eye,
} from "lucide-react";
import { ClinicalRecord, TriageLevel } from "../types";
import { generateClinicalPdf } from "../utils/pdfGenerator";

interface HistorialClinicoProps {
  records: ClinicalRecord[];
  onOpenPdfModal: (record: ClinicalRecord) => void;
  onNavigateToCapture?: () => void;
}

export const HistorialClinico: React.FC<HistorialClinicoProps> = ({
  records,
  onOpenPdfModal,
  onNavigateToCapture,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>(" ");
  const [mediaFilter, setMediaFilter] = useState<string>("ALL");

  const filteredRecords = records.filter((r) => {
    const q = searchQuery.trim().toLowerCase();
    const name = (r.student?.name || "").toLowerCase();
    const folio = (r.folioNumber || "").toLowerCase();
    const complaint = (r.chiefComplaint || "").toLowerCase();
    const program = (r.student?.academicProgram || "").toLowerCase();

    const matchesSearch =
      !q ||
      name.includes(q) ||
      folio.includes(q) ||
      complaint.includes(q) ||
      program.includes(q);

    const matchesMedia =
      mediaFilter === "ALL" || r.mediaType === mediaFilter;

    return matchesSearch && matchesMedia;
  });

  return (
    <div id="historial-clinico-container" className="flex flex-col gap-6 w-full animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-3xl font-extrabold text-[#191c1d] tracking-tight">
          Historial Clínico Digital
        </h2>
        <p className="text-base text-[#424752]">
          Bitácora completa de evaluaciones de enfermería universitaria con generación de reportes clínicos y PDF.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-[#c2c6d4] shadow-xs p-4 sm:p-5 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-[#727783]" />
          <input
            type="text"
            placeholder="Buscar por nombre, folio, diagnóstico o carrera..."
            value={searchQuery.trim() ? searchQuery : ""}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-[#f8f9fa] border border-[#c2c6d4] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#00478d] text-[#191c1d]"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Media Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-[#424752]">Origen:</span>
            <select
              value={mediaFilter}
              onChange={(e) => setMediaFilter(e.target.value)}
              className="text-xs bg-[#f8f9fa] border border-[#c2c6d4] rounded-lg px-2.5 py-2 text-[#191c1d] font-medium focus:outline-hidden focus:ring-1 focus:ring-[#00478d]"
            >
              <option value="ALL">Todo (Audio / Foto)</option>
              <option value="audio">Dictado de Voz</option>
              <option value="image">Captura de Imagen</option>
            </select>
          </div>
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-2xl border border-[#c2c6d4] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-[#f3f4f5] text-[#424752] font-bold uppercase tracking-wider border-b border-[#c2c6d4]">
              <tr>
                <th className="py-3.5 px-4">Folio / Fecha</th>
                <th className="py-3.5 px-4">Estudiante / Programa</th>
                <th className="py-3.5 px-4">Motivo / Diagnóstico</th>
                <th className="py-3.5 px-4">Origen</th>
                <th className="py-3.5 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f3f4f5]">
              {filteredRecords.length > 0 ? (
                filteredRecords.map((rec) => {
                  const studentName = rec.student?.name || "Sin Información";
                  const programName = rec.student?.academicProgram && rec.student.academicProgram !== "Sin Información"
                    ? `${rec.student.academicProgram}${rec.student.semester ? ` (${rec.student.semester}° Sem)` : ""}`
                    : "Sin Información";
                  const hasAlerts =
                    (rec.student?.allergies && rec.student.allergies.length > 0) ||
                    (rec.detectedAllergies && rec.detectedAllergies.length > 0);

                  return (
                    <tr
                      key={rec.id}
                      className="hover:bg-[#f8f9fa] transition-colors group cursor-pointer"
                      onClick={() => onOpenPdfModal(rec)}
                    >
                      {/* Folio & Date */}
                      <td className="py-4 px-4 font-mono">
                        <span className="font-bold text-[#00478d] block">
                          {rec.folioNumber}
                        </span>
                        <span className="text-[11px] text-[#727783] font-sans">
                          {new Date(rec.timestamp).toLocaleDateString()} •{" "}
                          {new Date(rec.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </td>

                      {/* Student & Program */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[#191c1d]">
                            {studentName}
                          </span>
                          {hasAlerts && (
                            <span className="text-[9px] font-bold bg-[#ffdad6] text-[#ba1a1a] px-1.5 py-0.5 rounded-sm">
                              Alergia
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#727783]">
                          {programName}
                        </p>
                      </td>

                      {/* Chief Complaint & Diagnosis */}
                      <td className="py-4 px-4 max-w-xs">
                        <p className="font-bold text-[#191c1d] truncate">
                          {rec.chiefComplaint || "Consulta de enfermería"}
                        </p>
                        <p className="text-[11px] text-[#006a68] truncate font-medium">
                          {rec.preliminaryDiagnosis || "Evaluación clínica"}
                        </p>
                      </td>

                      {/* AI Model / Origin */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5 text-[11px] text-[#424752]">
                          {rec.mediaType === "image" ? (
                            <>
                              <Camera className="w-3.5 h-3.5 text-[#00478d]" />
                              <span>Imagen</span>
                            </>
                          ) : (
                            <>
                              <Mic className="w-3.5 h-3.5 text-[#006a68]" />
                              <span>Voz</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td
                        className="py-4 px-4 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onOpenPdfModal(rec)}
                            className="p-1.5 rounded-lg bg-[#f3f4f5] hover:bg-[#e7e8e9] text-[#00478d] transition-colors"
                            title="Ver Reporte Clínico"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => generateClinicalPdf(rec, true)}
                            className="p-1.5 rounded-lg bg-[#00478d] hover:bg-[#003870] text-white transition-colors"
                            title="Descargar Reporte PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-[#727783]">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-[#f3f4f5] flex items-center justify-center text-[#727783]">
                        <FileText className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-semibold text-[#191c1d]">
                        {records.length === 0
                          ? "Aún no hay registros clínicos en el historial."
                          : "No se encontraron registros con los filtros seleccionados."}
                      </p>
                      <p className="text-xs text-[#727783] max-w-sm">
                        {records.length === 0
                          ? "Realice su primera captura rápida por audio o imagen médica para registrar la atención de enfermería."
                          : "Intente cambiar el término de búsqueda o restablecer los filtros."}
                      </p>
                      {records.length === 0 && onNavigateToCapture && (
                        <button
                          onClick={onNavigateToCapture}
                          className="mt-2 px-4 py-2 bg-[#006a68] hover:bg-[#00504f] text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
                        >
                          Ir a Captura Rápida
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
