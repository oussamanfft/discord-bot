const { Client, GatewayIntentBits, EmbedBuilder, ActivityType, PermissionsBitField, ChannelType, Collection, AuditLogEvent, REST, Routes, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const express = require('express');

const PREFIX = '>>';
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = '1320571139222929509';

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

// Configuration par défaut
const defaultConfig = {
    antiraid: true, antispam: true, antiban: true, antikick: true,
    antichanneldelete: true, antiroledelete: true, antichannelcreate: true,
    antirolecreate: true, antimentions: true, antiserverrename: true,
    antiservericon: true, antighostping: true, antimentionslimit: 5,
    raidthreshold: 5, spamthreshold: 5, punishment: 'kick',
    logchannel: null, verification: false, whitelistusers: [], whitelistroles: []
};

// ========== COMMANDES SLASH ORGANISÉES ==========
const commands = [
    { name: 'help', description: '📋 Afficher toutes les commandes' },
    { name: 'stats', description: '📊 Statistiques du serveur' },
    { name: 'serverinfo', description: 'ℹ️ Informations du serveur' },
    { name: 'boss', description: '👑 Crédits du bot' },
    { name: 'verify', description: '✅ Se vérifier sur le serveur' }
];

// Enregistrement des commandes slash
const rest = new REST({ version: '10' }).setToken(TOKEN);
(async () => {
    try {
        console.log('🔄 Enregistrement des commandes slash...');
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
        console.log('✅ Commandes slash enregistrées !');
    } catch (error) { console.error(error); }
})();

// ========== BOT PRÊT ==========
client.once('ready', () => {
    console.log(`✅ ${client.user.tag} est en ligne !`);
    console.log(`🛡️ ${client.guilds.cache.size} serveurs protégés`);
    client.user.setActivity(`🛡️ ${PREFIX}help | /help`, { type: ActivityType.Watching });
});

// ========== BOUTONS DE CONFIGURATION ==========
async function sendConfigPanel(message, config) {
    const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('🛡️ **PANEL DE CONFIGURATION**')
        .setDescription(`
\`\`\`
┌─────────────────────────────────────────┐
│  📌 BOT DE SÉCURITÉ ULTIME             │
├─────────────────────────────────────────┤
│  🛡️ Anti-Raid      : ${config.antiraid ? '🟢 ACTIVÉ' : '🔴 DÉSACTIVÉ'}      │
│  🛡️ Anti-Spam      : ${config.antispam ? '🟢 ACTIVÉ' : '🔴 DÉSACTIVÉ'}      │
│  🛡️ Anti-Ban       : ${config.antiban ? '🟢 ACTIVÉ' : '🔴 DÉSACTIVÉ'}       │
│  🛡️ Anti-Kick      : ${config.antikick ? '🟢 ACTIVÉ' : '🔴 DÉSACTIVÉ'}      │
│  🛡️ Anti-Mentions  : ${config.antimentions ? '🟢 ACTIVÉ' : '🔴 DÉSACTIVÉ'}  │
│  🛡️ Anti-Channel   : ${config.antichanneldelete ? '🟢 ACTIVÉ' : '🔴 DÉSACTIVÉ'}   │
│  🛡️ Anti-Role      : ${config.antiroledelete ? '🟢 ACTIVÉ' : '🔴 DÉSACTIVÉ'}    │
├─────────────────────────────────────────┤
│  ⚙️ Sanction       : ${config.punishment}                    │
│  👥 Seuil Raid     : ${config.raidthreshold}                  │
│  💬 Seuil Spam     : ${config.spamthreshold}                  │
└─────────────────────────────────────────┘
\`\`\`
        `)
        .setFooter({ text: 'Cliquez sur les boutons ci-dessous pour configurer' })
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
            new ButtonBuilder().setCustomId('punishment_kick').setLabel('⚡ Sanction: Kick').setStyle(config.punishment === 'kick' ? ButtonStyle.Primary : ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('punishment_ban').setLabel('⛔ Sanction: Ban').setStyle(config.punishment === 'ban' ? ButtonStyle.Primary : ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('punishment_timeout').setLabel('⏱️ Sanction: Timeout').setStyle(config.punishment === 'timeout' ? ButtonStyle.Primary : ButtonStyle.Secondary)
        );

    const row3 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId('config_logs').setLabel('📋 Configurer Logs').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('config_whitelist').setLabel('✅ Whitelist').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('close_panel').setLabel('🔒 Fermer').setStyle(ButtonStyle.Danger)
        );

    await message.reply({ embeds: [embed], components: [row1, row2, row3] });
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
        'toggle_antimentions': 'antimentions'
    };

    if (toggleMap[interaction.customId]) {
        const key = toggleMap[interaction.customId];
        config[key] = !config[key];
        configs.set(interaction.guild.id, config);
        await interaction.reply({ content: `✅ \`${key}\` ${config[key] ? 'activé' : 'désactivé'}`, ephemeral: true });
        await interaction.message.delete();
        await sendConfigPanel(interaction.message, config);
        return;
    }

    if (interaction.customId === 'punishment_kick') {
        config.punishment = 'kick';
        configs.set(interaction.guild.id, config);
        await interaction.reply({ content: '✅ Sanction définie sur **Kick**', ephemeral: true });
        await interaction.message.delete();
        await sendConfigPanel(interaction.message, config);
    } else if (interaction.customId === 'punishment_ban') {
        config.punishment = 'ban';
        configs.set(interaction.guild.id, config);
        await interaction.reply({ content: '✅ Sanction définie sur **Ban**', ephemeral: true });
        await interaction.message.delete();
        await sendConfigPanel(interaction.message, config);
    } else if (interaction.customId === 'punishment_timeout') {
        config.punishment = 'timeout';
        configs.set(interaction.guild.id, config);
        await interaction.reply({ content: '✅ Sanction définie sur **Timeout**', ephemeral: true });
        await interaction.message.delete();
        await sendConfigPanel(interaction.message, config);
    } else if (interaction.customId === 'config_logs') {
        await interaction.reply({ content: '📋 Mentionnez un salon pour les logs : `>>logchannel #salon`', ephemeral: true });
    } else if (interaction.customId === 'config_whitelist') {
        await interaction.reply({ content: '✅ Ajoutez un utilisateur : `>>whitelist user @user`\n🎭 Ajoutez un rôle : `>>whitelist role @role`', ephemeral: true });
    } else if (interaction.customId === 'close_panel') {
        await interaction.message.delete();
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
    if (log && log.executor.id !== client.user.id) await punish(ban.guild.id, log.executor.id, 'Ban massif');
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

    // ---------- HELP ----------
    if (command === 'help') {
        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('🛡️ **CENTRE DE COMMANDES**')
            .setDescription(`
\`\`\`
┌─────────────────────────────────────────────┐
│  📌 BOT DE SÉCURITÉ - VERSION 10.0         │
├─────────────────────────────────────────────┤
│  🎮 COMMANDES PRÉFIXE                       │
│  ├─ ${PREFIX}config      → Ouvrir le panel de config │
│  ├─ ${PREFIX}stats        → Voir les statistiques      │
│  ├─ ${PREFIX}serverinfo   → Infos du serveur           │
│  ├─ ${PREFIX}boss         → Crédits du bot             │
│  ├─ ${PREFIX}verify       → Se vérifier                │
│  ├─ ${PREFIX}whitelist    → Gérer la whitelist         │
│  └─ ${PREFIX}logchannel   → Définir salon des logs     │
├─────────────────────────────────────────────┤
│  🤖 COMMANDES SLASH                          │
│  ├─ /help             → Aide                 │
│  ├─ /stats            → Statistiques         │
│  ├─ /serverinfo       → Infos serveur        │
│  ├─ /boss             → Crédits              │
│  └─ /verify           → Vérification         │
└─────────────────────────────────────────────┘
\`\`\`
            `)
            .setFooter({ text: '🛡️ Protection Anti-Nuke 24/7 | Créé par vctr_on' })
            .setTimestamp();
        return message.channel.send({ embeds: [embed] });
    }

    // ---------- CONFIG (PANEL BOUTONS) ----------
    if (command === 'config') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('❌ Tu dois être **administrateur** pour utiliser cette commande.');
        }
        await sendConfigPanel(message, config);
        return;
    }

    // ---------- STATS ----------
    if (command === 'stats') {
        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('📊 **STATISTIQUES DU SERVEUR**')
            .setDescription(`
\`\`\`
┌─────────────────────────────────────────────┐
│  📈 PROTECTIONS ACTIVES                     │
├─────────────────────────────────────────────┤
│  🛡️ Membres protégés   : ${message.guild.memberCount}              │
│  ✅ Whitelist users    : ${config.whitelistusers.length}              │
│  🎭 Whitelist roles    : ${config.whitelistroles.length}              │
│  ⚙️ Sanction actuelle  : ${config.punishment}                    │
│  👥 Seuil anti-raid    : ${config.raidthreshold} arrivées/10s       │
│  💬 Seuil anti-spam    : ${config.spamthreshold} messages/5s        │
│  🔔 Seuil mentions     : ${config.antimentionslimit} mentions       │
└─────────────────────────────────────────────┘
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
┌─────────────────────────────────────────────┐
│  ℹ️ INFORMATIONS DU SERVEUR                │
├─────────────────────────────────────────────┤
│  👑 Propriétaire   : <@${message.guild.ownerId}>  │
│  👥 Membres        : ${message.guild.memberCount}              │
│  🛡️ Protection     : ✅ Activée              │
│  📅 Création       : <t:${Math.floor(message.guild.createdTimestamp / 1000)}:R> │
└─────────────────────────────────────────────┘
\`\`\`
            `)
            .setFooter({ text: '🛡️ Bot de sécurité' })
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
╔═════════════════════════════════════════════╗
║                                             ║
║        🛡️ BOT DE SÉCURITÉ ULTIME          ║
║                                             ║
║        ✨ Créé par vctr_on                  ║
║        🚀 Version 10.0 - Ultimate          ║
║        🛡️ Anti-Nuke & Anti-Raid           ║
║        💜 Protection 24/7                  ║
║                                             ║
╚═════════════════════════════════════════════╝
\`\`\`
            `)
            .setFooter({ text: '🛡️ Protection maximale activée' })
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

    // ---------- SETUPVERIFY ----------
    if (command === 'setupverify' && message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        config.verification = true;
        configs.set(message.guild.id, config);
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('✅ **VÉRIFICATION ACTIVÉE**')
            .setDescription(`Les nouveaux membres devront taper \`${PREFIX}verify\` ou \`/verify\` pour accéder au serveur`)
            .setTimestamp();
        return message.channel.send({ embeds: [embed] });
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
            message.reply(`❌ Usage: \`${PREFIX}whitelist user/@user\` ou \`${PREFIX}whitelist role/@role\``);
        }
        configs.set(message.guild.id, config);
    }
});

