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
    antichanneldelete: true, antiroledelete: true,
    antimentions: true, antiserverrename: true, antiservericon: true,
    antimentionslimit: 5, raidthreshold: 5, spamthreshold: 5,
    punishment: 'kick', logchannel: null, verification: false,
    whitelistusers: [], whitelistroles: []
};

// ========== BOT PRÊT ==========
client.once('ready', () => {
    console.log(`✅ ${client.user.tag} est en ligne !`);
    console.log(`🛡️ ${client.guilds.cache.size} serveurs protégés`);
    client.user.setActivity(`🛡️ ${PREFIX}help`, { type: ActivityType.Watching });
});

// ========== FONCTION POUR EMBEDS RESPONSIVE ==========
function createResponsiveEmbed(title, content, color = 0x1a1a2e, thumbnail = null) {
    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription(content)
        .setFooter({ text: '🛡️ Vctr_on Security • 24/7' })
        .setTimestamp();
    
    if (thumbnail) embed.setThumbnail(thumbnail);
    return embed;
}

// ========== DASHBOARD ==========
async function updateDashboard(message, config, guild) {
    const statusIcon = (value) => value ? '✅' : '❌';
    
    const content = `\`\`\`ansi
[1;36m╔════════════════════════════════════════════╗[0m
[1;36m║         [1;33m🛡️ DASHBOARD DE SÉCURITÉ [1;36m           ║[0m
[1;36m╠════════════════════════════════════════════╣[0m
[1;36m║ [1;32mPROTECTIONS ACTIVES[0m                         [1;36m║[0m
[1;36m║ [0m   Anti-Raid     : ${statusIcon(config.antiraid)} [1;36m║[0m
[1;36m║ [0m   Anti-Spam     : ${statusIcon(config.antispam)} [1;36m║[0m
[1;36m║ [0m   Anti-Ban      : ${statusIcon(config.antiban)} [1;36m║[0m
[1;36m║ [0m   Anti-Kick     : ${statusIcon(config.antikick)} [1;36m║[0m
[1;36m║ [0m   Anti-Mentions : ${statusIcon(config.antimentions)} [1;36m║[0m
[1;36m║ [0m   Anti-Channels : ${statusIcon(config.antichanneldelete)} [1;36m║[0m
[1;36m║ [0m   Anti-Roles    : ${statusIcon(config.antiroledelete)} [1;36m║[0m
[1;36m╠════════════════════════════════════════════╣[0m
[1;36m║ [1;32mCONFIGURATION[0m                                 [1;36m║[0m
[1;36m║ [0m   Sanction   : [1;33m${config.punishment.toUpperCase()}[0m                [1;36m║[0m
[1;36m║ [0m   Seuil Raid : [1;33m${config.raidthreshold}[0m membres/10s         [1;36m║[0m
[1;36m║ [0m   Seuil Spam : [1;33m${config.spamthreshold}[0m messages/5s         [1;36m║[0m
[1;36m║ [0m   Mentions   : [1;33m${config.antimentionslimit}[0m max              [1;36m║[0m
[1;36m╠════════════════════════════════════════════╣[0m
[1;36m║ [1;32mINFORMATIONS[0m                                 [1;36m║[0m
[1;36m║ [0m   👥 Membres     : [1;33m${guild.memberCount}[0m                     [1;36m║[0m
[1;36m║ [0m   ✅ Whitelist   : [1;33m${config.whitelistusers.length}[0m users           [1;36m║[0m
[1;36m║ [0m   🎭 Whitelist   : [1;33m${config.whitelistroles.length}[0m roles           [1;36m║[0m
[1;36m╚════════════════════════════════════════════╝[0m
\`\`\`
> **📌 Préfixe :** ` + PREFIX + ` | **🛡️ Bot v10.0**
> 💡 Utilisez les boutons ci-dessous pour configurer`;

    const embed = new EmbedBuilder()
        .setColor(0x1a1a2e)
        .setTitle('• SECURITY DASHBOARD •')
        .setDescription(content)
        .setFooter({ text: `Serveur : ${guild.name} | Cliquez sur les boutons` })
        .setTimestamp();

    const row1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId('toggle_antiraid').setLabel('Anti-Raid').setStyle(config.antiraid ? ButtonStyle.Success : ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('toggle_antispam').setLabel('Anti-Spam').setStyle(config.antispam ? ButtonStyle.Success : ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('toggle_antiban').setLabel('Anti-Ban').setStyle(config.antiban ? ButtonStyle.Success : ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('toggle_antikick').setLabel('Anti-Kick').setStyle(config.antikick ? ButtonStyle.Success : ButtonStyle.Danger)
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId('punishment_kick').setLabel('⚡ Kick').setStyle(config.punishment === 'kick' ? ButtonStyle.Primary : ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('punishment_ban').setLabel('⛔ Ban').setStyle(config.punishment === 'ban' ? ButtonStyle.Primary : ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('punishment_timeout').setLabel('⏱️ Timeout').setStyle(config.punishment === 'timeout' ? ButtonStyle.Primary : ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('refresh_dashboard').setLabel('🔄 Refresh').setStyle(ButtonStyle.Secondary)
        );

    const row3 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId('btn_logs').setLabel('📁 Logs').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('btn_whitelist').setLabel('✅ Whitelist').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('btn_verify').setLabel('🔐 Verify').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('btn_help').setLabel('❓ Help').setStyle(ButtonStyle.Secondary)
        );

    if (dashboardMessages.has(guild.id)) {
        try {
            const oldMsg = await message.channel.messages.fetch(dashboardMessages.get(guild.id));
            if (oldMsg) await oldMsg.edit({ embeds: [embed], components: [row1, row2, row3] });
        } catch(e) {
            const msg = await message.channel.send({ embeds: [embed], components: [row1, row2, row3] });
            dashboardMessages.set(guild.id, msg.id);
        }
    } else {
        const msg = await message.channel.send({ embeds: [embed], components: [row1, row2, row3] });
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
        'toggle_antikick': 'antikick'
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
        await interaction.reply({ content: '📁 **Configuration des logs**\n\nUtilisez : `>>logchannel #salon`', ephemeral: true });
    } else if (interaction.customId === 'btn_whitelist') {
        await interaction.reply({ content: '✅ **Gestion Whitelist**\n\n`>>whitelist user @user` - Ajouter\n`>>whitelist role @role` - Ajouter rôle\n`>>whitelist list` - Voir la liste', ephemeral: true });
    } else if (interaction.customId === 'btn_verify') {
        await interaction.reply({ content: '🔐 **Vérification**\n\n`>>setupverify` - Activer\n`>>verify` - Se vérifier', ephemeral: true });
    } else if (interaction.customId === 'btn_help') {
        await interaction.reply({ content: '📌 **Commandes disponibles**\n\n`>>dashboard` - Panneau principal\n`>>help` - Aide complète\n`>>stats` - Statistiques\n`>>serverinfo` - Infos serveur\n`>>boss` - Crédits', ephemeral: true });
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

// ========== ÉVÈNEMENTS SÉCURITÉ ==========
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

// ========== COMMANDES ==========
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;
    if (!message.guild) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (!configs.has(message.guild.id)) configs.set(message.guild.id, { ...defaultConfig });
    const config = configs.get(message.guild.id);

    // ---------- DASHBOARD ----------
    if (command === 'dashboard' || command === 'panel') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('❌ Tu dois être **administrateur** pour accéder au dashboard.');
        }
        await updateDashboard(message, config, message.guild);
        return;
    }

    // ---------- HELP ----------
    if (command === 'help') {
        const content = `\`\`\`ansi
[1;36m╔════════════════════════════════════════════╗[0m
[1;36m║         [1;33m📋 CENTRE DE COMMANDES [1;36m             ║[0m
[1;36m╠════════════════════════════════════════════╣[0m
[1;36m║ [1;32m🚀 DASHBOARD[0m                                [1;36m║[0m
[1;36m║ [0m   [1;36m>>dashboard[0m  - Panneau de contrôle     [1;36m║[0m
[1;36m║ [0m   [1;36m>>stats[0m      - Statistiques           [1;36m║[0m
[1;36m║ [0m   [1;36m>>serverinfo[0m - Infos du serveur       [1;36m║[0m
[1;36m╠════════════════════════════════════════════╣[0m
[1;36m║ [1;32m⚙️ CONFIGURATION[0m                           [1;36m║[0m
[1;36m║ [0m   [1;36m>>set threshold [n][0m - Seuil anti-raid [1;36m║[0m
[1;36m║ [0m   [1;36m>>logchannel #salon[0m - Salon des logs [1;36m║[0m
[1;36m║ [0m   [1;36m>>whitelist[0m      - Gérer whitelist   [1;36m║[0m
[1;36m║ [0m   [1;36m>>setupverify[0m   - Vérification       [1;36m║[0m
[1;36m╠════════════════════════════════════════════╣[0m
[1;36m║ [1;32m👑 AUTRES[0m                                  [1;36m║[0m
[1;36m║ [0m   [1;36m>>boss[0m       - Crédits du bot        [1;36m║[0m
[1;36m║ [0m   [1;36m>>verify[0m     - Se vérifier          [1;36m║[0m
[1;36m║ [0m   [1;36m>>help[0m       - Cette aide          [1;36m║[0m
[1;36m╚════════════════════════════════════════════╝[0m
\`\`\`
> **📌 Préfixe :** ` + PREFIX + ` | **🛡️ Protection 24/7**
> 💡 Utilisez \`>>dashboard\` pour le panneau interactif`;

        const embed = new EmbedBuilder()
            .setColor(0x1a1a2e)
            .setTitle('• SECURITY BOT •')
            .setDescription(content)
            .setFooter({ text: '🛡️ Créé par vctr_on • Version 10.0' })
            .setTimestamp();
        
        return message.channel.send({ embeds: [embed] });
    }

    // ---------- STATS ----------
    if (command === 'stats') {
        const content = `\`\`\`ansi
[1;36m╔════════════════════════════════════════════╗[0m
[1;36m║         [1;33m📊 STATISTIQUES [1;36m                  ║[0m
[1;36m╠════════════════════════════════════════════╣[0m
[1;36m║ [1;32m📈 INFORMATIONS[0m                           [1;36m║[0m
[1;36m║ [0m   👥 Membres      : [1;33m${message.guild.memberCount}[0m                 [1;36m║[0m
[1;36m║ [0m   ✅ Whitelist    : [1;33m${config.whitelistusers.length}[0m users          [1;36m║[0m
[1;36m║ [0m   🎭 Whitelist    : [1;33m${config.whitelistroles.length}[0m roles          [1;36m║[0m
[1;36m╠════════════════════════════════════════════╣[0m
[1;36m║ [1;32m⚙️ CONFIGURATION[0m                           [1;36m║[0m
[1;36m║ [0m   🔨 Sanction     : [1;33m${config.punishment.toUpperCase()}[0m               [1;36m║[0m
[1;36m║ [0m   👥 Seuil Raid   : [1;33m${config.raidthreshold}[0m membres            [1;36m║[0m
[1;36m║ [0m   💬 Seuil Spam   : [1;33m${config.spamthreshold}[0m messages          [1;36m║[0m
[1;36m║ [0m   🔔 Mentions max : [1;33m${config.antimentionslimit}[0m                 [1;36m║[0m
[1;36m╚════════════════════════════════════════════╝[0m
\`\`\``;
        const embed = createResponsiveEmbed('📊 STATISTIQUES', content);
        return message.channel.send({ embeds: [embed] });
    }

    // ---------- SERVERINFO ----------
    if (command === 'serverinfo') {
        const content = `\`\`\`ansi
[1;36m╔════════════════════════════════════════════╗[0m
[1;36m║         [1;33m📡 INFOS SERVEUR [1;36m                  ║[0m
[1;36m╠════════════════════════════════════════════╣[0m
[1;36m║ [0m   👑 Propriétaire : [1;33m${message.guild.members.cache.get(message.guild.ownerId)?.user?.tag || 'Inconnu'}[0m  [1;36m║[0m
[1;36m║ [0m   👥 Membres       : [1;33m${message.guild.memberCount}[0m                 [1;36m║[0m
[1;36m║ [0m   💬 Salons texte  : [1;33m${message.guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size}[0m                 [1;36m║[0m
[1;36m║ [0m   🔊 Salons vocaux : [1;33m${message.guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size}[0m                 [1;36m║[0m
[1;36m║ [0m   🎭 Rôles         : [1;33m${message.guild.roles.cache.size}[0m                    [1;36m║[0m
[1;36m║ [0m   📅 Création      : [1;33m${Math.floor((Date.now() - message.guild.createdTimestamp) / 86400000)}[0m jours          [1;36m║[0m
[1;36m╚════════════════════════════════════════════╝[0m
\`\`\`
> 🛡️ **Protection activée :** ✅`;
        const embed = createResponsiveEmbed(`📡 ${message.guild.name}`, content);
        embed.setThumbnail(message.guild.iconURL());
        return message.channel.send({ embeds: [embed] });
    }

    // ---------- BOSS ----------
    if (command === 'boss') {
        const content = `\`\`\`ansi
[1;36m╔════════════════════════════════════════════╗[0m
[1;36m║         [1;33m👑 MADE BY VCTR_ON [1;36m                ║[0m
[1;36m╠════════════════════════════════════════════╣[0m
[1;36m║ [0m   ⭐ Créé par : [1;33mvctr_on[0m                       [1;36m║[0m
[1;36m║ [0m   🚀 Version   : [1;33m10.0 - Ultimate[0m              [1;36m║[0m
[1;36m║ [0m   🛡️ Type      : [1;33mAnti-Nuke & Anti-Raid[0m       [1;36m║[0m
[1;36m║ [0m   💜 Uptime    : [1;33m24/7 - Toujours actif[0m        [1;36m║[0m
[1;36m╠════════════════════════════════════════════╣[0m
[1;36m║ [1;32m📌 COMMANDES[0m                                 [1;36m║[0m
[1;36m║ [0m   [1;36m>>help[0m      - Aide complète           [1;36m║[0m
[1;36m║ [0m   [1;36m>>dashboard[0m  - Panneau de contrôle     [1;36m║[0m
[1;36m╚════════════════════════════════════════════╝[0m
\`\`\`
> 🔒 **Protection maximale activée**`;
        const embed = createResponsiveEmbed('👑 CRÉDITS', content, 0xFF0000);
        return message.channel.send({ embeds: [embed] });
    }

    // ---------- SETUPVERIFY ----------
    if (command === 'setupverify' && message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        config.verification = true;
        configs.set(message.guild.id, config);
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('✅ VÉRIFICATION ACTIVÉE')
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
            .setTitle('✅ VÉRIFICATION RÉUSSIE')
            .setDescription('Bienvenue sur le serveur ! 🎉')
            .setTimestamp();
        return message.reply({ embeds: [embed] });
    }

    // ---------- SET THRESHOLD ----------
    if (command === 'set' && args[0] === 'threshold' && message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        const value = parseInt(args[1]);
        if (isNaN(value) || value < 2 || value > 20) return message.reply('❌ Seuil entre **2** et **20** arrivées');
        config.raidthreshold = value;
        configs.set(message.guild.id, config);
        message.reply(`✅ Seuil anti-raid défini sur **${value}** arrivées en 10 secondes`);
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
                .setColor(0x1a1a2e)
                .setTitle('✅ LISTE WHITELIST')
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

// ========== SERVEUR WEB ==========
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('🛡️ Bot de sécurité en ligne !'));
app.listen(port, () => console.log(`✅ Keep-alive sur port ${port}`));

client.login(TOKEN);