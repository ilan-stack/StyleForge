import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirnameEarly = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirnameEarly, "../.env") });
import Replicate from "replicate";
import archiver from "archiver";

const __dirname = __dirnameEarly;
const app = express();
const PORT = process.env.PORT || 3456;

app.use(cors());
app.use(express.json({ limit: "20mb" })); // larger limit for sketch canvas base64
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

// Multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "../uploads", req.params.projectId || "temp");
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png", ".webp"];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB per file
});

// In-memory project store (persisted to JSON)
const DB_PATH = path.join(__dirname, "../projects.json");

function loadProjects() {
  if (fs.existsSync(DB_PATH)) {
    return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
  }
  return {};
}

function saveProjects(projects) {
  fs.writeFileSync(DB_PATH, JSON.stringify(projects, null, 2));
}

// ─── Routes ──────────────────────────────────────────

// List all projects
app.get("/api/projects", (req, res) => {
  const projects = loadProjects();
  const list = Object.values(projects).sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
  res.json(list);
});

// Create a new style project
app.post("/api/projects", (req, res) => {
  const { name, triggerWord } = req.body;
  const id = `proj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const trigger = triggerWord || `STYLE_${id.slice(-6).toUpperCase()}`;

  const project = {
    id,
    name: name || "Untitled Style",
    triggerWord: trigger,
    images: [],
    training: null, // { status, replicateId, modelUrl, loraUrl }
    generations: [],
    createdAt: new Date().toISOString(),
  };

  const projects = loadProjects();
  projects[id] = project;
  saveProjects(projects);

  fs.mkdirSync(path.join(__dirname, "../uploads", id), { recursive: true });
  res.json(project);
});

// Get a single project
app.get("/api/projects/:projectId", (req, res) => {
  const projects = loadProjects();
  const project = projects[req.params.projectId];
  if (!project) return res.status(404).json({ error: "Project not found" });
  res.json(project);
});

// Upload images to a project
app.post("/api/projects/:projectId/images", upload.array("images", 200), (req, res) => {
  const projects = loadProjects();
  const project = projects[req.params.projectId];
  if (!project) return res.status(404).json({ error: "Project not found" });

  const newImages = req.files.map((f) => ({
    filename: f.filename,
    originalName: f.originalname,
    size: f.size,
    url: `/uploads/${req.params.projectId}/${f.filename}`,
  }));

  project.images.push(...newImages);
  saveProjects(projects);
  res.json({ uploaded: newImages.length, images: project.images });
});

// Delete an image from a project
app.delete("/api/projects/:projectId/images/:filename", (req, res) => {
  const projects = loadProjects();
  const project = projects[req.params.projectId];
  if (!project) return res.status(404).json({ error: "Project not found" });

  const idx = project.images.findIndex((img) => img.filename === req.params.filename);
  if (idx === -1) return res.status(404).json({ error: "Image not found" });

  const filePath = path.join(__dirname, "../uploads", req.params.projectId, req.params.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  project.images.splice(idx, 1);
  saveProjects(projects);
  res.json({ success: true });
});

// Delete a generated image from a project
app.delete("/api/projects/:projectId/generations/:genId", (req, res) => {
  const projects = loadProjects();
  const project = projects[req.params.projectId];
  if (!project) return res.status(404).json({ error: "Project not found" });

  const idx = project.generations.findIndex((g) => g.id === req.params.genId);
  if (idx === -1) return res.status(404).json({ error: "Generation not found" });

  project.generations.splice(idx, 1);
  saveProjects(projects);
  res.json({ success: true });
});

// Delete an entire project and its uploaded files
app.delete("/api/projects/:projectId", (req, res) => {
  const projects = loadProjects();
  const project = projects[req.params.projectId];
  if (!project) return res.status(404).json({ error: "Project not found" });

  // Remove uploaded files
  const uploadDir = path.join(__dirname, "../uploads", req.params.projectId);
  if (fs.existsSync(uploadDir)) {
    fs.rmSync(uploadDir, { recursive: true, force: true });
  }

  delete projects[req.params.projectId];
  saveProjects(projects);
  res.json({ success: true });
});

// Trainer configurations
const TRAINERS = {
  "fast-flux": {
    id: "fast-flux",
    name: "Fast Flux (Replicate)",
    description: "Replicate's optimized trainer. Fastest option, great for quick iterations.",
    owner: "replicate",
    model: "fast-flux-trainer",
    version: "f463fbfc97389e10a2f443a8a84b6953b1058eafbf0c9af4d84457ff07cb04db",
    getInput: (zipBase64, triggerWord) => ({
      input_images: zipBase64,
      trigger_word: triggerWord,
      steps: 1000,
      lora_rank: 16,
      autocaption: true,
    }),
  },
  "ostris-flux-dev": {
    id: "ostris-flux-dev",
    name: "Ostris FLUX.1 Dev (v3)",
    description: "Style-only LoRA. Rank 32, LR 1e-4, 2000 steps. Preserves FLUX's built-in face knowledge.",
    owner: "ostris",
    model: "flux-dev-lora-trainer",
    version: "26dce37af90b9d997eeb970d92e47de3064d46c300504ae376c75bef6a9022d2",
    getInput: (zipBase64, triggerWord) => ({
      input_images: zipBase64,
      trigger_word: triggerWord,
      steps: 2000,
      lora_rank: 32,
      learning_rate: 0.0001,
      optimizer: "adamw8bit",
      batch_size: 1,
      resolution: "512,768,1024",
      autocaption: true,
      autocaption_prefix: `${triggerWord} style black and white ink editorial cartoon with thick bold outlines and heavy crosshatching,`,
    }),
  },
};

// List available trainers
app.get("/api/trainers", (req, res) => {
  const list = Object.values(TRAINERS).map(({ id, name, description }) => ({
    id,
    name,
    description,
  }));
  res.json(list);
});

// Start training
app.post("/api/projects/:projectId/train", async (req, res) => {
  const { trainer: trainerId = "fast-flux" } = req.body;
  const trainerConfig = TRAINERS[trainerId];
  if (!trainerConfig) {
    return res.status(400).json({ error: `Unknown trainer: ${trainerId}` });
  }

  const projects = loadProjects();
  const project = projects[req.params.projectId];
  if (!project) return res.status(404).json({ error: "Project not found" });
  if (project.images.length < 5) {
    return res.status(400).json({ error: "Need at least 5 images to train" });
  }
  if (project.training?.status === "processing" || project.training?.status === "starting") {
    return res.status(400).json({ error: "Training already in progress" });
  }

  // Respond immediately, run training in background
  project.training = {
    status: "starting",
    trainerId: trainerId,
    trainerName: trainerConfig.name,
    loraUrl: null,
    startedAt: new Date().toISOString(),
  };
  saveProjects(projects);
  res.json({ training: project.training });

  // ─── Background: zip originals → upload → train ───
  (async () => {
    try {
      // Cap at 50 images for LoRA training (more isn't better, and avoids upload size limits)
      const MAX_TRAIN_IMAGES = 50;
      const trainingImages = project.images.length > MAX_TRAIN_IMAGES
        ? project.images.slice(0, MAX_TRAIN_IMAGES)
        : project.images;
      console.log(`[BG] Zipping ${trainingImages.length} training images (of ${project.images.length} total)...`);

      const zipPath = path.join(__dirname, "../uploads", project.id, "training_data.zip");
      await new Promise((resolve, reject) => {
        const output = fs.createWriteStream(zipPath);
        const archive = archiver("zip", { zlib: { level: 5 } });
        output.on("close", resolve);
        archive.on("error", reject);
        archive.pipe(output);
        for (const img of trainingImages) {
          const imgPath = path.join(__dirname, "../uploads", project.id, img.filename);
          archive.file(imgPath, { name: img.filename });
        }
        archive.finalize();
      });

      const zipStats = fs.statSync(zipPath);
      console.log(`[BG] ZIP size: ${(zipStats.size / 1024 / 1024).toFixed(1)}MB`);

      let zipInput;
      if (zipStats.size > 90 * 1024 * 1024) {
        // Over 90MB — use Replicate file upload API
        console.log(`[BG] Large ZIP, uploading via Replicate files API...`);
        const zipBuffer = fs.readFileSync(zipPath);
        const zipBlob = new Blob([zipBuffer], { type: "application/zip" });
        const fileResponse = await replicate.files.create(zipBlob, {
          content_type: "application/zip",
          filename: "training_data.zip",
        });
        zipInput = fileResponse.urls.get;
        console.log(`[BG] Uploaded: ${zipInput}`);
      } else {
        // Under 90MB — inline as base64 data URI (simpler, no extra API call)
        console.log(`[BG] Small ZIP, using inline base64...`);
        const zipBuffer = fs.readFileSync(zipPath);
        zipInput = `data:application/zip;base64,${zipBuffer.toString("base64")}`;
      }

      // Create model on Replicate
      const modelOwner = "sett";
      const modelName = `style-forge-${project.id.replace(/[^a-z0-9-]/gi, "-").toLowerCase()}`;
      try {
        await replicate.models.create(modelOwner, modelName, {
          visibility: "private",
          hardware: "gpu-t4",
          description: `StyleForge: ${project.name}`,
        });
      } catch (e) {
        if (!e.message?.includes("already exists")) throw e;
      }

      // Start training
      console.log(`[BG] Starting ${trainerConfig.name} training...`);
      const training = await replicate.trainings.create(
        trainerConfig.owner,
        trainerConfig.model,
        trainerConfig.version,
        {
          destination: `${modelOwner}/${modelName}`,
          input: trainerConfig.getInput(zipInput, project.triggerWord),
        }
      );
      console.log(`[BG] Training started: ${training.id}`);

      // Update project with Replicate training ID
      const projsAfter = loadProjects();
      const projAfter = projsAfter[req.params.projectId];
      if (projAfter) {
        projAfter.training = {
          status: "processing",
          replicateId: training.id,
          modelUrl: `${modelOwner}/${modelName}`,
          trainerId: trainerId,
          trainerName: trainerConfig.name,
          loraUrl: null,
          startedAt: project.training.startedAt,
        };
        saveProjects(projsAfter);
      }

      // Clean up
      fs.unlinkSync(zipPath);
    } catch (err) {
      console.error("[BG] Training error:", err);
      const projsErr = loadProjects();
      const projErr = projsErr[req.params.projectId];
      if (projErr) {
        projErr.training = { status: "failed", error: err.message, trainerId, trainerName: trainerConfig.name };
        saveProjects(projsErr);
      }
    }
  })();
});

// Check training status
app.get("/api/projects/:projectId/training/status", async (req, res) => {
  const projects = loadProjects();
  const project = projects[req.params.projectId];
  if (!project) return res.status(404).json({ error: "Project not found" });
  if (!project.training) return res.json({ status: "not_started" });

  if (project.training.status === "starting" && !project.training.replicateId) {
    // Still preprocessing images in background — just return current state with progress
  } else if (project.training.status === "starting" || project.training.status === "processing") {
    try {
      const t = await replicate.trainings.get(project.training.replicateId);
      project.training.status = t.status;

      if (t.status === "succeeded" && t.output?.weights) {
        project.training.loraUrl = t.output.weights;
      }
      if (t.status === "failed") {
        project.training.error = t.error;
      }
      project.training.logs = t.logs?.slice(-500);
      saveProjects(projects);
    } catch (err) {
      console.error("Status check error:", err);
    }
  }

  res.json(project.training);
});

// ─── Reference Photo Bank ──────────────────────────────
// Public domain / Creative Commons reference photos for PuLID face identity.
// These are well-known public figures — using freely-available press/government photos.
const REFERENCE_PHOTOS = {
  trump: "https://upload.wikimedia.org/wikipedia/commons/5/56/Donald_Trump_official_portrait.jpg",
  biden: "https://upload.wikimedia.org/wikipedia/commons/6/68/Joe_Biden_presidential_portrait.jpg",
  obama: "https://upload.wikimedia.org/wikipedia/commons/8/8d/President_Barack_Obama.jpg",
  putin: "https://upload.wikimedia.org/wikipedia/commons/d/d0/Vladimir_Putin_%282020-02-20%29.jpg",
  zelensky: "https://upload.wikimedia.org/wikipedia/commons/8/8c/Volodymyr_Zelensky_Official_portrait.jpg",
  netanyahu: "https://upload.wikimedia.org/wikipedia/commons/b/b1/Benjamin_Netanyahu_2023.jpg",
  harris: "https://upload.wikimedia.org/wikipedia/commons/4/41/Kamala_Harris_Vice_Presidential_Portrait.jpg",
  musk: "https://upload.wikimedia.org/wikipedia/commons/3/34/Elon_Musk_Royal_Society_%28crop2%29.jpg",
  kim: "https://upload.wikimedia.org/wikipedia/commons/f/f3/Kim_Jong-un_in_2024_%28cropped%29.jpg",
  pelosi: "https://upload.wikimedia.org/wikipedia/commons/b/b5/Nancy_Pelosi_portrait_2019.jpg",
  sanders: "https://upload.wikimedia.org/wikipedia/commons/d/de/Bernie_Sanders.jpg",
  mcconnell: "https://upload.wikimedia.org/wikipedia/commons/e/e9/Mitch_McConnell_2016_official_photo_%28cropped%29.jpg",
};

// Detect which characters are mentioned in the prompt
function detectCharacters(prompt) {
  const found = [];
  for (const name of Object.keys(CHARACTERS)) {
    const regex = new RegExp(`\\b${name}\\b`, "i");
    if (regex.test(prompt)) {
      found.push(name);
    }
  }
  return found;
}

// ─── Character Library ─────────────────────────────────
// Auto-detect public figures in prompts and inject detailed physical descriptions
// so the LoRA generates recognizable caricatures without the user needing to describe them.
const CHARACTERS = {
  trump: "Donald Trump with distinctive wispy blonde combover hair swept to the right, squinting eyes, pursed thin lips, large frame, oversized navy blue suit, extremely long red necktie, pointing finger gesture",
  biden: "Joe Biden with thin white hair, aviator sunglasses pushed up, warm toothy smile, slim elderly build, well-fitted navy suit, American flag pin on lapel",
  obama: "Barack Obama with short cropped dark hair, prominent ears, tall slim athletic build, confident wide smile, perfectly tailored charcoal suit, no-tie open collar",
  putin: "Vladimir Putin with receding short blonde hair, cold piercing blue eyes, stern expressionless face, compact muscular build, dark formal suit",
  zelensky: "Volodymyr Zelensky with short dark hair and stubble beard, olive green military t-shirt, tired determined eyes, medium build",
  netanyahu: "Benjamin Netanyahu with silver grey hair combed back, heavy-set build, stern serious expression, dark suit with blue tie",
  harris: "Kamala Harris with shoulder-length dark hair, bright confident smile, pearl necklace, navy blue power suit",
  musk: "Elon Musk with short dark hair, awkward half-smile, tall lanky build, black t-shirt or dark casual suit",
  kim: "Kim Jong Un with distinctive high-and-tight black haircut shaved on sides, round full face, small round glasses, black Mao suit",
  pelosi: "Nancy Pelosi with auburn coiffed hair, sharp facial features, colorful designer suit, pearl jewelry, thin build",
  sanders: "Bernie Sanders with wild unkempt white hair, large glasses, animated hand gestures, rumpled dark suit, hunched posture",
  mcconnell: "Mitch McConnell with thin white hair, distinctive jowly chin and neck, glasses, dark suit, stern unreadable expression",
};

function enhancePromptWithCharacters(prompt) {
  let enhanced = prompt;
  for (const [name, description] of Object.entries(CHARACTERS)) {
    // Match whole word, case-insensitive (e.g. "Trump" but not "trumped")
    const regex = new RegExp(`\\b${name}\\b`, "gi");
    enhanced = enhanced.replace(regex, description);
  }
  return enhanced;
}

// Generate images
app.post("/api/projects/:projectId/generate", async (req, res) => {
  const projects = loadProjects();
  const project = projects[req.params.projectId];
  if (!project) return res.status(404).json({ error: "Project not found" });
  if (project.training?.status !== "succeeded" || !project.training.loraUrl) {
    return res.status(400).json({ error: "Model not trained yet" });
  }

  const { prompt, numImages = 1, aspectRatio = "1:1", guidanceScale = 3.5, loraScale = 1.15, sketchImage, faceRestore = true, faceFidelity = 0.4, colorMode = "bw", suppressText = true, usePulidFace = true } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt is required" });

  try {
    const results = [];

    // Low guidance + high lora_scale lets the trained LoRA style dominate.
    // No extra style descriptors needed — they fight with the LoRA.
    const colorPrefix = colorMode === "bw"
      ? "black and white ink illustration, pure monochrome, no color,"
      : "full color illustration,";
    const textSuffix = suppressText
      ? ", absolutely no text, no speech bubbles, no dialogue boxes, no words, no letters, no writing, no captions, no banners, no signs, wordless, silent comic, pantomime style"
      : "";
    const clarityNudge = ", clear recognizable faces, well-defined facial features, distinct character expressions, caricature with accurate likeness";
    // Auto-inject detailed physical descriptions for known public figures
    const enhancedPrompt = enhancePromptWithCharacters(prompt);
    const styledPrompt = `${project.triggerWord} ${colorPrefix} ${enhancedPrompt}${clarityNudge}${textSuffix}`;
    console.log("Enhanced prompt:", enhancedPrompt);

    // Get the latest version of the trained model
    const [modelOwner, modelName] = project.training.modelUrl.split("/");
    const model = await replicate.models.get(modelOwner, modelName);
    const versionId = model.latest_version?.id;
    if (!versionId) throw new Error("No model version found — training may not have completed properly");

    const modelRef = `${project.training.modelUrl}:${versionId}`;
    console.log("Generating with:", modelRef);
    console.log("Prompt:", styledPrompt);
    console.log("LoRA URL:", project.training.loraUrl);
    if (sketchImage) console.log("Using sketch guide (img2img)");

    // Detect public figures for multi-LoRA face identity boost
    const detectedChars = detectCharacters(prompt);
    const useMultiLora = usePulidFace && detectedChars.length > 0 && !sketchImage && project.training.loraUrl;

    if (useMultiLora) {
      console.log(`Multi-LoRA mode: detected characters [${detectedChars.join(", ")}], using lucataco/flux-dev-multi-lora`);
      console.log("Style LoRA URL:", project.training.loraUrl);
    }

    for (let i = 0; i < Math.min(numImages, 4); i++) {
      let prediction;

      if (useMultiLora) {
        // ─── Multi-LoRA path: style LoRA loaded dynamically via lucataco/flux-dev-multi-lora
        // FLUX already knows major public figures — the multi-lora model is explicitly
        // designed for "person LoRA + style LoRA" combos and preserves face knowledge.
        // We pass our style LoRA via hf_loras so FLUX's built-in face recognition stays intact.
        // NOTE: hf_loras accepts replicate.delivery URLs ending in trained_model.tar or flux-lora.tar
        const multiLoraInput = {
          prompt: styledPrompt,
          hf_loras: [project.training.loraUrl],
          lora_scales: [loraScale],
          num_outputs: 1,
          aspect_ratio: aspectRatio,
          output_format: "png",
          guidance_scale: guidanceScale,
          num_inference_steps: 28,
          seed: Math.floor(Math.random() * 2147483647),
          disable_safety_checker: true,
        };

        console.log("=== MULTI-LORA GENERATION START ===");
        console.log("LoRAs:", multiLoraInput.hf_loras);
        console.log("Scales:", multiLoraInput.lora_scales);
        console.log("Prompt:", styledPrompt.slice(0, 200) + "...");

        try {
          const mlOutput = await replicate.run(
            "lucataco/flux-dev-multi-lora:ad0314563856e714367fdc7244b19b160d25926d305fec270c9e00f64665d352",
            { input: multiLoraInput }
          );

          if (mlOutput && mlOutput.length > 0) {
            prediction = { status: "succeeded", output: mlOutput };
            console.log("Multi-LoRA generation complete");
          } else {
            throw new Error("Multi-LoRA returned empty output");
          }
        } catch (mlErr) {
          // Fallback to standard path if multi-LoRA fails
          console.warn("Multi-LoRA failed, falling back to standard path:", mlErr.message);
          prediction = null;
        }
      }

      // ─── Standard path: use the trained model version directly (or fallback from multi-LoRA)
      if (!prediction) {
        const inputParams = {
          prompt: styledPrompt,
          num_outputs: 1,
          aspect_ratio: aspectRatio,
          output_format: "png",
          guidance_scale: guidanceScale,
          num_inference_steps: 50,
          go_fast: false,
          lora_scale: loraScale,
        };

        // If a sketch is provided, use img2img mode
        if (sketchImage) {
          inputParams.image = sketchImage;
          inputParams.prompt_strength = 0.45;
          delete inputParams.aspect_ratio;
        }

        console.log("=== GENERATION START ===");
        console.log("Version:", versionId);
        console.log("Input:", JSON.stringify(inputParams));
        prediction = await replicate.predictions.create({
          version: versionId,
          input: inputParams,
        });
        console.log("Prediction ID:", prediction.id);

        // Poll until complete
        while (prediction.status !== "succeeded" && prediction.status !== "failed" && prediction.status !== "canceled") {
          await new Promise((r) => setTimeout(r, 2000));
          prediction = await replicate.predictions.get(prediction.id);
        }

        if (prediction.status === "failed") {
          throw new Error(prediction.error || "Generation failed");
        }

        // Check if LoRA was actually loaded
        const loraLoaded = prediction.logs?.includes("Loaded LoRAs");
        console.log("LoRA loaded:", loraLoaded);
        if (!loraLoaded) {
          console.warn("WARNING: LoRA weights may not have loaded!");
          console.log("Full logs:", prediction.logs?.slice(0, 500));
        }
      }

      if (prediction.output && prediction.output[0]) {
        let imageUrl = String(prediction.output[0]);

        // Step 1: Text removal post-processing (runs BEFORE face fix)
        if (suppressText) {
          console.log("Running text removal (flux-kontext)...");
          try {
            const trOutput = await replicate.run("flux-kontext-apps/text-removal", {
              input: {
                input_image: imageUrl,
                output_format: "png",
                aspect_ratio: "match_input_image",
              },
            });
            if (trOutput) {
              imageUrl = String(Array.isArray(trOutput) ? trOutput[0] : trOutput);
              console.log("Text removal complete");
            }
          } catch (trErr) {
            console.warn("Text removal error:", trErr.message);
          }
        }

        // Step 2: CodeFormer face restoration post-processing
        if (faceRestore) {
          console.log("Running CodeFormer face restoration...");
          try {
            let cfPrediction = await replicate.predictions.create({
              version: "cc4956dd26fa5a7185d5660cc9100fab1b8070a1d1654a8bb5eb6d443b020bb2",
              input: {
                image: imageUrl,
                upscale: 2,
                face_upsample: true,
                codeformer_fidelity: faceFidelity,
                background_enhance: true,
              },
            });

            while (cfPrediction.status !== "succeeded" && cfPrediction.status !== "failed" && cfPrediction.status !== "canceled") {
              await new Promise((r) => setTimeout(r, 2000));
              cfPrediction = await replicate.predictions.get(cfPrediction.id);
            }

            if (cfPrediction.status === "succeeded" && cfPrediction.output) {
              imageUrl = String(Array.isArray(cfPrediction.output) ? cfPrediction.output[0] : cfPrediction.output);
              console.log("Face restoration complete");
            } else {
              console.warn("Face restoration failed, using original image");
            }
          } catch (cfErr) {
            console.warn("Face restoration error:", cfErr.message);
          }
        }

        results.push({
          id: `gen_${Date.now()}_${i}`,
          prompt,
          url: imageUrl,
          params: {
            loraScale,
            guidanceScale,
            aspectRatio,
            faceRestore,
            faceFidelity,
            colorMode,
            suppressText,
            multiLora: useMultiLora,
            steps: useMultiLora ? 28 : 50,
          },
          createdAt: new Date().toISOString(),
        });
      }
    }

    project.generations.push(...results);
    saveProjects(projects);

    res.json({ images: results });
  } catch (err) {
    console.error("Generation error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`StyleForge server running at http://localhost:${PORT}`);
});
