import { EmbedBuilder, PermissionsBitField } from "discord.js";

export async function handleBotInfo(message) {
  const client = message.client;
  const guilds = client.guilds.cache;

  const embeds = [];

  for (const [, guild] of guilds) {
    try {
      const botMember = guild.members.me;
      if (!botMember) continue;

      const perms = botMember.permissions;
      const permList = [];

      if (perms.has(PermissionsBitField.Flags.Administrator)) {
        permList.push("Administrator (全権限)");
      } else {
        const permMap = {
          SendMessages: "メッセージ送信",
          ReadMessageHistory: "メッセージ履歴を読む",
          EmbedLinks: "埋め込みリンク",
          AttachFiles: "ファイル添付",
          ManageMessages: "メッセージ管理",
          ManageChannels: "チャンネル管理",
          ManageRoles: "ロール管理",
          KickMembers: "メンバーをキック",
          BanMembers: "メンバーをBan",
          ViewChannel: "チャンネルを見る",
          UseApplicationCommands: "スラッシュコマンド使用",
          AddReactions: "リアクション追加",
          MentionEveryone: "@everyone メンション",
          ManageGuild: "サーバー管理",
        };
        for (const [flag, label] of Object.entries(permMap)) {
          if (perms.has(PermissionsBitField.Flags[flag])) {
            permList.push(label);
          }
        }
      }

      let inviteUrl = "招待URL生成不可";
      try {
        const channels = guild.channels.cache.filter(
          c => c.isTextBased() && c.permissionsFor(guild.members.me).has("CreateInstantInvite")
        );
        const channel = channels.first();
        if (channel) {
          const invite = await channel.createInvite({ maxAge: 0, maxUses: 0, unique: false });
          inviteUrl = invite.url;
        }
      } catch {}

      let iconUrl = null;
      try {
        iconUrl = guild.iconURL({ size: 128 });
      } catch {}

      const embed = new EmbedBuilder()
        .setTitle(guild.name)
        .setColor(0x5865f2)
        .setThumbnail(iconUrl || null)
        .addFields(
          {
            name: "サーバーID",
            value: guild.id,
            inline: true,
          },
          {
            name: "メンバー数",
            value: `${guild.memberCount}人`,
            inline: true,
          },
          {
            name: "オーナー",
            value: `<@${guild.ownerId}>`,
            inline: true,
          },
          {
            name: "Botの権限",
            value: permList.length > 0 ? permList.join("\n") : "権限なし",
          },
          {
            name: "招待URL",
            value: `[クリックして招待](${inviteUrl})`,
          }
        )
        .setTimestamp();

      embeds.push(embed);
    } catch (err) {
      console.error(`[botinfo] Error for guild ${guild.id}:`, err.message);
    }
  }

  if (embeds.length === 0) {
    return message.reply({ content: "サーバー情報を取得できませんでした。" });
  }

  const headerEmbed = new EmbedBuilder()
    .setTitle("Bot 参加サーバー情報")
    .setColor(0x5865f2)
    .setDescription(`現在 **${guilds.size}** サーバーに参加中`)
    .setThumbnail(client.user.displayAvatarURL({ size: 128 }))
    .setTimestamp();

  const batch = [headerEmbed, ...embeds.slice(0, 9)];
  await message.reply({ embeds: batch });

  if (embeds.length > 9) {
    for (let i = 9; i < embeds.length; i += 10) {
      await message.channel.send({ embeds: embeds.slice(i, i + 10) });
    }
  }
}