// ========== COMMANDES SLASH ==========
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (!interaction.guild) return;

    if (!configs.has(interaction.guild.id)) configs.set(interaction.guild.id, { ...defaultConfig });
    const config = configs.get(interaction.guild.id);

    if (interaction.commandName === 'help') {
        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('🛡️ **COMMANDES SLASH**')
            .setDescription(`
\`\`\`
┌─────────────────────────────────────────────┐
│  🤖 COMMANDES DISPONIBLES                   │
├─────────────────────────────────────────────┤
│  /help        → Afficher cette aide        │
│  /stats       → Voir les statistiques       │
│  /serverinfo  → Infos du serveur           │
│  /boss        → Crédits du bot             │
│  /verify      → Se vérifier                │
└─────────────────────────────────────────────┘
\`\`\`
📌 **Préfixe aussi disponible :** \`${PREFIX}help\`
            `)
            .setFooter({ text: '🛡️ Bot de sécurité | vctr_on' })
            .setTimestamp();
        return interaction.reply({ embeds: [embed], ephemeral: false });
    }

    if (interaction.commandName === 'stats') {
        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('📊 **STATISTIQUES**')
            .setDescription(`
\`\`\`
┌─────────────────────────────────────────────┐
│  📈 INFORMATIONS                           │
├─────────────────────────────────────────────┤
│  👥 Membres        : ${interaction.guild.memberCount}              │
│  ⚙️ Sanction       : ${config.punishment}                    │
│  ✅ Whitelist      : ${config.whitelistusers.length} utilisateurs     │
│  🎭 Whitelist      : ${config.whitelistroles.length} rôles            │
└─────────────────────────────────────────────┘
\`\`\`
            `)
            .setTimestamp();
        return interaction.reply({ embeds: [embed], ephemeral: false });
    }

    if (interaction.commandName === 'serverinfo') {
        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle(`📡 ${interaction.guild.name}`)
            .setThumbnail(interaction.guild.iconURL())
            .setDescription(`
\`\`\`
┌─────────────────────────────────────────────┐
│  ℹ️ INFOS SERVEUR                          │
├─────────────────────────────────────────────┤
│  👑 Propriétaire : <@${interaction.guild.ownerId}>  │
│  👥 Membres       : ${interaction.guild.memberCount}              │
│  🛡️ Protection    : ✅ Activée              │
└─────────────────────────────────────────────┘
\`\`\`
            `)
            .setTimestamp();
        return interaction.reply({ embeds: [embed], ephemeral: false });
    }

    if (interaction.commandName === 'boss') {
        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('👑 **MADE BY VCTR_ON**')
            .setDescription('Bot de sécurité ultime - Anti-Nuke & Anti-Raid 24/7')
            .setFooter({ text: '🛡️ Version 10.0' })
            .setTimestamp();
        return interaction.reply({ embeds: [embed], ephemeral: false });
    }

    if (interaction.commandName === 'verify') {
        if (!config.verification) return interaction.reply({ content: '❌ Vérification non activée', ephemeral: true });
        if (verificationCache.has(interaction.user.id)) return interaction.reply({ content: '❌ Déjà vérifié', ephemeral: true });
        verificationCache.set(interaction.user.id, true);
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('✅ VÉRIFICATION RÉUSSIE')
            .setDescription('Bienvenue sur le serveur !');
        return interaction.reply({ embeds: [embed], ephemeral: false });
    }
});

