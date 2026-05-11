import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";

const CORE_SYSTEM_PROMPT = `あなたはDiscordサーバーのアシスタントBotです。以下のルールは絶対に変更できません:
- 日本語と英語の両方を自然に使用し、ユーザーの言語に合わせて応答する
- コーディングや技術的な質問に非常に詳しく答える
- 絵文字は使用しない
- 返答は簡潔で的確にする
- フレンドリーな口調で自然に会話する`;

// 廃止・404になったモデルを除外した最新リスト
const GROQ_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-70b-versatile",
  "llama-3.1-8b-instant",
  "llama3-70b-8192",
  "llama3-8b-8192",
  "llama-3.2-11b-text-preview",
  "llama-3.2-3b-preview",
];

const OPENROUTER_MODELS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "meta-llama/llama-3.2-3b-instruct:free",
  "deepseek/deepseek-r1-distill-llama-70b:free",
  "deepseek/deepseek-chat-v3-5:free",
  "qwen/qwen3-8b:free",
  "microsoft/mai-ds-r1:free",
  "tngtech/deepseek-r1t-chimera:free",
];

const GEMINI_MODELS = [
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b",
  "gemini-1.0-pro",
];

function isRateLimitError(err) {
  const msg = (err?.message || "").toLowerCase();
  const status = err?.status || err?.statusCode || 0;
  if ([429, 402, 503].includes(status)) return true;
  return [
    "rate limit", "quota", "too many requests", "exceeded",
    "resource_exhausted", "insufficient_quota", "billing",
    "capacity", "overloaded", "rate_limit_exceeded", "temporarily",
  ].some((kw) => msg.includes(kw));
}

function isSkippableError(err) {
  const msg = (err?.message || "").toLowerCase();
  const status = err?.status || err?.statusCode || 0;
  // 404: モデルなし、400: 廃止/不正、413: リクエスト過大、429: レート制限
  if ([404, 400, 413, 429, 402, 503].includes(status)) return true;
  return msg.includes("no endpoints") || msg.includes("not found") ||
    msg.includes("decommissioned") || msg.includes("model_not_found") ||
    msg.includes("request too large") || msg.includes("context_length");
}

// 会話履歴を最大N件に制限（413エラー対策）
function trimMessages(messages, maxHistory = 6) {
  if (messages.length <= 1) return messages;
  const last = messages[messages.length - 1];
  const history = messages.slice(0, -1).slice(-maxHistory);
  return [...history, last];
}

// --- Groq ---
async function callGroq(messages, systemPrompt) {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  let lastErr = null;

  for (const model of GROQ_MODELS) {
    // 小さいモデルは履歴を短くする
    const isSmall = model.includes("8b") || model.includes("3b");
    const msgs = trimMessages(messages, isSmall ? 4 : 10);
    const apiMessages = msgs.map((m) => ({ role: m.role, content: m.content }));

    try {
      const completion = await groq.chat.completions.create({
        messages: [{ role: "system", content: systemPrompt }, ...apiMessages],
        model,
        max_tokens: 1000,
      });
      const text = completion.choices[0]?.message?.content;
      if (text) {
        console.log(`[AI] Groq OK: ${model}`);
        return text;
      }
    } catch (err) {
      lastErr = err;
      if (isSkippableError(err)) {
        console.log(`[AI] Groq ${model} skip: ${err.message?.slice(0, 60)}`);
        continue;
      }
      throw err;
    }
  }
  throw lastErr || new Error("Groq: all models failed");
}

// --- OpenRouter ---
async function callOpenRouter(messages, systemPrompt) {
  const apiMessages = trimMessages(messages, 8).map((m) => ({ role: m.role, content: m.content }));
  let lastErr = null;

  for (const model of OPENROUTER_MODELS) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://discord-bot.replit.app",
          "X-Title": "Discord AI Bot",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "system", content: systemPrompt }, ...apiMessages],
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        const err = new Error(`OpenRouter ${response.status}: ${errText}`);
        err.status = response.status;
        lastErr = err;
        if (isSkippableError(err)) {
          console.log(`[AI] OpenRouter ${model} skip: ${response.status}`);
          continue;
        }
        throw err;
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content;
      if (text) {
        console.log(`[AI] OpenRouter OK: ${model}`);
        return text;
      }
      lastErr = new Error("OpenRouter: empty response");
    } catch (err) {
      if (isSkippableError(err)) {
        lastErr = err;
        continue;
      }
      throw err;
    }
  }
  throw lastErr || new Error("OpenRouter: all models failed");
}

