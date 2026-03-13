# Kami Prompter

> **Prompt engineering, directly from your editor.**  
> Three AI-powered modules to improve, build, and generate product documentation from your prompts — powered by Google Gemini.

---

## Features

### 🔍 Prompt Improver
Analyzes your existing prompt and enhances it using a 7-vector quality model *(clarity, context, specificity, structure, role, examples, constraints)*. Returns the improved prompt with annotated diffs so you can see exactly what changed and why.

### 🧩 Prompt Builder (CREDO)
Guides you through building a high-quality prompt from scratch using the **CREDO framework**:
- **C**ontext — Background for the AI model
- **R**ole — Persona or expertise to adopt
- **E**xpectation — What the output should look like
- **D**ata Input — The information to work with
- **O**utput Format — Structure, length, or format constraints

An AI-powered suggestion engine can auto-complete any field based on what you've already written.

### 📋 PRD Maker
Generates a full **Product Requirements Document** from a brief product description. Choose your detail level (*basic / standard / exhaustive*) and output language, then regenerate any individual section with a custom AI instruction — without re-running the whole document.

---

## Getting Started

### 1. Get a Google Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Sign in with your Google account
3. Click **"Create API Key"** → Select a Google Cloud project (or create one)
4. Copy the generated key — you'll only see it once

> **Free tier limits:**
> | Model | ID | RPM | RPD | Context |
> |-------|----|-----|-----|---------|
> | Gemini 3 Flash | `gemini-3-flash-preview` | **15 RPM** | 1,500/day | 1M tokens |
> | Gemini 3.1 Pro | `gemini-3.1-pro-preview` | **2 RPM** | 50–100/day* | 1M tokens |
>
> *Pro access may be restricted or throttled based on system load. Kami Prompter automatically selects Flash for Intelligence ≤ 70 and Pro for ≥ 71.
>
> If you exceed the limit, Kami Prompter will display the retry time and wait automatically.

### 2. Configure the API Key in Kami Prompter

1. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Run **"Kami Prompter: Open"**
3. The panel will open — enter your API key in the **Settings** section
4. Click **Save** — the key is stored securely in VS Code's Secret Storage (never in settings files or plain text)

---

## Usage

### Prompt Improver

1. Paste your prompt into the **"Prompt a Mejorar"** field
2. Choose an intervention level:
   - **Subtle** — Minor rewording, preserves your style
   - **Moderate** — Restructures and adds missing context
   - **Aggressive** — Full rewrite optimized for AI consumption
3. Adjust the **Intelligence** slider (higher = smarter model, slower response)
4. Click **"Mejorar Prompt"**

The Intelligence slider maps to model selection:
- **0–70** → `gemini-3-flash-preview` (fast, 15 RPM free tier)
- **71–100** → `gemini-3.1-pro-preview` (more capable, 2 RPM free tier — a warning is shown before crossing the threshold)

---

### Prompt Builder (CREDO)

1. Fill in any CREDO fields you know — leave the rest blank
2. Click the lightbulb icon next to any field for an **AI suggestion** based on what you've written
3. When ready, click **"Ensamblar Prompt"**

The Builder returns a polished, unified prompt with an estimated effectiveness score (0–100).

---

### PRD Maker

1. Describe your product idea in 1–3 sentences
2. Fill in product type, target audience, tech stack (optional), detail level, and output language
3. Click **"Generar PRD"**

Each section appears as an individual card. To refine a section:
1. Click **"Regenerar Sección"** on any card
2. Type your instruction (e.g., *"Add acceptance criteria for each feature"*)
3. Click **Confirmar** — the section updates in place without re-generating the full document

---

## UI Overview

```
┌─────────────────────────────────────────────────────┐
│  Kami Prompter   [Improver] [Builder] [PRD Maker]   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  [Active Module Form]                               │
│                                                     │
│  Intelligence: ──────●──────── 50                  │
│                                                     │
│  [Primary Action Button]                            │
│                                                     │
│  ╔═════════════════════════════╗                    │
│  ║  Result Card                ║                    │
│  ║  ─────────────────────────  ║                    │
│  ║  [Output content here]      ║                    │
│  ╚═════════════════════════════╝                    │
└─────────────────────────────────────────────────────┘
```

The panel adapts to your VS Code theme (light, dark, and high-contrast) automatically.

---

## Requirements

- VS Code **1.85.0** or higher
- A Google Gemini API key (free tier is sufficient for regular use)
- Internet connection (all AI processing is done via the Gemini API — no local model required)
- Node.js ≥ 18 (for extension development only)

---

## Security

- Your API key is stored exclusively in VS Code's **Secret Storage** — it is never written to disk in plain text, logged, or transmitted anywhere other than the Gemini API endpoint (`generativelanguage.googleapis.com`)
- The Webview runs with a strict **Content Security Policy** — no eval, no external scripts
- All AI-generated content is sanitized before rendering

---

## Extension Settings

Kami Prompter does not add settings to `settings.json`. All configuration (API key, panel state) is managed through the panel UI and VS Code's internal storage APIs.

---

## Known Limitations

- The Intelligence slider at maximum (100) uses Gemini 2.5 Pro Preview which has a **2 RPM** rate limit — back-to-back requests may be throttled
- PRD Maker works best with product descriptions of 50–300 words; very short descriptions will produce generic sections
- Webview state is not persisted between VS Code restarts (by design — avoids stale context)

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

*Built with the [`@google/genai` SDK](https://www.npmjs.com/package/@google/genai) (unified Google AI Studio / Vertex AI SDK) · Powered by [Gemini 3](https://deepmind.google/technologies/gemini/)*
