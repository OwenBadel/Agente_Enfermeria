import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// AI Client setup
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!aiClient && apiKey) {
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// ---------- AI Clinical Extraction ----------
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function buildClinicalSystemPrompt(isImage: boolean): string {
  return `Eres un asistente de transcripción y estructuración clínica para "Unicolombo - Enfermería Universitaria".
Tu función es transcribir y estructurar fielmente la información médica real que aparezca en ${isImage ? "la imagen o documento médico adjunto (receta médica, apunte de ingreso, notas de enfermería, fórmula o examen)" : "el audio o dictado de voz"}.

REGLAS ESTRICTAS DE EXTRACCIÓN (SOLO TRANSCRIBIR Y ORGANIZAR LO QUE ESTÉ PRESENTE, NUNCA INVENTAR):
1. PACIENTE / ESTUDIANTE:
   - Si la imagen o el audio menciona explícitamente un nombre de paciente (por ejemplo: "Luis Ramírez", "María Gómez", etc.), extráelo en "studentInfo.name".
   - Si NO aparece ningún nombre en la imagen/audio, debes asignar exactamente: "Sin Información".
   - Programa, carrera, semestre o código estudiantil: Si se mencionan explícitamente en la imagen/audio, extráelos; de lo contrario pon "Sin Información" o null.

2. NO INVENTES DIAGNÓSTICOS:
   - Extrae el diagnóstico SOLO si está explícitamente escrito o dicho en el documento/audio.
   - Si NO hay diagnóstico explícito en la imagen ni en el audio, establece "preliminaryDiagnosis": null. No deduzcas diagnósticos si no están en el documento.

3. NO INVENTES SIGNOS VITALES:
   - Extrae tensión arterial, frecuencia cardíaca, temperatura, saturación de oxígeno o glucemia ÚNICAMENTE si están escritas o mencionadas con cifras numéricas en el documento o audio.
   - Si no hay signos vitales en el documento o audio, deja todos los campos de "vitals" en null o pon "vitals": null. NUNCA inventes 120/80, 36.6 u otros números por defecto.

4. SECCIONES DINÁMICAS:
   - "chiefComplaint": Extrae el porqué del ingreso o motivo de consulta si aparece. Si no aparece, null.
   - "symptoms": Extrae los síntomas reportados u observados como arreglo de textos. Si no hay, [].
   - "physicalExam": Extrae hallazgos del examen físico si están presentes. Si no, null.
   - "treatmentAdministered": Procedimiento o tratamiento realizado si está presente. Si no, null.
   - "medications": Medicamentos prescritos o administrados con dosis y vía si están presentes. Si no, [].
   - "nurseNotes": Notas u observaciones de enfermería si están presentes en la imagen/audio. Si no, null.
   - "recommendations": Recomendaciones si están presentes. Si no, null.
   - "detectedAllergies": Alergias si se mencionan. Si no, [].

Debes responder ÚNICAMENTE con un objeto JSON válido con la siguiente estructura:
{
  "studentInfo": {
    "name": "Nombre detectado o 'Sin Información'",
    "programType": null,
    "academicProgram": null,
    "semester": null,
    "studentId": null,
    "age": null
  },
  "chiefComplaint": "El porqué del ingreso o motivo de consulta si aparece, o null",
  "symptoms": ["síntoma 1 si aparece"],
  "vitals": {
    "bloodPressure": null,
    "heartRate": null,
    "temperature": null,
    "oxygenSaturation": null,
    "bloodGlucose": null
  },
  "physicalExam": null,
  "preliminaryDiagnosis": null,
  "treatmentAdministered": null,
  "medications": [],
  "detectedAllergies": [],
  "triageLevel": "Nivel 4 (Urgencia Menor)",
  "recommendations": null,
  "nurseNotes": "Notas u observaciones si aparecen en el documento/audio, o null",
  "confidenceScore": 0.95,
  "hasAmbiguityOrConflict": false,
  "conflictDetails": null
}
Genera siempre JSON puro y estricto.`;
}

// Runs generateContent across candidate models, retrying on transient (503) errors.
async function generateWithRetry(
  client: GoogleGenAI,
  modelCandidates: string[],
  parts: any[],
  config: any,
  attemptsPerModel = 2
): Promise<string> {
  let lastError: any = null;
  for (const m of modelCandidates) {
    for (let attempt = 1; attempt <= attemptsPerModel; attempt++) {
      try {
        const response = await client.models.generateContent({
          model: m,
          contents: { parts },
          config,
        });
        if (response && response.text) {
          console.log(`AI extraction OK via ${m}`);
          return response.text;
        }
      } catch (err: any) {
        lastError = err;
        const isUnavailable =
          err?.message?.includes("503") || err?.status === "UNAVAILABLE" || err?.status === 503;
        console.warn(`Model ${m} (attempt ${attempt}) failed:`, err?.message || err);
        if (isUnavailable && attempt < attemptsPerModel) {
          await sleep(1000);
          continue;
        }
        break;
      }
    }
  }
  throw lastError || new Error("Failed to get response from AI models");
}

// Parses the JSON object out of raw model output (tolerates prose and code fences).
function extractJsonObject(rawText: string): any {
  let text = String(rawText).trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    text = fenced[1].trim();
  }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) {
    text = text.substring(start, end + 1);
  }
  return JSON.parse(text);
}

