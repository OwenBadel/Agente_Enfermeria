export type ProgramType = "Tecnológico" | "Profesional" | "Inglés";

export type TriageLevel =
  | "Nivel 1 (Resucitación)"
  | "Nivel 2 (Emergencia)"
  | "Nivel 3 (Urgencia)"
  | "Nivel 4 (Urgencia Menor)"
  | "Nivel 5 (No Urgente)";

export interface Student {
  id: string;
  name: string;
  programType: ProgramType;
  academicProgram: string;
  semester: number;
  studentCode: string;
  age: number;
  gender: "M" | "F" | "Otro";
  allergies: string[];
  chronicConditions?: string[];
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  avatarUrl?: string;
}

export interface MedicationItem {
  name: string;
  dose: string;
  route: string;
  frequency?: string;
  administeredAt?: string;
}

export interface ClinicalVitals {
  bloodPressure?: string; // e.g. "120/80 mmHg"
  heartRate?: number; // bpm
  temperature?: number; // °C
  oxygenSaturation?: number; // %
  bloodGlucose?: number; // mg/dL
  weight?: number; // kg
  height?: number; // cm
}

export interface ClinicalRecord {
  id: string;
  folioNumber: string;
  timestamp: string;
  mediaType: "audio" | "image" | "manual";
  mediaUrl?: string;
  audioDuration?: string;
  rawTranscript: string;
  aiModelUsed: string;
  student: Student;
  chiefComplaint: string; // Motivo de consulta
  symptoms: string[];
  vitals: ClinicalVitals;
  physicalExam: string;
  preliminaryDiagnosis: string;
  treatmentAdministered: string;
  medications: MedicationItem[];
  detectedAllergies: string[];
  triageLevel: TriageLevel;
  recommendations: string;
  nurseNotes: string;
  nurseName: string;
  nurseLicense: string;
  status: "Completado" | "En Revisión" | "Conflicto" | "Derivado";
  hasConflict?: boolean;
  conflictData?: {
    reason: string;
    candidates: Student[];
  };
  obsidianMarkdown?: string;
  attachmentFile?: string;
  jsonStructure?: any;
}

export interface ConflictReviewItem {
  id: string;
  recordId: string;
  timestamp: string;
  timeAgo: string;
  mediaType: "audio" | "image";
  audioUrl?: string;
  audioDuration?: string;
  transcriptSnippet: string;
  highlightWords: string[];
  detectedEntity: string;
  candidates: Student[];
  selectedStudentId?: string;
  status: "pending" | "resolved" | "ignored";
  fullRecord: ClinicalRecord;
}
