# StyleForge

An accessible web app for creating editorial political cartoons in a custom ink style. Built for people with Parkinson's, Alzheimer's, and other disabilities — designed to be maximally automated so users can type a simple prompt like "Trump at podium" and get a recognizable caricature.

Inspired by the editorial cartoon style of [doctorfunnies.com](http://doctorfunnies.com) (David Schopick).

## How It Works

1. **Upload** reference images of the target art style (B&W ink cartoons)
2. **Train** a style LoRA on FLUX.1 Dev using Ostris trainer (rank 32, LR 1e-4, 2000 steps)
3. **Generate** cartoons from simple text prompts

### Generation Pipeline

```
User prompt ("trump at podium")
    |
    v
Character auto-detection (12 public figures)
    |
    v
Prompt enhancement (injects physical descriptions)
    |
    v
+-- Characters detected? --+
|   YES                     |   NO
|   Multi-LoRA path         |   Standard path
|   (lucataco/flux-dev-     |   (trained model
|    multi-lora + style     |    version with
|    LoRA via hf_loras)     |    lora_scale)
+---------------------------+
    |
    v
Text removal post-processing (flux-kontext)
    |
    v
CodeFormer face restoration
    |
    v
Final image
```

**Multi-LoRA mode** preserves FLUX's built-in knowledge of public figures while applying the trained ink style as a LoRA — so faces stay recognizable.

## Features

- **LoRA training** via Replicate (Ostris FLUX.1 Dev v3)
- **Multi-LoRA generation** for recognizable politician caricatures
- **Character auto-detection** — 12 public figures with physical descriptions auto-injected into prompts
- **CodeFormer face restoration** with adjustable fidelity
- **Text suppression** — prompt engineering + post-processing text removal
- **Sketch-to-cartoon** — draw a rough sketch, convert to ink style (img2img)
- **B&W / Color modes**
- **Adjustable parameters** — LoRA scale, guidance scale, aspect ratio, face fidelity

## Tech Stack

- **Frontend**: React + Vite
- **Backend**: Express.js
- **AI Models** (via Replicate):
  - `ostris/flux-dev-lora-trainer` — LoRA training
  - `lucataco/flux-dev-multi-lora` — generation with dynamic LoRA loading
  - `flux-kontext-apps/text-removal` — text/speech bubble removal
  - `sczhou/codeformer` — face restoration

## Setup

```bash
# Clone
git clone https://github.com/ilan-stack/StyleForge.git
cd StyleForge

# Install dependencies
npm install

# Create .env with your Replicate API token
echo "REPLICATE_API_TOKEN=your_token_here" > .env
echo "PORT=3456" >> .env

# Start the server
node server/index.js

# In another terminal, start the frontend
npx vite

# Open http://localhost:5199
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `REPLICATE_API_TOKEN` | Yes | Your [Replicate](https://replicate.com) API token |
| `PORT` | No | Server port (default: 3456) |

## Cost Estimates

| Operation | Cost |
|-----------|------|
| LoRA training (2000 steps) | ~$2-3 |
| Generation (multi-LoRA) | ~$0.03 |
| Generation (standard) | ~$0.03 |
| Text removal | ~$0.03 |
| Face restoration | ~$0.02 |
| **Per image total** | **~$0.08-0.10** |

## License

MIT
