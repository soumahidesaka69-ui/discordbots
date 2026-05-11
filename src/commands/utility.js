import { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } from "discord.js";
import { hasModPermission } from "../utils/permissions.js";

function noMod(i) { return i.reply({ content: "権限がありません。", ephemeral: true }); }

// /ping
const pingData = new SlashCommandBuilder().setName("ping").setDescription("Botのレイテンシを確認します");
async function pingExecute(interaction) {
  const sent = await interaction.reply({ content: "計測中...", fetchReply: true });
  const roundtrip = sent.createdTimestamp - interaction.createdTimestamp;
  const ws = interaction.client.ws.ping;
  const embed = new EmbedBuilder().setColor(0x5865f2).setTitle("Ping / Latency")
    .addFields(
      { name: "往復レイテンシ", value: `${roundtrip}ms`, inline: true },
      { name: "WebSocket", value: `${ws}ms`, inline: true },
      { name: "状態", value: ws < 100 ? "良好" : ws < 200 ? "普通" : "高め", inline: true }
    ).setTimestamp();
  return interaction.editReply({ content: "", embeds: [embed] });
}

// /userinfo
const userInfoData = new SlashCommandBuilder()
  .setName("userinfo").setDescription("ユーザー情報を表示します")
  .addUserOption(o => o.setName("user").setDescription("対象ユーザー（省略時は自分）"));
