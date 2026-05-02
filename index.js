const { Client, GatewayIntentBits, EmbedBuilder, ActivityType, PermissionsBitField, ChannelType, Collection, AuditLogEvent, ActionRowBuilder, ButtonBuilder, ButtonStyle, REST, Routes } = require('discord.js');
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
let voiceLocks = new Collection();
let permanentVoice = new Collection();

// Configuration par défaut
const defaultConfig = {
    antiraid: true, antispam: true, antiban: true, antikick: true,
    antichanneldelete: true, antiroledelete: true, antimentions: true,
    antiserverrename: true, antiservericon: true, antimentionslimit: 5,
    raidthreshold: 5, spamthreshold: 5, punishment: 'timeout',
    logchannel: null, verification: false, whitelistusers: [], whitelistroles: [],
    permanentVoiceChannel: null
};

// ========== COMMANDES SLASH ==========
const commands = [
    { name: 'help', description: '📋 Afficher toutes les commandes' },
    { name: 'stats', description: '📊 Statistiques du serveur' },
    { name: 'serverinfo', description: 'ℹ️ Informations du serveur' },
    { name: 'boss', description: '👑 Crédits du bot' },
    { name: 'verify', description: '✅ Se vérifier sur le serveur' },
    { name: 'kick', description: '👢 Expulser un membre', options: [{ name: 'user', type: 6, description: 'Membre à expulser', required: true }, { name: 'reason', type: 3, description: 'Raison', required: false }] },
    { name: 'ban', description: '🔨 Bannir un membre', options: [{ name: 'user', type: 6, description: 'Membre à bannir', required: true }, { name: 'reason', type: 3, description: 'Raison', required: false }] },
    { name: 'timeout', description: '⏱️ Timeout un membre', options: [{ name: 'user', type: 6, description: 'Membre', required: true }, { name: 'minutes', type: 4, description: 'Minutes (1-40320)', required: true }, { name: 'reason', type: 3, description: 'Raison', required: false }] },
    { name: 'clear', description: '🗑️ Supprimer des messages', options: [{ name: 'amount', type: 4, description: 'Nombre (1-100)', required: true }] },
    { name: 'setvoice', description: '🔊 Définir le salon vocal permanent du bot', options: [{ name: 'channel', type: 7, description: 'Salon vocal', required: true }] }
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

// ========== FONCTION LOGS ==========
async function sendLog(guildId, action, target, moderator, reason) {
    const config = configs.get(guildId) || defaultConfig;
    if (!config.logchannel) return;
    const channel = client.channels.cache.get(config.logchannel);
    if (!channel) return;
    const embed = new EmbedBuilder()
        .setColor(0x1a1a2e)
        .setAuthor({ name: `〢・${action}`, iconURL: client.user.displayAvatarURL() })
        .setDescription(`**👤 Cible :** ${target}\n**🛡️ Modérateur :** ${moderator}\n**📝 Raison :** ${reason || 'Aucune'}\n**⏰ Date :** <t:${Math.floor(Date.now() / 1000)}:F>`)
        .setFooter({ text: `ID: ${target.id || target}` })
        .setTimestamp();
    await channel.send({ embeds: [embed] });
}

// ========== FONCTION DASHBOARD RESPONSIVE ==========
async function sendDashboard(message, config, guild) {
    const embed = new EmbedBuilder()
        .setColor(0x1a1a2e)
        .setAuthor({ name: '🛡️ DASHBOARD', iconURL: guild.iconURL() })
        .setDescription(`
**〢 STATISTIQUES**
‣ 👥 **Membres** : ${guild.memberCount}
‣ ✅ **Whitelist utilisateurs** : ${config.whitelistusers.length}
‣ 🎭 **Whitelist rôles** : ${config.whitelistroles.length}

**〢 CONFIGURATION**
‣ 🔨 **Sanction** : ${config.punishment.toUpperCase()}
‣ 👥 **Seuil Raid** : ${config.raidthreshold} membres / 10s
‣ 💬 **Seuil Spam** : ${config.spamthreshold} messages / 5s
‣ 🔔 **Mentions max** : ${config.antimentionslimit}

**〢 PROTECTIONS**
‣ ${config.antiraid ? '✅' : '❌'} **Anti-Raid**    ${config.antispam ? '✅' : '❌'} **Anti-Spam**
‣ ${config.antiban ? '✅' : '❌'} **Anti-Ban**     ${config.antikick ? '✅' : '❌'} **Anti-Kick**
‣ ${config.antimentions ? '✅' : '❌'} **Anti-Mentions**
‣ ${config.antichanneldelete ? '✅' : '❌'} **Anti-Channel**
‣ ${config.antiroledelete ? '✅' : '❌'} **Anti-Role**

**〢 VOCAL LOCK**
‣ ${config.permanentVoiceChannel ? `🔒 Salon permanent : <#${config.permanentVoiceChannel}>` : '🔓 Aucun salon défini'}
‣ ${voiceLocks.has(guild.id) ? `🔒 Verrouillé dans <#${voiceLocks.get(guild.id)}>` : '🔓 Aucun verrouillage'}

**〢 STATUT BOT**
‣ ${client.user.presence?.status === 'online' ? '🟢 En ligne' : '🔴 Hors ligne'}
‣ 📌 **Préfixe** : \`${PREFIX}\`
‣ 🤖 **Commandes slash** : \`/help\`
        `)
        .setFooter({ text: `Cliquez sur les boutons • ${guild.name}` })
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
            new ButtonBuilder().setCustomId('punishment_kick').setLabel('Kick').setStyle(config.punishment === 'kick' ? ButtonStyle.Primary : ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('punishment_ban').setLabel('Ban').setStyle(config.punishment === 'ban' ? ButtonStyle.Primary : ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('punishment_timeout').setLabel('Timeout').setStyle(config.punishment === 'timeout' ? ButtonStyle.Primary : ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('refresh_dashboard').setLabel('Refresh').setStyle(ButtonStyle.Secondary)
        );

    const row3 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId('btn_logs').setLabel('📁 Logs').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('btn_whitelist').setLabel('✅ Whitelist').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('btn_verify').setLabel('🔐 Verify').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('btn_voice').setLabel('🔊 Voice').setStyle(ButtonStyle.Secondary)
        );

    if (message.channel) {
        await message.channel.send({ embeds: [embed], components: [row1, row2, row3] });
    }
}

// ========== FONCTION POUR RESTER EN VOCAL 24/7 ==========
async function joinPermanentVoice(guildId) {
    const config = configs.get(guildId) || defaultConfig;
    if (!config.permanentVoiceChannel) return;
    
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return;
    
    const channel = guild.channels.cache.get(config.permanentVoiceChannel);
    if (!channel || channel.type !== ChannelType.GuildVoice) return;
    
    const existingConnection = guild.members.me.voice.channel;
    if (existingConnection?.id === config.permanentVoiceChannel) return;
    
    try {
        await channel.join();
        console.log(`🔊 Bot connecté dans ${channel.name} (${guild.name})`);
        await sendLog(guildId, 'voice_connect', channel, 'System', 'Bot connecté 24/7');
    } catch (error) {
        console.error(`❌ Impossible de rejoindre ${channel.name}:`, error);
    }
}

// ========== VÉRIFICATION PÉRIODIQUE DU SALON VOCAL ==========
setInterval(async () => {
    for (const [guildId, config] of configs) {
        if (config.permanentVoiceChannel) {
            const guild = client.guilds.cache.get(guildId);
            if (guild) {
                const member = guild.members.me;
                const targetChannel = guild.channels.cache.get(config.permanentVoiceChannel);
                if (targetChannel && (!member.voice.channel || member.voice.channel.id !== config.permanentVoiceChannel)) {
                    await joinPermanentVoice(guildId);
                }
            }
        }
    }
}, 60000); // Vérification toutes les minutes

// ========== BOT PRÊT ==========
client.once('ready', async () => {
    console.log(`✅ ${client.user.tag} est en ligne !`);
    console.log(`🛡️ ${client.guilds.cache.size} serveurs protégés`);
    client.user.setActivity(`🛡️ ${PREFIX}help`, { type: ActivityType.Watching });
    
    // Rejoindre les salons vocaux permanents au démarrage
    for (const [guildId, config] of configs) {
        if (config.permanentVoiceChannel) {
            await joinPermanentVoice(guildId);
        }
    }
});

// ========== COMMANDES SLASH ==========
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (!interaction.guild) return;

    if (!configs.has(interaction.guild.id)) configs.set(interaction.guild.id, { ...defaultConfig });
    const config = configs.get(interaction.guild.id);

    // HELP
    if (interaction.commandName === 'help') {
        const embed = new EmbedBuilder()
            .setColor(0x1a1a2e)
            .setAuthor({ name: '🛡️ ANTI CHEAT APP', iconURL: client.user.displayAvatarURL() })
            .setDescription(`
**〢 COMMANDES DISPONIBLES**

**🎮 DASHBOARD**
‣ /dashboard - Panneau de contrôle
‣ /stats - Statistiques
‣ /serverinfo - Infos serveur

**⚙️ MODÉRATION**
‣ /kick - Expulser
‣ /ban - Bannir
‣ /timeout - Timeout
‣ /clear - Supprimer messages

**🔊 VOCAL**
‣ /setvoice - Définir salon vocal permanent

**👑 AUTRES**
‣ /boss - Crédits
‣ /verify - Se vérifier

**📌 PRÉFIXE**
‣ ${PREFIX}dashboard - Panneau interactif
‣ ${PREFIX}help - Cette aide
            `)
            .setFooter({ text: '🛡️ Protection 24/7 • vctr_on' })
            .setTimestamp();
        return interaction.reply({ embeds: [embed], ephemeral: false });
    }

    // DASHBOARD SLASH
    if (interaction.commandName === 'dashboard') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: '❌ Administrateur requis', ephemeral: true });
        }
        await sendDashboard(interaction, config, interaction.guild);
        return interaction.reply({ content: '✅ Dashboard envoyé !', ephemeral: true });
    }

    // STATS
    if (interaction.commandName === 'stats') {
        const embed = new EmbedBuilder()
            .setColor(0x1a1a2e)
            .setAuthor({ name: '📊 STATISTIQUES', iconURL: interaction.guild.iconURL() })
            .setDescription(`
**〢 INFORMATIONS**
‣ 👥 **Membres** : ${interaction.guild.memberCount}
‣ ✅ **Whitelist users** : ${config.whitelistusers.length}
‣ 🎭 **Whitelist rôles** : ${config.whitelistroles.length}

**〢 CONFIGURATION**
‣ 🔨 **Sanction** : ${config.punishment.toUpperCase()}
‣ 👥 **Seuil Raid** : ${config.raidthreshold} membres/10s
‣ 💬 **Seuil Spam** : ${config.spamthreshold} messages/5s
‣ 🔔 **Mentions max** : ${config.antimentionslimit}
            `)
            .setFooter({ text: '🛡️ Protection 24/7' })
            .setTimestamp();
        return interaction.reply({ embeds: [embed], ephemeral: false });
    }

    // SERVERINFO
    if (interaction.commandName === 'serverinfo') {
        const embed = new EmbedBuilder()
            .setColor(0x1a1a2e)
            .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL() })
            .setThumbnail(interaction.guild.iconURL())
            .setDescription(`
**〢 INFORMATIONS**
‣ 👑 **Propriétaire** : <@${interaction.guild.ownerId}>
‣ 👥 **Membres** : ${interaction.guild.memberCount}
‣ 💬 **Salons** : ${interaction.guild.channels.cache.size}
‣ 📅 **Création** : <t:${Math.floor(interaction.guild.createdTimestamp / 1000)}:R>
‣ 🛡️ **Protection** : Activée
            `)
            .setFooter({ text: `ID: ${interaction.guild.id}` })
            .setTimestamp();
        return interaction.reply({ embeds: [embed], ephemeral: false });
    }

    // BOSS
    if (interaction.commandName === 'boss') {
        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setAuthor({ name: '👑 MADE BY VCTR_ON', iconURL: client.user.displayAvatarURL() })
            .setDescription(`
**〢 BOT DE SÉCURITÉ ULTIME**
‣ ⭐ Créé par **vctr_on**
‣ 🚀 Version **10.0** - Ultimate
‣ 🛡️ **Anti-Nuke & Anti-Raid**
‣ 💜 **24/7** - Toujours actif
‣ 📌 **${PREFIX}help** pour les commandes
            `)
            .setFooter({ text: '🛡️ Protection maximale' })
            .setTimestamp();
        return interaction.reply({ embeds: [embed], ephemeral: false });
    }

    // VERIFY
    if (interaction.commandName === 'verify') {
        if (!config.verification) return interaction.reply({ content: '❌ Vérification non activée', ephemeral: true });
        if (verificationCache.has(interaction.user.id)) return interaction.reply({ content: '❌ Déjà vérifié', ephemeral: true });
        verificationCache.set(interaction.user.id, true);
        await sendLog(interaction.guild.id, 'verify', interaction.user, 'System', 'Vérification réussie');
        const embed = new EmbedBuilder().setColor(0x00FF00).setDescription('✅ **Vérification réussie**\n\nBienvenue sur le serveur ! 🎉').setTimestamp();
        return interaction.reply({ embeds: [embed], ephemeral: false });
    }

    // SETVOICE (Salon vocal permanent 24/7)
    if (interaction.commandName === 'setvoice') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: '❌ Administrateur requis', ephemeral: true });
        }
        const channel = interaction.options.getChannel('channel');
        if (channel.type !== ChannelType.GuildVoice) {
            return interaction.reply({ content: '❌ Ce n\'est pas un salon vocal', ephemeral: true });
        }
        
        config.permanentVoiceChannel = channel.id;
        configs.set(interaction.guild.id, config);
        await joinPermanentVoice(interaction.guild.id);
        await sendLog(interaction.guild.id, 'setvoice', channel, interaction.user.tag, 'Salon vocal permanent défini');
        
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setDescription(`🔊 **Salon vocal permanent défini**\n\nLe bot va rester 24/7 dans ${channel}\n\nUtilisez \`${PREFIX}removevoice\` pour supprimer.`)
            .setTimestamp();
        interaction.reply({ embeds: [embed], ephemeral: false });
    }

    // KICK, BAN, TIMEOUT, CLEAR (communes)
    if (interaction.commandName === 'kick') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers)) return interaction.reply({ content: '❌ Permission manquante', ephemeral: true });
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'Aucune raison';
        const member = interaction.guild.members.cache.get(user.id);
        if (!member || !member.kickable) return interaction.reply({ content: '❌ Impossible de kick', ephemeral: true });
        await member.kick(reason);
        await sendLog(interaction.guild.id, 'kick', user, interaction.user.tag, reason);
        interaction.reply({ content: `✅ ${user.tag} a été kické\n📝 Raison : ${reason}`, ephemeral: false });
    }

    if (interaction.commandName === 'ban') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) return interaction.reply({ content: '❌ Permission manquante', ephemeral: true });
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'Aucune raison';
        const member = interaction.guild.members.cache.get(user.id);
        if (!member || !member.bannable) return interaction.reply({ content: '❌ Impossible de ban', ephemeral: true });
        await member.ban({ reason });
        await sendLog(interaction.guild.id, 'ban', user, interaction.user.tag, reason);
        interaction.reply({ content: `✅ ${user.tag} a été banni\n📝 Raison : ${reason}`, ephemeral: false });
    }

    if (interaction.commandName === 'timeout') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return interaction.reply({ content: '❌ Permission manquante', ephemeral: true });
        const user = interaction.options.getUser('user');
        const minutes = interaction.options.getInteger('minutes');
        const reason = interaction.options.getString('reason') || 'Aucune raison';
        const member = interaction.guild.members.cache.get(user.id);
        if (!member) return interaction.reply({ content: '❌ Utilisateur introuvable', ephemeral: true });
        const duration = minutes * 60 * 1000;
        await member.timeout(duration, reason);
        await sendLog(interaction.guild.id, 'timeout', user, interaction.user.tag, `${minutes} minutes - ${reason}`);
        interaction.reply({ content: `✅ ${user.tag} timeout pour ${minutes} minutes\n📝 Raison : ${reason}`, ephemeral: false });
    }

    if (interaction.commandName === 'clear') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return interaction.reply({ content: '❌ Permission manquante', ephemeral: true });
        const amount = interaction.options.getInteger('amount');
        if (amount < 1 || amount > 100) return interaction.reply({ content: '❌ Nombre entre 1 et 100', ephemeral: true });
        const deleted = await interaction.channel.bulkDelete(amount, true);
        await sendLog(interaction.guild.id, 'clear', `${deleted.size} messages`, interaction.user.tag, `Salon: ${interaction.channel.name}`);
        interaction.reply({ content: `✅ ${deleted.size} messages supprimés`, ephemeral: true });
    }
});

