import React, { useState, useRef, useEffect } from "react";
import {
  Mic,
  Square,
  Camera,
  Upload,
  RefreshCw,
  Sparkles,
  FileAudio,
  Play,
  Pause,
  Zap,
} from "lucide-react";
import confetti from "canvas-confetti";
import { Student, ProgramType, ClinicalRecord } from "../types";
import { INITIAL_STUDENTS } from "../data/mockDatabase";
import { generateClinicalPdf } from "../utils/pdfGenerator";

interface CapturaRapidaProps {
  onRecordCreated: (record: ClinicalRecord) => void;
  onOpenPdfModal: (record: ClinicalRecord) => void;
}

export const CapturaRapida: React.FC<CapturaRapidaProps> = ({
  onRecordCreated,
  onOpenPdfModal,
}) => {
  // Media Capture state
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);

  // Image / Photo state
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);

  // AI Processing state
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [processingStatusText, setProcessingStatusText] = useState<string>(
    "Listo para capturar voz o imagen médica."
  );
  const [lastGeneratedRecord, setLastGeneratedRecord] = useState<ClinicalRecord | null>(null);

  // Audio recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const audioFileInputRef = useRef<HTMLInputElement | null>(null);

  // Handle Recording Timer
  useEffect(() => {
    if (isRecording) {
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  // Format seconds to mm:ss
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Start Audio Recording via Web Audio
  const startAudioRecording = async () => {
    try {
      setCapturedImage(null);
      setAudioBlob(null);
      setAudioUrl(null);
      audioChunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setProcessingStatusText("Grabando audio clínico... Describa síntomas, observaciones y diagnóstico.");
      setProgressPercent(15);
    } catch (err) {
      console.warn("Could not access microphone directly, using simulation:", err);
      setIsRecording(true);
    }
  };

  // Stop Recording
  const stopAudioRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setProgressPercent(45);
    setProcessingStatusText("Audio capturado. Listo para transcribir y estructurar.");
  };

  // Trigger Camera for Photo Capture
  const startCamera = async () => {
    try {
      setAudioBlob(null);
      setAudioUrl(null);
      setIsCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn("Camera not available, opening file picker instead:", err);
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        setCapturedImage(dataUrl);
      }
      const stream = videoRef.current.srcObject as MediaStream;
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      setIsCameraActive(false);
      setProgressPercent(45);
      setProcessingStatusText("Foto capturada. Lista para transcripción y análisis clínico.");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCapturedImage(event.target?.result as string);
        setAudioBlob(null);
        setAudioUrl(null);
        setProgressPercent(45);
        setProcessingStatusText(`Imagen cargada: ${file.name}. Lista para procesar.`);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAudioFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioBlob(file);
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      setCapturedImage(null);
      setProgressPercent(45);
      setProcessingStatusText(`Audio cargado: ${file.name}. Listo para procesar.`);
    }
  };

  // Convert Blob to Base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Process and Transcribe with Backend API
  const handleProcessMedia = async (forcedPreset?: "audio" | "image" | "conflict") => {
    setIsProcessing(true);
    setProgressPercent(40);
    setProcessingStatusText("Procesando y transcribiendo con IA... Extrayendo información médica...");

    try {
      let base64Data = "";
      let mediaType: "audio" | "image" = capturedImage ? "image" : "audio";
      let mimeType = capturedImage ? "image/jpeg" : "audio/webm";

      if (capturedImage) {
        mediaType = "image";
        base64Data = capturedImage;
        const mimeMatch = capturedImage.match(/^data:([^;]+);base64,/);
        if (mimeMatch && mimeMatch[1]) {
          mimeType = mimeMatch[1];
        }
      } else if (audioBlob) {
        mediaType = "audio";
        base64Data = await blobToBase64(audioBlob);
        mimeType = audioBlob.type || "audio/webm";
      } else if (forcedPreset === "image") {
        mediaType = "image";
        base64Data = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
      } else {
        mediaType = "audio";
        base64Data = "data:audio/webm;base64,GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQRChYECGFOAZwEAAAAAA";
      }

      const progressInterval = setInterval(() => {
        setProgressPercent((p) => {
          if (p < 85) return p + 10;
          return p;
        });
      }, 400);

      const response = await fetch("/api/transcribe-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaType,
          base64Data,
          mimeType,
        }),
      });

      clearInterval(progressInterval);

      const result = await response.json();
      const extracted = result.data || {};

      setProgressPercent(95);
      setProcessingStatusText("Generando expediente clínico y reporte en PDF...");

      await new Promise((r) => setTimeout(r, 600));

      const folio = `UNI-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      
      const rawName = (extracted.studentInfo?.name || "").trim();
      const hasValidName = rawName && rawName !== "Sin Información" && rawName !== "null" && rawName !== "undefined";
      const studentName = hasValidName ? rawName : "Sin Información";

      // Check if student exists in initial directory for avatar/details match if any
      const existingMatch = hasValidName
        ? INITIAL_STUDENTS.find((s) => s.name.toLowerCase() === rawName.toLowerCase())
        : null;

      let assignedStudent: Student;

      if (existingMatch) {
        assignedStudent = existingMatch;
      } else {
        assignedStudent = {
          id: `stu-${Date.now()}`,
          name: studentName,
          programType: (extracted.studentInfo?.programType as ProgramType) || "Profesional",
          academicProgram: extracted.studentInfo?.academicProgram && extracted.studentInfo.academicProgram !== "Sin Información"
            ? extracted.studentInfo.academicProgram
            : "Sin Información",
          semester: Number(extracted.studentInfo?.semester) || 0,
          studentCode: extracted.studentInfo?.studentId || "",
          age: Number(extracted.studentInfo?.age) || 0,
          gender: "M",
          allergies: extracted.detectedAllergies || [],
          emergencyContact: {
            name: "Sin Información",
            relationship: "Familiar",
            phone: "",
          },
        };
      }

      const newRecord: ClinicalRecord = {
        id: `rec-${Date.now()}`,
        folioNumber: folio,
        timestamp: new Date().toISOString(),
        mediaType,
        mediaUrl: audioUrl || capturedImage || undefined,
        audioDuration: audioBlob ? formatTime(recordingTime) || "0:18" : undefined,
        rawTranscript: extracted.rawTranscript || "",
        aiModelUsed: mediaType === "image" ? "Captura Visual" : "Dictado de Voz",
        student: assignedStudent,
        chiefComplaint: extracted.chiefComplaint || undefined,
        symptoms: extracted.symptoms && extracted.symptoms.length > 0 ? extracted.symptoms : undefined,
        vitals: extracted.vitals || undefined,
        physicalExam: extracted.physicalExam || undefined,
        preliminaryDiagnosis: extracted.preliminaryDiagnosis || undefined,
        treatmentAdministered: extracted.treatmentAdministered || undefined,
        medications: extracted.medications || [],
        detectedAllergies: extracted.detectedAllergies || [],
        triageLevel: extracted.triageLevel || "Nivel 4 (Urgencia Menor)",
        recommendations: extracted.recommendations || undefined,
        nurseNotes: extracted.nurseNotes || undefined,
        nurseName: "Enfermera",
        nurseLicense: "ENF-COL-48921",
        status: "Completado",
        hasConflict: false,
        jsonStructure: extracted,
      };

      // Persist to Obsidian Vault: clinical note (.md) + PDF + media attachment
      try {
        let pdfBase64: string | undefined;
        try {
          const pdfDoc = generateClinicalPdf(newRecord, false);
          const dataUri: string = (pdfDoc as any).output("datauristring");
          pdfBase64 = dataUri.substring(dataUri.indexOf("base64,") + 7);
        } catch (pdfErr) {
          console.warn("Could not generate vault PDF copy:", pdfErr);
        }

        let attachmentBase64: string | undefined;
        let attachmentExt: string | undefined;
        if (capturedImage) {
          attachmentBase64 = capturedImage;
          const mimeMatch = capturedImage.match(/^data:image\/([a-z0-9+.-]+);/i);
          attachmentExt = mimeMatch ? (mimeMatch[1].toLowerCase() === "jpeg" ? "jpg" : mimeMatch[1].toLowerCase()) : "png";
        } else if (audioBlob) {
          attachmentBase64 = await blobToBase64(audioBlob);
          const type = (audioBlob.type || "").toLowerCase();
          attachmentExt = type.includes("mpeg") ? "mp3" : type.includes("ogg") ? "ogg" : type.includes("wav") ? "wav" : "webm";
        }

        await fetch("/api/vault/records", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ record: newRecord, pdfBase64, attachmentBase64, attachmentExt }),
        });
      } catch (vaultErr) {
        console.warn("Could not persist record to Obsidian vault:", vaultErr);
      }

      setProgressPercent(100);
      setProcessingStatusText("¡Registro procesado con éxito! Listo para consultar o descargar PDF.");
      setLastGeneratedRecord(newRecord);
      onRecordCreated(newRecord);

      // Confetti effect
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
      });
    } catch (err: any) {
      console.error(err);
      setProgressPercent(100);
      setProcessingStatusText("Error en procesamiento. Verifique el archivo e intente nuevamente.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div id="captura-rapida-container" className="flex flex-col gap-6 w-full animate-in fade-in duration-200">
      
      {/* Hidden file inputs */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />
      <input
        type="file"
        ref={audioFileInputRef}
        accept="audio/*"
        onChange={handleAudioFileUpload}
        className="hidden"
      />

      {/* Main Header */}
      <div className="flex flex-col gap-1 max-w-4xl mx-auto w-full">
        <h2 className="text-3xl font-extrabold text-[#191c1d] tracking-tight">
          Captura Rápida
        </h2>
        <p className="text-base text-[#424752]">
          Capture la consulta médica mediante transcripción de audio o análisis de imagen/receta médica. La IA extraerá y estructurará automáticamente el reporte clínico.
        </p>
      </div>

      {/* Centered Focused Capture Layout */}
      <div className="w-full max-w-4xl mx-auto flex flex-col gap-6">
        
        {/* Multimodal Input Card */}
        <div className="bg-white rounded-2xl border border-[#c2c6d4] shadow-xs p-6 sm:p-10 flex flex-col items-center justify-center min-h-[440px] relative overflow-hidden">
          
          {/* Subtle decorative background */}
          <div
            className="absolute inset-0 opacity-5 pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(circle at 50% 50%, #006a68 0%, transparent 60%)",
            }}
          />

          {/* If Camera stream is open */}
          {isCameraActive ? (
            <div className="w-full max-w-lg flex flex-col items-center gap-4 z-10">
              <div className="relative rounded-2xl overflow-hidden border-2 border-[#006a68] w-full bg-black aspect-video flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                  EN VIVO
                </div>
              </div>
              <div className="flex items-center gap-3 w-full">
                <button
                  onClick={capturePhoto}
                  className="flex-1 py-3.5 bg-[#006a68] hover:bg-[#00504f] text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  <Camera className="w-5 h-5" />
                  <span>Tomar Foto Clínica</span>
                </button>
                <button
                  onClick={() => {
                    if (videoRef.current && videoRef.current.srcObject) {
                      (videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
                    }
                    setIsCameraActive(false);
                  }}
                  className="px-5 py-3.5 bg-[#e7e8e9] text-[#424752] font-semibold rounded-xl hover:bg-[#d9dadb] transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : capturedImage ? (
            /* If Image is already captured or uploaded */
            <div className="w-full max-w-lg flex flex-col items-center gap-5 z-10">
              <div className="relative rounded-xl overflow-hidden border border-[#c2c6d4] max-h-72 shadow-xs w-full flex items-center justify-center bg-[#f8f9fa]">
                <img
                  src={capturedImage}
                  alt="Captura médica"
                  className="w-full h-auto object-contain max-h-72 rounded-xl"
                />
                <span className="absolute top-3 right-3 bg-[#00478d] text-white text-xs font-bold px-2.5 py-1 rounded-md shadow-xs">
                  Imagen Lista para Procesar
                </span>
              </div>

              <div className="flex items-center gap-3 w-full">
                <button
                  onClick={() => handleProcessMedia()}
                  disabled={isProcessing}
                  className="flex-1 py-3.5 bg-[#00478d] hover:bg-[#003870] text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
                >
                  <Sparkles className="w-5 h-5 text-[#79f2f0]" />
                  <span>{isProcessing ? "Transcribiendo y analizando imagen..." : "Transcribir y Generar Reporte"}</span>
                </button>

                <button
                  onClick={() => setCapturedImage(null)}
                  className="px-4 py-3.5 bg-[#e7e8e9] hover:bg-[#d9dadb] text-[#ba1a1a] text-xs font-bold rounded-xl transition-colors"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ) : audioUrl ? (
            /* If Audio recording is ready for processing */
            <div className="w-full max-w-lg flex flex-col items-center gap-5 z-10">
              <div className="w-full bg-[#f3f4f5] p-5 rounded-2xl border border-[#c2c6d4] flex items-center gap-4">
                <button
                  onClick={() => {
                    if (!audioPlayerRef.current) return;
                    if (isPlayingAudio) {
                      audioPlayerRef.current.pause();
                      setIsPlayingAudio(false);
                    } else {
                      audioPlayerRef.current.play();
                      setIsPlayingAudio(true);
                    }
                  }}
                  className="w-12 h-12 rounded-full bg-[#006a68] text-white flex items-center justify-center shadow-xs hover:bg-[#00504f] transition-all flex-shrink-0"
                >
                  {isPlayingAudio ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#191c1d]">
                    <span>Grabación de Dictado Clínico</span>
                    <span className="font-mono text-[#006a68]">{formatTime(recordingTime) || "0:18"}</span>
                  </div>
                  <audio
                    ref={audioPlayerRef}
                    src={audioUrl}
                    onEnded={() => setIsPlayingAudio(false)}
                    className="hidden"
                  />
                  <div className="w-full h-2 bg-[#e1e3e4] rounded-full mt-2.5 overflow-hidden">
                    <div className="h-full bg-[#006a68] w-full rounded-full animate-pulse" />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full">
                <button
                  onClick={() => handleProcessMedia()}
                  disabled={isProcessing}
                  className="flex-1 py-3.5 bg-[#00478d] hover:bg-[#003870] text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
                >
                  <Sparkles className="w-5 h-5 text-[#79f2f0]" />
                  <span>{isProcessing ? "Transcribiendo audio..." : "Transcribir y Generar Reporte"}</span>
                </button>

                <button
                  onClick={() => {
                    setAudioBlob(null);
                    setAudioUrl(null);
                  }}
                  className="px-4 py-3.5 bg-[#e7e8e9] hover:bg-[#d9dadb] text-[#ba1a1a] text-xs font-bold rounded-xl transition-colors"
                >
                  Re-grabar
                </button>
              </div>
            </div>
          ) : (
            /* Default State: Recording Button & Media Capture Options */
            <div className="flex flex-col items-center gap-6 z-10 w-full max-w-lg">
              
              {/* Audio Button (Primary Action) */}
              <div className="flex flex-col items-center gap-3">
                <button
                  id="btn-record-audio-main"
                  onClick={isRecording ? stopAudioRecording : startAudioRecording}
                  className={`w-36 h-36 rounded-full flex items-center justify-center shadow-md transition-all duration-200 active:scale-95 ${
                    isRecording
                      ? "bg-red-600 text-white recording-pulse scale-105"
                      : "bg-[#006a68] text-white hover:bg-[#00504f] pulse-animation"
                  }`}
                >
                  {isRecording ? (
                    <Square className="w-14 h-14 fill-current" />
                  ) : (
                    <Mic className="w-16 h-16" />
                  )}
                </button>

                <span className="font-extrabold text-2xl text-[#191c1d] mt-1">
                  {isRecording ? `Grabando... (${formatTime(recordingTime)})` : "Grabar Audio"}
                </span>
                <span className="text-sm text-[#424752] text-center max-w-sm">
                  {isRecording
                    ? "Hable con claridad describiendo la consulta, síntomas, medicación o signos..."
                    : "Presione para dictar los detalles de la consulta clínica."}
                </span>

                {isRecording && (
                  <button
                    onClick={stopAudioRecording}
                    className="mt-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-full shadow-sm flex items-center gap-1.5 animate-bounce"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Terminar Grabación</span>
                  </button>
                )}
              </div>

              {/* Divider 'O' */}
              <div className="w-full flex items-center gap-4 my-2">
                <div className="flex-1 h-px bg-[#c2c6d4]" />
                <span className="text-xs font-bold text-[#727783] uppercase tracking-wider">
                  O ADJUNTAR DOCUMENTO / IMAGEN
                </span>
                <div className="flex-1 h-px bg-[#c2c6d4]" />
              </div>

              {/* Camera & Upload Options */}
              <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  id="btn-capture-photo-main"
                  onClick={startCamera}
                  className="py-3.5 px-4 rounded-xl border-2 border-dashed border-[#c2c6d4] hover:border-[#006a68] hover:bg-[#e0f7f6]/40 transition-all flex items-center justify-center gap-2 text-[#424752] hover:text-[#006a68] font-bold text-xs sm:text-sm"
                >
                  <Camera className="w-4 h-4 text-[#006a68]" />
                  <span>Tomar Foto</span>
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="py-3.5 px-4 rounded-xl border border-[#c2c6d4] bg-[#f3f4f5] hover:bg-[#e7e8e9] text-[#424752] font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors"
                  title="Subir archivo de imagen o receta"
                >
                  <Upload className="w-4 h-4" />
                  <span>Subir Imagen</span>
                </button>

                <button
                  onClick={() => audioFileInputRef.current?.click()}
                  className="py-3.5 px-4 rounded-xl border border-[#c2c6d4] bg-[#f3f4f5] hover:bg-[#e7e8e9] text-[#424752] font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors"
                  title="Subir archivo de audio pre-grabado"
                >
                  <FileAudio className="w-4 h-4" />
                  <span>Subir Audio</span>
                </button>
              </div>

            </div>
          )}

        </div>

        {/* Processing Status Card */}
        <div
          id="processing-status-card"
          className="bg-white rounded-2xl border border-[#c2c6d4] p-4 sm:p-5 flex items-center gap-4 shadow-xs"
        >
          <div className="w-12 h-12 flex-shrink-0 bg-[#f3f4f5] rounded-full flex items-center justify-center text-[#006a68]">
            <RefreshCw
              className={`w-6 h-6 ${isProcessing ? "animate-spin text-[#006a68]" : "text-[#727783]"}`}
            />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex justify-between mb-1.5 items-center">
              <span className="text-xs font-bold text-[#006a68] uppercase tracking-wide">
                Estado de Procesamiento
              </span>
              <span className="font-mono text-xs font-bold text-[#191c1d]">
                {progressPercent}%
              </span>
            </div>

            <div className="w-full h-2 bg-[#e1e3e4] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#006a68] rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <p className="text-xs text-[#424752] mt-2 truncate">
              {processingStatusText}
            </p>
          </div>

          {lastGeneratedRecord && (
            <button
              onClick={() => onOpenPdfModal(lastGeneratedRecord)}
              className="hidden sm:flex px-4 py-2.5 bg-[#00478d] hover:bg-[#003870] text-white text-xs font-bold rounded-xl items-center gap-2 shadow-xs transition-colors"
            >
              <Zap className="w-4 h-4 text-[#79f2f0]" />
              <span>Ver Reporte PDF</span>
            </button>
          )}
        </div>

      </div>

    </div>
  );
};
