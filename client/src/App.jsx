import { useState, useEffect, useRef, useCallback } from "react";
import * as api from "./api.js";

// ─── Quick-Generate Chips (one-tap political cartoons) ─────
const QUICK_PROMPTS = [
  { label: "Trump at podium", icon: "🎤" },
  { label: "Biden sitting at desk", icon: "🪑" },
  { label: "Obama giving speech", icon: "🗣" },
  { label: "Netanyahu in meeting", icon: "🤝" },
  { label: "Putin at table", icon: "🏛" },
  { label: "Zelensky with flag", icon: "🇺🇦" },
  { label: "Trump and Biden debate", icon: "⚡" },
  { label: "Congress in session", icon: "🏛" },
];

// ─── Prompt Templates & Scene Builder Data ──────────
const SCENE_TEMPLATES = [
  { label: "One Person", icon: "👤", desc: "A single person or face", prompt: "portrait of a person" },
  { label: "Two People", icon: "👥", desc: "Two people together", prompt: "two people standing together" },
  { label: "Scene", icon: "🌆", desc: "A place or landscape", prompt: "a scene" },
  { label: "Animals", icon: "🐾", desc: "An animal or pet", prompt: "an animal" },
  { label: "Objects", icon: "🎨", desc: "Things on a table", prompt: "a still life arrangement" },
  { label: "Free Write", icon: "✏️", desc: "Type anything you want", prompt: "" },
];

const MOODS = [
  { label: "😊 Happy", value: "happy, cheerful, warm lighting" },
  { label: "😌 Calm", value: "calm, peaceful, serene" },
  { label: "🎭 Dramatic", value: "dramatic, intense, bold" },
  { label: "🌙 Mysterious", value: "mysterious, moody, shadows" },
  { label: "🎪 Playful", value: "playful, fun, colorful" },
  { label: "😢 Sad", value: "melancholic, somber, quiet" },
];

const SETTINGS = [
  { label: "🌳 Outdoors", value: "outdoors, natural setting" },
  { label: "🏙 City", value: "in a city, urban environment" },
  { label: "🏠 Home", value: "in a cozy home interior" },
  { label: "🌊 Beach", value: "at the beach, ocean waves" },
  { label: "🎬 Studio", value: "plain background, studio setting" },
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
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  @keyframes breathe {
    0%, 100% { box-shadow: 0 0 0 0 rgba(124, 58, 237, 0.4); }
    50% { box-shadow: 0 0 0 12px rgba(124, 58, 237, 0); }
  }

  .fade-in { animation: fadeIn 0.4s ease-out; }

  /* Lightbox overlay */
  .lightbox-overlay {
    position: fixed; inset: 0; z-index: 1000;
    background: rgba(0,0,0,0.92);
    display: flex; align-items: center; justify-content: center;
    cursor: zoom-out;
    animation: fadeIn 0.2s ease-out;
  }
  .lightbox-overlay img {
    max-width: 90vw; max-height: 90vh;
    border-radius: 16px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.5);
  }

  /* Skeleton shimmer */
  .skeleton {
    background: linear-gradient(90deg, #1a1a2e 25%, #252540 50%, #1a1a2e 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 12px;
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
    marginBottom: 32,
    paddingBottom: 20,
    borderBottom: "1px solid #1a1a2e",
  },
  logo: {
    fontSize: 32,
    fontWeight: 800,
    background: "linear-gradient(135deg, #7c3aed, #c084fc, #e879f9)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    cursor: "pointer",
    letterSpacing: "-0.5px",
  },
  btn: {
    padding: "14px 24px",
    borderRadius: 14,
    border: "none",
    fontWeight: 600,
    fontSize: 16,
    cursor: "pointer",
    transition: "all 0.2s",
    fontFamily: "inherit",
    minHeight: 48,
  },
  btnPrimary: {
    background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
    color: "#fff",
  },
  btnSecondary: {
    background: "rgba(124, 58, 237, 0.1)",
    color: "#c084fc",
    border: "1px solid rgba(124, 58, 237, 0.3)",
    backdropFilter: "blur(10px)",
  },
  btnDanger: {
    background: "rgba(248, 113, 113, 0.1)",
    color: "#f87171",
    border: "1px solid rgba(248, 113, 113, 0.2)",
  },
  // Glassmorphic card
  card: {
    background: "rgba(18, 18, 30, 0.7)",
    backdropFilter: "blur(20px)",
    borderRadius: 20,
    border: "1px solid rgba(124, 58, 237, 0.15)",
    padding: 28,
    marginBottom: 20,
    transition: "all 0.3s",
  },
  input: {
    width: "100%",
    padding: "16px 20px",
    borderRadius: 14,
    border: "1px solid rgba(124, 58, 237, 0.2)",
    background: "rgba(10, 10, 20, 0.6)",
    color: "#e0e0e8",
    fontSize: 17,
    fontFamily: "inherit",
    outline: "none",
    minHeight: 52,
    transition: "border-color 0.2s",
  },
  textarea: {
    width: "100%",
    padding: "16px 20px",
    borderRadius: 14,
    border: "1px solid rgba(124, 58, 237, 0.2)",
    background: "rgba(10, 10, 20, 0.6)",
    color: "#e0e0e8",
    fontSize: 17,
    fontFamily: "inherit",
    outline: "none",
    resize: "vertical",
    minHeight: 100,
    transition: "border-color 0.2s",
  },
  badge: {
    display: "inline-block",
    padding: "6px 14px",
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
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
    borderRadius: 12,
    border: "2px solid rgba(124, 58, 237, 0.15)",
    cursor: "pointer",
    transition: "transform 0.2s, border-color 0.2s",
  },
  genGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: 20,
    marginTop: 20,
  },
  genImage: {
    width: "100%",
    borderRadius: 16,
    border: "1px solid rgba(124, 58, 237, 0.15)",
    cursor: "pointer",
    transition: "transform 0.2s",
  },
  dropZone: (isDragging) => ({
    border: `2px dashed ${isDragging ? "#7c3aed" : "rgba(124, 58, 237, 0.3)"}`,
    borderRadius: 20,
    padding: 56,
    textAlign: "center",
    cursor: "pointer",
    transition: "all 0.3s",
    background: isDragging ? "rgba(124, 58, 237, 0.08)" : "transparent",
    minHeight: 180,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  }),
  sectionTitle: {
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 12,
    color: "#e0e0e8",
  },
  label: {
    display: "block",
    fontSize: 15,
    fontWeight: 500,
    color: "#999",
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    background: "rgba(124, 58, 237, 0.15)",
    overflow: "hidden",
    marginTop: 16,
  },
  progressFill: (pct) => ({
    height: "100%",
    width: `${pct}%`,
    background: "linear-gradient(90deg, #7c3aed, #c084fc, #e879f9)",
    transition: "width 0.5s ease",
    borderRadius: 3,
  }),
};

