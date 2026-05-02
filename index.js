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

// Configuration par défaut
const defaultConfig = {
    antiraid: true, antispam: true, antiban: true, antikick: true,
    antichanneldelete: true, antiroledelete: true, antimentions: true,
    antiserverrename: true, antiservericon: true, antimentionslimit: 5,
    raidthreshold: 5, spamthreshold: 5, punishment: 'kick',
    logchannel: null, verification: false, whitelistusers: [], whitelistroles: []
};

// ========== BOT PRÊT ==========
client.once('ready', () => {
    console.log(`✅ ${client.user.tag} est en ligne !`);
    client.user.setActivity(`${PREFIX}help`, { type: ActivityType.Watching });
});

// ========== COMMANDES ==========
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
            .setColor(0x1a1a2e)
            .setAuthor({ name: '🛡️ SECURITY BOT', iconURL: client.user.displayAvatarURL() })
            .setDescription(`
**📌 COMMANDES DISPONIBLES**

**🚀 DASHBOARD**
\`>>dashboard\` - Ouvrir le panneau de contrôle
\`>>stats\` - Voir les statistiques
\`>>serverinfo\` - Infos du serveur

**⚙️ CONFIGURATION**
\`>>set threshold <nombre>\` - Changer seuil anti-raid
\`>>logchannel #salon\` - Salon des logs
\`>>whitelist user/@user\` - Gérer whitelist
\`>>setupverify\` - Activer vérification

**👑 AUTRES**
\`>>boss\` - Crédits
\`>>verify\` - Se vérifier
\`>>help\` - Cette aide
            `)
            .setFooter({ text: '🛡️ Protection 24/7 • vctr_on' })
            .setTimestamp();
        return message.channel.send({ embeds: [embed] });
    }

    // ---------- DASHBOARD ----------
    if (command === 'dashboard') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('❌ Administrateur requis');
        }

        const embed = new EmbedBuilder()
            .setColor(0x1a1a2e)
            .setAuthor({ name: '🛡️ DASHBOARD', iconURL: message.guild.iconURL() })
            .setDescription(`
**📊 STATISTIQUES**

👥 Membres : **${message.guild.memberCount}**
✅ Whitelist : **${config.whitelistusers.length}** utilisateurs
🎭 Whitelist : **${config.whitelistroles.length}** rôles

**⚙️ CONFIGURATION**

🔨 Sanction : **${config.punishment.toUpperCase()}**
👥 Seuil Raid : **${config.raidthreshold}** membres/10s
💬 Seuil Spam : **${config.spamthreshold}** messages/5s
🔔 Mentions max : **${config.antimentionslimit}**

**🛡️ PROTECTIONS**

${config.antiraid ? '✅' : '❌'} Anti-Raid    ${config.antispam ? '✅' : '❌'} Anti-Spam
${config.antiban ? '✅' : '❌'} Anti-Ban     ${config.antikick ? '✅' : '❌'} Anti-Kick
${config.antimentions ? '✅' : '❌'} Anti-Mentions
${config.antichanneldelete ? '✅' : '❌'} Anti-Channel
${config.antiroledelete ? '✅' : '❌'} Anti-Role
            `)
            .setFooter({ text: `Cliquez sur les boutons • ${message.guild.name}` })
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
                new ButtonBuilder().setCustomId('btn_logs').setLabel('Logs').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('btn_whitelist').setLabel('Whitelist').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('btn_verify').setLabel('Verify').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('btn_help').setLabel('Help').setStyle(ButtonStyle.Secondary)
            );

        await message.channel.send({ embeds: [embed], components: [row1, row2, row3] });
    }

    // ---------- STATS ----------
    if (command === 'stats') {
        const embed = new EmbedBuilder()
            .setColor(0x1a1a2e)
            .setAuthor({ name: '📊 STATISTIQUES', iconURL: message.guild.iconURL() })
            .setDescription(`
**INFORMATIONS**

👥 Membres : **${message.guild.memberCount}**
✅ Whitelist users : **${config.whitelistusers.length}**
🎭 Whitelist roles : **${config.whitelistroles.length}**

**CONFIGURATION**

🔨 Sanction : **${config.punishment.toUpperCase()}**
👥 Seuil Raid : **${config.raidthreshold}** membres/10s
💬 Seuil Spam : **${config.spamthreshold}** messages/5s
🔔 Mentions max : **${config.antimentionslimit}**
            `)
            .setFooter({ text: '🛡️ Protection 24/7' })
            .setTimestamp();
        return message.channel.send({ embeds: [embed] });
    }

    // ---------- SERVERINFO ----------
    if (command === 'serverinfo') {
        const embed = new EmbedBuilder()
            .setColor(0x1a1a2e)
            .setAuthor({ name: message.guild.name, iconURL: message.guild.iconURL() })
            .setThumbnail(message.guild.iconURL())
            .setDescription(`
👑 Propriétaire : <@${message.guild.ownerId}>
👥 Membres : **${message.guild.memberCount}**
💬 Salons : **${message.guild.channels.cache.size}**
📅 Création : <t:${Math.floor(message.guild.createdTimestamp / 1000)}:R>
🛡️ Protection : **Activée**
            `)
            .setFooter({ text: `ID: ${message.guild.id}` })
            .setTimestamp();
        return message.channel.send({ embeds: [embed] });
    }

    // ---------- BOSS ----------
    if (command === 'boss') {
        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setAuthor({ name: '👑 MADE BY VCTR_ON', iconURL: client.user.displayAvatarURL() })
            .setDescription(`
**BOT DE SÉCURITÉ ULTIME**

⭐ Créé par **vctr_on**
🚀 Version **10.0** - Ultimate
🛡️ **Anti-Nuke & Anti-Raid**
💜 **24/7** - Toujours actif

📌 **${PREFIX}help** pour les commandes
            `)
            .setFooter({ text: '🛡️ Protection maximale' })
            .setTimestamp();
        return message.channel.send({ embeds: [embed] });
    }

    // ---------- SETUPVERIFY ----------
    if (command === 'setupverify' && message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        config.verification = true;
        configs.set(message.guild.id, config);
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setDescription(`✅ **Vérification activée**\n\nLes nouveaux membres devront taper \`${PREFIX}verify\``)
            .setTimestamp();
        return message.channel.send({ embeds: [embed] });
    }

    // ---------- VERIFY ----------
    if (command === 'verify') {
        if (!config.verification) return message.reply('❌ Vérification non activée');
        if (verificationCache.has(message.author.id)) return message.reply('❌ Déjà vérifié');
        verificationCache.set(message.author.id, true);
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setDescription('✅ **Vérification réussie**\n\nBienvenue sur le serveur ! 🎉')
            .setTimestamp();
        return message.reply({ embeds: [embed] });
    }

    // ---------- SET THRESHOLD ----------
    if (command === 'set' && args[0] === 'threshold' && message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        const value = parseInt(args[1]);
        if (isNaN(value) || value < 2 || value > 20) return message.reply('❌ Seuil entre **2** et **20**');
        config.raidthreshold = value;
        configs.set(message.guild.id, config);
        message.reply(`✅ Seuil anti-raid : **${value}** membres/10s`);
    }

    // ---------- LOGCHANNEL ----------
    if (command === 'logchannel' && message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        const channel = message.mentions.channels.first();
        if (channel) {
            config.logchannel = channel.id;
            message.reply(`✅ Logs → ${channel}`);
        } else {
            config.logchannel = null;
            message.reply(`❌ Logs désactivés`);
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
                .setTitle('✅ WHITELIST')
                .addFields(
                    { name: 'Utilisateurs', value: users, inline: false },
                    { name: 'Rôles', value: roles, inline: false }
                )
                .setTimestamp();
            return message.channel.send({ embeds: [embed] });
        }
        
        const target = message.mentions.users.first() || message.mentions.roles.first();
        if (!target) return message.reply('❌ Mentionne un utilisateur ou un rôle');
        
        if (type === 'user') {
            if (config.whitelistusers.includes(target.id)) {
                config.whitelistusers = config.whitelistusers.filter(id => id !== target.id);
                message.reply(`✅ ${target.tag} retiré`);
            } else {
                config.whitelistusers.push(target.id);
                message.reply(`✅ ${target.tag} ajouté`);
            }
        } else if (type === 'role') {
            if (config.whitelistroles.includes(target.id)) {
                config.whitelistroles = config.whitelistroles.filter(id => id !== target.id);
                message.reply(`✅ ${target.name} retiré`);
            } else {
                config.whitelistroles.push(target.id);
                message.reply(`✅ ${target.name} ajouté`);
            }
        } else {
            message.reply(`❌ Usage: \`${PREFIX}whitelist user/@user\` ou \`${PREFIX}whitelist role/@role\``);
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
        return;
    }

    if (interaction.customId === 'punishment_kick') {
        config.punishment = 'kick';
        configs.set(interaction.guild.id, config);
        await interaction.reply({ content: '✅ Sanction : **Kick**', ephemeral: true });
    } else if (interaction.customId === 'punishment_ban') {
        config.punishment = 'ban';
        configs.set(interaction.guild.id, config);
        await interaction.reply({ content: '✅ Sanction : **Ban**', ephemeral: true });
    } else if (interaction.customId === 'punishment_timeout') {
        config.punishment = 'timeout';
        configs.set(interaction.guild.id, config);
        await interaction.reply({ content: '✅ Sanction : **Timeout**', ephemeral: true });
    } else if (interaction.customId === 'refresh_dashboard') {
        await interaction.reply({ content: '🔄 Rafraîchi', ephemeral: true });
    } else if (interaction.customId === 'btn_logs') {
        await interaction.reply({ content: '📁 Utilisez `>>logchannel #salon`', ephemeral: true });
    } else if (interaction.customId === 'btn_whitelist') {
        await interaction.reply({ content: '✅ `>>whitelist user/@user`\n📋 `>>whitelist list`', ephemeral: true });
    } else if (interaction.customId === 'btn_verify') {
        await interaction.reply({ content: '🔐 `>>setupverify` - Activer\n✅ `>>verify` - Se vérifier', ephemeral: true });
    } else if (interaction.customId === 'btn_help') {
        await interaction.reply({ content: '📌 `>>help` - Toutes les commandes', ephemeral: true });
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

// ========== SERVEUR WEB ==========
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('🛡️ Bot en ligne'));
app.listen(port, () => console.log(`✅ Web server port ${port}`));

client.login(TOKEN);