// ========== COMMANDES PRÉFIXE ==========
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;
    if (!message.guild) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (!configs.has(message.guild.id)) configs.set(message.guild.id, { ...defaultConfig });
    const config = configs.get(message.guild.id);

    // HELP
    if (command === 'help') {
        const embed = new EmbedBuilder()
            .setColor(0x1a1a2e)
            .setAuthor({ name: '🛡️ ANTI CHEAT APP', iconURL: client.user.displayAvatarURL() })
            .setDescription(`
**〢 COMMANDES DISPONIBLES**

**🎮 DASHBOARD**
‣ ${PREFIX}dashboard - Panneau de contrôle
‣ ${PREFIX}stats - Statistiques
‣ ${PREFIX}serverinfo - Infos serveur

**⚙️ MODÉRATION**
‣ ${PREFIX}kick @user <raison> - Expulser
‣ ${PREFIX}ban @user <raison> - Bannir
‣ ${PREFIX}timeout @user <minutes> <raison> - Timeout
‣ ${PREFIX}clear <1-100> - Supprimer messages

**🔊 VOCAL**
‣ ${PREFIX}setvoice #salon - Définir salon vocal permanent 24/7
‣ ${PREFIX}removevoice - Supprimer le salon vocal permanent

**🔧 CONFIGURATION**
‣ ${PREFIX}set threshold <n> - Seuil anti-raid
‣ ${PREFIX}logchannel #salon - Salon des logs
‣ ${PREFIX}whitelist user/@user - Gérer whitelist
‣ ${PREFIX}setupverify - Activer vérification

**👑 AUTRES**
‣ ${PREFIX}boss - Crédits
‣ ${PREFIX}verify - Se vérifier
            `)
            .setFooter({ text: '🛡️ Protection 24/7 • vctr_on' })
            .setTimestamp();
        return message.channel.send({ embeds: [embed] });
    }

    // DASHBOARD
    if (command === 'dashboard') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('❌ Administrateur requis');
        }
        await sendDashboard(message, config, message.guild);
    }

    // STATS
    if (command === 'stats') {
        const embed = new EmbedBuilder()
            .setColor(0x1a1a2e)
            .setAuthor({ name: '📊 STATISTIQUES', iconURL: message.guild.iconURL() })
            .setDescription(`
**〢 INFORMATIONS**
‣ 👥 **Membres** : ${message.guild.memberCount}
‣ ✅ **Whitelist users** : ${config.whitelistusers.length}
‣ 🎭 **Whitelist rôles** : ${config.whitelistroles.length}

**〢 CONFIGURATION**
‣ 🔨 **Sanction** : ${config.punishment.toUpperCase()}
‣ 👥 **Seuil Raid** : ${config.raidthreshold} membres/10s
‣ 💬 **Seuil Spam** : ${config.spamthreshold} messages/5s
‣ 🔔 **Mentions max** : ${config.antimentionslimit}
            `)
            .setFooter({ text: '🛡️ Protection 24/7' })
            .setTimestamp();
        return message.channel.send({ embeds: [embed] });
    }

    // SERVERINFO
    if (command === 'serverinfo') {
        const embed = new EmbedBuilder()
            .setColor(0x1a1a2e)
            .setAuthor({ name: message.guild.name, iconURL: message.guild.iconURL() })
            .setThumbnail(message.guild.iconURL())
            .setDescription(`
**〢 INFORMATIONS**
‣ 👑 **Propriétaire** : <@${message.guild.ownerId}>
‣ 👥 **Membres** : ${message.guild.memberCount}
‣ 💬 **Salons** : ${message.guild.channels.cache.size}
‣ 📅 **Création** : <t:${Math.floor(message.guild.createdTimestamp / 1000)}:R>
‣ 🛡️ **Protection** : Activée
            `)
            .setFooter({ text: `ID: ${message.guild.id}` })
            .setTimestamp();
        return message.channel.send({ embeds: [embed] });
    }

    // BOSS
    if (command === 'boss') {
        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setAuthor({ name: '👑 MADE BY VCTR_ON', iconURL: client.user.displayAvatarURL() })
            .setDescription(`
**〢 BOT DE SÉCURITÉ ULTIME**
‣ ⭐ Créé par **vctr_on**
‣ 🚀 Version **10.0** - Ultimate
‣ 🛡️ **Anti-Nuke & Anti-Raid**
‣ 💜 **24/7** - Toujours actif
‣ 📌 **${PREFIX}help** pour les commandes
            `)
            .setFooter({ text: '🛡️ Protection maximale' })
            .setTimestamp();
        return message.channel.send({ embeds: [embed] });
    }

    // SETVOICE (Salon vocal permanent 24/7)
    if (command === 'setvoice' && message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        const channel = message.mentions.channels.first();
        if (!channel || channel.type !== ChannelType.GuildVoice) {
            return message.reply('❌ Mentionne un salon vocal valide');
        }
        config.permanentVoiceChannel = channel.id;
        configs.set(message.guild.id, config);
        await joinPermanentVoice(message.guild.id);
        await sendLog(message.guild.id, 'setvoice', channel, message.author.tag, 'Salon vocal permanent défini');
        
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setDescription(`🔊 **Salon vocal permanent défini**\n\nLe bot va rester 24/7 dans ${channel}\n\nUtilisez \`${PREFIX}removevoice\` pour supprimer.`)
            .setTimestamp();
        return message.channel.send({ embeds: [embed] });
    }

    // REMOVEVOICE
    if (command === 'removevoice' && message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        config.permanentVoiceChannel = null;
        configs.set(message.guild.id, config);
        
        if (message.guild.members.me.voice.channel) {
            await message.guild.members.me.voice.disconnect();
        }
        
        await sendLog(message.guild.id, 'removevoice', 'System', message.author.tag, 'Salon vocal permanent supprimé');
        
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setDescription('🔊 **Salon vocal permanent supprimé**\n\nLe bot ne reste plus connecté automatiquement.')
            .setTimestamp();
        return message.channel.send({ embeds: [embed] });
    }

    // AUTRES COMMANDES (kick, ban, timeout, clear, setupverify, verify, set, logchannel, whitelist)
    if (command === 'kick' && message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
        const user = message.mentions.users.first();
        if (!user) return message.reply('❌ Mentionne un utilisateur');
        const reason = args.slice(1).join(' ') || 'Aucune raison';
        const member = message.guild.members.cache.get(user.id);
        if (!member || !member.kickable) return message.reply('❌ Impossible de kick');
        await member.kick(reason);
        await sendLog(message.guild.id, 'kick', user, message.author.tag, reason);
        message.reply(`✅ ${user.tag} a été kické\n📝 Raison : ${reason}`);
    }

    if (command === 'ban' && message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
        const user = message.mentions.users.first();
        if (!user) return message.reply('❌ Mentionne un utilisateur');
        const reason = args.slice(1).join(' ') || 'Aucune raison';
        const member = message.guild.members.cache.get(user.id);
        if (!member || !member.bannable) return message.reply('❌ Impossible de ban');
        await member.ban({ reason });
        await sendLog(message.guild.id, 'ban', user, message.author.tag, reason);
        message.reply(`✅ ${user.tag} a été banni\n📝 Raison : ${reason}`);
    }

    if (command === 'timeout' && message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
        const user = message.mentions.users.first();
        if (!user) return message.reply('❌ Mentionne un utilisateur');
        const minutes = parseInt(args[1]);
        if (isNaN(minutes) || minutes < 1 || minutes > 40320) return message.reply('❌ Minutes entre 1 et 40320');
        const reason = args.slice(2).join(' ') || 'Aucune raison';
        const member = message.guild.members.cache.get(user.id);
        if (!member) return message.reply('❌ Utilisateur introuvable');
        const duration = minutes * 60 * 1000;
        await member.timeout(duration, reason);
        await sendLog(message.guild.id, 'timeout', user, message.author.tag, `${minutes} minutes - ${reason}`);
        message.reply(`✅ ${user.tag} timeout pour ${minutes} minutes\n📝 Raison : ${reason}`);
    }

    if (command === 'clear' && message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
        const amount = parseInt(args[0]);
        if (isNaN(amount) || amount < 1 || amount > 100) return message.reply('❌ Nombre entre 1 et 100');
        const deleted = await message.channel.bulkDelete(amount, true);
        await sendLog(message.guild.id, 'clear', `${deleted.size} messages`, message.author.tag, `Salon: ${message.channel.name}`);
        const msg = await message.channel.send(`✅ ${deleted.size} messages supprimés`);
        setTimeout(() => msg.delete(), 3000);
    }

    if (command === 'setupverify' && message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        config.verification = true;
        configs.set(message.guild.id, config);
        const embed = new EmbedBuilder().setColor(0x00FF00).setDescription(`✅ **Vérification activée**\n\nLes nouveaux membres devront taper \`${PREFIX}verify\``).setTimestamp();
        return message.channel.send({ embeds: [embed] });
    }

    if (command === 'verify') {
        if (!config.verification) return message.reply('❌ Vérification non activée');
        if (verificationCache.has(message.author.id)) return message.reply('❌ Déjà vérifié');
        verificationCache.set(message.author.id, true);
        await sendLog(message.guild.id, 'verify', message.author, 'System', 'Vérification réussie');
        const embed = new EmbedBuilder().setColor(0x00FF00).setDescription('✅ **Vérification réussie**\n\nBienvenue sur le serveur ! 🎉').setTimestamp();
        return message.reply({ embeds: [embed] });
    }

    if (command === 'set' && args[0] === 'threshold' && message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        const value = parseInt(args[1]);
        if (isNaN(value) || value < 2 || value > 20) return message.reply('❌ Seuil entre **2** et **20**');
        config.raidthreshold = value;
        configs.set(message.guild.id, config);
        message.reply(`✅ Seuil anti-raid : **${value}** membres/10s`);
    }

    if (command === 'logchannel' && message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        const channel = message.mentions.channels.first();
        if (channel) {
            config.logchannel = channel.id;
            configs.set(message.guild.id, config);
            message.reply(`✅ Logs → ${channel}`);
            await sendLog(message.guild.id, 'logchannel', channel, message.author.tag, 'Salon des logs configuré');
        } else {
            config.logchannel = null;
            configs.set(message.guild.id, config);
            message.reply(`❌ Logs désactivés`);
        }
    }

    if (command === 'whitelist' && message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        const type = args[0];
        if (type === 'list') {
            const users = config.whitelistusers.map(id => `<@${id}>`).join(', ') || 'Aucun';
            const roles = config.whitelistroles.map(id => `<@&${id}>`).join(', ') || 'Aucun';
            const embed = new EmbedBuilder().setColor(0x1a1a2e).setTitle('✅ WHITELIST').addFields({ name: '〢・Utilisateurs', value: users }, { name: '〢・Rôles', value: roles }).setTimestamp();
            return message.channel.send({ embeds: [embed] });
        }
        const target = message.mentions.users.first() || message.mentions.roles.first();
        if (!target) return message.reply('❌ Mentionne un utilisateur ou un rôle');
        if (type === 'user') {
            if (config.whitelistusers.includes(target.id)) {
                config.whitelistusers = config.whitelistusers.filter(id => id !== target.id);
                message.reply(`✅ ${target.tag} retiré`);
                await sendLog(message.guild.id, 'whitelist_remove', target, message.author.tag, 'Utilisateur retiré');
            } else {
                config.whitelistusers.push(target.id);
                message.reply(`✅ ${target.tag} ajouté`);
                await sendLog(message.guild.id, 'whitelist_add', target, message.author.tag, 'Utilisateur ajouté');
            }
        } else if (type === 'role') {
            if (config.whitelistroles.includes(target.id)) {
                config.whitelistroles = config.whitelistroles.filter(id => id !== target.id);
                message.reply(`✅ ${target.name} retiré`);
                await sendLog(message.guild.id, 'whitelist_remove', target, message.author.tag, 'Rôle retiré');
            } else {
                config.whitelistroles.push(target.id);
                message.reply(`✅ ${target.name} ajouté`);
                await sendLog(message.guild.id, 'whitelist_add', target, message.author.tag, 'Rôle ajouté');
            }
        }
        configs.set(message.guild.id, config);
    }
});

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
        await interaction.reply({ content: `✅ ${key} ${config[key] ? 'activé' : 'désactivé'}`, ephemeral: true });
        await sendLog(interaction.guild.id, key, interaction.user, interaction.user.tag, `${config[key] ? 'Activé' : 'Désactivé'}`);
        return;
    }

    if (interaction.customId === 'punishment_kick') {
        config.punishment = 'kick';
        configs.set(interaction.guild.id, config);
        await interaction.reply({ content: '✅ Sanction : **Kick**', ephemeral: true });
        await sendLog(interaction.guild.id, 'punishment', interaction.user, interaction.user.tag, 'Sanction changée pour Kick');
    } else if (interaction.customId === 'punishment_ban') {
        config.punishment = 'ban';
        configs.set(interaction.guild.id, config);
        await interaction.reply({ content: '✅ Sanction : **Ban**', ephemeral: true });
        await sendLog(interaction.guild.id, 'punishment', interaction.user, interaction.user.tag, 'Sanction changée pour Ban');
    } else if (interaction.customId === 'punishment_timeout') {
        config.punishment = 'timeout';
        configs.set(interaction.guild.id, config);
        await interaction.reply({ content: '✅ Sanction : **Timeout**', ephemeral: true });
        await sendLog(interaction.guild.id, 'punishment', interaction.user, interaction.user.tag, 'Sanction changée pour Timeout');
    } else if (interaction.customId === 'refresh_dashboard') {
        await interaction.reply({ content: '🔄 Rafraîchi', ephemeral: true });
    } else if (interaction.customId === 'btn_logs') {
        await interaction.reply({ content: '📁 Utilisez `>>logchannel #salon`', ephemeral: true });
    } else if (interaction.customId === 'btn_whitelist') {
        await interaction.reply({ content: '✅ `>>whitelist user/@user`\n📋 `>>whitelist list`', ephemeral: true });
    } else if (interaction.customId === 'btn_verify') {
        await interaction.reply({ content: '🔐 `>>setupverify` - Activer\n✅ `>>verify` - Se vérifier', ephemeral: true });
    } else if (interaction.customId === 'btn_voice') {
        await interaction.reply({ content: '🔊 **Commandes vocales**\n\n`>>setvoice #salon` - Salon permanent 24/7\n`>>removevoice` - Supprimer', ephemeral: true });
    }
});

