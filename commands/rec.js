import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";

// スラッシュコマンドの定義
export const data = new SlashCommandBuilder()
  .setName("募集")
  .setDescription("ゲーム募集を開始します")
  .addIntegerOption((option) =>
    option.setName("人数").setDescription("必要な人数").setRequired(true)
  )
  // ゲームモードを「カジュアル」「ランク」「チームデスマッチ」の中から選択する
  .addStringOption((option) =>
    option
      .setName("モード")
      .setDescription("ゲームモードを選択してください")
      .setRequired(true)
      .addChoices(
        { name: "カジュアル", value: "カジュアル" },
        { name: "ランク", value: "ランク" },
        { name: "チームデスマッチ", value: "チームデスマッチ" }
      )
  );

// コマンド実行時の処理
export async function execute(interaction) {
  const maxPlayers = interaction.options.getInteger("人数");
  const mode = interaction.options.getString("モード");
  const allowedModes = ["カジュアル", "ランク", "チームデスマッチ"];

  // 入力をチェックして、正しいゲームモードかどうか確認
  if (!allowedModes.includes(mode)) {
    return await interaction.reply({
      content:
        "❌ 正しいゲームモードを入力してください（カジュアル・ランク・チームデスマッチ）",
      ephemeral: true,
    });
  }

  // 通常処理ここから（省略せずに続けてOK）
  const participants = [];
  const authorId = interaction.user.id;

  const embed = new EmbedBuilder()
    .setTitle(`🎮 募集中 - ${mode}`)
    .setDescription(`必要人数: **${maxPlayers}人**\n現在の参加者: 0人`)
    .setColor(0x00ae86)
    .setFooter({ text: `主催者: ${interaction.user.tag}` });
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

  // ボタンをActionRowにまとめる
  const row = new ActionRowBuilder().addComponents(joinButton, cancelButton);

  // 募集メッセージ送信（ボタン付き）
  const message = await interaction.reply({
    embeds: [embed],
    components: [row],
    fetchReply: true,
  });

  // 募集情報をメモリに保存
  interaction.client.activeBoshu.set(message.id, {
    participants,
    maxPlayers,
    authorId,
    mode,
    message,
    collector: null,
  });

  // ボタンのリアクションを収集するコレクター（10分間有効）
  const collector = message.createMessageComponentCollector({ time: 600000 }); // 10分間
  interaction.client.activeBoshu.get(message.id).collector = collector;

  // ボタンが押されたときの処理
  collector.on("collect", async (i) => {
    const boshu = interaction.client.activeBoshu.get(message.id);
    if (!boshu) return;

    if (i.customId === "join") {
      // 参加ボタン
      if (!boshu.participants.includes(i.user.id)) {
        boshu.participants.push(i.user.id); // 参加者追加
      }

      if (boshu.participants.length >= boshu.maxPlayers) {
        // 必要人数に達したらVC作成
        // 「ボイスチャンネル」カテゴリを取得
        const category = interaction.guild.channels.cache.find(
          (ch) => ch.type === 4 && ch.name === "ボイスチャンネル"
        );

        // 主催者の表示名（ニックネーム）を取得
        const member = await interaction.guild.members.fetch(
          interaction.user.id
        );
        const displayName = member.displayName;

        // VCを表示名で作成
        const vc = await interaction.guild.channels.create({
          name: `${displayName}さんのVC`,
          type: 2,
          parent: category?.id || null,
        });

        // 参加者にDMでVC情報送信
        for (const userId of boshu.participants) {
          const member = await interaction.guild.members.fetch(userId);
          await member.send(`🎧 VCが作成されました: ${vc.name}`);
        }

        // 募集完了のEmbedに更新し、ボタンを非表示
        embed.setDescription(
          `✅ 募集した人数が集まりました！VCを作成しました。\n${boshu.participants.length}人参加済み。`
        );
        await i.update({ embeds: [embed], components: [] });

        // VCの監視（誰もいなくなったら自動削除）
        const interval = setInterval(async () => {
          const freshVC = await interaction.guild.channels.fetch(vc.id);
          if (freshVC.members.size === 0) {
            await vc.delete();
            clearInterval(interval);
          }
        }, 15000);

        // 募集情報を削除し、コレクター停止
        interaction.client.activeBoshu.delete(message.id);
        collector.stop();
      } else {
        // まだ必要人数に達していない場合、Embedを更新
        embed.setDescription(
          `必要人数: **${boshu.maxPlayers}人**\n現在の参加者: ${boshu.participants.length}人`
        );
        await i.update({ embeds: [embed], components: [row] });
      }
    } else if (i.customId === "cancel") {
      // キャンセルボタン
      const index = boshu.participants.indexOf(i.user.id);
      if (index !== -1) {
        boshu.participants.splice(index, 1); // 参加者リストから削除
        embed.setDescription(
          `必要人数: **${boshu.maxPlayers}人**\n現在の参加者: ${boshu.participants.length}人`
        );
        await i.update({ embeds: [embed], components: [row] });
      } else {
        await i.reply({ content: "参加していません。", ephemeral: true }); // 参加していない場合は通知
      }
    }
  });

  // 募集終了時（タイムアウト）の処理
  collector.on("end", async () => {
    if (interaction.client.activeBoshu.has(message.id)) {
      embed.setDescription(
        `⏰ 募集タイムアウト。\n${participants.length}人参加。`
      );
      await message.edit({ embeds: [embed], components: [] }); // 募集終了を通知
      interaction.client.activeBoshu.delete(message.id); // 募集情報を削除
    }
  });
}
