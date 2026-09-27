import { jsPDF } from "jspdf";
import { ClinicalRecord } from "../types";

export function generateClinicalPdf(record: ClinicalRecord, autoDownload = true): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = 14;

  // 1. Header Banner / Branding Background
  doc.setFillColor(0, 71, 141); // #00478d
  doc.roundedRect(margin, y, contentWidth, 22, 2, 2, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("UNICOLOMBO - ENFERMERÍA UNIVERSITARIA", margin + 6, y + 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(200, 218, 255);
  doc.text("Sistema de Salud Estudiantil y Sanitas Escolar | Valoración Clínica Digital", margin + 6, y + 14);
  doc.text("Registro Clínico Institucional", margin + 6, y + 18);

  // Folio & Date
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(`FOLIO: ${record.folioNumber || "FOL-" + Date.now().toString().slice(-6)}`, pageWidth - margin - 52, y + 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Fecha: ${new Date(record.timestamp).toLocaleDateString()}`, pageWidth - margin - 52, y + 13);
  doc.text(`Hora: ${new Date(record.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`, pageWidth - margin - 52, y + 17);

  y += 26;

  // 2. Patient Demographics Box
  const patientName = record.student?.name && record.student.name.trim() ? record.student.name : "Sin Información";
  const studentCode = record.student?.studentCode && record.student.studentCode !== "N/A" && record.student.studentCode !== "Sin Información"
    ? record.student.studentCode
    : null;
  const program = record.student?.academicProgram && record.student.academicProgram !== "Sin Información"
    ? `${record.student.academicProgram}${record.student.programType ? ` (${record.student.programType})` : ""}`
    : null;
  const semester = record.student?.semester && record.student.semester > 0
    ? `${record.student.semester}° Semestre`
    : null;
  const allergies = (record.student?.allergies || []).concat(record.detectedAllergies || []);
  const uniqueAllergies = Array.from(new Set(allergies.filter((a) => a && a !== "Ninguna conocida" && a !== "Ninguna")));

  // Calculate patient box height dynamically
  let patientBoxHeight = 16;
  if (program || semester || studentCode) patientBoxHeight += 7;
  if (uniqueAllergies.length > 0) patientBoxHeight += 7;

  doc.setFillColor(243, 244, 245);
  doc.setDrawColor(194, 198, 212);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentWidth, patientBoxHeight, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(0, 71, 141);
  doc.text("DATOS DEL PACIENTE / ESTUDIANTE", margin + 4, y + 5.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(25, 28, 29);
  doc.text("Nombre:", margin + 4, y + 11.5);
  doc.setFont("helvetica", "normal");
  doc.text(patientName, margin + 22, y + 11.5);

  if (studentCode) {
    doc.setFont("helvetica", "bold");
    doc.text("Código:", margin + 110, y + 11.5);
    doc.setFont("helvetica", "normal");
    doc.text(studentCode, margin + 125, y + 11.5);
  }

  let curPatientY = y + 18;
  if (program || semester) {
    if (program) {
      doc.setFont("helvetica", "bold");
      doc.text("Programa:", margin + 4, curPatientY);
      doc.setFont("helvetica", "normal");
      doc.text(program, margin + 22, curPatientY);
    }
    if (semester) {
      doc.setFont("helvetica", "bold");
      doc.text("Semestre:", margin + 110, curPatientY);
      doc.setFont("helvetica", "normal");
      doc.text(semester, margin + 128, curPatientY);
    }
    curPatientY += 6.5;
  }

  if (uniqueAllergies.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(186, 26, 26);
    doc.text("Alergias:", margin + 4, curPatientY);
    doc.text(uniqueAllergies.join(", "), margin + 22, curPatientY);
  }

  y += patientBoxHeight + 4;

  // 3. Vital Signs Box (ONLY rendered if any vital sign exists)
  const vitals = record.vitals;
  const hasVitals = vitals && (
    vitals.bloodPressure ||
    vitals.heartRate ||
    vitals.temperature ||
    vitals.oxygenSaturation ||
    vitals.bloodGlucose
  );

  if (hasVitals) {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(194, 198, 212);
    doc.roundedRect(margin, y, contentWidth, 16, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(0, 71, 141);
    doc.text("SIGNOS VITALES REGISTRADOS:", margin + 4, y + 5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(64, 72, 80);

    const vitalItems: string[] = [];
    if (vitals.bloodPressure) vitalItems.push(`T.A.: ${vitals.bloodPressure}`);
    if (vitals.heartRate) vitalItems.push(`F.C.: ${vitals.heartRate} bpm`);
    if (vitals.temperature) vitalItems.push(`Temp: ${vitals.temperature} °C`);
    if (vitals.oxygenSaturation) vitalItems.push(`SpO2: ${vitals.oxygenSaturation} %`);
    if (vitals.bloodGlucose) vitalItems.push(`Glucemia: ${vitals.bloodGlucose} mg/dL`);

    let vx = margin + 4;
    vitalItems.forEach((vi) => {
      doc.text(vi, vx, y + 11.5);
      vx += 36;
    });

    y += 20;
  }

  // 4. Dynamic Clinical Sections (ONLY rendered if information exists)
  interface SectionItem {
    title: string;
    text: string;
    isHighlight?: boolean;
  }

  const sections: SectionItem[] = [];

  if (record.chiefComplaint && record.chiefComplaint.trim() && record.chiefComplaint !== "Sin Información") {
    sections.push({ title: "Motivo de Ingreso / Consulta:", text: record.chiefComplaint });
  }

  if (record.symptoms && record.symptoms.length > 0) {
    sections.push({ title: "Síntomas Reportados y Observados:", text: record.symptoms.join(" • ") });
  }

  if (record.physicalExam && record.physicalExam.trim()) {
    sections.push({ title: "Examen Físico y Hallazgos:", text: record.physicalExam });
  }

  if (record.preliminaryDiagnosis && record.preliminaryDiagnosis.trim()) {
    sections.push({ title: "Diagnóstico Clínico:", text: record.preliminaryDiagnosis, isHighlight: true });
  }

  if (record.treatmentAdministered && record.treatmentAdministered.trim()) {
    sections.push({ title: "Tratamiento y Procedimiento Suministrado:", text: record.treatmentAdministered });
  }

  if (record.recommendations && record.recommendations.trim()) {
    sections.push({ title: "Recomendaciones y Plan de Cuidados:", text: record.recommendations });
  }

  if (record.nurseNotes && record.nurseNotes.trim()) {
    sections.push({ title: "Notas y Observaciones de Enfermería:", text: record.nurseNotes });
  }

  if (sections.length > 0 || (record.medications && record.medications.length > 0)) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(0, 71, 141);
    doc.text("VALORACIÓN Y DETALLE CLÍNICO", margin, y + 4);
    y += 7;

    for (const sec of sections) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(sec.isHighlight ? 0 : 25, sec.isHighlight ? 106 : 28, sec.isHighlight ? 104 : 29);
      doc.text(sec.title, margin + 2, y + 4);

      doc.setFont("helvetica", sec.isHighlight ? "bold" : "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(42, 47, 52);

      const splitText = doc.splitTextToSize(sec.text, contentWidth - 8);
      
      // Draw light background for highlighted items or clean box
      if (sec.isHighlight) {
        doc.setFillColor(224, 247, 246);
        doc.roundedRect(margin, y + 6, contentWidth, splitText.length * 4.5 + 4, 1.5, 1.5, "F");
        doc.setTextColor(0, 80, 79);
        doc.text(splitText, margin + 4, y + 10.5);
        y += splitText.length * 4.5 + 11;
      } else {
        doc.setFillColor(248, 249, 250);
        doc.roundedRect(margin, y + 6, contentWidth, splitText.length * 4.5 + 4, 1.5, 1.5, "F");
        doc.text(splitText, margin + 4, y + 10);
        y += splitText.length * 4.5 + 10;
      }
    }

    // Render Medications table if present
    if (record.medications && record.medications.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(0, 71, 141);
      doc.text("Fármacos Administrados / Prescritos:", margin + 2, y + 4);
      y += 6;

      doc.setFillColor(243, 244, 245);
      doc.rect(margin, y, contentWidth, 6, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(64, 72, 80);
      doc.text("Medicamento", margin + 4, y + 4.2);
      doc.text("Dosis", margin + 60, y + 4.2);
      doc.text("Vía", margin + 105, y + 4.2);
      doc.text("Hora / Indicación", margin + 140, y + 4.2);
      y += 6;

      doc.setFont("helvetica", "normal");
      for (const med of record.medications) {
        doc.setFillColor(255, 255, 255);
        doc.rect(margin, y, contentWidth, 5.5, "F");
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 106, 104);
        doc.text(med.name, margin + 4, y + 3.8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(25, 28, 29);
        doc.text(med.dose || "-", margin + 60, y + 3.8);
        doc.text(med.route || "Oral", margin + 105, y + 3.8);
        doc.text(med.administeredAt || "Inmediata", margin + 140, y + 3.8);
        y += 5.5;
      }
      y += 3;
    }
  }

  // 5. Signatures and Institutional Digital Verification
  const footerY = Math.max(y + 8, pageHeight - 38);

  doc.setDrawColor(194, 198, 212);
  doc.setLineWidth(0.4);

  // Nurse signature line
  doc.line(margin + 6, footerY + 14, margin + 75, footerY + 14);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(25, 28, 29);
  doc.text(record.nurseName || "Enfermera de Turno", margin + 6, footerY + 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(`Enfermera de Turno • TP: ${record.nurseLicense || "COL-88492"}`, margin + 6, footerY + 22);
  doc.text("Unicolombo Bienestar Institucional", margin + 6, footerY + 25.5);

  // Verification Box
  doc.setDrawColor(0, 71, 141);
  doc.roundedRect(pageWidth - margin - 75, footerY + 4, 75, 24, 1, 1, "D");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(0, 71, 141);
  doc.text("VERIFICACIÓN CLÍNICA INSTITUCIONAL", pageWidth - margin - 72, footerY + 9.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(64, 72, 80);
  doc.text(`ID Registro: ${(record.id || "rec").slice(0, 16)}`, pageWidth - margin - 72, footerY + 14.5);
  doc.text("Expediente Digital de Enfermería", pageWidth - margin - 72, footerY + 18.5);
  doc.text(`Generado: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`, pageWidth - margin - 72, footerY + 22.5);

  if (autoDownload) {
    const cleanName = (record.student?.name || "Paciente").replace(/\s+/g, "_");
    doc.save(`Unicolombo_Reporte_${record.folioNumber || "REG"}_${cleanName}.pdf`);
  }

  return doc;
}
