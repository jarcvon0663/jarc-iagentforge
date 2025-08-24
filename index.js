#!/usr/bin/env node

/**
 * JARC-IAgentForge - index.js (versión con OpenRouter + Groq)
 *
 * - Permite elegir entre Groq y OpenRouter
 * - Configura modelos según el proveedor elegido
 * - Resto de funcionalidades intactas
 */

import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import shell from "shelljs";
import fs from "fs";
import path from "path";

// 🔧 Función sanitizeKey mejorada
function sanitizeKey(raw) {
  if (!raw) return "";
  
  let k = String(raw);
  
  // Remover prefijos comunes (case insensitive)
  k = k.replace(/^(GROQ_API_KEY|OPENROUTER_API_KEY|API_KEY)\s*=\s*/i, "");
  
  // Trim espacios y tabs al inicio y final
  k = k.trim();
  
  // Remover comillas dobles o simples del inicio y final
  k = k.replace(/^["']+|["']+$/g, "");
  
  // Remover saltos de línea y retornos de carro
  k = k.replace(/[\r\n\t]/g, "");
  
  // Trim final por seguridad
  k = k.trim();
  
  return k;
}

// 🤖 Configuraciones de proveedores
const PROVIDERS = {
  groq: {
    name: "Groq",
    apiUrl: "https://api.groq.com/openai/v1/chat/completions",
    envVar: "GROQ_API_KEY",
    models: [
      { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B (ultrarrápido)" },
      { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B (versátil)" },
      { id: "openai/gpt-oss-120b", label: "openai/gpt-oss-120b (potente)" },
      { id: "openai/gpt-oss-20b", label: "openai/gpt-oss-20b (balance)" }
    ]
  },
  openrouter: {
    name: "OpenRouter",
    apiUrl: "https://openrouter.ai/api/v1/chat/completions",
    envVar: "OPENROUTER_API_KEY",
    models: [
      { id: "openai/gpt-4o", label: "GPT-4o (más capaz)" },
      { id: "openai/gpt-4o-mini", label: "GPT-4o Mini (rápido)" },
      { id: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet (excelente)" },
      { id: "google/gemini-pro-1.5", label: "Gemini Pro 1.5 (multimodal)" },
      { id: "meta-llama/llama-3.1-8b-instruct:free", label: "Llama 3.1 8B (gratis)" },
      { id: "microsoft/wizardlm-2-8x22b", label: "WizardLM 2 8x22B (potente)" }
    ]
  }
};

const spinner = ora();

console.log(chalk.cyan.bold("\n🚀 JARC-IAgentForge — Auto Generator v2 🚀\n"));

async function exitWith(msg) {
  console.log(chalk.yellow(msg));
  process.exit(1);
}

async function createProjectFiles(cwd, provider, apiKey, promptText) {
  const providerConfig = PROVIDERS[provider];
  const cleanApiKey = sanitizeKey(apiKey);
  
  // .env.local
  fs.writeFileSync(path.join(cwd, ".env.local"), `${providerConfig.envVar}=${cleanApiKey}`, { encoding: "utf8" });

  const safePrompt = promptText ? promptText.replace(/"/g, '\\"') : "Experto asesor en servicio al cliente";

  // API route actualizada con soporte multi-proveedor
  const apiDir = path.join(cwd, "src", "pages", "api");
  fs.mkdirSync(apiDir, { recursive: true });
  
  const modelsArray = providerConfig.models.map(m => `"${m.id}"`).join(",\n      ");
  const defaultModel = providerConfig.models[0].id;
  
  const chatApi = `// src/pages/api/chat.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    const { message, model } = req.body || {};

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "message is required" });
    }

    // Lista blanca de modelos para ${providerConfig.name}
    const ALLOWED_MODELS = [
      ${modelsArray}
    ];

    const chosenModel = (typeof model === "string" && ALLOWED_MODELS.includes(model))
      ? model
      : "${defaultModel}";

    // Log mínimo para debug
    console.log("Chat API [${providerConfig.name}] - model:", chosenModel, "key-prefix:", (process.env.${providerConfig.envVar}||"").slice(0,4));

    const headers = {
      "Content-Type": "application/json",
      "Authorization": \`Bearer \${process.env.${providerConfig.envVar}}\`,
    };

    ${provider === 'openrouter' ? `
    // Headers adicionales para OpenRouter (opcionales pero recomendados)
    headers["HTTP-Referer"] = "https://jarc-iagentforge.vercel.app";
    headers["X-Title"] = "JARC IAgent Forge";` : ''}

    const response = await fetch("${providerConfig.apiUrl}", {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: chosenModel,
        messages: [
          { role: "system", content: "${safePrompt}. Responde en el idioma que te escriben de forma clara y directa" },
          { role: "user", content: message },
        ],
        ${provider === 'openrouter' ? 'temperature: 0.7,' : ''}
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("${providerConfig.name} API error:", response.status, errText);
      return res.status(500).json({ error: "${providerConfig.name} API failed", details: errText });
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content || "Sin respuesta de IA";
    return res.status(200).json({ reply });
  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ error: "Error interno" });
  }
}
`;
  fs.writeFileSync(path.join(apiDir, "chat.js"), chatApi, "utf8");

  // Frontend actualizado con modelos específicos del proveedor
  const pagesDir = path.join(cwd, "src", "pages");
  fs.mkdirSync(pagesDir, { recursive: true });
  
  const modelsJsArray = providerConfig.models.map(m => 
    `  { id: "${m.id}", label: "${m.label}" }`
  ).join(",\n");
  
  const indexJs = `// src/pages/index.js
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const MODELS = [
${modelsJsArray}
];

const PROVIDER_INFO = {
  name: "${providerConfig.name}",
  url: "${provider === 'groq' ? 'https://groq.com' : 'https://openrouter.ai'}"
};

export default function Home() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: \`¡Hola! Soy tu agente de IA potenciado por **\${PROVIDER_INFO.name}**. ¿En qué puedo ayudarte hoy?\` }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState("${defaultModel}");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("jarc:model");
      if (saved && MODELS.some(m => m.id === saved)) {
        setModel(saved);
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("jarc:model", model);
    } catch (e) {}
  }, [model]);

  async function send(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const next = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, model }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessages(prev => [...next, { role: "assistant", content: data.reply || "Sin respuesta" }]);
      } else {
        const errMsg = data?.error || "Error hablando con la IA.";
        setMessages(prev => [...next, { role: "assistant", content: \`❌ **Error**: \${errMsg}\` }]);
      }
    } catch (err) {
      setMessages(prev => [...next, { role: "assistant", content: "❌ **Error**: No se pudo conectar con la IA." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="chat-container">
      <header className="chat-header">
        <h1>🤖 Chat IA</h1>
        <p className="subtitle">
          Potenciado por <strong>{PROVIDER_INFO.name}</strong> • 
          <a href={PROVIDER_INFO.url} target="_blank" rel="noopener noreferrer">
            Más info
          </a>
        </p>
      </header>

      <div className="model-selector">
        <label>🧠 Modelo:</label>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          disabled={loading}
        >
          {MODELS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>
        <div className="current-model">
          {MODELS.find(m => m.id === model)?.label || model}
        </div>
      </div>

      <div className="chat-box">
        {messages.map((m, i) => {
          const isUser = m.role === "user";
          return (
            <div key={i} className={"message-row " + (isUser ? "user" : "assistant")}>
              <div className={"message " + (isUser ? "user-msg" : "assistant-msg")}>
                {isUser ? (
                  <span>{m.content}</span>
                ) : (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                )}
              </div>
            </div>
          );
        })}
        {loading && (
          <div className="message-row assistant">
            <div className="message assistant-msg loading">
              <span>Pensando...</span>
              <div className="typing-indicator">
                <span></span><span></span><span></span>
              </div>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={send} className="chat-form">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={loading ? "Esperando respuesta..." : "Escribe tu mensaje…"}
          disabled={loading}
        />
        <button type="submit" disabled={loading || !input.trim()}>
          {loading ? "⏳" : "🚀"}
        </button>
      </form>

      <div className="footer">
        <span>Creado con ❤️ por <strong>JARC-IAgentForge</strong></span>
      </div>
    </div>
  );
}
`;
  fs.writeFileSync(path.join(pagesDir, "index.js"), indexJs, "utf8");

  // CSS mejorado
  const stylesDir = path.join(cwd, "src", "styles");
  fs.mkdirSync(stylesDir, { recursive: true });
  const globalsCss = `:root {
  --background: #ffffff;
  --foreground: #171717;
  --border: #e5e5e5;
  --accent: #0070f3;
  --accent-hover: #0051cc;
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
    --border: #333333;
    --accent: #3291ff;
    --accent-hover: #0070f3;
  }
}

* {
  box-sizing: border-box;
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  margin: 0;
  padding: 0;
  line-height: 1.6;
}

.chat-container {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  height: 100vh;
  gap: 16px;
}

.chat-header {
  text-align: center;
}

.chat-header h1 {
  font-size: 2rem;
  margin: 0;
  background: linear-gradient(135deg, var(--accent), #ff6b6b);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.subtitle {
  margin: 8px 0 0;
  color: #666;
  font-size: 0.9rem;
}

.subtitle a {
  color: var(--accent);
  text-decoration: none;
}

.subtitle a:hover {
  text-decoration: underline;
}

.model-selector {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--background);
  border: 1px solid var(--border);
  border-radius: 12px;
  flex-wrap: wrap;
}

.model-selector label {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--foreground);
  white-space: nowrap;
}

.model-selector select {
  flex: 1;
  min-width: 200px;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--background);
  color: var(--foreground);
  font-size: 0.9rem;
}

.current-model {
  font-size: 0.8rem;
  color: #666;
  margin-left: auto;
  font-style: italic;
}

.chat-box {
  flex-grow: 1;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px;
  overflow-y: auto;
  background: var(--background);
  min-height: 400px;
}

.message-row {
  display: flex;
  margin-bottom: 16px;
}

.message {
  max-width: 85%;
  padding: 12px 16px;
  border-radius: 18px;
  font-size: 15px;
  line-height: 1.5;
  word-wrap: break-word;
}

.user {
  justify-content: flex-end;
}

.user-msg {
  background: var(--accent);
  color: white;
  border-bottom-right-radius: 4px;
}

.assistant {
  justify-content: flex-start;
}

.assistant-msg {
  background: var(--border);
  color: var(--foreground);
  border-bottom-left-radius: 4px;
  border: 1px solid var(--border);
}

.loading {
  display: flex;
  align-items: center;
  gap: 8px;
}

.typing-indicator {
  display: flex;
  gap: 2px;
}

.typing-indicator span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
  animation: typing 1.4s infinite ease-in-out;
}

.typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
.typing-indicator span:nth-child(2) { animation-delay: -0.16s; }

@keyframes typing {
  0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
  40% { transform: scale(1); opacity: 1; }
}

.chat-form {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: var(--background);
  border: 1px solid var(--border);
  border-radius: 12px;
}

.chat-form input {
  flex: 1;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid var(--border);
  outline: none;
  font-size: 16px;
  background: var(--background);
  color: var(--foreground);
  transition: border-color 0.2s;
}

.chat-form input:focus {
  border-color: var(--accent);
}

.chat-form input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.chat-form button {
  padding: 14px 20px;
  border-radius: 12px;
  border: none;
  background: var(--accent);
  color: white;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  transition: all 0.2s;
  min-width: 60px;
}

.chat-form button:hover:not(:disabled) {
  background: var(--accent-hover);
  transform: translateY(-1px);
}

.chat-form button:disabled {
  background: #999;
  cursor: not-allowed;
  transform: none;
}

.footer {
  text-align: center;
  padding: 8px;
  font-size: 0.8rem;
  color: #666;
  border-top: 1px solid var(--border);
  margin-top: 8px;
}

.footer strong {
  color: var(--accent);
  font-weight: 600;
}

/* Markdown styles */
.assistant-msg h1, .assistant-msg h2, .assistant-msg h3 {
  margin-top: 0;
  margin-bottom: 8px;
}

.assistant-msg p {
  margin: 8px 0;
}

.assistant-msg ul, .assistant-msg ol {
  margin: 8px 0;
  padding-left: 20px;
}

.assistant-msg code {
  background: rgba(0, 0, 0, 0.1);
  padding: 2px 4px;
  border-radius: 4px;
  font-family: 'Monaco', 'Consolas', monospace;
  font-size: 0.9em;
}

.assistant-msg pre {
  background: rgba(0, 0, 0, 0.1);
  padding: 12px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 8px 0;
}

.assistant-msg pre code {
  background: none;
  padding: 0;
}

.assistant-msg blockquote {
  border-left: 3px solid var(--accent);
  margin: 8px 0;
  padding-left: 12px;
  opacity: 0.8;
}

@media (max-width: 768px) {
  .chat-container {
    padding: 12px;
    gap: 12px;
  }
  
  .message {
    max-width: 90%;
  }
  
  .model-selector {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
  
  .current-model {
    margin-left: 0;
    text-align: center;
  }
  
  .chat-header h1 {
    font-size: 1.5rem;
  }
}
`;
  fs.writeFileSync(path.join(stylesDir, "globals.css"), globalsCss, "utf8");

  // _app.js
  const appJs = `// src/pages/_app.js
import "../styles/globals.css";
export default function MyApp({ Component, pageProps }) { 
  return <Component {...pageProps} />; 
}
`;
  fs.writeFileSync(path.join(pagesDir, "_app.js"), appJs, "utf8");

  // README actualizado
  const readme = `# ${path.basename(cwd)}
Generated by JARC-IAgentForge v2.0

**Provider**: ${providerConfig.name}
**Prompt**: ${promptText}

## 🚀 Quick Start
\`\`\`bash
npm install
npm run dev
\`\`\`

Open http://localhost:3000

## 🔧 Configuration
- Provider: ${providerConfig.name}
- API Key: Set in \`.env.local\` as \`${providerConfig.envVar}\`
- Models: ${providerConfig.models.length} available models

## 🛡️ Security
- Never commit \`.env.local\` to version control
- API key is sanitized and validated
- Model selection is restricted to allowed list

## 📦 Tech Stack
- Next.js (Pages Router)
- React Markdown with GFM
- ${providerConfig.name} AI API
- Responsive CSS with dark mode

---
Created with ❤️ by JARC-IAgentForge
`;
  fs.writeFileSync(path.join(cwd, "README.md"), readme, "utf8");
}

async function deployToVercel(cwd, projectName, provider, apiKey) {
  const providerConfig = PROVIDERS[provider];
  const cleanApiKey = sanitizeKey(apiKey);
  spinner.text = "Desplegando en Vercel (CLI o token)…";

  const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
  let vercelCmd = "vercel --prod --yes";
  if (VERCEL_TOKEN) vercelCmd = `vercel --prod --yes --token ${VERCEL_TOKEN}`;

  // 1) Primer deploy
  const first = shell.exec(vercelCmd, { silent: false });
  if (first.code !== 0) {
    return { ok: false, error: "vercel_deploy_failed_initial", detail: first.stdout || first.stderr };
  }

  const stdout = first.stdout || "";
  const urlMatch = stdout.match(/https?:\/\/[^\s]+vercel\.app/);
  const initialUrl = urlMatch ? urlMatch[0] : null;

  // 2) Configurar variable de entorno
  let envOk = false;
  if (VERCEL_TOKEN) {
    spinner.text = `Configurando ${providerConfig.envVar} en Vercel (via API)…`;
    try {
      const projectsRes = await fetch("https://api.vercel.com/v9/projects", {
        headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
      });

      if (!projectsRes.ok) {
        const txt = await projectsRes.text();
        console.log(chalk.yellow("⚠️ No se pudo obtener lista de proyectos en Vercel:"), txt);
      } else {
        const projectsData = await projectsRes.json();
        const project = (projectsData.projects || []).find(p => p.name === projectName);

        if (!project) {
          console.log(chalk.yellow(`⚠️ Proyecto '${projectName}' no encontrado en Vercel.`));
        } else {
          const endpoint = `https://api.vercel.com/v10/projects/${project.id}/env?upsert=true`;
          const r = await fetch(endpoint, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${VERCEL_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              key: providerConfig.envVar,
              value: cleanApiKey,
              type: "encrypted",
              target: ["production", "preview", "development"],
            }),
          });

          if (!r.ok) {
            const txt = await r.text();
            console.log(chalk.yellow("⚠️ No se pudo crear/actualizar la env via API:"), txt);
          } else {
            console.log(chalk.green(`✅ Variable ${providerConfig.envVar} configurada en Vercel via API.`));
            envOk = true;
          }
        }
      }
    } catch (e) {
      console.log(chalk.yellow("⚠️ Falló al intentar crear env en Vercel via API:"), e.message);
    }
  } else {
    // Fallback CLI
    spinner.text = "Agregando variable en Vercel CLI (fallback sin token)…";
    try {
      const tmpPath = path.join(cwd, ".tmp.vercel.env.value");
      fs.writeFileSync(tmpPath, cleanApiKey, { encoding: "utf8", flag: "w" });

      const addCmd = `vercel env add ${providerConfig.envVar} production < "${tmpPath}"`;
      const res = shell.exec(addCmd, { silent: false });

      try { fs.unlinkSync(tmpPath); } catch (e) {}

      if (res.code === 0) {
        console.log(chalk.green(`✅ Variable ${providerConfig.envVar} configurada en Vercel via CLI.`));
        envOk = true;
      } else {
        console.log(chalk.yellow("⚠️ No se pudo configurar la variable con la CLI."));
      }
    } catch (e) {
      console.log(chalk.yellow("⚠️ Error durante fallback CLI:"), e.message);
    }
  }

  // 3) Redeploy si la env se configuró
  if (envOk) {
    spinner.text = "Redeploy para aplicar la variable…";
    const redeployCmd = VERCEL_TOKEN ? `vercel --prod --yes --token ${VERCEL_TOKEN}` : "vercel --prod --yes";
    const second = shell.exec(redeployCmd, { silent: false });

    if (second.code !== 0) {
      console.log(chalk.yellow("⚠️ El redeploy falló."));
      return { ok: false, error: "vercel_redeploy_failed", url: initialUrl };
    }

    const out2 = second.stdout || "";
    const urlMatch2 = out2.match(/https?:\/\/[^\s]+vercel\.app/);
    const finalUrl = urlMatch2 ? urlMatch2[0] : initialUrl;
    return { ok: true, url: finalUrl };
  }

  return { ok: false, error: "env_not_created", url: initialUrl };
}

async function createGithubRepoAndPush(cwd, projectName) {
  spinner.text = "Creando repo en GitHub y haciendo push…";

  const ghAuth = shell.exec("gh auth status --hostname github.com", {
    silent: true,
  });
  if (ghAuth.code === 0) {
    const ghCmd = `gh repo create "${projectName}" --public --source=. --remote=origin --push`;
    const out = shell.exec(ghCmd, { silent: false });
    if (out.code === 0) return { ok: true };
    return { ok: false, error: "gh_repo_create_failed" };
  }

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  if (!GITHUB_TOKEN) {
    return { ok: false, error: "gh_not_authenticated_and_no_GITHUB_TOKEN" };
  }

  try {
    const res = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3+json",
      },
    });
    if (!res.ok) return { ok: false, error: "github_token_invalid" };
    const user = await res.json();
    const owner = user.login;

    const createRes = await fetch("https://api.github.com/user/repos", {
      method: "POST",
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: projectName, private: false }),
    });
    if (!createRes.ok) {
      const txt = await createRes.text();
      return { ok: false, error: "github_create_failed", detail: txt };
    }

    const remoteUrl = `https://${owner}:${GITHUB_TOKEN}@github.com/${owner}/${projectName}.git`;
    shell.exec(`git remote add origin "${remoteUrl}"`, { silent: true });
    const pushOut = shell.exec("git push -u origin main", { silent: false });
    if (pushOut.code !== 0) return { ok: false, error: "git_push_failed" };

    shell.exec(
      `git remote set-url origin https://github.com/${owner}/${projectName}.git`,
      { silent: true }
    );

    return { ok: true };
  } catch (e) {
    return { ok: false, error: "github_exception", detail: e.message };
  }
}

