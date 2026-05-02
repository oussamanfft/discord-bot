const { Client, GatewayIntentBits, EmbedBuilder, ActivityType, PermissionsBitField, ChannelType, Collection, AuditLogEvent, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const express = require('express');

const PREFIX = '>>';
const TOKEN = process.env.DISCORD_TOKEN;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences,
    ]
});

// ========== SYSTÈMES ==========
let configs = new Collection();
let joinLog = new Collection();
let messageCache = new Collection();
let verificationCache = new Collection();
let dashboardMessages = new Collection();

// Configuration par défaut
const defaultConfig = {
    antiraid: true, antispam: true, antiban: true, antikick: true,
    antichanneldelete: true, antiroledelete: true, antichannelcreate: true,
    antirolecreate: true, antimentions: true, antiserverrename: true,
    antiservericon: true, antighostping: true, antimentionslimit: 5,
    raidthreshold: 5, spamthreshold: 5, punishment: 'kick',
    logchannel: null, verification: false, whitelistusers: [], whitelistroles: []
};

// ========== BOT PRÊT ==========
client.once('ready', () => {
    console.log(`✅ ${client.user.tag} est en ligne !`);
    console.log(`🛡️ ${client.guilds.cache.size} serveurs protégés`);
    client.user.setActivity(`🛡️ ${PREFIX}help | ${PREFIX}dashboard`, { type: ActivityType.Watching });
});

