import { Client, Collection, GatewayIntentBits, Partials } from "discord.js";
import { mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
mkdirSync(join(__dirname, "../data"), { recursive: true });

const token = process.env.DISCORD_BOT_TOKEN;
if (!token) {
  console.error("[Bot] DISCORD_BOT_TOKEN is not set. Exiting.");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildModeration,
  ],
  partials: [Partials.Channel, Partials.Message],
});

client.commands = new Collection();

// コマンドモジュール（single: { data, execute } / multi: { commands: [...] }）
const COMMAND_FILES = [
  "./commands/channel.js",
  "./commands/addmods.js",
  "./commands/order.js",
  "./commands/help.js",
  "./commands/ai.js",
  "./commands/automod.js",
  "./commands/moderation.js",
  "./commands/protect.js",
  "./commands/utility.js",
];

async function loadCommands() {
  const allCommandData = [];
  for (const file of COMMAND_FILES) {
    const mod = await import(file);
    if (mod.commands) {
      for (const cmd of mod.commands) {
        client.commands.set(cmd.data.name, cmd);
        allCommandData.push(cmd.data.toJSON());
        console.log(`[Bot] Loaded command: ${cmd.data.name}`);
      }
    } else if (mod.data && mod.execute) {
      client.commands.set(mod.data.name, mod);
      allCommandData.push(mod.data.toJSON());
      console.log(`[Bot] Loaded command: ${mod.data.name}`);
    }
  }
  return allCommandData;
}

async function loadEvents() {
  const eventModules = [
    await import("./events/ready.js"),
    await import("./events/messageCreate.js"),
    await import("./events/interactionCreate.js"),
  ];
  for (const mod of eventModules) {
    if (mod.once) {
      client.once(mod.name, (...args) => mod.execute(client, ...args));
    } else {
      client.on(mod.name, (...args) => mod.execute(...args));
    }
    console.log(`[Bot] Loaded event: ${mod.name}`);
  }
}

async function deployCommands(commandData) {
  try {
    const { REST, Routes } = await import("discord.js");
    const rest = new REST({ version: "10" }).setToken(token);
    const clientId = Buffer.from(token.split(".")[0], "base64").toString("utf-8");
    console.log(`[Bot] Registering ${commandData.length} slash commands...`);
    const data = await rest.put(Routes.applicationCommands(clientId), { body: commandData });
    console.log(`[Bot] Registered ${data.length} commands.`);
  } catch (err) {
    console.error("[Bot] Failed to register commands:", err.message);
  }
}

process.on("unhandledRejection", (err) => console.error("[Bot] Unhandled rejection:", err));
process.on("uncaughtException", (err) => console.error("[Bot] Uncaught exception:", err));

async function main() {
  const commandData = await loadCommands();
  await loadEvents();

  const { registerProtectionEvents } = await import("./utils/protection_system.js");
  registerProtectionEvents(client);

  await deployCommands(commandData);
  await client.login(token);
}

main().catch((err) => {
  console.error("[Bot] Fatal error:", err);
  process.exit(1);
});
