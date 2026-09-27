# 🩺 Agente de Enfermería — Asistente Clínico Inteligente (Unicolombo)

[![React 19](https://img.shields.io/badge/React-19.0-61dafb)](https://react.dev/)
[![TailwindCSS v4](https://img.shields.io/badge/TailwindCSS-v4.0-38bdf8)](https://tailwindcss.com/)
[![Google GenAI SDK](https://img.shields.io/badge/Google_GenAI-Gemini-4285f4)](https://ai.google.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

**Autor y Titular:** Ingeniero Owen Badel Hooker  
**GitHub:** [OwenBadel](https://github.com/OwenBadel)  
**Repositorio Oficial:** [Agente_Enfermeria](https://github.com/OwenBadel/Agente_Enfermeria)  

---

Asistente clínico inteligente y sistema de gestión de valoración de enfermería universitaria para Unicolombo. Procesa dictados de voz en tiempo real y fotografías de recetas médicas manuscritas mediante Google Gemini AI, estructurando signos vitales, nivel de triage, medicamentos y diagnósticos para exportación directa a reportes PDF (jsPDF) y expedientes clínicos estructurados.

---

## 🏛️ Características Principales

* 🎙️ **Captura Rápida de Audio:** Grabación de dictados clínicos con WebRTC `MediaRecorder` y codificación Base64.
* 📷 **Digitalización de Fórmulas y Órdenes:** Carga de imágenes de notas manuscritas para extracción OCR multimodal.
* 🤖 **Motor de IA Multimodal (Google GenAI):** Pipeline con reintentos exponenciales y cadena de fallback (`gemini-2.5-flash`, `gemini-2.0-flash`).
* 📄 **Generación de Reportes PDF:** Emisión de expedientes institucionales con cabeceras vectoriales, insignias de triage y marcas de agua vía `jsPDF`.
* 🧠 **Integración con Obsidian:** Exportación directa a notas Markdown con Frontmatter Dataview y Callouts estilizados.
* 🎨 **Sistema de Diseño Visual UI/UX Institucional:** Paleta médica Deep Navy (`#00478d`), Clinical Teal (`#006a68`) y Active Cyan (`#79f2f0`).

---

## 📂 Estructura del Proyecto

```text
PROJ_002_Agente_Enfermeria/
├── server.ts                             <-- Backend Express & Pipeline Gemini GenAI
├── src/
│   ├── components/
│   │   ├── CapturaRapida.tsx            <-- Grabación de audio y subida de imágenes
│   │   ├── HistorialClinico.tsx         <-- Tabla interactiva y filtros de triage
│   │   ├── ClinicalPdfModal.tsx         <-- Visualizador y editor del reporte clínico
│   │   ├── Header.tsx                   <-- Branding y navegación
│   │   └── Sidebar.tsx                  <-- Navegación glassmorphic
│   ├── utils/
│   │   ├── pdfGenerator.ts              <-- Generador PDF en cliente
│   │   └── obsidianGenerator.ts         <-- Generador Markdown OKF para Obsidian
│   ├── types.ts                         <-- Definición de tipos TypeScript
│   ├── index.css                        <-- Tokens CSS y animaciones pulse-ring
│   └── App.tsx                          <-- Layout y orquestador de estado
├── ObsidianVault/                       <-- Bóveda de Obsidian integrada
│   ├── Pacientes/                       <-- Fichas individuales de pacientes
│   ├── Registros/                       <-- Expedientes clínicos Markdown
│   ├── PDFs/                            <-- Reportes generados
│   └── Adjuntos/                        <-- Grabaciones de audio y fotos
├── package.json                         <-- Dependencias npm
└── README.md                            <-- Documentación técnica
```

---

## 🚀 Instalación y Ejecución Local

### Prerrequisitos
* **Node.js:** v18.0 o superior
* **npm** o **bun**

### 1. Instalación de dependencias
```bash
npm install
```

### 2. Configuración de Variables de Entorno
Crea o edita el archivo `.env` en la raíz del proyecto:
```env
GEMINI_API_KEY=tu_clave_de_gemini_aqui
PORT=3000
```

### 3. Ejecución del Servidor y Frontend
```bash
npm run dev
```
La aplicación estará disponible en `http://localhost:3000` (o el puerto configurado por Vite).

---

## 🏛️ Arquitectura Técnica y Capacidades
* **Frontend React 19:** Componentes funcionales desacoplados con hooks de estado reactivo y TailwindCSS v4.
* **Procesamiento de Audio:** WebRTC MediaRecorder para captación estéreo y conversión fluida a payloads Base64.
* **Visión Multimodal:** Detección y transcripción de órdenes médicas manuscritas con Google Gemini Vision.
* **Emisión de Expedientes:** jsPDF con maquetación clínica vectorial e insignias de triage normativo.
