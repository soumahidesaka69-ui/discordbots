import {
  getChannelSetting,
  getConversationHistory,
  addConversationMessage,
  getCustomInstruction,
} from "../utils/database.js";
import { generateAIResponse, generateWithSpecificProvider } from "../utils/aiManager.js";
import { handleBotInfo } from "../commands/botinfo.js";

export const name = "messageCreate";

async function fetchImageAsBase64(url) {
  try {
    const res = await fetch(url);
    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const contentType = res.headers.get("content-type") || "image/png";
    return { base64, mimeType: contentType.split(";")[0] };
  } catch {
    return null;
  }
}

function splitText(text, maxLen) {
  const chunks = [];
  let current = "";
  for (const line of text.split("\n")) {
    if (current.length + line.length + 1 > maxLen) {
      if (current) chunks.push(current);
      current = line;
    } else {
      current += (current ? "\n" : "") + line;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

export async function execute(message) {
  if (message.author.bot) return;
  if (!message.guild) return;

  if (message.content.trim().toLowerCase() === "!botinfo") {
    return handleBotInfo(message);
  }

  const guildId = message.guild.id;
  const channelId = message.channel.id;
  const setting = getChannelSetting(guildId, channelId);

  if (!setting) return;

  const textContent = message.content.replace(/<@!?\d+>/g, "").trim();

  const imageAttachments = [...message.attachments.values()].filter((a) =>
    (a.contentType || "").startsWith("image/")
  );

  if (!textContent && imageAttachments.length === 0) return;

  const customInstruction = getCustomInstruction(guildId);
  const history = getConversationHistory(guildId, channelId, message.author.id);

  try {
    await message.channel.sendTyping();

    let result;

    if (imageAttachments.length > 0) {
      const imgData = await fetchImageAsBase64(imageAttachments[0].url);
      if (imgData) {
        result = await generateWithSpecificProvider(
          "gemini",
          [{ role: "user", content: textContent || "この画像について説明してください。", image: imgData }],
          customInstruction
        );
      } else {
        result = await generateAIResponse(
          [...history, { role: "user", content: textContent || "画像が送信されましたが読み込めませんでした。" }],
          customInstruction
        );
      }
    } else {
      const messages = [...history, { role: "user", content: textContent }];
      result = await generateAIResponse(messages, customInstruction);
    }

    addConversationMessage(guildId, channelId, message.author.id, "user", textContent || "[画像]");
    addConversationMessage(guildId, channelId, message.author.id, "assistant", result.text);

    const chunks = splitText(result.text, 1900);
    await message.reply({ content: chunks[0], allowedMentions: { repliedUser: false } });
    for (let i = 1; i < chunks.length; i++) {
      await message.channel.send(chunks[i]);
    }
  } catch (err) {
    console.error("[messageCreate] AI error:", err);
    await message.reply({
      content: "AIの応答に失敗しました。しばらくしてからもう一度お試しください。",
      allowedMentions: { repliedUser: false },
    });
  }
}
