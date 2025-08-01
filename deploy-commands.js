import "dotenv/config"; // .envファイルから環境変数を読み込む
import { REST, Routes } from "discord.js"; // Discord.jsのREST APIとルートをインポート
import { readdirSync } from "fs"; // ファイルシステム操作用
import path from "path"; // パス操作用
import { fileURLToPath } from "url"; // ファイルURLをパスに変換

const __dirname = path.dirname(fileURLToPath(import.meta.url)); // 現在のディレクトリ名を取得

const commands = []; // コマンドデータを格納する配列
const commandFiles = readdirSync(path.join(__dirname, "commands")).filter(
  (file) => file.endsWith(".js") // commandsフォルダ内の.jsファイルのみ取得
);

for (const file of commandFiles) {
  const command = await import(`./commands/${file}`); // コマンドファイルをインポート
  commands.push(command.data.toJSON()); // コマンドデータをJSON形式で配列に追加
}

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN); // RESTクライアントを作成

try {
  console.log("📡 コマンドを登録中..."); // 登録開始メッセージ
  await rest.put(
    Routes.applicationGuildCommands(
      process.env.CLIENT_ID, // アプリケーションID
      process.env.GUILD_ID // ギルドID
    ),
    { body: commands } // コマンドデータを送信
  );
  console.log("✅ コマンド登録完了！"); // 登録完了メッセージ
} catch (error) {
  console.error(error); // エラーを表示
}
