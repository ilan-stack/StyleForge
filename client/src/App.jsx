import { useState, useEffect, useRef, useCallback } from "react";
import * as api from "./api.js";

// ─── Prompt Templates & Scene Builder Data ──────────

const SCENE_TEMPLATES = [
  { label: "Portrait", icon: "P", desc: "A single person or face", prompt: "portrait of a person" },
  { label: "Two People", icon: "2P", desc: "Two people together", prompt: "two people standing together" },
  { label: "Landscape", icon: "L", desc: "A natural scene", prompt: "a beautiful landscape" },
  { label: "Street Scene", icon: "S", desc: "People in a city or town", prompt: "a street scene with people walking" },
  { label: "Indoor Scene", icon: "I", desc: "Inside a room or building", prompt: "an indoor scene" },
  { label: "Animals", icon: "A", desc: "An animal or pet", prompt: "an animal" },
  { label: "Still Life", icon: "SL", desc: "Objects on a table", prompt: "a still life arrangement of objects" },
  { label: "Free Write", icon: "...", desc: "Describe anything you want", prompt: "" },
];

const MOODS = [
  { label: "Happy", value: "happy, cheerful, warm lighting" },
  { label: "Calm", value: "calm, peaceful, serene" },
  { label: "Dramatic", value: "dramatic, intense, bold" },
  { label: "Mysterious", value: "mysterious, moody, shadows" },
  { label: "Playful", value: "playful, fun, colorful" },
  { label: "Sad", value: "melancholic, somber, quiet" },
];

const SETTINGS = [
  { label: "Outdoors", value: "outdoors, natural setting" },
  { label: "City", value: "in a city, urban environment" },
  { label: "Home", value: "in a cozy home interior" },
  { label: "Nature", value: "surrounded by nature, trees and flowers" },
  { label: "Beach", value: "at the beach, ocean waves" },
  { label: "Studio", value: "plain background, studio setting" },
];

// ─── Styles ──────────────────────────────────────────

const globalStyles = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Inter', -apple-system, sans-serif;
    background: #0a0a0f;
    color: #e0e0e8;
    min-height: 100vh;
  }
  ::selection { background: #7c3aed55; }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`;

const css = {
  app: {
    maxWidth: 960,
    margin: "0 auto",
    padding: "32px 24px",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 40,
    paddingBottom: 20,
    borderBottom: "1px solid #1a1a2e",
  },
  logo: {
    fontSize: 28,
    fontWeight: 700,
    background: "linear-gradient(135deg, #7c3aed, #c084fc)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    cursor: "pointer",
  },
  btn: {
    padding: "10px 20px",
    borderRadius: 10,
    border: "none",
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer",
    transition: "all 0.2s",
    fontFamily: "inherit",
  },
  btnPrimary: {
    background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
    color: "#fff",
  },
  btnSecondary: {
    background: "#1a1a2e",
    color: "#c084fc",
    border: "1px solid #2a2a4e",
  },
  btnDanger: {
    background: "#1a1a2e",
    color: "#f87171",
    border: "1px solid #2a1a1a",
  },
  card: {
    background: "#12121e",
    borderRadius: 16,
    border: "1px solid #1a1a2e",
    padding: 24,
    marginBottom: 16,
  },
  input: {
    width: "100%",
    padding: "12px 16px",
    borderRadius: 10,
    border: "1px solid #2a2a4e",
    background: "#0a0a14",
    color: "#e0e0e8",
    fontSize: 15,
    fontFamily: "inherit",
    outline: "none",
  },
  textarea: {
    width: "100%",
    padding: "12px 16px",
    borderRadius: 10,
    border: "1px solid #2a2a4e",
    background: "#0a0a14",
    color: "#e0e0e8",
    fontSize: 15,
    fontFamily: "inherit",
    outline: "none",
    resize: "vertical",
    minHeight: 80,
  },
  badge: {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
    textTransform: "uppercase",
  },
  imageGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
    gap: 12,
    marginTop: 16,
  },
  imageThumb: {
    width: "100%",
    aspectRatio: "1",
    objectFit: "cover",
    borderRadius: 10,
    border: "2px solid #1a1a2e",
  },
  genGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
    gap: 16,
    marginTop: 20,
  },
  genImage: {
    width: "100%",
    borderRadius: 12,
    border: "1px solid #1a1a2e",
  },
  dropZone: (isDragging) => ({
    border: `2px dashed ${isDragging ? "#7c3aed" : "#2a2a4e"}`,
    borderRadius: 16,
    padding: 48,
    textAlign: "center",
    cursor: "pointer",
    transition: "all 0.2s",
    background: isDragging ? "#7c3aed11" : "transparent",
  }),
  sectionTitle: {
    fontSize: 18,
    fontWeight: 600,
    marginBottom: 12,
    color: "#c8c8d8",
  },
  label: {
    display: "block",
    fontSize: 13,
    fontWeight: 500,
    color: "#888",
    marginBottom: 6,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    background: "#1a1a2e",
    overflow: "hidden",
    marginTop: 12,
  },
  progressFill: (pct) => ({
    height: "100%",
    width: `${pct}%`,
    background: "linear-gradient(90deg, #7c3aed, #c084fc)",
    transition: "width 0.5s ease",
  }),
};

