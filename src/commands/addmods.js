import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from "discord.js";
import { addModRole, removeModRole, getModRoles } from "../utils/database.js";

export const data = new SlashCommandBuilder()
  .setName("add-mods")
  .setDescription("Botを操作できるロールを管理します")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand((sub) =>
    sub
      .setName("add")
      .setDescription("Modロールを追加します")
      .addRoleOption((opt) =>
        opt.setName("role").setDescription("追加するロール").setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("remove")
      .setDescription("Modロールを削除します")
      .addRoleOption((opt) =>
        opt.setName("role").setDescription("削除するロール").setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub.setName("list").setDescription("現在のModロール一覧を表示します")
  );

export async function execute(interaction) {
  if (!interaction.member.permissions.has("Administrator")) {
    return interaction.reply({
      content: "このコマンドはサーバー管理者のみ使用できます。",
      ephemeral: true,
    });
  }

  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guild.id;

  if (sub === "add") {
    const role = interaction.options.getRole("role");
    addModRole(guildId, role.id);
    const embed = new EmbedBuilder()
      .setTitle("Modロール追加")
      .setColor(0x57f287)
      .setDescription(`<@&${role.id}> をBotのModロールに追加しました。\nこのロールを持つメンバーはBotの設定コマンドを使用できます。`)
      .setTimestamp();
    return interaction.reply({ embeds: [embed] });
  }

  if (sub === "remove") {
    const role = interaction.options.getRole("role");
    removeModRole(guildId, role.id);
    const embed = new EmbedBuilder()
      .setTitle("Modロール削除")
      .setColor(0xed4245)
      .setDescription(`<@&${role.id}> をModロールから削除しました。`)
      .setTimestamp();
    return interaction.reply({ embeds: [embed] });
  }

  if (sub === "list") {
    const roles = getModRoles(guildId);
    const embed = new EmbedBuilder()
      .setTitle("Modロール一覧")
      .setColor(0x5865f2)
      .setTimestamp();

    if (roles.length === 0) {
      embed.setDescription(
        "Modロールが設定されていません。\nサーバー管理者と管理権限を持つメンバーのみが操作できます。"
      );
    } else {
      embed.setDescription(roles.map((r) => `<@&${r}>`).join("\n"));
    }

    return interaction.reply({ embeds: [embed] });
  }
}