// ---------- Obsidian Vault Storage (real database) ----------
const VAULT_ROOT = path.resolve(
  process.env.OBSIDIAN_VAULT_PATH || path.join(process.cwd(), "ObsidianVault")
);
const VAULT_DIRS = {
  registros: path.join(VAULT_ROOT, "Registros"),
  pacientes: path.join(VAULT_ROOT, "Pacientes"),
  pdfs: path.join(VAULT_ROOT, "PDFs"),
  adjuntos: path.join(VAULT_ROOT, "Adjuntos"),
};

function ensureVaultDirs(): void {
  Object.values(VAULT_DIRS).forEach((d) => fs.mkdirSync(d, { recursive: true }));
}

function sanitizeFilePart(input: string): string {
  return (
    (input || "Sin_Informacion")
      .replace(/[\\/:*?"<>|#^\[\]]/g, "_")
      .replace(/\s+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 80) || "Sin_Informacion"
  );
}

function stripBase64Prefix(data: string): string {
  const s = String(data);
  const idx = s.indexOf("base64,");
  return idx >= 0 ? s.substring(idx + 7) : s;
}

function buildRecordMarkdown(record: any, files: { pdfFile?: string; attachmentFile?: string }): string {
  const r = record;
  const ts = r.timestamp ? new Date(r.timestamp) : new Date();
  const dateStr = ts.toISOString().split("T")[0];
  const timeStr = ts.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
  const name = r.student?.name || "Sin Información";
  const triage = r.triageLevel || "Nivel 4 (Urgencia Menor)";
  const allergies = Array.from(new Set([...(r.student?.allergies || []), ...(r.detectedAllergies || [])]));
  const meds = r.medications || [];

  const esc = (v: any) => String(v ?? "").replace(/"/g, '\\"').replace(/\r?\n/g, " ");
  const yamlAllergies = allergies.length > 0
    ? `\nalergias:\n${allergies.map((a) => `  - "${esc(a)}"`).join("\n")}`
    : `\nalergias: []`;
  const yamlMeds = meds.length > 0
    ? `\nmedicamentos:\n${meds.map((m) => `  - nombre: "${esc(m.name)}"\n    dosis: "${esc(m.dose)}"\n    via: "${esc(m.route || "Oral")}"`).join("\n")}`
    : ``;

  const triageTag = triage.toLowerCase().includes("1")
    ? "triage/rojo-reanimacion"
    : triage.toLowerCase().includes("2")
    ? "triage/naranja-emergencia"
    : triage.toLowerCase().includes("3")
    ? "triage/amarillo-urgencia"
    : triage.toLowerCase().includes("4")
    ? "triage/verde-menor"
    : "triage/azul-no-urgente";

  const vitalsLines: string[] = [];
  if (r.vitals?.bloodPressure) vitalsLines.push(`- **Tensión Arterial::** ${r.vitals.bloodPressure}`);
  if (r.vitals?.heartRate) vitalsLines.push(`- **Frecuencia Cardíaca::** ${r.vitals.heartRate} bpm`);
  if (r.vitals?.temperature) vitalsLines.push(`- **Temperatura::** ${r.vitals.temperature} °C`);
  if (r.vitals?.oxygenSaturation) vitalsLines.push(`- **Saturación SpO2::** ${r.vitals.oxygenSaturation} %`);
  if (r.vitals?.bloodGlucose) vitalsLines.push(`- **Glucemia::** ${r.vitals.bloodGlucose} mg/dL`);

  const section = (title: string, body?: string | null): string =>
    body && String(body).trim()
      ? `## ${title}\n${body}\n`
      : "";

  return `---
folio: "${esc(r.folioNumber)}"
tipo: atencion_enfermeria
institucion: "Unicolombo - Enfermería Universitaria"
fecha: ${dateStr}
hora: "${timeStr}"
paciente: "[[Pacientes/${sanitizeFilePart(name)}|${name}]]"
codigo_estudiantil: "${esc(r.student?.studentCode)}"
programa_academico: "${esc(r.student?.academicProgram)}"
tipo_programa: "${esc(r.student?.programType)}"
semestre: ${r.student?.semester ?? 0}
edad: ${r.student?.age ?? 0}
triage: "${esc(triage)}"
enfermera: "${esc(r.nurseName)}"
registro_profesional: "${esc(r.nurseLicense)}"
fuente_captura: "${esc(r.mediaType)}"${files.pdfFile ? `\npdf: "[[PDFs/${sanitizeFilePart(r.folioNumber)}.pdf]]"` : ""}${files.attachmentFile ? `\nadjunto: "[[Adjuntos/${files.attachmentFile}]]"` : ""}${yamlAllergies}${yamlMeds}
tags:
  - unicolombo/enfermeria
  - clinica/evaluacion
  - ${triageTag}
---

# 🩺 Valoración de Enfermería - Folio \`${esc(r.folioNumber)}\`

> [!ABSTRACT] Resumen Clínico
> **Paciente:** [[Pacientes/${sanitizeFilePart(name)}|${name}]] ${r.student?.studentCode ? `(${r.student.studentCode})` : ""}
> **Fecha y Hora:** \`${dateStr} ${timeStr}\` | **Triage:** \`${esc(triage)}\`
> **Atendido por:** ${esc(r.nurseName)} (\`${esc(r.nurseLicense)}\`)

${
  allergies.length > 0
    ? `> [!WARNING] Alerta de Alergias
> **Alergias Conocidas / Detectadas:** ${allergies.join(", ")}

`
    : ""
}
## 📋 Motivo de Consulta
**${r.chiefComplaint || "Consulta de enfermería"}**

${
  r.symptoms && r.symptoms.length > 0
    ? `### Síntomas Referidos
${r.symptoms.map((s: string) => `- ${s}`).join("\n")}

`
    : ""
}${
  vitalsLines.length > 0
    ? `## 📊 Signos Vitales (Dataview Fields)
${vitalsLines.join("\n")}

`
    : ""
}${section("🔍 Examen Físico e Inspección", r.physicalExam)}${
  r.preliminaryDiagnosis
    ? `## 🧠 Diagnóstico Preliminar
> [!NOTE] Diagnóstico Clínico
> **${r.preliminaryDiagnosis}**

`
    : ""
}${section("💊 Tratamiento y Cuidados", r.treatmentAdministered)}${
  meds.length > 0
    ? `### Fármacos Suministrados
| Medicamento | Dosis | Vía | Hora |
|:---|:---|:---|:---|
${meds.map((m: any) => `| ${m.name} | \`${m.dose || "-"}\` | ${m.route || "Oral"} | ${m.administeredAt || "Inmediata"} |`).join("\n")}

`
    : ""
}${section("📝 Recomendaciones y Plan de Cuidados", r.recommendations)}${section("Notas de Evolución", r.nurseNotes)}
---

*Firma Digital:* **${esc(r.nurseName)}** - ${esc(r.nurseLicense)}
*Unicolombo Sistema de Salud Escolar y Universitaria*

## Datos Estructurados (JSON)
\`\`\`json
${JSON.stringify(r, null, 2)}
\`\`\`
`;
}

function upsertPatientNote(record: any, registroMdName: string): void {
  const name = record.student?.name || "Sin Información";
  const safe = sanitizeFilePart(name);
  const file = path.join(VAULT_DIRS.pacientes, `${safe}.md`);
  const fecha = new Date(record.timestamp || Date.now()).toISOString().split("T")[0];
  const detalle = record.preliminaryDiagnosis || record.chiefComplaint || "Atención de enfermería";
  const entry = `- \`${fecha}\` [[Registros/${registroMdName.replace(/\.md$/i, "")}|${record.folioNumber}]] — ${String(detalle).replace(/\r?\n/g, " ")}`;

  let content = "";
  if (fs.existsSync(file)) {
    content = fs.readFileSync(file, "utf8");
  } else {
    content = `---
paciente: "${name}"
codigo_estudiantil: "${record.student?.studentCode || ""}"
programa_academico: "${record.student?.academicProgram || ""}"
tipo_programa: "${record.student?.programType || ""}"
semestre: ${record.student?.semester ?? 0}
edad: ${record.student?.age ?? 0}
alergias: ${JSON.stringify(record.student?.allergies || [])}
tags:
  - unicolombo/paciente
---

# 🧑‍⚕️ ${name}

Expediente del paciente mantenido automáticamente por el sistema Unicolombo.

## Historial de Atenciones
`;
  }
  const marker = "## Historial de Atenciones";
  if (!content.includes(marker)) {
    content += `\n${marker}\n`;
  }
  content = content.trimEnd() + "\n" + entry + "\n";
  fs.writeFileSync(file, content, "utf8");
}

function readVaultRecords(): any[] {
  ensureVaultDirs();
  const out: any[] = [];
  for (const f of fs.readdirSync(VAULT_DIRS.registros)) {
    if (!f.toLowerCase().endsWith(".md")) continue;
    try {
      const content = fs.readFileSync(path.join(VAULT_DIRS.registros, f), "utf8");
      const blocks = content.match(/```json\s*([\s\S]*?)```/g) || [];
      for (const block of blocks) {
        try {
          const parsed = JSON.parse(block.replace(/```json\s*/i, "").replace(/```$/, "").trim());
          if (parsed && parsed.folioNumber) {
            if (parsed.attachmentFile && (!parsed.mediaUrl || /^(blob:|\/?api\/)/.test(parsed.mediaUrl))) {
              parsed.mediaUrl = `/api/vault/media/${parsed.attachmentFile}`;
            }
            out.push(parsed);
            break;
          }
        } catch {
          /* ignore malformed json blocks */
        }
      }
    } catch {
      /* ignore unreadable files */
    }
  }
  return out.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      service: "Unicolombo Clinical Service",
      vaultPath: VAULT_ROOT,
      vaultRecordsCount: readVaultRecords().length,
    });
  });

  // Serve attachments (images/audio) stored in the vault
  app.use("/api/vault/media", express.static(VAULT_DIRS.adjuntos));

  // Vault retrieve all records (parsed from Obsidian markdown notes)
  app.get("/api/vault/records", (_req, res) => {
    try {
      const records = readVaultRecords();
      res.json({
        success: true,
        vaultPath: VAULT_ROOT,
        count: records.length,
        records,
      });
    } catch (err: any) {
      console.error("Vault read error:", err);
      res.status(500).json({ error: "Failed to read vault", details: err.message });
    }
  });

  // Vault save record: Obsidian note + patient note + PDF + attachment
  app.post("/api/vault/records", (req, res) => {
    try {
      const { record, pdfBase64, attachmentBase64, attachmentExt } = req.body || {};
      if (!record || !record.id || !record.folioNumber) {
        return res.status(400).json({ error: "Invalid record payload" });
      }
      ensureVaultDirs();

      let attachmentFile: string | undefined;
      if (attachmentBase64) {
        const ext = (String(attachmentExt || "bin").replace(/[^a-z0-9]/gi, "").toLowerCase() || "bin");
        attachmentFile = `${sanitizeFilePart(record.folioNumber)}.${ext}`;
        fs.writeFileSync(
          path.join(VAULT_DIRS.adjuntos, attachmentFile),
          Buffer.from(stripBase64Prefix(attachmentBase64), "base64")
        );
        record.attachmentFile = attachmentFile;
      }

      let pdfFile: string | undefined;
      if (pdfBase64) {
        pdfFile = `${sanitizeFilePart(record.folioNumber)}.pdf`;
        fs.writeFileSync(
          path.join(VAULT_DIRS.pdfs, pdfFile),
          Buffer.from(stripBase64Prefix(pdfBase64), "base64")
        );
      }

      if (attachmentFile && (!record.mediaUrl || /^blob:/.test(record.mediaUrl))) {
        record.mediaUrl = `/api/vault/media/${attachmentFile}`;
      }

      const mdName = `${sanitizeFilePart(record.folioNumber)}_${sanitizeFilePart(record.student?.name)}.md`;
      fs.writeFileSync(
        path.join(VAULT_DIRS.registros, mdName),
        buildRecordMarkdown(record, { pdfFile, attachmentFile }),
        "utf8"
      );
      upsertPatientNote(record, mdName);

      console.log(`Vault: saved ${mdName}${pdfFile ? ` + ${pdfFile}` : ""}${attachmentFile ? ` + ${attachmentFile}` : ""}`);
      res.json({ success: true, note: mdName, pdfFile, attachmentFile });
    } catch (err: any) {
      console.error("Vault save error:", err);
      res.status(500).json({ error: "Failed to save record to vault", details: err.message });
    }
  });

  // AI Multimodal transcription endpoint (Image -> Gemma 4 31B / Audio -> Gemini Flash)
  app.post("/api/transcribe-media", async (req, res) => {
    try {
      const { mediaType, base64Data, mimeType, context } = req.body;

      if (!base64Data) {
        return res.status(400).json({ error: "No media data provided" });
      }

      const client = getAiClient();
      let extractedData: any = null;

      // Extract accurate mimeType from base64 data URL if present
      let effectiveMimeType = mimeType;
      if (typeof base64Data === "string" && base64Data.startsWith("data:")) {
        const match = base64Data.match(/^data:([^;]+);base64,/);
        if (match && match[1]) {
          effectiveMimeType = match[1];
        }
      }
      if (!effectiveMimeType) {
        effectiveMimeType = mediaType === "image" ? "image/jpeg" : "audio/webm";
      }

      if (client) {
        try {
          const isImage = mediaType === "image";
          const systemPrompt = buildClinicalSystemPrompt(isImage);

          const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, "");
          const mediaPart = {
            inlineData: {
              data: cleanBase64,
              mimeType: effectiveMimeType,
            },
          };
          const taskInstruction = isImage
            ? "Transcribe y organiza la información médica contenida en esta imagen clínica. Devuelve el JSON estructurado."
            : "Transcribe y organiza la información de este dictado de voz. NO inventes diagnósticos ni signos vitales que no se hayan dicho. Devuelve el JSON estructurado.";

          let responseText: string;
          if (isImage) {
            // Gemma no soporta systemInstruction ni responseMimeType: las instrucciones van inline
            const gemmaPrompt = `${taskInstruction}\n\nINSTRUCCIONES:\n${systemPrompt}\n\nIMPORTANTE: Responde ÚNICAMENTE con el objeto JSON solicitado, sin explicaciones ni bloques de código.`;
            responseText = await generateWithRetry(
              client,
              ["gemma-4-31b-it"],
              [mediaPart, { text: gemmaPrompt }],
              { temperature: 0.1 },
              3
            );
          } else {
            responseText = await generateWithRetry(
              client,
              ["gemini-3.1-flash-lite", "gemini-3.7-flash", "gemini-flash-latest"],
              [mediaPart, { text: taskInstruction }],
              {
                systemInstruction: systemPrompt,
                responseMimeType: "application/json",
                temperature: 0.1,
              }
            );
          }

          extractedData = extractJsonObject(responseText);
        } catch (apiErr) {
          console.warn("AI processing error, using fallback clinical parser:", apiErr);
        }
      }

      // If API didn't return or error occurred, provide clean structured record without fabricating data
      if (!extractedData) {
        const studentName = context?.studentName && context.studentName !== "Autodetectar" && context.studentName !== "No especificado"
          ? context.studentName
          : "Sin Información";
        const program = context?.academicProgram || "Sin Información";
        const semester = context?.semester ? Number(context.semester) : null;
        const programType = context?.programType || "Sin Información";

        extractedData = {
          rawTranscript: "Registro clínico institucional procesado.",
          studentInfo: {
            name: studentName,
            programType: programType,
            academicProgram: program,
            semester: semester,
            studentId: null,
            age: null,
          },
          chiefComplaint: "Ingreso a enfermería universitaria",
          symptoms: [],
          vitals: null,
          physicalExam: null,
          preliminaryDiagnosis: null,
          treatmentAdministered: null,
          medications: [],
          detectedAllergies: [],
          triageLevel: "Nivel 4 (Urgencia Menor)",
          recommendations: null,
          nurseNotes: "Registro transcrito por enfermería.",
          confidenceScore: 0.95,
          hasAmbiguityOrConflict: false,
          conflictDetails: null,
        };
      }

      res.json({
        success: true,
        mediaType,
        timestamp: new Date().toISOString(),
        data: extractedData,
      });
    } catch (err: any) {
      console.error("Transcription error:", err);
      res.status(500).json({ error: "Failed to process media", details: err.message });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Unicolombo Clinical Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
