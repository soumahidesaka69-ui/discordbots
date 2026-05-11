import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("help")
  .setDescription("コマンド一覧と使い方を表示します");

export async function execute(interaction) {
  const embeds = [
    new EmbedBuilder()
      .setTitle("AI Mods — コマンド一覧")
      .setColor(0x5865f2)
      .setDescription("3つのAI API（Groq / OpenRouter / Gemini）を使用した高機能ModBot")
      .addFields(
        {
          name: "AI 設定 / セットアップ",
          value: [
            "`/channel set` — チャンネルでAI自動応答を有効化",
            "`/channel remove` — チャンネルのAI設定を解除",
            "`/channel list` — AI設定チャンネル一覧",
            "`/channel clear` — 会話履歴をリセット",
            "`/order setup` — AIへの追加命令を設定",
            "`/order reset` — 追加命令をリセット",
            "`/order view` — 現在の命令設定を確認",
            "`/add-mods add` — Modロールを追加",
            "`/add-mods remove` — Modロールを削除",
            "`/add-mods list` — Modロール一覧",
          ].join("\n"),
        },
        {
          name: "AI コマンド",
          value: [
            "`/ai ask` — AIに質問",
            "`/ai code` — コード生成・解説・デバッグ",
            "`/ai translate` — テキスト翻訳",
            "`/ai summary` — テキスト要約",
            "`/ai improve` — テキスト改善",
            "`/ai explain` — 概念をわかりやすく説明",
            "`/ai review` — コードレビュー",
            "`/ai debug` — バグ特定・修正",
            "`/ai compare` — 2つの選択肢を比較",
            "`/ai regex` — 正規表現を生成・説明",
            "`/ai sql` — SQLクエリ生成・最適化",
            "`/ai json` — JSON整形・解析",
            "`/ai security` — セキュリティチェック",
            "`/ai optimize` — パフォーマンス最適化",
            "`/ai history` — 会話履歴をリセット",
          ].join("\n"),
        }
      )
      .setTimestamp(),

    new EmbedBuilder()
      .setTitle("モデレーション コマンド")
      .setColor(0xff9900)
      .addFields(
        {
          name: "警告管理",
          value: [
            "`/warn add <user> <reason>` — ユーザーに警告を追加",
            "`/warn list <user>` — 警告一覧を表示",
            "`/warn clear <user>` — 警告をすべて削除",
          ].join("\n"),
        },
        {
          name: "処罰コマンド",
          value: [
            "`/kick <user> [reason]` — ユーザーをKick",
            "`/ban <user> [reason] [days]` — ユーザーをBAN（メッセージ削除日数指定可）",
            "`/unban <userid>` — BANを解除",
            "`/mute <user> <duration> [reason]` — タイムアウト（例: 10m, 2h, 1d）",
            "`/unmute <user>` — タイムアウトを解除",
          ].join("\n"),
        },
        {
          name: "チャンネル管理",
          value: [
            "`/purge <amount> [user]` — メッセージを一括削除（最大100件）",
            "`/lock [channel]` — チャンネルをロック（送信不可）",
            "`/unlock [channel]` — チャンネルのロックを解除",
            "`/slowmode <seconds> [channel]` — スローモードを設定（0で無効）",
          ].join("\n"),
        }
      )
      .setTimestamp(),

    new EmbedBuilder()
      .setTitle("保護 / AutoMod コマンド")
      .setColor(0xff4444)
      .addFields(
        {
          name: "AntiNuke（サーバー破壊対策）",
          value: [
            "`/antinuke enable [threshold]` — AntiNukeを有効化（大量チャンネル/ロール削除・連続BANを検出して自動BAN）",
            "`/antinuke disable` — AntiNukeを無効化",
            "`/antinuke status` — 設定状況を確認",
          ].join("\n"),
        },
        {
          name: "AntiRaid（大量参加対策）",
          value: [
            "`/antiraid enable [threshold]` — AntiRaidを有効化（短時間の大量参加を検出して認証レベルを最高に）",
            "`/antiraid disable` — AntiRaidを無効化",
            "`/antiraid status` — 設定状況を確認",
          ].join("\n"),
        },
        {
          name: "チャンネルリセット",
          value: [
            "`/nuke [channel]` — チャンネルを完全リセット（全メッセージ削除・再作成）※管理者専用",
          ].join("\n"),
        },
        {
          name: "AutoMod",
          value: [
            "`/automod list` — AutoModルール一覧",
            "`/automod keyword` — キーワードフィルター作成",
            "`/automod preset` — プリセットフィルター設定",
            "`/automod spam` — メンションスパム保護",
            "`/automod link` — リンクフィルター",
            "`/automod enable/disable/delete` — ルール有効化/無効化/削除",
            "`/automod exempt` — ロール・チャンネルを除外設定",
          ].join("\n"),
        }
      )
      .setTimestamp(),

    new EmbedBuilder()
      .setTitle("ユーティリティ コマンド")
      .setColor(0x00cc66)
      .addFields(
        {
          name: "サーバー情報",
          value: [
            "`/ping` — Botのレイテンシを確認",
            "`/userinfo [user]` — ユーザーの詳細情報",
            "`/serverinfo` — サーバーの詳細情報",
            "`/avatar [user]` — アバターを表示",
            "`/membercount` — メンバー数の内訳",
          ].join("\n"),
        },
        {
          name: "コミュニティ機能",
          value: [
            "`/announce <channel> <message>` — 指定チャンネルにアナウンス送信",
            "`/poll <question> <option1> <option2> [option3-5]` — 投票を作成（最大5選択肢）",
            "`!botinfo` — Botの参加サーバー情報とサーバー招待URL",
          ].join("\n"),
        }
      )
      .setFooter({ text: "Powered by Groq / OpenRouter / Gemini — 絵文字なし / 日英対応" })
      .setTimestamp(),
  ];

  return interaction.reply({ embeds: embeds });
}