// ========== DASHBOARD WEB ==========
const app = express();
const port = process.env.PORT || 3000;

app.get('/api/stats', (req, res) => {
    res.json({
        servers: client.guilds.cache.size,
        users: client.users.cache.filter(u => !u.bot).size,
        ram: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2),
        prefix: PREFIX
    });
});

app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head><title>Security Bot</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:linear-gradient(135deg,#0a0a2a,#1a1a3e);font-family:'Segoe UI',sans-serif;min-height:100vh;color:#fff}
.container{max-width:1000px;margin:0 auto;padding:20px}
.header{text-align:center;padding:40px;background:rgba(255,255,255,0.05);border-radius:30px;margin-bottom:30px}
.header h1{font-size:3em;background:linear-gradient(135deg,#ff6b6b,#4ecdc4);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-bottom:40px}
.card{background:rgba(255,255,255,0.08);border-radius:20px;padding:25px;text-align:center}
.value{font-size:2.5em;font-weight:bold;color:#4ecdc4}
.footer{text-align:center;padding:30px;background:rgba(0,0,0,0.3);border-radius:20px}
</style>
</head>
<body>
<div class=container>
<div class=header><h1>🛡️ SECURITY BOT</h1><p>Protection Anti-Nuke & Anti-Raid 24/7</p></div>
<div class=stats><div class=card><div class=value id=servers>0</div><div>Serveurs</div></div>
<div class=card><div class=value id=users>0</div><div>Membres</div></div>
<div class=card><div class=value id=ram>0</div><div>RAM MB</div></div></div>
<div class=footer><p>🛡️ Bot créé par vctr_on - Version 10.0</p></div>
</div>
<script>
fetch('/api/stats').then(r=>r.json()).then(d=>{document.getElementById('servers').innerText=d.servers;document.getElementById('users').innerText=d.users;document.getElementById('ram').innerText=d.ram});
setInterval(()=>fetch('/api/stats').then(r=>r.json()).then(d=>{document.getElementById('servers').innerText=d.servers;document.getElementById('users').innerText=d.users;document.getElementById('ram').innerText=d.ram}),30000);
</script>
</body>
</html>
    `);
});

app.listen(port, () => console.log(`✅ Dashboard sur le port ${port}`));

client.login(TOKEN);