// ─── Lightbox ────────────────────────────────────────
function Lightbox({ src, alt, onClose }) {
  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <img src={src} alt={alt || ""} onClick={(e) => e.stopPropagation()} />
    </div>
  );
}

// ─── Loading Spinner ─────────────────────────────────
function Spinner({ size = 40, color = "#7c3aed" }) {
  return (
    <div style={{
      width: size, height: size,
      border: `3px solid rgba(124, 58, 237, 0.15)`,
      borderTopColor: color,
      borderRadius: "50%",
      animation: "spin 0.8s linear infinite",
      margin: "0 auto",
    }} />
  );
}

// ─── Skeleton Loader ─────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{ ...css.card, padding: 0, overflow: "hidden" }}>
      <div className="skeleton" style={{ height: 80 }} />
    </div>
  );
}

// ─── StatusBadge ─────────────────────────────────────
function StatusBadge({ status }) {
  const colors = {
    not_started: { bg: "rgba(26, 26, 46, 0.8)", color: "#666" },
    starting: { bg: "rgba(250, 204, 21, 0.1)", color: "#facc15" },
    processing: { bg: "rgba(56, 189, 248, 0.1)", color: "#38bdf8" },
    succeeded: { bg: "rgba(74, 222, 128, 0.1)", color: "#4ade80" },
    failed: { bg: "rgba(248, 113, 113, 0.1)", color: "#f87171" },
  };
  const c = colors[status] || colors.not_started;
  const labels = {
    not_started: "Not trained",
    starting: "Starting...",
    processing: "Training...",
    succeeded: "Ready",
    failed: "Failed",
  };
  return (
    <span style={{ ...css.badge, background: c.bg, color: c.color }}>
      {labels[status] || status?.replace("_", " ")}
    </span>
  );
}

