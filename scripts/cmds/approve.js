const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "approve",
    aliases: ["approval"],
    version: "2.0",
    author: "RAFI",
    role: 2,
    shortDescription: "✅ Approve allowed groups",
    longDescription: "Approve or reject groups via config.json",
    category: "admin",
    guide: {
      en: `⚙️ Usage :
{pn}                  → Approve this group
{pn} <groupID>        → Approve a group by ID
{pn} list             → List approved groups
{pn} pending          → List pending groups
{pn} reject <groupID> → Reject a group
{pn} help             → Show this help`
    }
  },

  onStart: async function ({ api, event, args }) {
    const CONFIG_PATH = path.join(__dirname, "../../config.json");
    const { threadID, senderID, messageID } = event;
    const DEFAULT_OWNER = "100090895866311";
    const OWNER_ID = global.GoatBot?.config?.ADMIN?.[0] || DEFAULT_OWNER;

    // 🔐 Owner restriction
    if (senderID !== OWNER_ID) {
      return api.sendMessage("⛔ | Only the OWNER can use this command!", threadID, messageID);
    }

    // 📦 Load or create config file
    function loadConfig() {
      try {
        return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
      } catch {
        const def = {
          AUTO_APPROVE: {
            enabled: true,
            approvedGroups: [],
            autoApproveMessage: false
          },
          APPROVAL: {
            approvedGroups: [],
            pendingGroups: [],
            rejectedGroups: []
          }
        };
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(def, null, 2));
        return def;
      }
    }

    function saveConfig(config) {
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    }

    const config = loadConfig();
    const subCommand = (args[0] || "").toLowerCase();

    // 🆘 Help
    if (subCommand === "help") {
      return api.sendMessage(this.config.guide.en.replace(/{pn}/g, global.GoatBot.config.prefix + this.config.name), threadID, messageID);
    }

    // 📜 List approved
    if (subCommand === "list") {
      const approved = config.APPROVAL.approvedGroups || [];
      if (!approved.length) return api.sendMessage("📭 No approved groups.", threadID, messageID);
      return api.sendMessage(`✅ Approved groups (${approved.length}) :\n\n` +
        approved.map((id, i) => `${i + 1}. 🆔 ${id}`).join("\n"), threadID, messageID);
    }

    // ⏳ List pending
    if (subCommand === "pending") {
      const pending = config.APPROVAL.pendingGroups || [];
      if (!pending.length) return api.sendMessage("⏳ No pending groups.", threadID, messageID);
      return api.sendMessage(`🕒 Pending groups (${pending.length}) :\n\n` +
        pending.map((id, i) => `${i + 1}. 🆔 ${id}`).join("\n"), threadID, messageID);
    }

    // ❌ Reject a group
    if (subCommand === "reject") {
      const groupId = args[1];
      if (!groupId) return api.sendMessage("❌ | Please provide the group ID to reject.", threadID, messageID);

      ["approvedGroups", "pendingGroups"].forEach(key => {
        const idx = config.APPROVAL[key].indexOf(groupId);
        if (idx !== -1) config.APPROVAL[key].splice(idx, 1);
      });

      if (!config.APPROVAL.rejectedGroups.includes(groupId)) {
        config.APPROVAL.rejectedGroups.push(groupId);
      }

      saveConfig(config);
      api.sendMessage(`🚫 Group ${groupId} has been rejected successfully.`, threadID, messageID);
      try {
        api.sendMessage("❌ This group has been rejected by admin. The bot will no longer function here.", groupId);
      } catch {}
      return;
    }

    // ✅ Approve a group
    let targetID = (!isNaN(args[0])) ? args[0] : threadID;

    if (config.APPROVAL.approvedGroups.includes(targetID)) {
      return api.sendMessage(`✅ This group is already approved.\n🆔 ${targetID}`, threadID, messageID);
    }

    if (config.APPROVAL.rejectedGroups.includes(targetID)) {
      return api.sendMessage(`❌ This group has been previously rejected.\n🆔 ${targetID}`, threadID, messageID);
    }

    // 💾 Update
    config.APPROVAL.pendingGroups = config.APPROVAL.pendingGroups.filter(id => id !== targetID);
    config.APPROVAL.approvedGroups.push(targetID);

    // 🌟 Add to auto system
    if (config.AUTO_APPROVE?.enabled && !config.AUTO_APPROVE.approvedGroups.includes(targetID)) {
      config.AUTO_APPROVE.approvedGroups.push(targetID);
    }

    saveConfig(config);
    return api.sendMessage(
      `🎉 Group approved successfully!\n\n🆔 Thread ID: ${targetID}\n✨ The bot is now active here.`,
      threadID, messageID
    );
  }
};