async function userInfoExecute(interaction) {
  const user = interaction.options.getUser("user") || interaction.user;
  const member = await interaction.guild.members.fetch(user.id).catch(() => null);
  const embed = new EmbedBuilder().setColor(0x5865f2).setTitle(`${user.tag} の情報`)
    .setThumbnail(user.displayAvatarURL({ size: 256 }))
    .addFields(
      { name: "ID", value: user.id, inline: true },
      { name: "アカウント作成", value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
      { name: "Bot", value: user.bot ? "はい" : "いいえ", inline: true },
    );
  if (member) {
    embed.addFields(
      { name: "サーバー参加", value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
      { name: "ニックネーム", value: member.nickname || "なし", inline: true },
      { name: "最高ロール", value: member.roles.highest.toString(), inline: true },
      { name: "ロール数", value: `${member.roles.cache.size - 1}個`, inline: true },
      { name: "タイムアウト中", value: member.isCommunicationDisabled() ? "はい" : "いいえ", inline: true },
    );
  }
  embed.setTimestamp();
  return interaction.reply({ embeds: [embed] });
}

// /serverinfo
const serverInfoData = new SlashCommandBuilder().setName("serverinfo").setDescription("サーバー情報を表示します");
async function serverInfoExecute(interaction) {
  const guild = interaction.guild;
  const members = guild.memberCount;
  const bots = guild.members.cache.filter(m => m.user.bot).size;
  const humans = members - bots;
  const channels = guild.channels.cache;
  const text = channels.filter(c => c.type === 0).size;
  const voice = channels.filter(c => c.type === 2).size;
  const embed = new EmbedBuilder().setColor(0x5865f2).setTitle(`${guild.name} サーバー情報`)
    .setThumbnail(guild.iconURL({ size: 256 }))
    .addFields(
      { name: "サーバーID", value: guild.id, inline: true },
      { name: "オーナー", value: `<@${guild.ownerId}>`, inline: true },
      { name: "作成日", value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
      { name: "メンバー", value: `${members}人（人間: ${humans} / Bot: ${bots}）`, inline: true },
      { name: "チャンネル", value: `テキスト: ${text} / ボイス: ${voice}`, inline: true },
      { name: "ロール数", value: `${guild.roles.cache.size}個`, inline: true },
      { name: "絵文字数", value: `${guild.emojis.cache.size}個`, inline: true },
      { name: "認証レベル", value: `${guild.verificationLevel}`, inline: true },
      { name: "Boostレベル", value: `Tier ${guild.premiumTier}（${guild.premiumSubscriptionCount}Boost）`, inline: true },
    ).setTimestamp();
  return interaction.reply({ embeds: [embed] });
}

// /avatar
const avatarData = new SlashCommandBuilder()
  .setName("avatar").setDescription("ユーザーのアバターを表示します")
  .addUserOption(o => o.setName("user").setDescription("対象ユーザー（省略時は自分）"));
async function avatarExecute(interaction) {
  const user = interaction.options.getUser("user") || interaction.user;
  const url = user.displayAvatarURL({ size: 1024, extension: "png" });
  const embed = new EmbedBuilder().setColor(0x5865f2).setTitle(`${user.tag} のアバター`)
    .setImage(url)
    .setDescription(`[PNG](${url}) | [WebP](${user.displayAvatarURL({ size: 1024, extension: "webp" })})`)
    .setTimestamp();
  return interaction.reply({ embeds: [embed] });
}

// /membercount
const memberCountData = new SlashCommandBuilder().setName("membercount").setDescription("サーバーのメンバー数を表示します");
async function memberCountExecute(interaction) {
  const guild = interaction.guild;
  await guild.members.fetch();
  const total = guild.memberCount;
  const bots = guild.members.cache.filter(m => m.user.bot).size;
  const online = guild.members.cache.filter(m => m.presence?.status === "online").size;
  const embed = new EmbedBuilder().setColor(0x5865f2).setTitle(`${guild.name} メンバー数`)
    .addFields(
      { name: "総メンバー", value: `${total}人`, inline: true },
      { name: "人間", value: `${total - bots}人`, inline: true },
      { name: "Bot", value: `${bots}個`, inline: true },
      { name: "オンライン", value: online > 0 ? `${online}人` : "取得不可（Intent未有効）", inline: true },
    ).setTimestamp();
  return interaction.reply({ embeds: [embed] });
}

// /announce
const announceData = new SlashCommandBuilder()
  .setName("announce").setDescription("指定チャンネルにアナウンスを送信します")
  .addChannelOption(o => o.setName("channel").setDescription("送信先チャンネル").setRequired(true))
  .addStringOption(o => o.setName("message").setDescription("アナウンス内容").setRequired(true))
  .addBooleanOption(o => o.setName("everyone").setDescription("@everyone メンションを付けるか"));

async function announceExecute(interaction) {
  if (!hasModPermission(interaction.member)) return noMod(interaction);
  const channel = interaction.options.getChannel("channel");
  const message = interaction.options.getString("message");
  const everyone = interaction.options.getBoolean("everyone") ?? false;

  if (!channel.isTextBased()) return interaction.reply({ content: "テキストチャンネルを指定してください。", ephemeral: true });
  if (!channel.permissionsFor(interaction.guild.members.me).has("SendMessages"))
    return interaction.reply({ content: "そのチャンネルに送信権限がありません。", ephemeral: true });

  const content = everyone ? `@everyone\n${message}` : message;
  const embed = new EmbedBuilder().setColor(0x5865f2).setDescription(message)
    .setFooter({ text: `送信者: ${interaction.user.tag}` }).setTimestamp();

  await channel.send({ content: everyone ? "@everyone" : undefined, embeds: [embed], allowedMentions: { parse: everyone ? ["everyone"] : [] } });
  return interaction.reply({ content: `${channel} にアナウンスを送信しました。`, ephemeral: true });
}

// /poll
const pollData = new SlashCommandBuilder()
  .setName("poll").setDescription("投票を作成します")
  .addStringOption(o => o.setName("question").setDescription("質問").setRequired(true))
  .addStringOption(o => o.setName("option1").setDescription("選択肢1").setRequired(true))
  .addStringOption(o => o.setName("option2").setDescription("選択肢2").setRequired(true))
  .addStringOption(o => o.setName("option3").setDescription("選択肢3"))
  .addStringOption(o => o.setName("option4").setDescription("選択肢4"))
  .addStringOption(o => o.setName("option5").setDescription("選択肢5"));

async function pollExecute(interaction) {
  if (!hasModPermission(interaction.member)) return noMod(interaction);
  const question = interaction.options.getString("question");
  const numbers = ["1", "2", "3", "4", "5"];
  const options = [1, 2, 3, 4, 5]
    .map(n => interaction.options.getString(`option${n}`))
    .filter(Boolean);

  const optionText = options.map((o, i) => `${numbers[i]}. ${o}`).join("\n");
  const embed = new EmbedBuilder().setColor(0x5865f2).setTitle(`投票: ${question}`)
    .setDescription(optionText)
    .setFooter({ text: `投票者: ${interaction.user.tag}` }).setTimestamp();

  const msg = await interaction.reply({ embeds: [embed], fetchReply: true });
  const reactionEmojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣"];
  for (let i = 0; i < options.length; i++) {
    await msg.react(reactionEmojis[i]).catch(() => {});
  }
}

export const commands = [
  { data: pingData, execute: pingExecute },
  { data: userInfoData, execute: userInfoExecute },
  { data: serverInfoData, execute: serverInfoExecute },
  { data: avatarData, execute: avatarExecute },
  { data: memberCountData, execute: memberCountExecute },
  { data: announceData, execute: announceExecute },
  { data: pollData, execute: pollExecute },
];
