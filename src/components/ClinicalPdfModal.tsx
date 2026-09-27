import React, { useState } from "react";
import {
  X,
  Download,
  Printer,
  FileText,
  Code2,
  AlertTriangle,
  Activity,
  ShieldCheck,
  Copy,
  Check,
} from "lucide-react";
import { ClinicalRecord } from "../types";
import { generateClinicalPdf } from "../utils/pdfGenerator";
import { downloadJsonFile } from "../utils/obsidianGenerator";

interface ClinicalPdfModalProps {
  record: ClinicalRecord | null;
  onClose: () => void;
}

export const ClinicalPdfModal: React.FC<ClinicalPdfModalProps> = ({
  record,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<"document" | "json">("document");
  const [copied, setCopied] = useState(false);

  if (!record) return null;

  const handleDownloadPdf = () => {
    generateClinicalPdf(record, true);
  };

  const handlePrint = () => {
    window.print();
  };

  const patientName = record.student?.name && record.student.name.trim() ? record.student.name : "Sin Información";
  const studentCode = record.student?.studentCode && record.student.studentCode !== "N/A" && record.student.studentCode !== "Sin Información"
    ? record.student.studentCode
    : null;
  const program = record.student?.academicProgram && record.student.academicProgram !== "Sin Información"
    ? record.student.academicProgram
    : null;
  const semester = record.student?.semester && record.student.semester > 0
    ? record.student.semester
    : null;
  const allergies = (record.student?.allergies || []).concat(record.detectedAllergies || []);
  const uniqueAllergies = Array.from(new Set(allergies.filter((a) => a && a !== "Ninguna conocida" && a !== "Ninguna")));

  const vitals = record.vitals;
  const hasVitals = vitals && (
    vitals.bloodPressure ||
    vitals.heartRate ||
    vitals.temperature ||
    vitals.oxygenSaturation ||
    vitals.bloodGlucose
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-[#c2c6d4] shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Top Header */}
        <div className="bg-[#00478d] text-white p-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <FileText className="w-6 h-6 text-[#79f2f0]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg leading-tight">
                  Hoja de Valoración Clínica de Enfermería
                </h3>
                <span className="bg-[#79f2f0] text-[#00504f] text-xs font-bold px-2 py-0.5 rounded-full">
                  Folio {record.folioNumber}
                </span>
              </div>
              <p className="text-xs text-[#c8daff] mt-0.5">
                Unicolombo • Paciente: {patientName} • {new Date(record.timestamp).toLocaleDateString()}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* View Switcher Tabs & Actions */}
        <div className="bg-[#f3f4f5] border-b border-[#c2c6d4] px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 bg-[#e1e3e4] p-1 rounded-xl">
            <button
              onClick={() => setActiveTab("document")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === "document"
                  ? "bg-white text-[#00478d] shadow-xs"
                  : "text-[#424752] hover:text-[#191c1d]"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Vista Reporte Clínico (PDF)</span>
            </button>
            <button
              onClick={() => setActiveTab("json")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === "json"
                  ? "bg-white text-[#191c1d] shadow-xs"
                  : "text-[#424752] hover:text-[#191c1d]"
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Datos Estructurados</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => downloadJsonFile(record)}
              className="px-3 py-1.5 bg-white border border-[#c2c6d4] hover:bg-[#e7e8e9] text-[#191c1d] text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
              title="Descargar Registro en JSON"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar JSON</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              className="px-4 py-1.5 bg-[#00478d] hover:bg-[#003870] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-[#79f2f0]" />
              <span>Descargar PDF</span>
            </button>

            <button
              onClick={handlePrint}
              className="p-1.5 text-[#424752] hover:text-[#191c1d] hover:bg-[#e7e8e9] rounded-lg transition-colors"
              title="Imprimir"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 p-6 overflow-y-auto bg-[#f8f9fa]">
          
          {/* TAB 1: Visual Printable Assessment Document */}
          {activeTab === "document" && (
            <div className="bg-white rounded-xl border border-[#c2c6d4] p-8 shadow-sm max-w-3xl mx-auto flex flex-col gap-6 text-[#191c1d]">
              
              {/* Official Header */}
              <div className="flex items-start justify-between border-b border-[#e1e3e4] pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-2xl text-[#00478d] tracking-tight">
                      UNICOLOMBO
                    </span>
                    <span className="text-xs bg-[#e0f7f6] text-[#006a68] font-bold px-2.5 py-0.5 rounded-full">
                      Enfermería Universitaria
                    </span>
                  </div>
                  <p className="text-xs text-[#727783] mt-1 font-medium">
                    Sanitas Escolar • Departamento de Bienestar y Salud Estudiantil
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-mono font-bold text-[#00478d]">
                    FOLIO: {record.folioNumber}
                  </p>
                  <p className="text-xs text-[#727783] mt-0.5">
                    {new Date(record.timestamp).toLocaleDateString()} • {new Date(record.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>

              {/* Student Demographics */}
              <div className="bg-[#f3f4f5] rounded-xl p-4 border border-[#e1e3e4] grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="font-bold text-[#424752]">Estudiante / Paciente:</span>
                  <p className="font-semibold text-sm text-[#191c1d] mt-0.5">
                    {patientName}
                  </p>
                </div>
                {studentCode && (
                  <div>
                    <span className="font-bold text-[#424752]">Código Estudiantil:</span>
                    <p className="font-mono text-sm text-[#191c1d] mt-0.5">
                      {studentCode}
                    </p>
                  </div>
                )}
                {program && (
                  <div>
                    <span className="font-bold text-[#424752]">Programa Académico:</span>
                    <p className="font-medium text-[#191c1d] mt-0.5">
                      {program} {record.student?.programType ? `(${record.student.programType})` : ""}
                    </p>
                  </div>
                )}
                {semester && (
                  <div>
                    <span className="font-bold text-[#424752]">Semestre:</span>
                    <p className="font-medium text-[#191c1d] mt-0.5">
                      {semester}° Semestre
                    </p>
                  </div>
                )}

                {uniqueAllergies.length > 0 && (
                  <div className="sm:col-span-2 pt-2 border-t border-[#e1e3e4] flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-[#ba1a1a]" />
                    <span className="font-bold text-[#ba1a1a]">Alergias Registradas:</span>
                    <span className="font-semibold text-[#ba1a1a]">
                      {uniqueAllergies.join(", ")}
                    </span>
                  </div>
                )}
              </div>

              {/* Vital Signs Grid (Only if vitals exist) */}
              {hasVitals && vitals && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#00478d] mb-2.5 flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-[#006a68]" />
                    Signos Vitales Registrados
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center">
                    {vitals.bloodPressure && (
                      <div className="p-3 bg-[#f8f9fa] rounded-xl border border-[#e1e3e4]">
                        <span className="text-[10px] uppercase font-bold text-[#727783]">Tensión Art.</span>
                        <p className="font-bold text-sm text-[#191c1d] mt-0.5 font-mono">{vitals.bloodPressure}</p>
                      </div>
                    )}
                    {vitals.heartRate && (
                      <div className="p-3 bg-[#f8f9fa] rounded-xl border border-[#e1e3e4]">
                        <span className="text-[10px] uppercase font-bold text-[#727783]">Frec. Cardíaca</span>
                        <p className="font-bold text-sm text-[#191c1d] mt-0.5 font-mono">{vitals.heartRate} bpm</p>
                      </div>
                    )}
                    {vitals.temperature && (
                      <div className="p-3 bg-[#f8f9fa] rounded-xl border border-[#e1e3e4]">
                        <span className="text-[10px] uppercase font-bold text-[#727783]">Temperatura</span>
                        <p className="font-bold text-sm text-[#191c1d] mt-0.5 font-mono">{vitals.temperature} °C</p>
                      </div>
                    )}
                    {vitals.oxygenSaturation && (
                      <div className="p-3 bg-[#f8f9fa] rounded-xl border border-[#e1e3e4]">
                        <span className="text-[10px] uppercase font-bold text-[#727783]">SpO2</span>
                        <p className="font-bold text-sm text-[#191c1d] mt-0.5 font-mono">{vitals.oxygenSaturation} %</p>
                      </div>
                    )}
                    {vitals.bloodGlucose && (
                      <div className="p-3 bg-[#f8f9fa] rounded-xl border border-[#e1e3e4] col-span-2 sm:col-span-1">
                        <span className="text-[10px] uppercase font-bold text-[#727783]">Glucemia</span>
                        <p className="font-bold text-sm text-[#191c1d] mt-0.5 font-mono">{vitals.bloodGlucose} mg/dL</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Dynamic Clinical Assessment Body */}
              <div className="flex flex-col gap-4 text-xs">
                {record.chiefComplaint && record.chiefComplaint.trim() && record.chiefComplaint !== "Sin Información" && (
                  <div>
                    <h4 className="font-bold text-[#00478d] mb-1">Motivo de Ingreso / Consulta:</h4>
                    <p className="p-3 rounded-lg bg-[#f8f9fa] border border-[#e1e3e4] text-[#191c1d] font-medium">
                      {record.chiefComplaint}
                    </p>
                  </div>
                )}

                {record.symptoms && record.symptoms.length > 0 && (
                  <div>
                    <h4 className="font-bold text-[#00478d] mb-1">Síntomas Reportados y Observados:</h4>
                    <div className="p-3 rounded-lg bg-[#f8f9fa] border border-[#e1e3e4] text-[#191c1d]">
                      <ul className="list-disc list-inside space-y-1">
                        {record.symptoms.map((s, i) => (
                          <li key={i} className="font-medium text-[#424752]">{s}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {record.physicalExam && record.physicalExam.trim() && (
                  <div>
                    <h4 className="font-bold text-[#00478d] mb-1">Examen Físico y Hallazgos:</h4>
                    <p className="p-3 rounded-lg bg-[#f8f9fa] border border-[#e1e3e4] text-[#424752] leading-relaxed">
                      {record.physicalExam}
                    </p>
                  </div>
                )}

                {record.preliminaryDiagnosis && record.preliminaryDiagnosis.trim() && (
                  <div>
                    <h4 className="font-bold text-[#00478d] mb-1">Diagnóstico Clínico:</h4>
                    <p className="p-3 rounded-lg bg-[#e0f7f6] border border-[#79f2f0] text-[#00504f] font-bold text-sm">
                      {record.preliminaryDiagnosis}
                    </p>
                  </div>
                )}

                {record.treatmentAdministered && record.treatmentAdministered.trim() && (
                  <div>
                    <h4 className="font-bold text-[#00478d] mb-1">Tratamiento y Procedimiento Suministrado:</h4>
                    <p className="p-3 rounded-lg bg-[#f8f9fa] border border-[#e1e3e4] text-[#424752] leading-relaxed">
                      {record.treatmentAdministered}
                    </p>
                  </div>
                )}

                {record.medications && record.medications.length > 0 && (
                  <div>
                    <h4 className="font-bold text-[#00478d] mb-1.5">Fármacos Administrados / Prescritos:</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border border-[#e1e3e4] rounded-lg overflow-hidden text-xs">
                        <thead className="bg-[#f3f4f5] text-[#424752] font-semibold">
                          <tr>
                            <th className="p-2 border-b border-[#e1e3e4]">Medicamento</th>
                            <th className="p-2 border-b border-[#e1e3e4]">Dosis</th>
                            <th className="p-2 border-b border-[#e1e3e4]">Vía</th>
                            <th className="p-2 border-b border-[#e1e3e4]">Indicación</th>
                          </tr>
                        </thead>
                        <tbody>
                          {record.medications.map((m, idx) => (
                            <tr key={idx} className="border-b border-[#e1e3e4] bg-white">
                              <td className="p-2 font-bold text-[#006a68]">{m.name}</td>
                              <td className="p-2 font-mono">{m.dose}</td>
                              <td className="p-2">{m.route}</td>
                              <td className="p-2 text-[#727783]">{m.administeredAt || "Inmediata"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {record.recommendations && record.recommendations.trim() && (
                  <div>
                    <h4 className="font-bold text-[#00478d] mb-1">Recomendaciones y Plan de Cuidados:</h4>
                    <p className="p-3 rounded-lg bg-[#f8f9fa] border border-[#e1e3e4] text-[#424752] leading-relaxed">
                      {record.recommendations}
                    </p>
                  </div>
                )}

                {record.nurseNotes && record.nurseNotes.trim() && (
                  <div>
                    <h4 className="font-bold text-[#00478d] mb-1">Notas y Observaciones de Enfermería:</h4>
                    <p className="p-3 rounded-lg bg-[#f8f9fa] border border-[#e1e3e4] text-[#424752] leading-relaxed">
                      {record.nurseNotes}
                    </p>
                  </div>
                )}
              </div>

              {/* Signatures & Seal */}
              <div className="pt-6 border-t border-[#e1e3e4] flex flex-col sm:flex-row items-center justify-between gap-6 text-xs">
                <div className="text-center sm:text-left">
                  <div className="w-48 border-b-2 border-[#191c1d] mb-1.5 mx-auto sm:mx-0"></div>
                  <p className="font-bold text-[#191c1d]">{record.nurseName}</p>
                  <p className="text-[#727783]">Licencia Profesional: {record.nurseLicense}</p>
                  <p className="text-[#006a68] font-semibold text-[11px]">Enfermera de Turno • Unicolombo</p>
                </div>

                <div className="p-3 border-2 border-dashed border-[#00478d] rounded-xl bg-[#d6e3ff]/30 text-center max-w-xs">
                  <ShieldCheck className="w-5 h-5 text-[#00478d] mx-auto mb-1" />
                  <p className="font-bold text-[#00478d] text-[11px]">EXPEDIENTE CLÍNICO DIGITAL</p>
                  <p className="text-[10px] text-[#424752] font-mono mt-0.5">ID: {record.id.slice(0, 16)}</p>
                  <p className="text-[9px] text-[#727783]">Registrado en Sistema de Enfermería</p>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: Structured JSON Data */}
          {activeTab === "json" && (
            <div className="max-w-3xl mx-auto flex flex-col gap-4">
              <div className="bg-[#f3f4f5] p-4 rounded-xl border border-[#c2c6d4] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Code2 className="w-5 h-5 text-[#00478d]" />
                  <div>
                    <h4 className="text-xs font-bold text-[#191c1d]">Datos Estructurados del Paciente</h4>
                    <p className="text-[11px] text-[#727783]">
                      Registro digital en formato JSON listo para integración de historia clínica.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(record, null, 2));
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="px-3 py-1.5 bg-white text-[#00478d] hover:bg-[#e7e8e9] font-bold text-xs rounded-lg border border-[#c2c6d4] shadow-xs flex items-center gap-1.5 transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? "¡Copiado!" : "Copiar JSON"}</span>
                </button>
              </div>

              <pre className="p-6 bg-[#0f172a] text-[#38bdf8] rounded-xl font-mono text-xs overflow-x-auto leading-relaxed border border-slate-800 shadow-inner">
                {JSON.stringify(record, null, 2)}
              </pre>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