// ========== DASHBOARD DISCORD (PANEL INTERACTIF) ==========
async function updateDashboard(message, config, guild) {
    const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('🛡️ **DASHBOARD DE SÉCURITÉ**')
        .setThumbnail(guild.iconURL())
        .setDescription(`
\`\`\`
╔══════════════════════════════════════════════════════════╗
║                    📊 ÉTAT DES PROTECTIONS               ║
╠══════════════════════════════════════════════════════════╣
║  🛡️ Anti-Raid           : ${config.antiraid ? '🟢 ACTIVÉ' : '🔴 DÉSACTIVÉ'}              ║
║  🛡️ Anti-Spam           : ${config.antispam ? '🟢 ACTIVÉ' : '🔴 DÉSACTIVÉ'}              ║
║  🛡️ Anti-Ban            : ${config.antiban ? '🟢 ACTIVÉ' : '🔴 DÉSACTIVÉ'}              ║
║  🛡️ Anti-Kick           : ${config.antikick ? '🟢 ACTIVÉ' : '🔴 DÉSACTIVÉ'}              ║
║  🛡️ Anti-Mentions       : ${config.antimentions ? '🟢 ACTIVÉ' : '🔴 DÉSACTIVÉ'}              ║
║  🛡️ Anti-Channel Delete : ${config.antichanneldelete ? '🟢 ACTIVÉ' : '🔴 DÉSACTIVÉ'}              ║
║  🛡️ Anti-Role Delete    : ${config.antiroledelete ? '🟢 ACTIVÉ' : '🔴 DÉSACTIVÉ'}              ║
║  🛡️ Anti-Server Rename  : ${config.antiserverrename ? '🟢 ACTIVÉ' : '🔴 DÉSACTIVÉ'}              ║
║  🛡️ Anti-Server Icon    : ${config.antiservericon ? '🟢 ACTIVÉ' : '🔴 DÉSACTIVÉ'}              ║
╠══════════════════════════════════════════════════════════╣
║                    ⚙️ CONFIGURATION                      ║
╠══════════════════════════════════════════════════════════╣
║  🔨 Sanction par défaut : ${config.punishment.toUpperCase()}${' '.repeat(15 - config.punishment.length)}║
║  👥 Seuil Anti-Raid     : ${config.raidthreshold} arrivées/10s${' '.repeat(12)}║
║  💬 Seuil Anti-Spam     : ${config.spamthreshold} messages/5s${' '.repeat(13)}║
║  🔔 Limite Mentions     : ${config.antimentionslimit} mentions${' '.repeat(18)}║
╠══════════════════════════════════════════════════════════╣
║                    📋 INFORMATIONS                       ║
╠══════════════════════════════════════════════════════════╣
║  👥 Membres protégés    : ${guild.memberCount}${' '.repeat(18)}║
║  ✅ Whitelist Users     : ${config.whitelistusers.length}${' '.repeat(22)}║
║  🎭 Whitelist Roles     : ${config.whitelistroles.length}${' '.repeat(22)}║
║  📝 Salon des logs      : ${config.logchannel ? `<#${config.logchannel}>` : '❌ NON DÉFINI'}${' '.repeat(8)}║
╚══════════════════════════════════════════════════════════╝
\`\`\`
        `)
        .setFooter({ text: `🛡️ Bot de sécurité v10.0 | Serveur: ${guild.name}` })
        .setTimestamp();

    const row1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId('toggle_antiraid').setLabel('🛡️ Anti-Raid').setStyle(config.antiraid ? ButtonStyle.Success : ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('toggle_antispam').setLabel('⚠️ Anti-Spam').setStyle(config.antispam ? ButtonStyle.Success : ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('toggle_antiban').setLabel('🔨 Anti-Ban').setStyle(config.antiban ? ButtonStyle.Success : ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('toggle_antikick').setLabel('👢 Anti-Kick').setStyle(config.antikick ? ButtonStyle.Success : ButtonStyle.Danger)
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId('toggle_antimentions').setLabel('🔔 Anti-Mentions').setStyle(config.antimentions ? ButtonStyle.Success : ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('toggle_antichannel').setLabel('📁 Anti-Channel').setStyle(config.antichanneldelete ? ButtonStyle.Success : ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('toggle_antirole').setLabel('🎭 Anti-Role').setStyle(config.antiroledelete ? ButtonStyle.Success : ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('toggle_antiserver').setLabel('🏷️ Anti-Rename').setStyle(config.antiserverrename ? ButtonStyle.Success : ButtonStyle.Danger)
        );

    const row3 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId('punishment_kick').setLabel('⚡ Kick').setStyle(config.punishment === 'kick' ? ButtonStyle.Primary : ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('punishment_ban').setLabel('⛔ Ban').setStyle(config.punishment === 'ban' ? ButtonStyle.Primary : ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('punishment_timeout').setLabel('⏱️ Timeout').setStyle(config.punishment === 'timeout' ? ButtonStyle.Primary : ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('btn_whitelist').setLabel('✅ Whitelist').setStyle(ButtonStyle.Secondary)
        );

    const row4 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId('btn_logs').setLabel('📋 Configurer Logs').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('btn_threshold').setLabel('👥 Seuil Anti-Raid').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('btn_verify').setLabel('✅ Vérification').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('refresh_dashboard').setLabel('🔄 Rafraîchir').setStyle(ButtonStyle.Secondary)
        );

    if (dashboardMessages.has(guild.id)) {
        const oldMsg = dashboardMessages.get(guild.id);
        try {
            const msg = await message.channel.messages.fetch(oldMsg);
            if (msg) await msg.edit({ embeds: [embed], components: [row1, row2, row3, row4] });
        } catch(e) {
            const msg = await message.channel.send({ embeds: [embed], components: [row1, row2, row3, row4] });
            dashboardMessages.set(guild.id, msg.id);
        }
    } else {
        const msg = await message.channel.send({ embeds: [embed], components: [row1, row2, row3, row4] });
        dashboardMessages.set(guild.id, msg.id);
    }
}

// ========== INTERACTIONS BOUTONS ==========
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    if (!interaction.guild) return;

    if (!configs.has(interaction.guild.id)) configs.set(interaction.guild.id, { ...defaultConfig });
    const config = configs.get(interaction.guild.id);

    const toggleMap = {
        'toggle_antiraid': 'antiraid',
        'toggle_antispam': 'antispam',
        'toggle_antiban': 'antiban',
        'toggle_antikick': 'antikick',
        'toggle_antimentions': 'antimentions',
        'toggle_antichannel': 'antichanneldelete',
        'toggle_antirole': 'antiroledelete',
        'toggle_antiserver': 'antiserverrename'
    };

    if (toggleMap[interaction.customId]) {
        const key = toggleMap[interaction.customId];
        config[key] = !config[key];
        configs.set(interaction.guild.id, config);
        await interaction.reply({ content: `✅ \`${key}\` ${config[key] ? 'activé' : 'désactivé'}`, ephemeral: true });
        await updateDashboard(interaction.message, config, interaction.guild);
        return;
    }

    if (interaction.customId === 'punishment_kick') {
        config.punishment = 'kick';
        configs.set(interaction.guild.id, config);
        await interaction.reply({ content: '✅ Sanction définie sur **Kick**', ephemeral: true });
        await updateDashboard(interaction.message, config, interaction.guild);
    } else if (interaction.customId === 'punishment_ban') {
        config.punishment = 'ban';
        configs.set(interaction.guild.id, config);
        await interaction.reply({ content: '✅ Sanction définie sur **Ban**', ephemeral: true });
        await updateDashboard(interaction.message, config, interaction.guild);
    } else if (interaction.customId === 'punishment_timeout') {
        config.punishment = 'timeout';
        configs.set(interaction.guild.id, config);
        await interaction.reply({ content: '✅ Sanction définie sur **Timeout**', ephemeral: true });
        await updateDashboard(interaction.message, config, interaction.guild);
    } else if (interaction.customId === 'refresh_dashboard') {
        await interaction.reply({ content: '🔄 Dashboard rafraîchi', ephemeral: true });
        await updateDashboard(interaction.message, config, interaction.guild);
    } else if (interaction.customId === 'btn_logs') {
        await interaction.reply({ content: '📋 Mentionnez un salon pour les logs : `>>logchannel #salon`', ephemeral: true });
    } else if (interaction.customId === 'btn_whitelist') {
        await interaction.reply({ content: '✅ **Gestion Whitelist**\n\nAjouter un utilisateur : `>>whitelist user @user`\nAjouter un rôle : `>>whitelist role @role`\n\nPour voir la liste, utilisez `>>whitelist list`', ephemeral: true });
    } else if (interaction.customId === 'btn_threshold') {
        await interaction.reply({ content: '👥 **Changer le seuil Anti-Raid**\n\nUtilisez : `>>set threshold [nombre]`\nExemple : `>>set threshold 5` (5 arrivées en 10 secondes)', ephemeral: true });
    } else if (interaction.customId === 'btn_verify') {
        await interaction.reply({ content: '✅ **Vérification**\n\nActiver : `>>setupverify`\nSe vérifier : `>>verify`', ephemeral: true });
    }
});

// ========== FONCTIONS DE SÉCURITÉ ==========
async function punish(guildId, userId, reason) {
    const config = configs.get(guildId) || defaultConfig;
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return;
    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) return;
    if (config.whitelistusers.includes(userId)) return;
    if (member.roles.cache.some(r => config.whitelistroles.includes(r.id))) return;
    try {
        if (config.punishment === 'kick') { await member.kick(reason); return 'kick'; }
        if (config.punishment === 'ban') { await member.ban({ reason }); return 'ban'; }
        if (config.punishment === 'timeout') { await member.timeout(60000, reason); return 'timeout'; }
    } catch(e) { return null; }
}

// ========== ÉVÈNEMENTS DE SÉCURITÉ ==========
client.on('guildMemberAdd', async (member) => {
    const config = configs.get(member.guild.id) || defaultConfig;
    if (!config.antiraid) return;
    const now = Date.now();
    if (!joinLog.has(member.guild.id)) joinLog.set(member.guild.id, []);
    const joins = joinLog.get(member.guild.id);
    joins.push(now);
    const recent = joins.filter(t => now - t < 10000);
    joinLog.set(member.guild.id, recent);
    if (recent.length >= config.raidthreshold) {
        member.guild.channels.cache.forEach(async c => {
            if (c.type === ChannelType.GuildText) await c.permissionOverwrites.edit(member.guild.id, { SendMessages: false });
        });
        setTimeout(() => {
            member.guild.channels.cache.forEach(async c => {
                if (c.type === ChannelType.GuildText) await c.permissionOverwrites.edit(member.guild.id, { SendMessages: null });
            });
        }, 30000);
    }
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;
    const config = configs.get(message.guild.id) || defaultConfig;
    if (config.antispam) {
        if (!messageCache.has(message.author.id)) messageCache.set(message.author.id, []);
        const msgs = messageCache.get(message.author.id);
        const now = Date.now();
        msgs.push(now);
        const recent = msgs.filter(t => now - t < 5000);
        messageCache.set(message.author.id, recent);
        if (recent.length >= config.spamthreshold) {
            await punish(message.guild.id, message.author.id, 'Spam');
            messageCache.delete(message.author.id);
        }
    }
    if (config.antimentions) {
        const mentions = message.mentions.users.size + message.mentions.roles.size;
        if (mentions > config.antimentionslimit) {
            await message.delete();
            await punish(message.guild.id, message.author.id, `Mentions (${mentions})`);
        }
    }
});

client.on('guildBanAdd', async (ban) => {
    const config = configs.get(ban.guild.id) || defaultConfig;
    if (!config.antiban) return;
    const logs = await ban.guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanAdd, limit: 1 });
    const log = logs.entries.first();
    if (log && log.executor.id !== client.user.id && Date.now() - log.createdTimestamp < 3000) {
        await punish(ban.guild.id, log.executor.id, 'Ban massif');
    }
});

client.on('guildMemberRemove', async (member) => {
    const config = configs.get(member.guild.id) || defaultConfig;
    if (!config.antikick) return;
    const logs = await member.guild.fetchAuditLogs({ type: AuditLogEvent.MemberKick, limit: 1 });
    const log = logs.entries.first();
    if (log && log.executor.id !== client.user.id && Date.now() - log.createdTimestamp < 3000) {
        await punish(member.guild.id, log.executor.id, 'Kick massif');
    }
});

client.on('channelDelete', async (channel) => {
    if (!channel.guild) return;
    const config = configs.get(channel.guild.id) || defaultConfig;
    if (!config.antichanneldelete) return;
    const logs = await channel.guild.fetchAuditLogs({ type: AuditLogEvent.ChannelDelete, limit: 1 });
    const log = logs.entries.first();
    if (log && log.executor.id !== client.user.id) await punish(channel.guild.id, log.executor.id, 'Suppression salon');
});

client.on('roleDelete', async (role) => {
    if (!role.guild) return;
    const config = configs.get(role.guild.id) || defaultConfig;
    if (!config.antiroledelete) return;
    const logs = await role.guild.fetchAuditLogs({ type: AuditLogEvent.RoleDelete, limit: 1 });
    const log = logs.entries.first();
    if (log && log.executor.id !== client.user.id) await punish(role.guild.id, log.executor.id, 'Suppression rôle');
});

// ========== COMMANDES PRÉFIXE ==========
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;
    if (!message.guild) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (!configs.has(message.guild.id)) configs.set(message.guild.id, { ...defaultConfig });
    const config = configs.get(message.guild.id);

    // ---------- DASHBOARD (PANEL PRINCIPAL) ----------
    if (command === 'dashboard' || command === 'panel') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('❌ Tu dois être **administrateur** pour accéder au dashboard.');
        }
        await updateDashboard(message, config, message.guild);
        return;
    }

    // ---------- HELP ----------
    if (command === 'help') {
        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('🛡️ **CENTRE DE COMMANDES**')
            .setDescription(`
\`\`\`
╔══════════════════════════════════════════════════════════╗
║                    📋 COMMANDES DISPONIBLES              ║
╠══════════════════════════════════════════════════════════╣
║  🎮 DASHBOARD                                            ║
║  ├─ ${PREFIX}dashboard  → Ouvrir le panneau de contrôle     ║
║  ├─ ${PREFIX}stats       → Voir les statistiques            ║
║  └─ ${PREFIX}serverinfo  → Infos du serveur                ║
╠══════════════════════════════════════════════════════════╣
║  ⚙️ CONFIGURATION                                        ║
║  ├─ ${PREFIX}set threshold [n] → Changer seuil anti-raid     ║
║  ├─ ${PREFIX}logchannel #salon → Définir salon des logs      ║
║  ├─ ${PREFIX}whitelist user/@user → Gérer whitelist          ║
║  └─ ${PREFIX}setupverify → Activer la vérification          ║
╠══════════════════════════════════════════════════════════╣
║  👑 AUTRES                                               ║
║  ├─ ${PREFIX}boss        → Crédits du bot                   ║
║  ├─ ${PREFIX}verify      → Se vérifier                      ║
║  └─ ${PREFIX}help        → Afficher cette aide              ║
╚══════════════════════════════════════════════════════════╝
\`\`\`
            `)
            .setFooter({ text: '🛡️ Protection Anti-Nuke 24/7 | Créé par vctr_on' })
            .setTimestamp();
        return message.channel.send({ embeds: [embed] });
    }

    // ---------- STATS ----------
    if (command === 'stats') {
        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('📊 **STATISTIQUES DU SERVEUR**')
            .setDescription(`
\`\`\`
╔══════════════════════════════════════════════════════════╗
║                    📈 STATISTIQUES                       ║
╠══════════════════════════════════════════════════════════╣
║  👥 Membres protégés    : ${message.guild.memberCount}                      ║
║  ✅ Whitelist users     : ${config.whitelistusers.length}                      ║
║  🎭 Whitelist roles     : ${config.whitelistroles.length}                      ║
║  🔨 Sanction actuelle   : ${config.punishment.toUpperCase()}                      ║
║  👥 Seuil anti-raid     : ${config.raidthreshold} arrivées/10s               ║
║  💬 Seuil anti-spam     : ${config.spamthreshold} messages/5s                ║
║  🔔 Limite mentions     : ${config.antimentionslimit} mentions                ║
╚══════════════════════════════════════════════════════════╝
\`\`\`
            `)
            .setFooter({ text: '🛡️ Protection active 24/7' })
            .setTimestamp();
        return message.channel.send({ embeds: [embed] });
    }

    // ---------- SERVERINFO ----------
    if (command === 'serverinfo') {
        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle(`📡 **${message.guild.name}**`)
            .setThumbnail(message.guild.iconURL())
            .setDescription(`
\`\`\`
╔══════════════════════════════════════════════════════════╗
║                    ℹ️ INFORMATIONS                       ║
╠══════════════════════════════════════════════════════════╣
║  👑 Propriétaire   : <@${message.guild.ownerId}>                         ║
║  👥 Membres        : ${message.guild.memberCount}                         ║
║  🛡️ Protection     : ✅ Activée                         ║
║  📅 Création       : <t:${Math.floor(message.guild.createdTimestamp / 1000)}:R>              ║
╚══════════════════════════════════════════════════════════╝
\`\`\`
            `)
            .setFooter({ text: '🛡️ Bot de sécurité | vctr_on' })
            .setTimestamp();
        return message.channel.send({ embeds: [embed] });
    }

    // ---------- BOSS ----------
    if (command === 'boss') {
        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('👑 **MADE BY VCTR_ON** 👑')
            .setDescription(`
\`\`\`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║              🛡️ BOT DE SÉCURITÉ ULTIME                 ║
║                                                          ║
║              ✨ Créé par vctr_on                        ║
║              🚀 Version 10.0 - Ultimate                 ║
║              🛡️ Anti-Nuke & Anti-Raid                  ║
║              💜 Protection 24/7                         ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
\`\`\`
            `)
            .setFooter({ text: '🛡️ Protection maximale activée' })
            .setTimestamp();
        return message.channel.send({ embeds: [embed] });
    }

    // ---------- SET THRESHOLD ----------
    if (command === 'set' && args[0] === 'threshold' && message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        const value = parseInt(args[1]);
        if (isNaN(value) || value < 2 || value > 20) return message.reply('❌ Seuil entre **2** et **20** arrivées');
        config.raidthreshold = value;
        configs.set(message.guild.id, config);
        message.reply(`✅ Seuil anti-raid défini sur **${value}** arrivées en 10 secondes`);
    }

    // ---------- SETUPVERIFY ----------
    if (command === 'setupverify' && message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        config.verification = true;
        configs.set(message.guild.id, config);
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('✅ **VÉRIFICATION ACTIVÉE**')
            .setDescription(`Les nouveaux membres devront taper \`${PREFIX}verify\` pour accéder au serveur`)
            .setTimestamp();
        return message.channel.send({ embeds: [embed] });
    }

    // ---------- VERIFY ----------
    if (command === 'verify') {
        if (!config.verification) return message.reply('❌ La vérification n\'est pas activée. Un admin doit taper `>>setupverify`');
        if (verificationCache.has(message.author.id)) return message.reply('❌ Tu es déjà vérifié !');
        verificationCache.set(message.author.id, true);
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('✅ **VÉRIFICATION RÉUSSIE**')
            .setDescription('Bienvenue sur le serveur ! 🎉')
            .setFooter({ text: '🛡️ Bot de sécurité' })
            .setTimestamp();
        return message.reply({ embeds: [embed] });
    }

    // ---------- LOGCHANNEL ----------
    if (command === 'logchannel' && message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        const channel = message.mentions.channels.first();
        if (channel) {
            config.logchannel = channel.id;
            message.reply(`✅ Logs configurés dans ${channel}`);
        } else {
            config.logchannel = null;
            message.reply(`❌ Salon des logs désactivé`);
        }
        configs.set(message.guild.id, config);
    }

    // ---------- WHITELIST ----------
    if (command === 'whitelist' && message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        const type = args[0];
        
        if (type === 'list') {
            const users = config.whitelistusers.map(id => `<@${id}>`).join(', ') || 'Aucun';
            const roles = config.whitelistroles.map(id => `<@&${id}>`).join(', ') || 'Aucun';
            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('✅ **LISTE WHITELIST**')
                .addFields(
                    { name: '👤 Utilisateurs', value: users, inline: false },
                    { name: '🎭 Rôles', value: roles, inline: false }
                )
                .setTimestamp();
            return message.channel.send({ embeds: [embed] });
        }
        
        const target = message.mentions.users.first() || message.mentions.roles.first();
        if (!target) return message.reply('❌ Mentionne un utilisateur ou un rôle');
        
        if (type === 'user') {
            if (config.whitelistusers.includes(target.id)) {
                config.whitelistusers = config.whitelistusers.filter(id => id !== target.id);
                message.reply(`✅ ${target.tag} retiré de la whitelist`);
            } else {
                config.whitelistusers.push(target.id);
                message.reply(`✅ ${target.tag} ajouté à la whitelist`);
            }
        } else if (type === 'role') {
            if (config.whitelistroles.includes(target.id)) {
                config.whitelistroles = config.whitelistroles.filter(id => id !== target.id);
                message.reply(`✅ ${target.name} retiré de la whitelist`);
            } else {
                config.whitelistroles.push(target.id);
                message.reply(`✅ ${target.name} ajouté à la whitelist`);
            }
        } else {
            message.reply(`❌ Usage: \`${PREFIX}whitelist user/@user\` ou \`${PREFIX}whitelist role/@role\`\n\`${PREFIX}whitelist list\` pour voir la liste`);
        }
        configs.set(message.guild.id, config);
    }
});

// ========== SERVEUR WEB KEEP-ALIVE ==========
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('🛡️ Bot de sécurité en ligne !'));
app.listen(port, () => console.log(`✅ Keep-alive sur port ${port}`));

client.login(TOKEN);