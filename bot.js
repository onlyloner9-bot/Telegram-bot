require("dotenv").config();
const { Telegraf } = require("telegraf");

const bot = new Telegraf(process.env.BOT_TOKEN);

// ================= SETTINGS =================
const settings = {
  antilink: true,
  antibadword: true,
  antispam: true,
  antiforward: true,
};

// ================= STORAGE =================
const spam = {};
const warns = {};

const badWords = ["badword1", "badword2", "fuck", "shit"];

// ================= SAFE ADMIN CHECK =================
async function isAdmin(ctx) {
  try {
    const m = await ctx.getChatMember(ctx.from.id);
    return ["creator", "administrator"].includes(m.status);
  } catch {
    return false;
  }
}

// ================= SAFE DELETE =================
async function safeDelete(ctx) {
  try {
    if (ctx.message?.message_id) {
      await ctx.deleteMessage(ctx.message.message_id);
    }
  } catch {}
}

// ================= START =================
bot.start((ctx) => {
  ctx.reply(`
🤖 Group Manager v2

⚙ Commands:
/antilink on|off
/antibadword on|off
/antispam on|off
/antiforward on|off

👮 Admin:
/ban (reply)
/kick (reply)
/mute (reply)
/warn (reply)
`);
});

// ================= TOGGLE SYSTEM =================
function toggle(cmd, key, label) {
  bot.command(cmd, async (ctx) => {
    if (!(await isAdmin(ctx))) return ctx.reply("❌ Admin only");

    const arg = ctx.message.text.split(" ")[1];
    settings[key] = arg === "on";

    ctx.reply(`${label}: ${settings[key] ? "ON" : "OFF"}`);
  });
}

toggle("antilink", "antilink", "🔗 Anti-link");
toggle("antibadword", "antibadword", "🚫 Anti-badword");
toggle("antispam", "antispam", "⚡ Anti-spam");
toggle("antiforward", "antiforward", "📩 Anti-forward");

// ================= BAN =================
bot.command("ban", async (ctx) => {
  if (!(await isAdmin(ctx))) return;

  if (!ctx.message?.reply_to_message)
    return ctx.reply("Reply to user");

  try {
    const id = ctx.message.reply_to_message.from.id;
    await ctx.banChatMember(id);
    ctx.reply("🔨 Banned");
  } catch {}
});

// ================= KICK =================
bot.command("kick", async (ctx) => {
  if (!(await isAdmin(ctx))) return;

  if (!ctx.message?.reply_to_message)
    return ctx.reply("Reply to user");

  try {
    const id = ctx.message.reply_to_message.from.id;
    await ctx.banChatMember(id);
    await ctx.unbanChatMember(id);
    ctx.reply("👢 Kicked");
  } catch {}
});

// ================= MUTE =================
bot.command("mute", async (ctx) => {
  if (!(await isAdmin(ctx))) return;

  if (!ctx.message?.reply_to_message)
    return ctx.reply("Reply to user");

  try {
    const id = ctx.message.reply_to_message.from.id;

    await ctx.restrictChatMember(id, {
      permissions: { can_send_messages: false },
    });

    ctx.reply("🔇 Muted");
  } catch {}
});

// ================= WARN SYSTEM =================
bot.command("warn", async (ctx) => {
  if (!(await isAdmin(ctx))) return;

  if (!ctx.message?.reply_to_message)
    return ctx.reply("Reply to user");

  const id = ctx.message.reply_to_message.from.id;

  warns[id] = (warns[id] || 0) + 1;

  ctx.reply(`⚠️ Warn: ${warns[id]}/3`);

  if (warns[id] >= 3) {
    try {
      await ctx.banChatMember(id);
      ctx.reply("🔨 Auto-banned (3 warns)");
    } catch {}
  }
});

// ================= FILTER SYSTEM =================
bot.on("message", async (ctx) => {
  const text = (ctx.message?.text || "").toLowerCase();
  const userId = ctx.from.id;

  // ===== ANTI LINK =====
  if (settings.antilink && text) {
    if (text.includes("http") || text.includes("t.me")) {
      if (!(await isAdmin(ctx))) {
        await safeDelete(ctx);
        return ctx.reply("🚫 Links not allowed");
      }
    }
  }

  // ===== ANTI BADWORD =====
  if (settings.antibadword && text) {
    for (let w of badWords) {
      if (text.includes(w)) {
        if (!(await isAdmin(ctx))) {
          await safeDelete(ctx);
          return ctx.reply("🚫 Bad words not allowed");
        }
      }
    }
  }

  // ===== ANTI SPAM (IMPROVED) =====
  if (settings.antispam) {
    if (!spam[userId]) spam[userId] = [];

    const now = Date.now();
    spam[userId].push(now);

    spam[userId] = spam[userId].filter(t => now - t < 5000);

    if (spam[userId].length > 6) {
      await safeDelete(ctx);
      return ctx.reply("⚠️ Slow down!");
    }
  }

  // ===== ANTI FORWARD =====
  if (settings.antiforward) {
    if (ctx.message?.forward_date) {
      if (!(await isAdmin(ctx))) {
        await safeDelete(ctx);
        return ctx.reply("🚫 Forwarding blocked");
      }
    }
  }
});

// ================= ERROR HANDLER =================
bot.catch((err) => {
  console.log("BOT ERROR:", err);
});

// ================= START =================
bot.launch();
console.log("🤖 Group Manager v2 Running...");