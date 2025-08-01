import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";

// スラッシュコマンドの定義
export const data = new SlashCommandBuilder()
  .setName("募集") // コマンド名
  .setDescription("ゲーム募集を開始します") // コマンド説明
  .addIntegerOption(
    (option) =>
      option.setName("人数").setDescription("必要な人数").setRequired(true) // 必要人数
  )
  .addStringOption(
    (option) =>
      option
        .setName("モード")
        .setDescription("ゲームモード（例：ランク）")
        .setRequired(true) // ゲームモード
  );

// コマンド実行時の処理
export async function execute(interaction) {
  const maxPlayers = interaction.options.getInteger("人数"); // 必要人数取得
  const mode = interaction.options.getString("モード"); // モード取得
  const participants = []; // 参加者IDリスト

  // 募集用Embed作成
  const embed = new EmbedBuilder()
    .setTitle(`🎮 募集中 - ${mode}`)
    .setDescription(`必要人数: **${maxPlayers}人**\n現在の参加者: 0人`)
    .setColor(0x00ae86);

  // 参加ボタン作成
  const joinButton = new ButtonBuilder()
    .setCustomId("join")
    .setLabel("参加")
    .setStyle(ButtonStyle.Success);

  // キャンセルボタン作成
  const cancelButton = new ButtonBuilder()
    .setCustomId("cancel")
    .setLabel("キャンセル")
    .setStyle(ButtonStyle.Danger);

  // ボタンをまとめてActionRowに追加
  const row = new ActionRowBuilder().addComponents(joinButton, cancelButton);

  // メッセージ送信（ボタン付き）
  const message = await interaction.reply({
    embeds: [embed],
    components: [row],
    fetchReply: true,
  });

  // ボタンのリアクションを収集するコレクター（10分間有効）
  const collector = message.createMessageComponentCollector({ time: 600000 }); // 10分

  // ボタンが押されたときの処理
  collector.on("collect", async (i) => {
    if (i.customId === "join") {
      // 参加ボタン
      if (!participants.includes(i.user.id)) {
        participants.push(i.user.id); // 参加者追加
      }

      if (participants.length >= maxPlayers) {
        // 必要人数に達したらVC作成
        const vc = await interaction.guild.channels.create({
          name: `パーティ-${interaction.user.username}`,
          type: 2, // ボイスチャンネル
        });

        // 参加者にDMでVC情報送信
        for (const userId of participants) {
          const member = await interaction.guild.members.fetch(userId);
          await member.send(`🎧 VCが作成されました: ${vc.url || vc.name}`);
        }

        collector.stop(); // 募集終了
        embed.setDescription(
          `✅ 募集完了！VCを作成しました。\n${participants.length}人参加済み。`
        );
        await i.update({ embeds: [embed], components: [] });

        // VCに誰もいなくなったら自動削除
        const vcWatcher = setInterval(async () => {
          const freshVC = await interaction.guild.channels.fetch(vc.id);
          if (freshVC.members.size === 0) {
            await vc.delete();
            clearInterval(vcWatcher);
          }
        }, 15000); // 15秒ごとにチェック
      } else {
        // まだ人数未達
        embed.setDescription(
          `必要人数: **${maxPlayers}人**\n現在の参加者: ${participants.length}人`
        );
        await i.update({ embeds: [embed], components: [row] });
      }
    } else if (i.customId === "cancel") {
      // キャンセルボタン
      const index = participants.indexOf(i.user.id);
      if (index !== -1) {
        participants.splice(index, 1); // 参加者から削除
        embed.setDescription(
          `必要人数: **${maxPlayers}人**\n現在の参加者: ${participants.length}人`
        );
        await i.update({ embeds: [embed], components: [row] });
      } else {
        await i.reply({ content: "参加していません。", ephemeral: true }); // 参加していない場合
      }
    }
  });

  // コレクター終了時の処理（タイムアウトや人数未達成）
  collector.on("end", async () => {
    if (participants.length < maxPlayers) {
      embed.setDescription(
        `⏰ 募集タイムアウト or 未達成で終了。\n${participants.length}人参加。`
      );
      await message.edit({ embeds: [embed], components: [] });
    }
  });
}