async function run() {
  const cwd = process.cwd();
  const projectName = path.basename(cwd);

  const answers = await inquirer.prompt([
    {
      type: "list",
      name: "provider",
      message: "🤖 Elige tu proveedor de IA:",
      choices: [
        {
          name: `${chalk.cyan("Groq")} - Ultra rápido, modelos Llama (económico)`,
          value: "groq"
        },
        {
          name: `${chalk.green("OpenRouter")} - GPT-4, Claude, Gemini y más (versátil)`,
          value: "openrouter"
        }
      ]
    },
    {
      type: "input",
      name: "apiKey",
      message: (answers) => {
        const providerName = PROVIDERS[answers.provider].name;
        return `🔑 Ingresa tu API Key de ${providerName}:`;
      },
      validate: (input) => {
        const clean = sanitizeKey(input);
        if (!clean || clean.length < 10) {
          return "Por favor ingresa una API Key válida";
        }
        return true;
      }
    },
    {
      type: "input",
      name: "prompt",
      message: "🎯 Describe el propósito de tu agente IA:",
      default: "Experto asesor en servicio al cliente",
      validate: (input) => {
        if (!input.trim()) {
          return "Por favor describe el propósito del agente";
        }
        return true;
      }
    },

  ]);

  const { provider, apiKey, prompt: promptText } = answers;
  const providerConfig = PROVIDERS[provider];

  console.log(chalk.blue(`\n🎯 Configuración seleccionada:`));
  console.log(chalk.blue(`   Proveedor: ${providerConfig.name}`));
  console.log(chalk.blue(`   Modelos disponibles: ${providerConfig.models.length}`));
  console.log(chalk.blue(`   Proyecto: ${projectName}`));
  console.log(chalk.blue(`   🚀 Deploy automático: ACTIVADO\n`));

  spinner.start("Ejecutando create-next-app...");
  const createCmd = `npx create-next-app@latest . --js --eslint --no-tailwind --src-dir --no-app --no-turbopack --use-npm --yes`;
  const res = shell.exec(createCmd, { silent: true });
  if (res.code !== 0) {
    spinner.fail("create-next-app falló. Revisa salida:");
    console.error(res.stdout || res.stderr);
    return exitWith("Cancelado por error en create-next-app.");
  }
  spinner.succeed("create-next-app completado.");

  spinner.start(`Generando archivos para ${providerConfig.name}...`);
  createProjectFiles(cwd, provider, apiKey, promptText);
  spinner.succeed("Archivos del proyecto creados.");

  spinner.start("Instalando dependencias del proyecto...");
  const inst = shell.exec("npm install", { silent: true });
  if (inst.code !== 0) {
    spinner.fail("npm install falló.");
    console.error(inst.stdout || inst.stderr);
    return exitWith("Instalación fallida.");
  }

  spinner.text = "Instalando dependencias adicionales...";
  const markdownInst = shell.exec("npm install react-markdown remark-gfm", {
    silent: true,
  });
  if (markdownInst.code !== 0) {
    spinner.fail("La instalación de react-markdown falló.");
    console.error(markdownInst.stdout || markdownInst.stderr);
    return exitWith("Instalación de dependencias adicionales fallida.");
  }
  spinner.succeed("Dependencias instaladas.");

  spinner.start("Configurando .gitignore...");
  const gitignorePath = path.join(cwd, ".gitignore");
  const existing = fs.existsSync(gitignorePath)
    ? fs.readFileSync(gitignorePath, "utf8")
    : "";
  if (!existing.includes(".env.local")) {
    fs.appendFileSync(gitignorePath, "\n# Environment variables\n.env.local\n", "utf8");
  }
  spinner.succeed(".gitignore configurado.");

  spinner.start("Inicializando git y haciendo commit inicial...");
  shell.exec("git init --initial-branch=main", { silent: true });
  shell.exec("git add .", { silent: true });
  const commitRes = shell.exec(
    `git commit -m "feat: scaffold JARC-IAgentForge with ${providerConfig.name}"`,
    { silent: true }
  );
  if (commitRes.code !== 0) {
    shell.exec('git config user.email "jarc@iagentforge.dev"', { silent: true });
    shell.exec('git config user.name "JARC-IAgentForge"', { silent: true });
    shell.exec("git add .", { silent: true });
    shell.exec(`git commit -m "feat: scaffold JARC-IAgentForge with ${providerConfig.name}"`, {
      silent: true,
    });
  }
  spinner.succeed("Repositorio git inicializado.");

  // 🚀 Deploy automático - sin preguntas
  const ghRes = await createGithubRepoAndPush(cwd, projectName);
  if (!ghRes.ok) {
    console.log(
      chalk.yellow("⚠️ No se pudo crear repo/push automático:"),
      ghRes.error
    );
    console.log(
      chalk.yellow(
        "💡 Para hacerlo manualmente: `gh repo create ${projectName} --public --source=. --remote=origin --push`"
      )
    );
  } else {
    console.log(chalk.green("✅ Repositorio GitHub creado y código subido."));
  }

  const vercelRes = await deployToVercel(cwd, projectName, provider, apiKey);
  if (!vercelRes.ok) {
    console.log(
      chalk.yellow("⚠️ Deployment en Vercel tuvo problemas:"),
      vercelRes.error
    );
    if (vercelRes.url) {
      console.log(chalk.cyan(`🔗 URL (puede necesitar configuración manual): ${vercelRes.url}`));
    }
    console.log(
      chalk.yellow(
        "💡 Revisa el dashboard de Vercel para configurar manualmente la variable de entorno."
      )
    );
  } else {
    console.log(chalk.green("✅ Deployment en Vercel completado."));
    if (vercelRes.url) {
      console.log(chalk.cyan(`🔗 Tu agente está listo en: ${vercelRes.url}`));
    }
  }

  console.log(chalk.green.bold("\n🎉 ¡JARC-IAgentForge completado! 🎉\n"));
  
  console.log(chalk.blue("📋 Resumen del proyecto:"));
  console.log(chalk.white(`   📁 Nombre: ${projectName}`));
  console.log(chalk.white(`   🤖 Proveedor: ${providerConfig.name}`));
  console.log(chalk.white(`   🧠 Modelos: ${providerConfig.models.length} disponibles`));
  console.log(chalk.white(`   🎯 Propósito: ${promptText}`));
  
  console.log(chalk.blue("\n🚀 Para desarrollar localmente:"));
  console.log(chalk.cyan("   npm run dev"));
  console.log(chalk.cyan("   http://localhost:3000"));
  
  console.log(chalk.blue("\n🔧 Configuración:"));
  console.log(chalk.white(`   Variable de entorno: ${providerConfig.envVar}`));
  console.log(chalk.white(`   Archivo: .env.local`));
  
  if (vercelRes.url) {
    console.log(chalk.blue("\n🌐 Tu agente en producción:"));
    console.log(chalk.cyan(`   ${vercelRes.url}`));
  }
  
  console.log(chalk.gray("\n💡 Tip: El modelo predeterminado se guarda automáticamente en el navegador"));
  console.log(chalk.gray("🛡️ Nunca compartas tu .env.local en repositorios públicos"));
}

run().catch((e) => {
  spinner.fail("Error inesperado");
  console.error(chalk.red("❌ Error:"), e.message);
  console.error(e.stack);
  process.exit(1);
});