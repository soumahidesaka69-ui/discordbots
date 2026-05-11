import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "../../data");
const DB_FILE = join(DATA_DIR, "bot_data.json");

function ensureDir() {
  try { mkdirSync(DATA_DIR, { recursive: true }); } catch {}
}

function loadData() {
  ensureDir();
  if (!existsSync(DB_FILE)) {
    return { channelSettings: {}, modRoles: {}, customInstructions: {}, conversationHistory: {}, warnings: {}, antiNuke: {}, antiRaid: {} };
  }
  try {
    const d = JSON.parse(readFileSync(DB_FILE, "utf-8"));
    if (!d.warnings) d.warnings = {};
    if (!d.antiNuke) d.antiNuke = {};
    if (!d.antiRaid) d.antiRaid = {};
    return d;
  } catch {
    return { channelSettings: {}, modRoles: {}, customInstructions: {}, conversationHistory: {}, warnings: {}, antiNuke: {}, antiRaid: {} };
  }
}

function persist() {
  ensureDir();
  try { writeFileSync(DB_FILE, JSON.stringify(_data, null, 2), "utf-8"); }
  catch (e) { console.error("[DB] Failed to save:", e.message); }
}

let _data = loadData();

// --- Channel Settings ---
export function getChannelSetting(guildId, channelId) { return _data.channelSettings?.[guildId]?.[channelId] || null; }
export function setChannelSetting(guildId, channelId, setting) {
  if (!_data.channelSettings[guildId]) _data.channelSettings[guildId] = {};
  _data.channelSettings[guildId][channelId] = setting; persist();
}
export function removeChannelSetting(guildId, channelId) {
  if (_data.channelSettings[guildId]) { delete _data.channelSettings[guildId][channelId]; persist(); }
}
export function getAllChannelSettings(guildId) { return _data.channelSettings?.[guildId] || {}; }

// --- Mod Roles ---
export function getModRoles(guildId) { return _data.modRoles?.[guildId] || []; }
export function addModRole(guildId, roleId) {
  if (!_data.modRoles[guildId]) _data.modRoles[guildId] = [];
  if (!_data.modRoles[guildId].includes(roleId)) { _data.modRoles[guildId].push(roleId); persist(); }
}
export function removeModRole(guildId, roleId) {
  if (_data.modRoles[guildId]) { _data.modRoles[guildId] = _data.modRoles[guildId].filter(r => r !== roleId); persist(); }
}

// --- Custom Instructions ---
export function getCustomInstruction(guildId) { return _data.customInstructions?.[guildId] || null; }
export function setCustomInstruction(guildId, instruction) { _data.customInstructions[guildId] = instruction; persist(); }
export function removeCustomInstruction(guildId) { delete _data.customInstructions[guildId]; persist(); }

// --- Conversation History ---
export function getConversationHistory(guildId, channelId, userId) {
  return _data.conversationHistory?.[`${guildId}:${channelId}:${userId}`] || [];
}
export function addConversationMessage(guildId, channelId, userId, role, content) {
  const key = `${guildId}:${channelId}:${userId}`;
  if (!_data.conversationHistory[key]) _data.conversationHistory[key] = [];
  _data.conversationHistory[key].push({ role, content });
  if (_data.conversationHistory[key].length > 20) _data.conversationHistory[key] = _data.conversationHistory[key].slice(-20);
  persist();
}
export function clearConversationHistory(guildId, channelId, userId) {
  delete _data.conversationHistory[`${guildId}:${channelId}:${userId}`]; persist();
}
export function clearAllChannelHistory(guildId, channelId) {
  const prefix = `${guildId}:${channelId}:`;
  for (const key of Object.keys(_data.conversationHistory)) { if (key.startsWith(prefix)) delete _data.conversationHistory[key]; }
  persist();
}

// --- Warnings ---
export function getWarnings(guildId, userId) { return _data.warnings?.[guildId]?.[userId] || []; }
export function addWarning(guildId, userId, reason, moderatorId) {
  if (!_data.warnings[guildId]) _data.warnings[guildId] = {};
  if (!_data.warnings[guildId][userId]) _data.warnings[guildId][userId] = [];
  _data.warnings[guildId][userId].push({ reason, moderatorId, timestamp: Date.now() });
  persist();
}
export function clearWarnings(guildId, userId) {
  if (_data.warnings[guildId]) { delete _data.warnings[guildId][userId]; persist(); }
}
export function getAllWarnings(guildId) { return _data.warnings?.[guildId] || {}; }

// --- AntiNuke Settings ---
export function getAntiNuke(guildId) { return _data.antiNuke?.[guildId] || { enabled: false, threshold: 3, windowMs: 10000 }; }
export function setAntiNuke(guildId, settings) { _data.antiNuke[guildId] = settings; persist(); }

// --- AntiRaid Settings ---
export function getAntiRaid(guildId) { return _data.antiRaid?.[guildId] || { enabled: false, threshold: 10, windowMs: 10000 }; }
export function setAntiRaid(guildId, settings) { _data.antiRaid[guildId] = settings; persist(); }