// ─── Step Indicator ──────────────────────────────────
function StepIndicator({ steps, current }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 28 }}>
      {steps.map((step, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : "none" }}>
          <div style={{
            width: 40, height: 40, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, fontWeight: 700,
            background: i <= current
              ? "linear-gradient(135deg, #7c3aed, #6d28d9)"
              : "rgba(26, 26, 46, 0.8)",
            color: i <= current ? "#fff" : "#555",
            transition: "all 0.3s",
            flexShrink: 0,
          }}>
            {i < current ? "✓" : i + 1}
          </div>
          <span style={{
            fontSize: 14, fontWeight: 600, marginLeft: 10,
            color: i <= current ? "#c084fc" : "#555",
            whiteSpace: "nowrap",
          }}>
            {step}
          </span>
          {i < steps.length - 1 && (
            <div style={{
              flex: 1, height: 2, marginLeft: 12, marginRight: 12,
              background: i < current
                ? "linear-gradient(90deg, #7c3aed, #c084fc)"
                : "rgba(124, 58, 237, 0.15)",
              borderRadius: 1,
              transition: "all 0.3s",
            }} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Hero Section ────────────────────────────────────
function Hero({ onGetStarted, hasProjects }) {
  return (
    <div className="fade-in" style={{
      textAlign: "center",
      padding: "48px 24px",
      marginBottom: 32,
      background: "radial-gradient(ellipse at top, rgba(124, 58, 237, 0.12) 0%, transparent 70%)",
      borderRadius: 28,
      border: "1px solid rgba(124, 58, 237, 0.1)",
    }}>
      <h1 style={{
        fontSize: 44,
        fontWeight: 800,
        marginBottom: 16,
        background: "linear-gradient(135deg, #c084fc, #e879f9, #7c3aed)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        lineHeight: 1.2,
      }}>
        Create Art with Your Voice
      </h1>
      <p style={{
        fontSize: 20,
        color: "#999",
        maxWidth: 560,
        margin: "0 auto 12px",
        lineHeight: 1.6,
      }}>
        Say or type a simple description and get a beautiful editorial cartoon in your own style.
      </p>
      <p style={{
        fontSize: 15,
        color: "#666",
        marginBottom: 32,
      }}>
        Designed for everyone. Big buttons, voice input, simple steps.
      </p>
      {!hasProjects && (
        <button
          style={{
            ...css.btn,
            ...css.btnPrimary,
            padding: "18px 40px",
            fontSize: 20,
            fontWeight: 700,
            borderRadius: 18,
            animation: "breathe 2s infinite",
          }}
          onClick={onGetStarted}
        >
          Get Started
        </button>
      )}
    </div>
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

  return (
    <div>
      <Hero onGetStarted={onCreate} hasProjects={projects.length > 0} />

      {loading ? (
        <div>
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : projects.length > 0 ? (
        <div className="fade-in">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700 }}>Your Art Styles</h2>
            <button style={{ ...css.btn, ...css.btnPrimary }} onClick={onCreate}>
              + New Style
            </button>
          </div>

          {projects.map((p) => (
            <div
              key={p.id}
              className="fade-in"
              style={{
                ...css.card,
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 16,
              }}
              onClick={() => onSelect(p.id)}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(124, 58, 237, 0.5)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(124, 58, 237, 0.15)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: 19, fontWeight: 700, marginBottom: 6 }}>{p.name}</h3>
                <span style={{ fontSize: 15, color: "#888" }}>
                  {p.images.length} reference images
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <StatusBadge status={p.training?.status || "not_started"} />
                <button
                  onClick={(e) => handleDeleteProject(e, p.id)}
                  title="Delete project"
                  style={{
                    ...css.btn,
                    ...css.btnDanger,
                    padding: "10px 18px",
                    fontSize: 15,
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
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
    const project = await api.createProject(name || "My Art Style", trigger || undefined);
    onCreated(project.id);
  };

  return (
    <div className="fade-in" style={{ ...css.card, maxWidth: 600, margin: "0 auto" }}>
      <h2 style={{ ...css.sectionTitle, marginBottom: 8 }}>Create a New Art Style</h2>
      <p style={{ fontSize: 15, color: "#888", marginBottom: 28 }}>
        Give your style a name. You'll upload reference images next.
      </p>
      <div style={{ marginBottom: 20 }}>
        <label style={css.label}>Style Name</label>
        <input
          style={css.input}
          placeholder="e.g. My Ink Cartoons, Watercolor Art..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
      </div>
      <div style={{ marginBottom: 28 }}>
        <label style={css.label}>Keyword (optional)</label>
        <input
          style={css.input}
          placeholder="Auto-generated if empty"
          value={trigger}
          onChange={(e) => setTrigger(e.target.value.toUpperCase().replace(/\s/g, "_"))}
        />
        <p style={{ fontSize: 13, color: "#555", marginTop: 8 }}>
          A special word the AI uses to activate your style. Leave empty for automatic.
        </p>
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <button
          style={{ ...css.btn, ...css.btnPrimary, flex: 1 }}
          onClick={handleCreate}
          disabled={creating}
        >
          {creating ? "Creating..." : "Create Style"}
        </button>
        <button style={{ ...css.btn, ...css.btnSecondary }} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── SpeechButton (Web Speech API) ───────────────────
function SpeechButton({ onResult, large }) {
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

  const size = large ? 64 : 52;
  return (
    <button
      onClick={toggle}
      title={listening ? "Listening... click to stop" : "Speak your description"}
      style={{
        width: size,
        height: size,
        borderRadius: 16,
        border: `2px solid ${listening ? "#ef4444" : "rgba(124, 58, 237, 0.3)"}`,
        background: listening ? "rgba(239, 68, 68, 0.15)" : "rgba(124, 58, 237, 0.08)",
        color: listening ? "#ef4444" : "#c084fc",
        cursor: "pointer",
        fontSize: large ? 28 : 24,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        transition: "all 0.2s",
        animation: listening ? "pulse 1.2s infinite" : "none",
      }}
    >
      {listening ? "⏹" : "🎙"}
    </button>
  );
}

// ─── SketchCanvas ────────────────────────────────────
function SketchCanvas({ onSketchChange }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(8);
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
      <div style={{ ...css.card, textAlign: "center", padding: "24px 28px" }}>
        <button
          onClick={() => setEnabled(true)}
          style={{
            background: "none",
            border: "2px dashed rgba(124, 58, 237, 0.3)",
            borderRadius: 18,
            padding: "24px 30px",
            cursor: "pointer",
            color: "#888",
            fontSize: 16,
            fontFamily: "inherit",
            width: "100%",
            transition: "all 0.2s",
            minHeight: 80,
          }}
        >
          <span style={{ fontSize: 28, display: "block", marginBottom: 8 }}>✏️</span>
          Draw a rough sketch (optional)
          <span style={{ display: "block", fontSize: 14, color: "#666", marginTop: 6 }}>
            The AI will use your sketch as a guide
          </span>
        </button>
      </div>
    );
  }

  const colors = ["#ffffff", "#ff4444", "#4488ff", "#44cc44", "#ffaa00", "#cc44cc", "#000000"];

  return (
    <div style={css.card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: "#e0e0e8" }}>
          Sketch a guide (optional)
        </h3>
        <button
          onClick={() => { setEnabled(false); onSketchChange(null); }}
          style={{ ...css.btn, ...css.btnSecondary, padding: "10px 18px", fontSize: 14 }}
        >
          Remove
        </button>
      </div>
      <p style={{ fontSize: 14, color: "#888", marginBottom: 14 }}>
        Draw roughly — the AI will transform it into your art style
      </p>

      <canvas
        ref={canvasRef}
        width={512}
        height={512}
        style={{
          width: "100%",
          maxWidth: 512,
          aspectRatio: "1",
          borderRadius: 16,
          border: "2px solid rgba(124, 58, 237, 0.2)",
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

      <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 8 }}>
          {colors.map((c) => (
            <button
              key={c}
              onClick={() => setBrushColor(c)}
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                border: `3px solid ${brushColor === c ? "#7c3aed" : "rgba(124, 58, 237, 0.2)"}`,
                background: c,
                cursor: "pointer",
              }}
            />
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {[4, 8, 14, 22].map((s) => (
            <button
              key={s}
              onClick={() => setBrushSize(s)}
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                border: `2px solid ${brushSize === s ? "#7c3aed" : "rgba(124, 58, 237, 0.2)"}`,
                background: brushSize === s ? "rgba(124, 58, 237, 0.15)" : "transparent",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div style={{
                width: Math.max(s, 5),
                height: Math.max(s, 5),
                borderRadius: "50%",
                background: "#e0e0e8",
              }} />
            </button>
          ))}
        </div>

        <button
          onClick={clearCanvas}
          style={{ ...css.btn, ...css.btnDanger, padding: "10px 20px", fontSize: 15 }}
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
  const [tab, setTab] = useState("upload");
  const fileRef = useRef(null);
  const sketchRef = useRef(null);
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
  const [colorMode, setColorMode] = useState("bw");
  const [suppressText, setSuppressText] = useState(true);
  const [faceFidelity, setFaceFidelity] = useState(0.4);
  const [usePulidFace, setUsePulidFace] = useState(true);
  const [trainers, setTrainers] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedMood, setSelectedMood] = useState(null);
  const [selectedSetting, setSelectedSetting] = useState(null);
  const [extraDetails, setExtraDetails] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedTrainer, setSelectedTrainer] = useState("ostris-flux-dev");
  const [wantsRetrain, setWantsRetrain] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);

  // Determine which generate "step" we're on
  const genStep = !selectedTemplate ? 0 : selectedTemplate.label === "Free Write" ? (prompt.trim() ? 2 : 1) : 1;

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

  const buildPrompt = () => {
    if (prompt.trim()) return prompt;
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
      }
      await api.generateImages(projectId, finalPrompt, opts);
      await load();
    } catch (err) {
      alert(err.message);
    }
    setGenerating(false);
  };

  const handleQuickGenerate = async (quickPrompt) => {
    setPrompt(quickPrompt);
    setSelectedTemplate(SCENE_TEMPLATES.find(t => t.label === "Free Write"));
    // Don't auto-generate — let user see it first and hit Create
  };

  const handleDeleteImage = async (filename) => {
    await api.deleteImage(projectId, filename);
    await load();
  };

  const handleDeleteGeneration = async (genId) => {
    await api.deleteGeneration(projectId, genId);
    await load();
  };

  if (!project) return (
    <div style={{ textAlign: "center", padding: 60 }}>
      <Spinner />
      <p style={{ color: "#888", marginTop: 16 }}>Loading your project...</p>
    </div>
  );

  const isReady = project.training?.status === "succeeded";
  const isTraining = project.training?.status === "processing" || project.training?.status === "starting";

  const tabs = [
    { id: "upload", label: `📁 Images (${project.images.length})` },
    { id: "train", label: "🧠 Train" },
    { id: "generate", label: "🎨 Create", disabled: !isReady },
  ];

  return (
    <div className="fade-in">
      {lightboxImage && (
        <Lightbox src={lightboxImage.url} alt={lightboxImage.alt} onClose={() => setLightboxImage(null)} />
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
        <button
          style={{ ...css.btn, ...css.btnSecondary, padding: "12px 18px", fontSize: 20 }}
          onClick={onBack}
        >
          ←
        </button>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700 }}>{project.name}</h2>
        </div>
        <StatusBadge status={project.training?.status || "not_started"} />
      </div>

      {/* Tabs */}
      <div style={{
        display: "flex", gap: 6, marginBottom: 28,
        background: "rgba(10, 10, 20, 0.6)",
        borderRadius: 16, padding: 6,
        backdropFilter: "blur(10px)",
      }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            style={{
              ...css.btn,
              flex: 1,
              borderRadius: 12,
              background: tab === t.id
                ? "linear-gradient(135deg, rgba(124, 58, 237, 0.3), rgba(124, 58, 237, 0.15))"
                : "transparent",
              color: tab === t.id ? "#c084fc" : "#666",
              opacity: t.disabled ? 0.35 : 1,
              pointerEvents: t.disabled ? "none" : "auto",
              fontSize: 16,
              fontWeight: 600,
            }}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ═══ Upload Tab ═══ */}
      {tab === "upload" && (
        <div className="fade-in">
          <div
            style={css.dropZone(isDragging)}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
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
            {uploading ? (
              <>
                <Spinner size={36} />
                <p style={{ color: "#c084fc", fontWeight: 600, fontSize: 17, marginTop: 16 }}>
                  Uploading...
                </p>
              </>
            ) : (
              <>
                <p style={{ fontSize: 44, marginBottom: 12 }}>
                  {isDragging ? "📥" : "📤"}
                </p>
                <p style={{ color: "#ccc", fontWeight: 600, fontSize: 17 }}>
                  Drop images here or tap to browse
                </p>
                <p style={{ color: "#666", fontSize: 15, marginTop: 10 }}>
                  JPG, PNG, WebP &middot; At least 10 images recommended
                </p>
              </>
            )}
          </div>

          {project.images.length > 0 && (
            <>
              <div style={css.imageGrid}>
                {project.images.map((img) => (
                  <div key={img.filename} style={{ position: "relative" }}>
                    <img
                      src={img.url}
                      style={css.imageThumb}
                      alt=""
                      onClick={() => setLightboxImage({ url: img.url, alt: img.filename })}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.05)"; e.currentTarget.style.borderColor = "#7c3aed"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.borderColor = "rgba(124, 58, 237, 0.15)"; }}
                    />
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteImage(img.filename); }}
                      style={{
                        position: "absolute", top: 6, right: 6,
                        width: 30, height: 30, borderRadius: "50%",
                        border: "none", background: "rgba(0,0,0,0.7)",
                        color: "#f87171", cursor: "pointer",
                        fontSize: 16, lineHeight: "30px",
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
                  <label style={css.label}>Choose Training Method</label>
                  <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                    {trainers.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTrainer(t.id)}
                        style={{
                          flex: 1,
                          padding: "18px 20px",
                          borderRadius: 16,
                          border: `2px solid ${selectedTrainer === t.id ? "#7c3aed" : "rgba(124, 58, 237, 0.15)"}`,
                          background: selectedTrainer === t.id ? "rgba(124, 58, 237, 0.1)" : "rgba(10, 10, 20, 0.4)",
                          cursor: "pointer",
                          transition: "all 0.2s",
                        }}
                      >
                        <div style={{ fontSize: 16, fontWeight: 700, color: selectedTrainer === t.id ? "#c084fc" : "#e0e0e8", marginBottom: 6 }}>
                          {t.name}
                        </div>
                        <div style={{ fontSize: 14, color: "#888" }}>{t.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 16, color: "#999" }}>
                  {project.images.length} images uploaded
                  {project.images.length < 5 && (
                    <span style={{ color: "#f59e0b" }}> — need at least 5 to train</span>
                  )}
                </span>
                <button
                  style={{
                    ...css.btn,
                    ...css.btnPrimary,
                    padding: "16px 32px",
                    fontSize: 17,
                    opacity: project.images.length < 5 || isTraining ? 0.4 : 1,
                  }}
                  disabled={project.images.length < 5 || isTraining}
                  onClick={handleTrain}
                >
                  {training ? "Starting..." : isTraining ? "Training..." : "🧠 Start Training"}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══ Train Tab ═══ */}
      {tab === "train" && (
        <div className="fade-in" style={css.card}>
          {!project.training ? (
            <div style={{ textAlign: "center", padding: 48 }}>
              <p style={{ fontSize: 40, marginBottom: 16 }}>🧠</p>
              <p style={{ color: "#999", marginBottom: 20, fontSize: 17 }}>
                Upload at least 5 reference images, then train the AI to learn your style.
              </p>
              <button
                style={{
                  ...css.btn,
                  ...css.btnPrimary,
                  padding: "16px 32px",
                  fontSize: 17,
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
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h3 style={css.sectionTitle}>Training Status</h3>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  {project.training.trainerName && (
                    <span style={{ ...css.badge, background: "rgba(26, 26, 46, 0.8)", color: "#999" }}>
                      {project.training.trainerName}
                    </span>
                  )}
                  <StatusBadge status={project.training.status} />
                </div>
              </div>

              {isTraining && (
                <>
                  <div style={{ textAlign: "center", marginBottom: 20 }}>
                    <Spinner size={48} />
                  </div>
                  <p style={{ color: "#999", marginBottom: 8, fontSize: 16, textAlign: "center" }}>
                    {project.training.preprocessLog
                      ? `Cleaning images... ${project.training.preprocessLog}`
                      : project.training.status === "starting"
                        ? "Preparing your training data..."
                        : "Training on cloud GPUs... This usually takes 20-30 minutes."}
                  </p>
                  <div style={css.progressBar}>
                    <div style={css.progressFill(project.training.status === "starting" ? 15 : 60)} />
                  </div>
                </>
              )}

              {project.training.status === "succeeded" && (
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: 48, marginBottom: 12 }}>🎉</p>
                  <p style={{ color: "#4ade80", marginBottom: 20, fontSize: 18, fontWeight: 600 }}>
                    Your style is ready! You can start creating artwork now.
                  </p>
                  <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                    <button
                      style={{ ...css.btn, ...css.btnPrimary, padding: "16px 32px", fontSize: 18 }}
                      onClick={() => setTab("generate")}
                    >
                      🎨 Start Creating →
                    </button>
                    {!wantsRetrain ? (
                      <button
                        style={{ ...css.btn, ...css.btnSecondary }}
                        onClick={() => { setWantsRetrain(true); setSelectedTrainer("ostris-flux-dev"); }}
                      >
                        Retrain
                      </button>
                    ) : (
                      <button
                        style={{ ...css.btn, ...css.btnSecondary }}
                        onClick={() => setWantsRetrain(false)}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                  {wantsRetrain && (
                    <div style={{ marginTop: 20, padding: 16, background: "rgba(245, 158, 11, 0.08)", borderRadius: 14, border: "1px solid rgba(245, 158, 11, 0.2)" }}>
                      <p style={{ color: "#f59e0b", fontSize: 14, marginBottom: 12 }}>
                        Retrain with improved settings for better face recognition.
                      </p>
                      <button
                        style={{ ...css.btn, ...css.btnPrimary }}
                        disabled={project.images.length < 5}
                        onClick={() => { setWantsRetrain(false); handleTrain(); }}
                      >
                        Start Retraining
                      </button>
                    </div>
                  )}
                </div>
              )}

              {project.training.status === "failed" && (
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: 40, marginBottom: 12 }}>😞</p>
                  <p style={{ color: "#f87171", marginBottom: 12, fontSize: 17 }}>Training didn't work this time.</p>
                  {project.training.error && (
                    <pre style={{
                      background: "rgba(10, 10, 20, 0.6)",
                      padding: 16, borderRadius: 12,
                      fontSize: 13, color: "#f87171",
                      overflow: "auto", textAlign: "left",
                      marginBottom: 16,
                    }}>
                      {project.training.error}
                    </pre>
                  )}
                  <button
                    style={{ ...css.btn, ...css.btnPrimary }}
                    onClick={handleTrain}
                  >
                    Try Again
                  </button>
                </div>
              )}

              {project.training.logs && (
                <details style={{ marginTop: 20 }}>
                  <summary style={{ cursor: "pointer", color: "#666", fontSize: 14 }}>
                    Show training details
                  </summary>
                  <pre style={{
                    background: "rgba(10, 10, 20, 0.6)",
                    padding: 16, borderRadius: 12,
                    fontSize: 12, color: "#888",
                    overflow: "auto", maxHeight: 200, marginTop: 10,
                  }}>
                    {project.training.logs}
                  </pre>
                </details>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══ Generate Tab ═══ */}
      {tab === "generate" && (
        <div className="fade-in">
          {/* Step indicator */}
          <StepIndicator
            steps={["Choose Subject", "Set the Mood", "Create"]}
            current={genStep}
          />

          {/* Quick-generate chips */}
          <div style={{ ...css.card, paddingTop: 20, paddingBottom: 20 }}>
            <p style={{ fontSize: 16, fontWeight: 600, color: "#999", marginBottom: 14 }}>
              Quick create — tap a suggestion:
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {QUICK_PROMPTS.map((q) => (
                <button
                  key={q.label}
                  onClick={() => handleQuickGenerate(q.label)}
                  style={{
                    padding: "14px 20px",
                    borderRadius: 16,
                    border: "1px solid rgba(124, 58, 237, 0.25)",
                    background: prompt === q.label
                      ? "rgba(124, 58, 237, 0.2)"
                      : "rgba(124, 58, 237, 0.06)",
                    color: prompt === q.label ? "#c084fc" : "#ccc",
                    cursor: "pointer",
                    fontSize: 15,
                    fontWeight: 500,
                    fontFamily: "inherit",
                    transition: "all 0.2s",
                    minHeight: 48,
                  }}
                >
                  {q.icon} {q.label}
                </button>
              ))}
            </div>
          </div>

          {/* Step 1: Scene type */}
          <div style={css.card}>
            <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, color: "#e0e0e8" }}>
              What would you like to create?
            </h3>
            <p style={{ fontSize: 16, color: "#999", marginBottom: 22 }}>
              Pick a subject, or choose "Free Write" to describe anything
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
              {SCENE_TEMPLATES.map((t) => (
                <button
                  key={t.label}
                  onClick={() => {
                    setSelectedTemplate(selectedTemplate?.label === t.label ? null : t);
                    if (t.label !== "Free Write") setPrompt("");
                  }}
                  style={{
                    padding: "20px 16px",
                    borderRadius: 18,
                    border: `2px solid ${selectedTemplate?.label === t.label ? "#7c3aed" : "rgba(124, 58, 237, 0.15)"}`,
                    background: selectedTemplate?.label === t.label ? "rgba(124, 58, 237, 0.15)" : "rgba(10, 10, 20, 0.4)",
                    cursor: "pointer",
                    textAlign: "center",
                    transition: "all 0.2s",
                    fontFamily: "inherit",
                    minHeight: 100,
                  }}
                >
                  <div style={{ fontSize: 30, marginBottom: 8 }}>
                    {t.icon}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: selectedTemplate?.label === t.label ? "#c084fc" : "#e0e0e8" }}>
                    {t.label}
                  </div>
                  <div style={{ fontSize: 13, color: "#888", marginTop: 6 }}>{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Mood & Setting */}
          {selectedTemplate && (
            <div className="fade-in" style={css.card}>
              <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20, color: "#e0e0e8" }}>
                Set the mood & place
              </h3>
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 16, color: "#999", marginBottom: 12 }}>Mood (optional)</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {MOODS.map((m) => (
                    <button
                      key={m.label}
                      onClick={() => setSelectedMood(selectedMood?.label === m.label ? null : m)}
                      style={{
                        padding: "14px 22px",
                        borderRadius: 24,
                        border: `2px solid ${selectedMood?.label === m.label ? "#7c3aed" : "rgba(124, 58, 237, 0.2)"}`,
                        background: selectedMood?.label === m.label ? "rgba(124, 58, 237, 0.15)" : "transparent",
                        color: selectedMood?.label === m.label ? "#c084fc" : "#bbb",
                        cursor: "pointer",
                        fontSize: 16,
                        fontWeight: 500,
                        fontFamily: "inherit",
                        transition: "all 0.2s",
                        minHeight: 48,
                      }}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p style={{ fontSize: 16, color: "#999", marginBottom: 12 }}>Setting (optional)</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {SETTINGS.map((s) => (
                    <button
                      key={s.label}
                      onClick={() => setSelectedSetting(selectedSetting?.label === s.label ? null : s)}
                      style={{
                        padding: "14px 22px",
                        borderRadius: 24,
                        border: `2px solid ${selectedSetting?.label === s.label ? "#7c3aed" : "rgba(124, 58, 237, 0.2)"}`,
                        background: selectedSetting?.label === s.label ? "rgba(124, 58, 237, 0.15)" : "transparent",
                        color: selectedSetting?.label === s.label ? "#c084fc" : "#bbb",
                        cursor: "pointer",
                        fontSize: 16,
                        fontWeight: 500,
                        fontFamily: "inherit",
                        transition: "all 0.2s",
                        minHeight: 48,
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Extra details / free write */}
          {selectedTemplate && (
            <div className="fade-in" style={css.card}>
              <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: "#e0e0e8" }}>
                {selectedTemplate.label === "Free Write" ? "Describe your image" : "Add details (optional)"}
              </h3>
              <p style={{ fontSize: 15, color: "#888", marginBottom: 14 }}>
                {selectedTemplate.label === "Free Write"
                  ? "Describe what you want — keep it simple, the AI adds your style automatically"
                  : "e.g. \"wearing a red hat\", \"with a dog\", \"at sunset\""}
              </p>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                {selectedTemplate.label === "Free Write" ? (
                  <textarea
                    style={{ ...css.textarea, fontSize: 18, flex: 1 }}
                    placeholder="e.g. Trump at a podium giving a speech..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                  />
                ) : (
                  <input
                    style={{ ...css.input, fontSize: 18, flex: 1 }}
                    placeholder="wearing a hat, holding flowers..."
                    value={extraDetails}
                    onChange={(e) => setExtraDetails(e.target.value)}
                  />
                )}
                <SpeechButton
                  large
                  onResult={(text) => {
                    if (selectedTemplate.label === "Free Write") {
                      setPrompt((prev) => prev ? prev + " " + text : text);
                    } else {
                      setExtraDetails((prev) => prev ? prev + " " + text : text);
                    }
                  }}
                />
              </div>
            </div>
          )}

          {/* Sketch canvas */}
          {selectedTemplate && (
            <SketchCanvas
              onSketchChange={(dataUrl) => { sketchRef.current = dataUrl; }}
            />
          )}

          {/* Preview & Generate */}
          {selectedTemplate && (
            <div style={css.card}>
              {buildPrompt() && (
                <div style={{
                  marginBottom: 20, padding: "16px 20px",
                  background: "rgba(124, 58, 237, 0.08)",
                  borderRadius: 14,
                  border: "1px solid rgba(124, 58, 237, 0.15)",
                }}>
                  <p style={{ fontSize: 13, color: "#888", marginBottom: 6 }}>Your image will be:</p>
                  <p style={{ fontSize: 17, color: "#c084fc", fontWeight: 500 }}>{buildPrompt()}</p>
                </div>
              )}

              <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 15, color: "#999", marginBottom: 8 }}>How many?</p>
                  <div style={{ display: "flex", gap: 8 }}>
                    {[1, 2, 3, 4].map((n) => (
                      <button
                        key={n}
                        onClick={() => setNumImages(n)}
                        style={{
                          flex: 1,
                          padding: "14px 0",
                          borderRadius: 14,
                          border: `2px solid ${numImages === n ? "#7c3aed" : "rgba(124, 58, 237, 0.15)"}`,
                          background: numImages === n ? "rgba(124, 58, 237, 0.15)" : "transparent",
                          color: numImages === n ? "#c084fc" : "#888",
                          cursor: "pointer",
                          fontSize: 18,
                          fontWeight: 700,
                          fontFamily: "inherit",
                          minHeight: 52,
                        }}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 15, color: "#999", marginBottom: 8 }}>Shape</p>
                  <div style={{ display: "flex", gap: 8 }}>
                    {[
                      { r: "1:1", label: "Square" },
                      { r: "16:9", label: "Wide" },
                      { r: "9:16", label: "Tall" },
                    ].map(({ r, label }) => (
                      <button
                        key={r}
                        onClick={() => setAspectRatio(r)}
                        style={{
                          flex: 1,
                          padding: "14px 0",
                          borderRadius: 14,
                          border: `2px solid ${aspectRatio === r ? "#7c3aed" : "rgba(124, 58, 237, 0.15)"}`,
                          background: aspectRatio === r ? "rgba(124, 58, 237, 0.15)" : "transparent",
                          color: aspectRatio === r ? "#c084fc" : "#888",
                          cursor: "pointer",
                          fontSize: 15,
                          fontWeight: 600,
                          fontFamily: "inherit",
                          minHeight: 52,
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Advanced Settings */}
              <div style={{ marginBottom: 20 }}>
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  style={{
                    background: "none", border: "none",
                    color: "#888", fontSize: 15, cursor: "pointer",
                    fontFamily: "inherit", padding: "8px 0",
                    display: "flex", alignItems: "center", gap: 8,
                  }}
                >
                  <span style={{ transform: showAdvanced ? "rotate(90deg)" : "rotate(0)", transition: "transform 0.2s", display: "inline-block" }}>▶</span>
                  Fine-tune settings
                </button>
                {showAdvanced && (
                  <div className="fade-in" style={{ marginTop: 16, padding: 20, background: "rgba(10, 10, 20, 0.4)", borderRadius: 16, border: "1px solid rgba(124, 58, 237, 0.1)" }}>
                    <div style={{ display: "flex", gap: 28 }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 14, color: "#999", marginBottom: 8 }}>
                          Style strength: <span style={{ color: "#c084fc", fontWeight: 600 }}>{loraScale.toFixed(2)}</span>
                        </p>
                        <input
                          type="range" min="0.5" max="2.0" step="0.05" value={loraScale}
                          onChange={(e) => setLoraScale(parseFloat(e.target.value))}
                          style={{ width: "100%", accentColor: "#7c3aed", height: 6 }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 14, color: "#999", marginBottom: 8 }}>
                          Prompt accuracy: <span style={{ color: "#c084fc", fontWeight: 600 }}>{guidanceScale.toFixed(1)}</span>
                        </p>
                        <input
                          type="range" min="2" max="10" step="0.5" value={guidanceScale}
                          onChange={(e) => setGuidanceScale(parseFloat(e.target.value))}
                          style={{ width: "100%", accentColor: "#7c3aed", height: 6 }}
                        />
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 24, marginTop: 18, flexWrap: "wrap" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", minHeight: 44 }}>
                        <input
                          type="checkbox" checked={faceRestore}
                          onChange={(e) => setFaceRestore(e.target.checked)}
                          style={{ accentColor: "#7c3aed", width: 20, height: 20 }}
                        />
                        <span style={{ fontSize: 14, color: "#999" }}>Fix faces (cleaner, +10s)</span>
                      </label>
                      <div style={{ display: "flex", gap: 8 }}>
                        {[{ id: "bw", label: "B&W" }, { id: "color", label: "Color" }].map((m) => (
                          <button
                            key={m.id}
                            onClick={() => setColorMode(m.id)}
                            style={{
                              padding: "10px 18px",
                              borderRadius: 12,
                              border: `2px solid ${colorMode === m.id ? "#7c3aed" : "rgba(124, 58, 237, 0.15)"}`,
                              background: colorMode === m.id ? "rgba(124, 58, 237, 0.15)" : "transparent",
                              color: colorMode === m.id ? "#c084fc" : "#888",
                              cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "inherit",
                              minHeight: 44,
                            }}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>
                      <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", minHeight: 44 }}>
                        <input
                          type="checkbox" checked={suppressText}
                          onChange={(e) => setSuppressText(e.target.checked)}
                          style={{ accentColor: "#7c3aed", width: 20, height: 20 }}
                        />
                        <span style={{ fontSize: 14, color: "#999" }}>No text in image</span>
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", minHeight: 44 }}>
                        <input
                          type="checkbox" checked={usePulidFace}
                          onChange={(e) => setUsePulidFace(e.target.checked)}
                          style={{ accentColor: "#f59e0b", width: 20, height: 20 }}
                        />
                        <span style={{ fontSize: 14, color: "#999" }}>Recognizable faces (politicians)</span>
                      </label>
                    </div>
                    {faceRestore && (
                      <div style={{ marginTop: 16 }}>
                        <p style={{ fontSize: 14, color: "#999", marginBottom: 8 }}>
                          Face fix strength: <span style={{ color: "#4ade80", fontWeight: 600 }}>{faceFidelity.toFixed(2)}</span>
                          <span style={{ color: "#666", marginLeft: 10 }}>(lower = stronger)</span>
                        </p>
                        <input
                          type="range" min="0.1" max="0.9" step="0.05" value={faceFidelity}
                          onChange={(e) => setFaceFidelity(parseFloat(e.target.value))}
                          style={{ width: "100%", maxWidth: 300, accentColor: "#4ade80", height: 6 }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Generate button */}
              <button
                style={{
                  ...css.btn,
                  ...css.btnPrimary,
                  width: "100%",
                  padding: "22px 24px",
                  fontSize: 20,
                  fontWeight: 700,
                  borderRadius: 18,
                  opacity: !canGenerate || generating ? 0.5 : 1,
                  position: "relative",
                  overflow: "hidden",
                }}
                onClick={handleGenerate}
                disabled={!canGenerate || generating}
              >
                {generating ? (
                  <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
                    <Spinner size={24} color="#fff" />
                    Creating your artwork...
                  </span>
                ) : (
                  "🎨 Create in My Style"
                )}
              </button>
            </div>
          )}

          {/* Generated images */}
          {project.generations.length > 0 && (
            <div className="fade-in">
              <h3 style={{ fontSize: 22, fontWeight: 700, marginTop: 36, marginBottom: 20, color: "#e0e0e8" }}>
                Your Artwork ({project.generations.length})
              </h3>
              <div style={css.genGrid}>
                {[...project.generations].reverse().map((g) => (
                  <div key={g.id} style={{ ...css.card, position: "relative", padding: 0, overflow: "hidden" }}>
                    <button
                      onClick={() => handleDeleteGeneration(g.id)}
                      style={{
                        position: "absolute", top: 12, right: 12,
                        width: 36, height: 36, borderRadius: "50%",
                        border: "none", background: "rgba(0,0,0,0.7)",
                        color: "#f87171", cursor: "pointer",
                        fontSize: 18, lineHeight: "36px", zIndex: 1,
                      }}
                    >
                      &times;
                    </button>
                    <img
                      src={g.url}
                      style={{ ...css.genImage, borderRadius: "20px 20px 0 0", border: "none" }}
                      alt={g.prompt}
                      onClick={() => setLightboxImage({ url: g.url, alt: g.prompt })}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.02)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                    />
                    <div style={{ padding: "16px 20px" }}>
                      <p style={{ fontSize: 15, color: "#999" }}>{g.prompt}</p>
                      {g.params && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                          <span style={{ ...css.badge, background: "rgba(124, 58, 237, 0.1)", color: "#c084fc", fontSize: 11 }}>
                            Style {g.params.loraScale}
                          </span>
                          {g.params.faceRestore && (
                            <span style={{ ...css.badge, background: "rgba(74, 222, 128, 0.1)", color: "#4ade80", fontSize: 11 }}>
                              Face Fix
                            </span>
                          )}
                          {g.params.multiLora && (
                            <span style={{ ...css.badge, background: "rgba(245, 158, 11, 0.1)", color: "#f59e0b", fontSize: 11 }}>
                              Known Face
                            </span>
                          )}
                          {g.params.colorMode && (
                            <span style={{ ...css.badge, background: "rgba(26, 26, 46, 0.8)", color: g.params.colorMode === "bw" ? "#e0e0e8" : "#facc15", fontSize: 11 }}>
                              {g.params.colorMode === "bw" ? "B&W" : "Color"}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
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
  const [view, setView] = useState("list");
  const [activeProject, setActiveProject] = useState(null);

  return (
    <>
      <style>{globalStyles}</style>
      <div style={css.app}>
        <div style={css.header}>
          <div
            style={css.logo}
            onClick={() => { setView("list"); setActiveProject(null); }}
          >
            ArtVoice
          </div>
          {view !== "list" && (
            <button
              style={{ ...css.btn, ...css.btnSecondary }}
              onClick={() => { setView("list"); setActiveProject(null); }}
            >
              ← Home
            </button>
          )}
        </div>

        {view === "list" && (
          <ProjectList
            onSelect={(id) => { setActiveProject(id); setView("project"); }}
            onCreate={() => setView("new")}
          />
        )}
        {view === "new" && (
          <NewProject
            onCreated={(id) => { setActiveProject(id); setView("project"); }}
            onCancel={() => setView("list")}
          />
        )}
        {view === "project" && activeProject && (
          <ProjectDetail
            projectId={activeProject}
            onBack={() => { setView("list"); setActiveProject(null); }}
          />
        )}
      </div>
    </>
  );
}