// ========== ÉVÈNEMENTS SÉCURITÉ ==========
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
        await sendLog(member.guild.id, 'raid_detected', `${recent.length} membres`, 'System', `Raid détecté - Lockdown activé`);
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
            await sendLog(message.guild.id, 'spam', message.author, 'System', `${recent.length} messages en 5 secondes`);
            messageCache.delete(message.author.id);
        }
    }
    
    if (config.antimentions) {
        const mentions = message.mentions.users.size + message.mentions.roles.size;
        if (mentions > config.antimentionslimit) {
            await message.delete();
            await punish(message.guild.id, message.author.id, `Mentions (${mentions})`);
            await sendLog(message.guild.id, 'mass_mention', message.author, 'System', `${mentions} mentions dans un message`);
        }
    }
});

client.on('guildBanAdd', async (ban) => {
    const logs = await ban.guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanAdd, limit: 1 });
    const log = logs.entries.first();
    if (log && log.executor.id !== client.user.id) {
        await sendLog(ban.guild.id, 'ban', ban.user, log.executor.tag, log.reason || 'Aucune');
    }
});

client.on('guildMemberRemove', async (member) => {
    const logs = await member.guild.fetchAuditLogs({ type: AuditLogEvent.MemberKick, limit: 1 });
    const log = logs.entries.first();
    if (log && log.executor.id !== client.user.id && Date.now() - log.createdTimestamp < 5000) {
        await sendLog(member.guild.id, 'kick', member.user, log.executor.tag, log.reason || 'Aucune');
    }
});

client.on('channelDelete', async (channel) => {
    if (!channel.guild) return;
    const logs = await channel.guild.fetchAuditLogs({ type: AuditLogEvent.ChannelDelete, limit: 1 });
    const log = logs.entries.first();
    if (log && log.executor.id !== client.user.id) {
        await sendLog(channel.guild.id, 'channel_delete', channel, log.executor.tag, `Nom: ${channel.name}`);
    }
});

client.on('roleDelete', async (role) => {
    if (!role.guild) return;
    const logs = await role.guild.fetchAuditLogs({ type: AuditLogEvent.RoleDelete, limit: 1 });
    const log = logs.entries.first();
    if (log && log.executor.id !== client.user.id) {
        await sendLog(role.guild.id, 'role_delete', role, log.executor.tag, `Nom: ${role.name}`);
    }
});

// ========== SERVEUR WEB ==========
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('🛡️ Bot en ligne'));
app.listen(port, () => console.log(`✅ Web server port ${port}`));

client.login(TOKEN);