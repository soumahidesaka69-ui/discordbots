import { REST, Routes } from "discord.js";
import { data as channelData } from "./commands/channel.js";
import { data as addModsData } from "./commands/addmods.js";
import { data as orderData } from "./commands/order.js";
import { data as helpData } from "./commands/help.js";
import { data as aiData } from "./commands/ai.js";

const token = process.env.DISCORD_BOT_TOKEN;
if (!token) {
  console.error("[Deploy] DISCORD_BOT_TOKEN is not set.");
  process.exit(1);
}

const commands = [
  channelData.toJSON(),
  addModsData.toJSON(),
  orderData.toJSON(),
  helpData.toJSON(),
  aiData.toJSON(),
];

const rest = new REST({ version: "10" }).setToken(token);

async function deploy() {
  try {
    console.log(`[Deploy] Registering ${commands.length} slash commands globally...`);
    const clientId = Buffer.from(token.split(".")[0], "base64").toString("utf-8");
    const data = await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log(`[Deploy] Successfully registered ${data.length} commands.`);
  } catch (err) {
    console.error("[Deploy] Failed to register commands:", err);
    process.exit(1);
  }
}

deploy();
