import { ClinicalRecord } from "../types";

export function generateObsidianMarkdown(record: ClinicalRecord): string {
  const dateStr = record.timestamp
    ? new Date(record.timestamp).toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0];
  const timeStr = record.timestamp
    ? new Date(record.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  const studentName = record.student?.name || "Sin Información";
  const studentCode = record.student?.studentCode || "";
  const program = record.student?.academicProgram || "Sin Información";
  const progType = record.student?.programType || "Profesional";
  const semester = record.student?.semester || 0;
  const age = record.student?.age || 0;
  const triage = record.triageLevel || "Nivel 4 (Urgencia Menor)";
  const complaint = record.chiefComplaint || "Consulta de enfermería";
  const nurseName = record.nurseName || "Enfermería Institucional";
  const nurseLicense = record.nurseLicense || "COL-REG";
  const aiModel = record.aiModelUsed || "IA";
  const mediaType = record.mediaType || "audio";

  const studentAllergies = record.student?.allergies || [];
  const detectedAllergies = record.detectedAllergies || [];
  const allAllergies = [...new Set([...studentAllergies, ...detectedAllergies])];

  const allergiesYaml =
    allAllergies.length > 0
      ? `\nalergias:\n${allAllergies.map((a) => `  - "${a}"`).join("\n")}`
      : `\nalergias: []`;

  const medications = record.medications || [];
  const medsYaml =
    medications.length > 0
      ? `\nmedicamentos_suministrados:\n${medications
          .map((m) => `  - nombre: "${m.name}"\n    dosis: "${m.dose}"\n    via: "${m.route}"`)
          .join("\n")}`
      : `\nmedicamentos_suministrados: []`;

  const triageTag = triage.toLowerCase().includes("1")
    ? "triage/rojo-reanimacion"
    : triage.toLowerCase().includes("2")
    ? "triage/naranja-emergencia"
    : triage.toLowerCase().includes("3")
    ? "triage/amarillo-urgencia"
    : triage.toLowerCase().includes("4")
    ? "triage/verde-menor"
    : "triage/azul-no-urgente";

  return `---
folio: "${record.folioNumber}"
tipo: "atencion_enfermeria"
institucion: "Unicolombo - Enfermería Universitaria"
fecha: ${dateStr}
hora: "${timeStr}"
estudiante: "[[Estudiantes/${studentName}]]"
codigo_estudiantil: "${studentCode}"
programa_academico: "[[Programas/${program}]]"
tipo_programa: "${progType}"
semestre: ${semester}
edad: ${age}
triage: "${triage}"
motivo_consulta: "${complaint}"
enfermera: "[[Personal/${nurseName}]]"
registro_profesional: "${nurseLicense}"
modelo_ia: "${aiModel}"
fuente_captura: "${mediaType}"${allergiesYaml}${medsYaml}
tags:
  - unicolombo/enfermeria
  - clinica/evaluacion
  - ${triageTag}
  - semestre/${semester}
---

# 🩺 Valoración de Enfermería - Folio \`${record.folioNumber}\`

> [!ABSTRACT] Resumen Clínico
> **Paciente:** [[Estudiantes/${studentName}]] ${studentCode ? `(${studentCode})` : ""}  
> **Programa:** [[Programas/${program}]] (${progType}${semester > 0 ? ` - Semestre ${semester}` : ""})  
> **Fecha y Hora:** \`${dateStr} ${timeStr}\` | **Triage:** \`${triage}\`  
> **Atendido por:** [[Personal/${nurseName}]] (\`${nurseLicense}\`)

---

${
  allAllergies.length > 0
    ? `> [!WARNING] Alerta de Alergias Detectadas
> ⚠️ **Alergias Conocidas / Notificadas:** ${allAllergies.join(", ")}
> *Verificar compatibilidad farmacológica antes de cualquier suministro.*

`
    : ""
}

## 📋 Motivo de Consulta
**${complaint}**

${
  record.symptoms && record.symptoms.length > 0
    ? `### Síntomas Referidos
${record.symptoms.map((s) => `- [[Sintomas/${s}|${s}]]`).join("\n")}

---`
    : ""
}

${
  record.vitals
    ? `## 📊 Signos Vitales (Dataview Fields)
- **Tensión Arterial::** ${record.vitals.bloodPressure || "120/80 mmHg"}
- **Frecuencia Cardíaca::** ${record.vitals.heartRate || 75} bpm
- **Temperatura Corporal::** ${record.vitals.temperature || 36.6} °C
- **Saturación de Oxígeno (SpO2)::** ${record.vitals.oxygenSaturation || 98} %
- **Glucemia Capilar::** ${record.vitals.bloodGlucose || 95} mg/dL

---`
    : ""
}

${
  record.physicalExam
    ? `## 🔍 Examen Físico e Inspección
${record.physicalExam}

---`
    : ""
}

${
  record.preliminaryDiagnosis
    ? `## 🧠 Diagnóstico Preliminar de Enfermería
> [!NOTE] Diagnóstico Clínico
> **[[Diagnosticos/${record.preliminaryDiagnosis}|${record.preliminaryDiagnosis}]]**

---`
    : ""
}

${
  record.treatmentAdministered
    ? `## 💊 Tratamiento y Medicación Administrada
${record.treatmentAdministered}
`
    : ""
}

${
  medications.length > 0
    ? `### Fármacos Suministrados en Tópico:
| Medicamento | Dosis | Vía | Hora |
|:---|:---|:---|:---|
${medications
  .map(
    (m) =>
      `| [[Medicamentos/${m.name}|${m.name}]] | \`${m.dose}\` | ${m.route} | ${
        m.administeredAt || timeStr
      } |`
  )
  .join("\n")}`
    : `*No se requirió administración de medicamentos farmacológicos.*`
}

---

${
  record.recommendations
    ? `## 📝 Recomendaciones y Plan de Cuidados
> [!TIP] Conducta a Seguir
> ${record.recommendations}
`
    : ""
}

${
  record.nurseNotes
    ? `**Notas de Evolución:**
${record.nurseNotes}

---`
    : ""
}

\`\`\`json
// JSON Estructurado para interoperabilidad médica
${JSON.stringify(
  {
    folio: record.folioNumber,
    fecha: record.timestamp,
    paciente: studentName,
    codigo: studentCode,
    programa: program,
    triage: triage,
    signosVitales: record.vitals,
    diagnostico: record.preliminaryDiagnosis,
    medicamentos: medications,
    alergias: allAllergies,
  },
  null,
  2
)}
\`\`\`

---
*Firma Digital:* **${nurseName}** - ${nurseLicense}  
*Unicolombo Sistema de Salud Escolar y Universitaria*
`;
}

export function downloadMarkdownFile(record: ClinicalRecord): void {
  const content = generateObsidianMarkdown(record);
  const cleanName = (record.student?.name || "Paciente").replace(/\s+/g, "_");
  const filename = `${record.folioNumber}_${cleanName}.md`;

  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadJsonFile(record: ClinicalRecord): void {
  const content = JSON.stringify(record, null, 2);
  const cleanName = (record.student?.name || "Paciente").replace(/\s+/g, "_");
  const filename = `${record.folioNumber}_${cleanName}.json`;

  const blob = new Blob([content], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
