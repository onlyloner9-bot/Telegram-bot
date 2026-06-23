const TelegramBot = require("node-telegram-bot-api");

// ================= BOT TOKEN =================
// 👇 PUT YOUR TOKEN HERE
const TOKEN = "YOUR_BOT_TOKEN_HERE";

const bot = new TelegramBot(TOKEN, { polling: true });

// ================= SETTINGS =================
const badWords = ["badword1", "badword2", "fuck", "shit"];

const spamMap = new Map();
const warnMap = new Map();

const MAX_WARN = 3;
const SPAM_LIMIT = 5;
const TIME_WINDOW = 5000;

// ================= CHECK ADMIN =================
async function isAdmin(chatId, userId) {
  try {
    const res = await bot.getChatMember(chatId, userId);
    return ["administrator", "creator"].includes(res.status);
  } catch {
    return false;
  }
}

// ================= DETECTORS =================
function hasLink(text = "") {
  return /(https?:\/\/|t\.me\/|www\.)/i.test(text);
}

function hasBadWord(text = "") {
  return badWords.some(w => text.toLowerCase().includes(w));
}

function hasMassMention(text = "") {
  return text.includes("@all") || (text.match(/@\w+/g) || []).length > 5;
}

// ================= MESSAGE HANDLER =================
bot.on("message", async (msg) => {
  if (!msg.text) return;

  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text;

  if (msg.from.is_bot) return;

  const admin = await isAdmin(chatId, userId);
  if (admin) return; // admins bypass

  // ================= ANTI LINK =================
  if (hasLink(text)) {
    bot.deleteMessage(chatId, msg.message_id);
    return warn(chatId, userId, "Links are not allowed");
  }

  // ================= ANTI BAD WORD =================
  if (hasBadWord(text)) {
    bot.deleteMessage(chatId, msg.message_id);
    return warn(chatId, userId, "Bad words detected");
  }

  // ================= ANTI MASS MENTION =================
  if (hasMassMention(text)) {
    bot.deleteMessage(chatId, msg.message_id);
    return warn(chatId, userId, "Mass mention detected");
  }

  // ================= ANTI SPAM =================
  const now = Date.now();

  if (!spamMap.has(userId)) spamMap.set(userId, []);

  const times = spamMap.get(userId);
  times.push(now);

  const recent = times.filter(t => now - t < TIME_WINDOW);
  spamMap.set(userId, recent);

  if (recent.length > SPAM_LIMIT) {
    bot.deleteMessage(chatId, msg.message_id);
    return warn(chatId, userId, "Spam detected");
  }
});

// ================= WARNING SYSTEM =================
async function warn(chatId, userId, reason) {
  let count = warnMap.get(userId) || 0;
  count++;
  warnMap.set(userId, count);

  await bot.sendMessage(chatId, `⚠️ Warning ${count}/${MAX_WARN}\nReason: ${reason}`);

  if (count >= MAX_WARN) {
    await bot.banChatMember(chatId, userId);
    warnMap.delete(userId);
    bot.sendMessage(chatId, "⛔ User banned.");
  }
}

// ================= COMMANDS =================
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "🤖 Group Management Bot is online!");
});

bot.onText(/\/help/, (msg) => {
  bot.sendMessage(msg.chat.id, `
📌 Commands:
/start - Start bot
/help - Help

🛡 Features:
- Anti Link
- Anti Spam
- Anti Badword
- Anti Mass Mention
`);
});