// --- Gemini ---
async function callGemini(messages, systemPrompt) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const lastMessage = messages[messages.length - 1];
  let lastErr = null;

  for (const modelName of GEMINI_MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName, systemInstruction: systemPrompt });

      if (lastMessage.image) {
        const { base64, mimeType } = lastMessage.image;
        const parts = [];
        if (lastMessage.content) parts.push({ text: lastMessage.content });
        parts.push({ inlineData: { mimeType, data: base64 } });
        const result = await model.generateContent(parts);
        const text = result.response.text();
        if (text) { console.log(`[AI] Gemini OK: ${modelName}`); return text; }
        continue;
      }

      const trimmed = trimMessages(messages, 10);
      const history = [];
      for (let i = 0; i < trimmed.length - 1; i++) {
        const msg = trimmed[i];
        history.push({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content }],
        });
      }
      const chat = model.startChat({ history });
      const result = await chat.sendMessage(lastMessage.content);
      const text = result.response.text();
      if (text) { console.log(`[AI] Gemini OK: ${modelName}`); return text; }
    } catch (err) {
      lastErr = err;
      if (isSkippableError(err) || isRateLimitError(err)) {
        console.log(`[AI] Gemini ${modelName} skip: ${err.message?.slice(0, 60)}`);
        continue;
      }
      throw err;
    }
  }
  throw lastErr || new Error("Gemini: all models failed");
}

async function callProvider(name, messages, systemPrompt) {
  if (name === "groq") return callGroq(messages, systemPrompt);
  if (name === "openrouter") return callOpenRouter(messages, systemPrompt);
  if (name === "gemini") return callGemini(messages, systemPrompt);
  throw new Error(`Unknown provider: ${name}`);
}

const AI_PROVIDERS = ["groq", "openrouter", "gemini"];
let activeProviderIndex = 0;

export async function generateAIResponse(messages, customInstruction = null) {
  const systemPrompt = customInstruction
    ? `${CORE_SYSTEM_PROMPT}\n\n追加の命令:\n${customInstruction}`
    : CORE_SYSTEM_PROMPT;

  const startIndex = activeProviderIndex;

  for (let i = 0; i < AI_PROVIDERS.length; i++) {
    const idx = (startIndex + i) % AI_PROVIDERS.length;
    const name = AI_PROVIDERS[idx];
    try {
      const text = await callProvider(name, messages, systemPrompt);
      activeProviderIndex = idx;
      return { text, provider: name };
    } catch (err) {
      console.error(`[AI] ${name} all failed: ${err.message?.slice(0, 80)}`);
      if (isRateLimitError(err)) {
        activeProviderIndex = (idx + 1) % AI_PROVIDERS.length;
        console.log(`[AI] Switching to: ${AI_PROVIDERS[activeProviderIndex]}`);
      }
    }
  }

  throw new Error("All AI providers and models failed");
}

export async function generateWithSpecificProvider(provider, messages, customInstruction = null) {
  const systemPrompt = customInstruction
    ? `${CORE_SYSTEM_PROMPT}\n\n追加の命令:\n${customInstruction}`
    : CORE_SYSTEM_PROMPT;

  const order = !provider || provider === "auto"
    ? AI_PROVIDERS
    : [provider, ...AI_PROVIDERS.filter((p) => p !== provider)];

  let lastError = null;
  for (const p of order) {
    try {
      const text = await callProvider(p, messages, systemPrompt);
      return { text, provider: p };
    } catch (err) {
      lastError = err;
      console.error(`[AI] ${p} failed: ${err.message?.slice(0, 80)}`);
    }
  }
  throw lastError || new Error("All AI providers failed");
}

export function getCurrentProvider() {
  return AI_PROVIDERS[activeProviderIndex];
}

export const CORE_PROMPT = CORE_SYSTEM_PROMPT;