// ─── StatusBadge ─────────────────────────────────────

function StatusBadge({ status }) {
  const colors = {
    not_started: { bg: "#1a1a2e", color: "#666" },
    starting: { bg: "#1a1a2e", color: "#facc15" },
    processing: { bg: "#1a1a2e", color: "#38bdf8" },
    succeeded: { bg: "#052e16", color: "#4ade80" },
    failed: { bg: "#2a1a1a", color: "#f87171" },
  };
  const c = colors[status] || colors.not_started;
  return (
    <span style={{ ...css.badge, background: c.bg, color: c.color }}>
      {status === "processing" ? "Training..." : status?.replace("_", " ")}
    </span>
  );
}

// ─── ProjectList ─────────────────────────────────────

function ProjectList({ onSelect, onCreate }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.fetchProjects().then((p) => {
      setProjects(p);
      setLoading(false);
    });
  }, []);

  const handleDeleteProject = async (e, projectId) => {
    e.stopPropagation();
    if (!confirm("Delete this project and all its images?")) return;
    await api.deleteProject(projectId);
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
  };

  if (loading) return <p style={{ color: "#666" }}>Loading...</p>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 600 }}>Your Style Projects</h2>
        <button style={{ ...css.btn, ...css.btnPrimary }} onClick={onCreate}>
          + New Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div style={{ ...css.card, textAlign: "center", padding: 60 }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>&#127912;</p>
          <p style={{ color: "#888", marginBottom: 20 }}>No style projects yet</p>
          <button style={{ ...css.btn, ...css.btnPrimary }} onClick={onCreate}>
            Create Your First Style
          </button>
        </div>
      ) : (
        projects.map((p) => (
          <div
            key={p.id}
            style={{ ...css.card, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
            onClick={() => onSelect(p.id)}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#7c3aed")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#1a1a2e")}
          >
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>{p.name}</h3>
              <span style={{ fontSize: 13, color: "#666" }}>
                {p.images.length} images &middot; trigger: <code style={{ color: "#c084fc" }}>{p.triggerWord}</code>
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <StatusBadge status={p.training?.status || "not_started"} />
              <button
                onClick={(e) => handleDeleteProject(e, p.id)}
                title="Delete project"
                style={{
                  ...css.btn,
                  ...css.btnDanger,
                  padding: "6px 12px",
                  fontSize: 13,
                }}
              >
                Delete
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ─── NewProject ──────────────────────────────────────

function NewProject({ onCreated, onCancel }) {
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    setCreating(true);
    const project = await api.createProject(name || "Untitled Style", trigger || undefined);
    onCreated(project.id);
  };

  return (
    <div style={css.card}>
      <h2 style={{ ...css.sectionTitle, marginBottom: 20 }}>New Style Project</h2>
      <div style={{ marginBottom: 16 }}>
        <label style={css.label}>Project Name</label>
        <input
          style={css.input}
          placeholder="e.g. Watercolor Landscapes, Anime Portraits..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
      </div>
      <div style={{ marginBottom: 24 }}>
        <label style={css.label}>Trigger Word (optional)</label>
        <input
          style={css.input}
          placeholder="e.g. WTRCLR01 (auto-generated if empty)"
          value={trigger}
          onChange={(e) => setTrigger(e.target.value.toUpperCase().replace(/\s/g, "_"))}
        />
        <p style={{ fontSize: 12, color: "#555", marginTop: 6 }}>
          A unique word used in prompts to activate your style. Should not be a real word.
        </p>
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <button style={{ ...css.btn, ...css.btnPrimary }} onClick={handleCreate} disabled={creating}>
          {creating ? "Creating..." : "Create Project"}
        </button>
        <button style={{ ...css.btn, ...css.btnSecondary }} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── SpeechButton (Web Speech API) ───────────────────

function SpeechButton({ onResult, style: extraStyle }) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  const supported = typeof window !== "undefined" &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);

  const toggle = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      onResult(text);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  if (!supported) return null;

  return (
    <button
      onClick={toggle}
      title={listening ? "Listening... click to stop" : "Speak your description"}
      style={{
        width: 48,
        height: 48,
        borderRadius: 12,
        border: `2px solid ${listening ? "#ef4444" : "#2a2a4e"}`,
        background: listening ? "#ef444422" : "#0a0a14",
        color: listening ? "#ef4444" : "#888",
        cursor: "pointer",
        fontSize: 22,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        transition: "all 0.2s",
        animation: listening ? "pulse 1.2s infinite" : "none",
        ...extraStyle,
      }}
    >
      {listening ? "\u23F9" : "\uD83C\uDF99"}
    </button>
  );
}

// ─── SketchCanvas ────────────────────────────────────

function SketchCanvas({ onSketchChange }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(6);
  const [brushColor, setBrushColor] = useState("#ffffff");
  const [hasDrawn, setHasDrawn] = useState(false);
  const [enabled, setEnabled] = useState(false);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (e) => {
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const pos = getPos(e);
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = brushColor;
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDraw = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (hasDrawn) {
      onSketchChange(canvasRef.current.toDataURL("image/png"));
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    onSketchChange(null);
  };

  useEffect(() => {
    if (enabled && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#111";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, [enabled]);

  if (!enabled) {
    return (
      <div style={{ ...css.card, textAlign: "center", padding: "20px 24px" }}>
        <button
          onClick={() => setEnabled(true)}
          style={{
            background: "none",
            border: "2px dashed #2a2a4e",
            borderRadius: 14,
            padding: "20px 30px",
            cursor: "pointer",
            color: "#888",
            fontSize: 15,
            fontFamily: "inherit",
            width: "100%",
            transition: "all 0.2s",
          }}
        >
          <span style={{ fontSize: 24, display: "block", marginBottom: 6 }}>&#9998;</span>
          Add a rough sketch (optional)
          <span style={{ display: "block", fontSize: 12, color: "#555", marginTop: 4 }}>
            Draw a simple sketch and the AI will use it as a guide
          </span>
        </button>
      </div>
    );
  }

  const colors = ["#ffffff", "#ff4444", "#4488ff", "#44cc44", "#ffaa00", "#cc44cc", "#000000"];

  return (
    <div style={css.card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: "#e0e0e8" }}>
          Sketch a guide (optional)
        </h3>
        <button
          onClick={() => { setEnabled(false); onSketchChange(null); }}
          style={{ ...css.btn, ...css.btnSecondary, padding: "6px 14px", fontSize: 12 }}
        >
          Remove sketch
        </button>
      </div>
      <p style={{ fontSize: 13, color: "#666", marginBottom: 12 }}>
        Draw roughly — the AI will transform it into your art style
      </p>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={512}
        height={512}
        style={{
          width: "100%",
          maxWidth: 512,
          aspectRatio: "1",
          borderRadius: 12,
          border: "2px solid #2a2a4e",
          cursor: "crosshair",
          touchAction: "none",
          display: "block",
          margin: "0 auto",
        }}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={stopDraw}
        onMouseLeave={stopDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={stopDraw}
      />

      {/* Brush controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 14, flexWrap: "wrap" }}>
        {/* Colors */}
        <div style={{ display: "flex", gap: 6 }}>
          {colors.map((c) => (
            <button
              key={c}
              onClick={() => setBrushColor(c)}
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                border: `3px solid ${brushColor === c ? "#7c3aed" : "#2a2a4e"}`,
                background: c,
                cursor: "pointer",
              }}
            />
          ))}
        </div>

        {/* Brush size */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {[3, 6, 12, 20].map((s) => (
            <button
              key={s}
              onClick={() => setBrushSize(s)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                border: `2px solid ${brushSize === s ? "#7c3aed" : "#2a2a4e"}`,
                background: brushSize === s ? "#7c3aed22" : "transparent",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div style={{
                width: Math.max(s, 4),
                height: Math.max(s, 4),
                borderRadius: "50%",
                background: "#e0e0e8",
              }} />
            </button>
          ))}
        </div>

        {/* Clear */}
        <button
          onClick={clearCanvas}
          style={{ ...css.btn, ...css.btnDanger, padding: "8px 16px", fontSize: 13 }}
        >
          Clear
        </button>
      </div>
    </div>
  );
}

// ─── ProjectDetail ───────────────────────────────────

function ProjectDetail({ projectId, onBack }) {
  const [project, setProject] = useState(null);
  const [tab, setTab] = useState("upload"); // upload | train | generate
  const fileRef = useRef(null);
  const sketchRef = useRef(null); // holds sketch data URL for img2img
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [training, setTraining] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [numImages, setNumImages] = useState(2);
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [loraScale, setLoraScale] = useState(1.15);
  const [guidanceScale, setGuidanceScale] = useState(3.5);
  const [faceRestore, setFaceRestore] = useState(true);
  const [colorMode, setColorMode] = useState("bw"); // "bw" or "color"
  const [suppressText, setSuppressText] = useState(true); // suppress garbled text
  const [faceFidelity, setFaceFidelity] = useState(0.4); // lower = stronger face fix
  const [usePulidFace, setUsePulidFace] = useState(true); // PuLID face identity for known figures
  const [trainers, setTrainers] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedMood, setSelectedMood] = useState(null);
  const [selectedSetting, setSelectedSetting] = useState(null);
  const [extraDetails, setExtraDetails] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedTrainer, setSelectedTrainer] = useState("ostris-flux-dev");
  const [wantsRetrain, setWantsRetrain] = useState(false);

  const load = useCallback(async () => {
    const p = await api.getProject(projectId);
    setProject(p);
    return p;
  }, [projectId]);

  useEffect(() => {
    load();
    api.fetchTrainers().then(setTrainers);
  }, [load]);

  // Poll training status
  useEffect(() => {
    if (project?.training?.status !== "processing" && project?.training?.status !== "starting") return;
    const interval = setInterval(async () => {
      const status = await api.getTrainingStatus(projectId);
      setProject((prev) => ({ ...prev, training: status }));
      if (status.status === "succeeded" || status.status === "failed") {
        clearInterval(interval);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [project?.training?.status, projectId]);

  const handleUpload = async (files) => {
    if (!files.length) return;
    setUploading(true);
    await api.uploadImages(projectId, files);
    await load();
    setUploading(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleUpload([...e.dataTransfer.files]);
  };

  const handleTrain = async () => {
    setTraining(true);
    try {
      await api.startTraining(projectId, selectedTrainer);
      await load();
      setTab("train");
    } catch (err) {
      alert(err.message);
    }
    setTraining(false);
  };

  // Build the final prompt from template + mood + setting + extra details
  const buildPrompt = () => {
    if (prompt.trim()) return prompt; // free-text overrides
    const parts = [];
    if (selectedTemplate && selectedTemplate.prompt) parts.push(selectedTemplate.prompt);
    if (selectedSetting) parts.push(selectedSetting.value);
    if (selectedMood) parts.push(selectedMood.value);
    if (extraDetails.trim()) parts.push(extraDetails.trim());
    return parts.join(", ");
  };

  const canGenerate = buildPrompt().length > 0;

  const handleGenerate = async () => {
    const finalPrompt = buildPrompt();
    if (!finalPrompt) return;
    setGenerating(true);
    try {
      const opts = { numImages, aspectRatio, loraScale, guidanceScale, faceRestore, faceFidelity, colorMode, suppressText, usePulidFace };
      if (sketchRef.current) {
        opts.sketchImage = sketchRef.current;
        console.log("Sending sketch, data length:", sketchRef.current.length);
      }
      await api.generateImages(projectId, finalPrompt, opts);
      await load();
    } catch (err) {
      alert(err.message);
    }
    setGenerating(false);
  };

  const handleDeleteImage = async (filename) => {
    await api.deleteImage(projectId, filename);
    await load();
  };

  const handleDeleteGeneration = async (genId) => {
    await api.deleteGeneration(projectId, genId);
    await load();
  };

  if (!project) return <p style={{ color: "#666" }}>Loading...</p>;

  const isReady = project.training?.status === "succeeded";
  const isTraining = project.training?.status === "processing" || project.training?.status === "starting";

  const tabs = [
    { id: "upload", label: `Images (${project.images.length})` },
    { id: "train", label: "Train" },
    { id: "generate", label: "Generate", disabled: !isReady },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <button
          style={{ ...css.btn, ...css.btnSecondary, padding: "8px 14px" }}
          onClick={onBack}
        >
          &larr;
        </button>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 600 }}>{project.name}</h2>
          <span style={{ fontSize: 13, color: "#666" }}>
            trigger: <code style={{ color: "#c084fc" }}>{project.triggerWord}</code>
          </span>
        </div>
        <div style={{ marginLeft: "auto" }}>
          <StatusBadge status={project.training?.status || "not_started"} />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "#0a0a14", borderRadius: 12, padding: 4 }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            style={{
              ...css.btn,
              flex: 1,
              background: tab === t.id ? "#1a1a2e" : "transparent",
              color: tab === t.id ? "#c084fc" : "#666",
              opacity: t.disabled ? 0.4 : 1,
              pointerEvents: t.disabled ? "none" : "auto",
            }}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Upload Tab */}
      {tab === "upload" && (
        <div>
          <div
            style={css.dropZone(isDragging)}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
          >
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              style={{ display: "none" }}
              onChange={(e) => handleUpload([...e.target.files])}
            />
            <p style={{ fontSize: 36, marginBottom: 8 }}>
              {uploading ? "..." : isDragging ? "+" : "\u2191"}
            </p>
            <p style={{ color: "#888", fontWeight: 500 }}>
              {uploading ? "Uploading..." : "Drop images here or click to browse"}
            </p>
            <p style={{ color: "#555", fontSize: 13, marginTop: 8 }}>
              JPG, PNG, WebP &middot; At least 10 images recommended
            </p>
          </div>

          {project.images.length > 0 && (
            <>
              <div style={{ ...css.imageGrid }}>
                {project.images.map((img) => (
                  <div key={img.filename} style={{ position: "relative" }}>
                    <img src={img.url} style={css.imageThumb} alt="" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteImage(img.filename);
                      }}
                      style={{
                        position: "absolute",
                        top: 6,
                        right: 6,
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        border: "none",
                        background: "#000a",
                        color: "#f87171",
                        cursor: "pointer",
                        fontSize: 14,
                        lineHeight: "24px",
                      }}
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>

              {/* Trainer selector */}
              {trainers.length > 0 && !isTraining && (!isReady || wantsRetrain) && (
                <div style={{ marginTop: 24 }}>
                  <label style={css.label}>Select Trainer</label>
                  <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                    {trainers.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTrainer(t.id)}
                        style={{
                          flex: 1,
                          padding: "14px 16px",
                          borderRadius: 12,
                          border: `2px solid ${selectedTrainer === t.id ? "#7c3aed" : "#1a1a2e"}`,
                          background: selectedTrainer === t.id ? "#7c3aed11" : "#0a0a14",
                          cursor: "pointer",
                          transition: "all 0.2s",
                        }}
                      >
                        <div style={{ fontSize: 14, fontWeight: 600, color: selectedTrainer === t.id ? "#c084fc" : "#e0e0e8", marginBottom: 4 }}>
                          {t.name}
                        </div>
                        <div style={{ fontSize: 12, color: "#666" }}>{t.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 14, color: "#888" }}>
                  {project.images.length} images uploaded
                  {project.images.length < 5 && " (need at least 5 to train)"}
                </span>
                <button
                  style={{
                    ...css.btn,
                    ...css.btnPrimary,
                    opacity: project.images.length < 5 || isTraining ? 0.4 : 1,
                  }}
                  disabled={project.images.length < 5 || isTraining}
                  onClick={handleTrain}
                >
                  {training ? "Starting..." : isTraining ? "Training..." : "Start Training"}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Train Tab */}
      {tab === "train" && (
        <div style={css.card}>
          {!project.training ? (
            <div style={{ textAlign: "center", padding: 40 }}>
              <p style={{ color: "#888", marginBottom: 16 }}>
                Upload at least 5 images, then start training to teach the AI your style.
              </p>
              <button
                style={{
                  ...css.btn,
                  ...css.btnPrimary,
                  opacity: project.images.length < 5 ? 0.4 : 1,
                }}
                disabled={project.images.length < 5}
                onClick={handleTrain}
              >
                Start Training
              </button>
            </div>
          ) : (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={css.sectionTitle}>Training Status</h3>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {project.training.trainerName && (
                    <span style={{ ...css.badge, background: "#1a1a2e", color: "#888" }}>
                      {project.training.trainerName}
                    </span>
                  )}
                  <StatusBadge status={project.training.status} />
                </div>
              </div>

              {isTraining && (
                <>
                  <p style={{ color: "#888", marginBottom: 8 }}>
                    {project.training.preprocessLog
                      ? `Cleaning training images... ${project.training.preprocessLog}`
                      : project.training.status === "starting"
                        ? "Preparing training data..."
                        : "Training on Replicate's GPUs... This takes 20-30 minutes for v3."}
                  </p>
                  <div style={css.progressBar}>
                    <div style={css.progressFill(project.training.status === "starting" ? 15 : 60)} />
                  </div>
                </>
              )}

              {project.training.status === "succeeded" && (
                <div>
                  <p style={{ color: "#4ade80", marginBottom: 12 }}>
                    Training complete! Your style model is ready to generate images.
                  </p>
                  <div style={{ display: "flex", gap: 12 }}>
                    <button
                      style={{ ...css.btn, ...css.btnPrimary }}
                      onClick={() => setTab("generate")}
                    >
                      Start Generating &rarr;
                    </button>
                    {!wantsRetrain ? (
                      <button
                        style={{ ...css.btn, background: "#1a1a2e", color: "#f59e0b", border: "1px solid #f59e0b33" }}
                        onClick={() => { setWantsRetrain(true); setSelectedTrainer("ostris-flux-dev"); }}
                      >
                        Retrain with v3 Settings
                      </button>
                    ) : (
                      <button
                        style={{ ...css.btn, background: "#1a1a2e", color: "#888" }}
                        onClick={() => setWantsRetrain(false)}
                      >
                        Cancel Retrain
                      </button>
                    )}
                  </div>
                  {wantsRetrain && (
                    <div style={{ marginTop: 16, padding: 12, background: "#0a0a14", borderRadius: 8, border: "1px solid #f59e0b33" }}>
                      <p style={{ color: "#f59e0b", fontSize: 13, marginBottom: 8 }}>
                        v3 fixes: lower learning rate (0.0001), rank 32, auto text-removal from training images.
                        This preserves FLUX's face recognition for politicians.
                      </p>
                      <button
                        style={{ ...css.btn, ...css.btnPrimary }}
                        disabled={project.images.length < 5}
                        onClick={() => { setWantsRetrain(false); handleTrain(); }}
                      >
                        Start v3 Training
                      </button>
                    </div>
                  )}
                </div>
              )}

              {project.training.status === "failed" && (
                <div>
                  <p style={{ color: "#f87171", marginBottom: 8 }}>Training failed.</p>
                  {project.training.error && (
                    <pre
                      style={{
                        background: "#0a0a14",
                        padding: 12,
                        borderRadius: 8,
                        fontSize: 12,
                        color: "#f87171",
                        overflow: "auto",
                      }}
                    >
                      {project.training.error}
                    </pre>
                  )}
                  <button
                    style={{ ...css.btn, ...css.btnSecondary, marginTop: 12 }}
                    onClick={handleTrain}
                  >
                    Retry Training
                  </button>
                </div>
              )}

              {project.training.logs && (
                <details style={{ marginTop: 16 }}>
                  <summary style={{ cursor: "pointer", color: "#666", fontSize: 13 }}>
                    Training logs
                  </summary>
                  <pre
                    style={{
                      background: "#0a0a14",
                      padding: 12,
                      borderRadius: 8,
                      fontSize: 11,
                      color: "#888",
                      overflow: "auto",
                      maxHeight: 200,
                      marginTop: 8,
                    }}
                  >
                    {project.training.logs}
                  </pre>
                </details>
              )}
            </div>
          )}
        </div>
      )}

      {/* Generate Tab */}
      {tab === "generate" && (
        <div>
          {/* Step 1: What do you want to draw? */}
          <div style={css.card}>
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6, color: "#e0e0e8" }}>
              What would you like to create?
            </h3>
            <p style={{ fontSize: 14, color: "#888", marginBottom: 20 }}>
              Pick a scene type, or choose "Free Write" to describe anything
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, marginBottom: 8 }}>
              {SCENE_TEMPLATES.map((t) => (
                <button
                  key={t.label}
                  onClick={() => {
                    setSelectedTemplate(selectedTemplate?.label === t.label ? null : t);
                    if (t.label !== "Free Write") setPrompt("");
                  }}
                  style={{
                    padding: "16px 12px",
                    borderRadius: 14,
                    border: `2px solid ${selectedTemplate?.label === t.label ? "#7c3aed" : "#1a1a2e"}`,
                    background: selectedTemplate?.label === t.label ? "#7c3aed22" : "#0a0a14",
                    cursor: "pointer",
                    textAlign: "center",
                    transition: "all 0.2s",
                    fontFamily: "inherit",
                  }}
                >
                  <div style={{ fontSize: 22, marginBottom: 6, color: selectedTemplate?.label === t.label ? "#c084fc" : "#888" }}>
                    {t.icon}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: selectedTemplate?.label === t.label ? "#c084fc" : "#e0e0e8" }}>
                    {t.label}
                  </div>
                  <div style={{ fontSize: 11, color: "#666", marginTop: 4 }}>{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Mood & Setting */}
          {selectedTemplate && (
            <div style={css.card}>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: "#e0e0e8" }}>
                Set the mood &amp; place
              </h3>
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 14, color: "#888", marginBottom: 10 }}>Mood (optional)</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {MOODS.map((m) => (
                    <button
                      key={m.label}
                      onClick={() => setSelectedMood(selectedMood?.label === m.label ? null : m)}
                      style={{
                        padding: "10px 18px",
                        borderRadius: 20,
                        border: `2px solid ${selectedMood?.label === m.label ? "#7c3aed" : "#2a2a4e"}`,
                        background: selectedMood?.label === m.label ? "#7c3aed22" : "transparent",
                        color: selectedMood?.label === m.label ? "#c084fc" : "#aaa",
                        cursor: "pointer",
                        fontSize: 14,
                        fontWeight: 500,
                        fontFamily: "inherit",
                        transition: "all 0.2s",
                      }}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p style={{ fontSize: 14, color: "#888", marginBottom: 10 }}>Setting (optional)</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {SETTINGS.map((s) => (
                    <button
                      key={s.label}
                      onClick={() => setSelectedSetting(selectedSetting?.label === s.label ? null : s)}
                      style={{
                        padding: "10px 18px",
                        borderRadius: 20,
                        border: `2px solid ${selectedSetting?.label === s.label ? "#7c3aed" : "#2a2a4e"}`,
                        background: selectedSetting?.label === s.label ? "#7c3aed22" : "transparent",
                        color: selectedSetting?.label === s.label ? "#c084fc" : "#aaa",
                        cursor: "pointer",
                        fontSize: 14,
                        fontWeight: 500,
                        fontFamily: "inherit",
                        transition: "all 0.2s",
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Extra details or free write */}
          {selectedTemplate && (
            <div style={css.card}>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6, color: "#e0e0e8" }}>
                {selectedTemplate.label === "Free Write" ? "Describe your image" : "Add details (optional)"}
              </h3>
              <p style={{ fontSize: 13, color: "#666", marginBottom: 12 }}>
                {selectedTemplate.label === "Free Write"
                  ? "Describe what you want to see — keep it simple, the AI will add your style automatically"
                  : "Anything extra? e.g. \"wearing a red hat\", \"with a dog\", \"at sunset\""}
              </p>
              {selectedTemplate.label === "Free Write" ? (
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <textarea
                    style={{ ...css.textarea, fontSize: 16, minHeight: 100, flex: 1 }}
                    placeholder="e.g. a cat sleeping on a windowsill..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                  />
                  <SpeechButton
                    onResult={(text) => setPrompt((prev) => prev ? prev + " " + text : text)}
                    style={{ marginTop: 2 }}
                  />
                </div>
              ) : (
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <input
                    style={{ ...css.input, fontSize: 16, padding: "14px 18px", flex: 1 }}
                    placeholder="e.g. wearing a hat, holding flowers..."
                    value={extraDetails}
                    onChange={(e) => setExtraDetails(e.target.value)}
                  />
                  <SpeechButton
                    onResult={(text) => setExtraDetails((prev) => prev ? prev + " " + text : text)}
                  />
                </div>
              )}
            </div>
          )}

          {/* Step 4: Sketch canvas */}
          {selectedTemplate && (
            <SketchCanvas
              onSketchChange={(dataUrl) => {
                // Store sketch data URL for img2img generation
                sketchRef.current = dataUrl;
              }}
            />
          )}

          {/* Preview & Generate */}
          {selectedTemplate && (
            <div style={css.card}>
              {buildPrompt() && (
                <div style={{ marginBottom: 16, padding: "12px 16px", background: "#0a0a14", borderRadius: 10 }}>
                  <p style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>Your image will be:</p>
                  <p style={{ fontSize: 15, color: "#c084fc" }}>{buildPrompt()}</p>
                </div>
              )}

              <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, color: "#888", marginBottom: 6 }}>How many?</p>
                  <div style={{ display: "flex", gap: 6 }}>
                    {[1, 2, 3, 4].map((n) => (
                      <button
                        key={n}
                        onClick={() => setNumImages(n)}
                        style={{
                          flex: 1,
                          padding: "12px 0",
                          borderRadius: 10,
                          border: `2px solid ${numImages === n ? "#7c3aed" : "#2a2a4e"}`,
                          background: numImages === n ? "#7c3aed22" : "transparent",
                          color: numImages === n ? "#c084fc" : "#888",
                          cursor: "pointer",
                          fontSize: 16,
                          fontWeight: 700,
                          fontFamily: "inherit",
                        }}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, color: "#888", marginBottom: 6 }}>Shape</p>
                  <div style={{ display: "flex", gap: 6 }}>
                    {[
                      { r: "1:1", icon: "\u25A0" },
                      { r: "16:9", icon: "\u25AC" },
                      { r: "9:16", icon: "\u25AE" },
                    ].map(({ r, icon }) => (
                      <button
                        key={r}
                        onClick={() => setAspectRatio(r)}
                        style={{
                          flex: 1,
                          padding: "12px 0",
                          borderRadius: 10,
                          border: `2px solid ${aspectRatio === r ? "#7c3aed" : "#2a2a4e"}`,
                          background: aspectRatio === r ? "#7c3aed22" : "transparent",
                          color: aspectRatio === r ? "#c084fc" : "#888",
                          cursor: "pointer",
                          fontSize: 14,
                          fontWeight: 600,
                          fontFamily: "inherit",
                        }}
                      >
                        {icon} {r}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Advanced Settings (collapsed) */}
              <div style={{ marginBottom: 16 }}>
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#666",
                    fontSize: 13,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    padding: "4px 0",
                  }}
                >
                  {showAdvanced ? "\u25BC" : "\u25B6"} Advanced settings
                </button>
                {showAdvanced && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ display: "flex", gap: 24 }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 13, color: "#888", marginBottom: 6 }}>
                          Style strength: <span style={{ color: "#c084fc" }}>{loraScale.toFixed(2)}</span>
                        </p>
                        <input
                          type="range" min="0.5" max="2.0" step="0.05" value={loraScale}
                          onChange={(e) => setLoraScale(parseFloat(e.target.value))}
                          style={{ width: "100%", accentColor: "#7c3aed" }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 13, color: "#888", marginBottom: 6 }}>
                          Prompt adherence: <span style={{ color: "#c084fc" }}>{guidanceScale.toFixed(1)}</span>
                        </p>
                        <input
                          type="range" min="2" max="10" step="0.5" value={guidanceScale}
                          onChange={(e) => setGuidanceScale(parseFloat(e.target.value))}
                          style={{ width: "100%", accentColor: "#7c3aed" }}
                        />
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 14, flexWrap: "wrap" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={faceRestore}
                          onChange={(e) => setFaceRestore(e.target.checked)}
                          style={{ accentColor: "#7c3aed", width: 18, height: 18 }}
                        />
                        <span style={{ fontSize: 13, color: "#888" }}>
                          Face restoration (cleaner faces, adds ~10s)
                        </span>
                      </label>
                      <div style={{ display: "flex", gap: 6 }}>
                        {[
                          { id: "bw", label: "B&W" },
                          { id: "color", label: "Color" },
                        ].map((m) => (
                          <button
                            key={m.id}
                            onClick={() => setColorMode(m.id)}
                            style={{
                              padding: "6px 14px",
                              borderRadius: 8,
                              border: `2px solid ${colorMode === m.id ? "#7c3aed" : "#2a2a4e"}`,
                              background: colorMode === m.id ? "#7c3aed22" : "transparent",
                              color: colorMode === m.id ? "#c084fc" : "#666",
                              cursor: "pointer",
                              fontSize: 13,
                              fontWeight: 600,
                              fontFamily: "inherit",
                            }}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={suppressText}
                          onChange={(e) => setSuppressText(e.target.checked)}
                          style={{ accentColor: "#7c3aed", width: 18, height: 18 }}
                        />
                        <span style={{ fontSize: 13, color: "#888" }}>
                          No text in image (avoids garbled speech bubbles)
                        </span>
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={usePulidFace}
                          onChange={(e) => setUsePulidFace(e.target.checked)}
                          style={{ accentColor: "#f59e0b", width: 18, height: 18 }}
                        />
                        <span style={{ fontSize: 13, color: "#888" }}>
                          Face ID (multi-LoRA for recognizable politicians)
                        </span>
                      </label>
                    </div>
                    {faceRestore && (
                      <div style={{ marginTop: 14 }}>
                        <p style={{ fontSize: 13, color: "#888", marginBottom: 6 }}>
                          Face fix strength: <span style={{ color: "#4ade80" }}>{faceFidelity.toFixed(2)}</span>
                          <span style={{ color: "#555", marginLeft: 8 }}>(lower = stronger fix)</span>
                        </p>
                        <input
                          type="range" min="0.1" max="0.9" step="0.05" value={faceFidelity}
                          onChange={(e) => setFaceFidelity(parseFloat(e.target.value))}
                          style={{ width: "100%", maxWidth: 300, accentColor: "#4ade80" }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button
                style={{
                  ...css.btn,
                  ...css.btnPrimary,
                  width: "100%",
                  padding: "18px 20px",
                  fontSize: 18,
                  fontWeight: 700,
                  opacity: !canGenerate || generating ? 0.5 : 1,
                }}
                onClick={handleGenerate}
                disabled={!canGenerate || generating}
              >
                {generating ? "Creating your artwork..." : "Create in My Style"}
              </button>
            </div>
          )}

          {/* Generated images */}
          {project.generations.length > 0 && (
            <div>
              <h3 style={{ fontSize: 20, fontWeight: 700, marginTop: 32, marginBottom: 16, color: "#e0e0e8" }}>
                Your Artwork ({project.generations.length})
              </h3>
              <div style={css.genGrid}>
                {[...project.generations].reverse().map((g) => (
                  <div key={g.id} style={{ ...css.card, position: "relative" }}>
                    <button
                      onClick={() => handleDeleteGeneration(g.id)}
                      style={{
                        position: "absolute",
                        top: 12,
                        right: 12,
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        border: "none",
                        background: "#000a",
                        color: "#f87171",
                        cursor: "pointer",
                        fontSize: 16,
                        lineHeight: "28px",
                        zIndex: 1,
                      }}
                    >
                      &times;
                    </button>
                    <img src={g.url} style={css.genImage} alt={g.prompt} />
                    <p style={{ fontSize: 13, color: "#888", marginTop: 10 }}>{g.prompt}</p>
                    {g.params && (
                      <div style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 6,
                        marginTop: 8,
                      }}>
                        <span style={{ ...css.badge, background: "#1a1a2e", color: "#c084fc", fontSize: 11 }}>
                          LoRA {g.params.loraScale}
                        </span>
                        <span style={{ ...css.badge, background: "#1a1a2e", color: "#38bdf8", fontSize: 11 }}>
                          Guidance {g.params.guidanceScale}
                        </span>
                        <span style={{ ...css.badge, background: "#1a1a2e", color: "#888", fontSize: 11 }}>
                          {g.params.aspectRatio}
                        </span>
                        {g.params.faceRestore && (
                          <span style={{ ...css.badge, background: "#052e16", color: "#4ade80", fontSize: 11 }}>
                            Face Fix {g.params.faceFidelity != null ? g.params.faceFidelity : ""}
                          </span>
                        )}
                        {g.params.multiLora && (
                          <span style={{ ...css.badge, background: "#1c1917", color: "#f59e0b", fontSize: 11 }}>
                            Multi-LoRA
                          </span>
                        )}
                        {g.params.colorMode && (
                          <span style={{ ...css.badge, background: g.params.colorMode === "bw" ? "#1a1a2e" : "#1a1a2e", color: g.params.colorMode === "bw" ? "#e0e0e8" : "#facc15", fontSize: 11 }}>
                            {g.params.colorMode === "bw" ? "B&W" : "Color"}
                          </span>
                        )}
                        <span style={{ ...css.badge, background: "#1a1a2e", color: "#888", fontSize: 11 }}>
                          {g.params.steps} steps
                        </span>
                      </div>
                    )}
                    <a
                      href={g.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: 13, color: "#7c3aed", textDecoration: "none", marginTop: 6, display: "inline-block" }}
                    >
                      Open full size
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── App ─────────────────────────────────────────────

export default function App() {
  const [view, setView] = useState("list"); // list | new | project
  const [activeProject, setActiveProject] = useState(null);

  return (
    <>
      <style>{globalStyles}</style>
      <div style={css.app}>
        <div style={css.header}>
          <div
            style={css.logo}
            onClick={() => {
              setView("list");
              setActiveProject(null);
            }}
          >
            StyleForge
          </div>
          {view !== "list" && (
            <button
              style={{ ...css.btn, ...css.btnSecondary, fontSize: 13 }}
              onClick={() => {
                setView("list");
                setActiveProject(null);
              }}
            >
              All Projects
            </button>
          )}
        </div>

        {view === "list" && (
          <ProjectList
            onSelect={(id) => {
              setActiveProject(id);
              setView("project");
            }}
            onCreate={() => setView("new")}
          />
        )}
        {view === "new" && (
          <NewProject
            onCreated={(id) => {
              setActiveProject(id);
              setView("project");
            }}
            onCancel={() => setView("list")}
          />
        )}
        {view === "project" && activeProject && (
          <ProjectDetail
            projectId={activeProject}
            onBack={() => {
              setView("list");
              setActiveProject(null);
            }}
          />
        )}
      </div>
    </>
  );
}
