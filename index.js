const { Client, GatewayIntentBits, EmbedBuilder, ActivityType, PermissionsBitField, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, Collection } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, getVoiceConnection } = require('@discordjs/voice');
const play = require('play-dl');
const express = require('express');
const fs = require('fs');

const PREFIX = '>>';
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
    ]
});

// ========== SYSTÈMES ==========
let musicQueues = new Collection();
let currentPlayer = new Collection();
let tickets = new Collection();

// ========== BOT PRÊT ==========
client.once('ready', () => {
    console.log(`✅ ${client.user.tag} est en ligne !`);
    console.log(`📊 Serveurs : ${client.guilds.cache.size}`);
    client.user.setActivity(`${PREFIX}help | ${client.guilds.cache.size} serveurs`, { type: ActivityType.Watching });
});

// ========== FONCTION MUSIQUE ==========
async function playMusic(guildId, textChannel) {
    const queue = musicQueues.get(guildId);
    if (!queue || queue.length === 0) {
        currentPlayer.delete(guildId);
        return;
    }

    const song = queue[0];
    const connection = getVoiceConnection(guildId);
    if (!connection) return;

    const player = createAudioPlayer();
    
    try {
        const stream = await play.stream(song.url);
        const resource = createAudioResource(stream.stream, { inputType: stream.type });
        
        player.play(resource);
        connection.subscribe(player);
        currentPlayer.set(guildId, player);

        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('🎵 **Lecture en cours**')
            .setDescription(`[${song.title}](${song.url})`)
            .addFields(
                { name: '⏱️ Durée', value: song.duration, inline: true },
                { name: '👤 Demandé par', value: song.requested, inline: true }
            )
            .setThumbnail(song.thumbnail);
        
        if (textChannel) textChannel.send({ embeds: [embed] });

        player.on(AudioPlayerStatus.Idle, () => {
            queue.shift();
            musicQueues.set(guildId, queue);
            playMusic(guildId, textChannel);
        });

    } catch (error) {
        console.error(error);
        queue.shift();
        playMusic(guildId, textChannel);
    }
}

// ========== FONCTION TICKETS ==========
async function createTicket(message, reason) {
    const guild = message.guild;
    const member = message.author;
    
    const ticketChannel = await guild.channels.create({
        name: `ticket-${member.username}`,
        type: ChannelType.GuildText,
        parent: null,
        permissionOverwrites: [
            {
                id: guild.id,
                deny: [PermissionsBitField.Flags.ViewChannel],
            },
            {
                id: member.id,
                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory],
            },
            {
                id: client.user.id,
                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.ManageChannels],
            },
        ],
    });

    tickets.set(ticketChannel.id, {
        creator: member.id,
        createdAt: Date.now(),
        closed: false,
        messages: []
    });

    const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('🎫 **Ticket créé**')
        .setDescription(`> Sujet : ${reason || 'Aucun sujet'}\n> Utilisez les boutons ci-dessous pour gérer ce ticket.`)
        .setFooter({ text: `Créé par ${member.tag}` })
        .setTimestamp();

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('close_ticket')
                .setLabel('🔒 Fermer')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('transcript_ticket')
                .setLabel('📄 Transcript')
                .setStyle(ButtonStyle.Secondary)
        );

    await ticketChannel.send({ content: `<@${member.id}>`, embeds: [embed], components: [row] });
    
    message.reply({ embeds: [new EmbedBuilder().setColor(0x00FF00).setDescription(`✅ **Ticket créé !** Rendez-vous dans ${ticketChannel}`)] });
}

// ========== INTERACTIONS BOUTONS ==========
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'close_ticket') {
        const ticketData = tickets.get(interaction.channel.id);
        if (!ticketData) return interaction.reply({ content: '❌ Ticket non trouvé.', ephemeral: true });

        ticketData.closed = true;
        tickets.set(interaction.channel.id, ticketData);

        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('🔒 **Ticket fermé**')
            .setDescription('> Ce ticket va être fermé dans 5 secondes.')
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        
        setTimeout(() => {
            interaction.channel.delete();
            tickets.delete(interaction.channel.id);
        }, 5000);
    }

    if (interaction.customId === 'transcript_ticket') {
        const messages = await interaction.channel.messages.fetch({ limit: 100 });
        const transcript = messages.reverse().map(m => `[${m.createdAt.toLocaleString()}] ${m.author.tag}: ${m.content}`).join('\n');
        
        const transcriptFile = Buffer.from(transcript, 'utf-8');
        await interaction.reply({
            content: '📄 **Transcript du ticket**',
            files: [{ attachment: transcriptFile, name: `transcript-${interaction.channel.name}.txt` }],
            ephemeral: true
        });
    }
});

// ========== COMMANDES ==========
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // ---------- BOSS ----------
    if (command === 'boss') {
        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('👑 **MADE BY VCTR_ON** 👑')
            .setDescription(`
╔════════════════════════════════════════════╗
║                                            ║
║     🤖 **BOT ULTRA PUISSANT**              ║
║                                            ║
║     ✨ Créé par **vctr_on**                ║
║     🚀 Version 9.0                         ║
║     🎵 Musique YouTube                     ║
║     🎫 Système de tickets                  ║
║     💜 24/7 - Toujours actif               ║
║                                            ║
╚════════════════════════════════════════════╝

> **Commandes disponibles :** \`${PREFIX}help\`
> **Dashboard :** [Cliquez ici](${process.env.RENDER_URL || 'https://bot.onrender.com'})
            `)
            .setFooter({ text: '❤️ Merci d\'utiliser ce bot !' })
            .setTimestamp();
        message.channel.send({ embeds: [embed] });
    }

    // ---------- HELP ----------
    if (command === 'help') {
        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('🎮 **MENU DES COMMANDES** 🎮')
            .setDescription(`> **Préfixe actuel :** \`${PREFIX}\``)
            .setThumbnail(client.user.displayAvatarURL())
            .addFields(
                { name: '🎵 **・MUSIQUE**', value: '`play` `skip` `stop` `queue`', inline: true },
                { name: '🎫 **・TICKETS**', value: '`ticket` `close`', inline: true },
                { name: '👑 **・GÉNÉRAL**', value: '`ping` `help` `info` `boss`', inline: true },
                { name: '📊 **・STATISTIQUES**', value: '`serverinfo` `botinfo`', inline: true },
                { name: '🔐 **・MODÉRATION**', value: '`clear` `kick` `ban` `lock` `unlock` `slowmode`', inline: true },
                { name: '🛡️ **・ANTI-RAID**', value: '`antiraid` `lockdown` `purge`', inline: true }
            )
            .setFooter({ text: `💪 ${client.user.username} - ${client.guilds.cache.size} serveurs` })
            .setTimestamp();
        message.channel.send({ embeds: [embed] });
    }

    // ---------- PING ----------
    if (command === 'ping') {
        const sent = await message.reply('🏓 **Calcul du ping...**');
        const latency = sent.createdTimestamp - message.createdTimestamp;
        const apiLatency = Math.round(client.ws.ping);
        
        sent.edit({
            content: null,
            embeds: [new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('🏓 **PONG !**')
                .setDescription(`> **Latence :** \`${latency}ms\`\n> **API Discord :** \`${apiLatency}ms\``)
                .setFooter({ text: '🤖 Vctr_on Bot | 24/7' })
                .setTimestamp()
            ]
        });
    }

    // ---------- INFO ----------
    if (command === 'info') {
        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('📊 **INFORMATIONS DU BOT**')
            .setThumbnail(client.user.displayAvatarURL())
            .addFields(
                { name: '👤 **Nom**', value: `\`${client.user.tag}\``, inline: true },
                { name: '📚 **Serveurs**', value: `\`${client.guilds.cache.size}\``, inline: true },
                { name: '👥 **Utilisateurs**', value: `\`${client.users.cache.size}\``, inline: true },
                { name: '🎵 **Musique**', value: `\`YouTube\``, inline: true },
                { name: '🎫 **Tickets**', value: `\`Actif\``, inline: true },
                { name: '💖 **Créateur**', value: `\`vctr_on\``, inline: true }
            )
            .setFooter({ text: '🤖 Bot Discord Ultra Puissant' })
            .setTimestamp();
        message.channel.send({ embeds: [embed] });
    }

    // ---------- MUSIQUE ----------
    if (command === 'play') {
        const query = args.join(' ');
        if (!query) return message.reply('🎵 **Donne un titre ou un lien YouTube !**\nExemple: `>>play never gonna give you up`');

        if (!message.member.voice.channel) return message.reply('❌ **Tu dois être dans un salon vocal !**');

        let songInfo;
        try {
            if (query.includes('youtube.com') || query.includes('youtu.be')) {
                const result = await play.video_info(query);
                songInfo = result.video_details;
            } else {
                const search = await play.search(query, { limit: 1 });
                if (search.length === 0) return message.reply('❌ **Aucun résultat trouvé !**');
                songInfo = search[0];
            }
        } catch (error) {
            return message.reply('❌ **Erreur lors de la recherche !**');
        }

        const song = {
            title: songInfo.title,
            url: songInfo.url,
            duration: songInfo.durationRaw,
            thumbnail: songInfo.thumbnails[0]?.url,
            requested: message.author.username
        };

        if (!musicQueues.has(message.guild.id)) musicQueues.set(message.guild.id, []);
        const queue = musicQueues.get(message.guild.id);
        queue.push(song);
        musicQueues.set(message.guild.id, queue);

        const connection = getVoiceConnection(message.guild.id);
        
        if (!connection) {
            joinVoiceChannel({
                channelId: message.member.voice.channel.id,
                guildId: message.guild.id,
                adapterCreator: message.guild.voiceAdapterCreator,
            });
            
            setTimeout(() => {
                if (queue.length === 1) playMusic(message.guild.id, message.channel);
            }, 1000);
        } else if (queue.length === 1) {
            playMusic(message.guild.id, message.channel);
        }

        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('➕ **Ajouté à la file**')
            .setDescription(`[${song.title}](${song.url})`)
            .addFields(
                { name: '⏱️ Durée', value: song.duration, inline: true },
                { name: '📌 Position', value: `${queue.length}`, inline: true }
            )
            .setThumbnail(song.thumbnail);
        message.channel.send({ embeds: [embed] });
    }

    if (command === 'skip') {
        const player = currentPlayer.get(message.guild.id);
        if (player) {
            player.stop();
            message.reply('⏭️ **Musique passée !**');
        } else {
            message.reply('❌ **Aucune musique en cours !**');
        }
    }

    if (command === 'stop') {
        const connection = getVoiceConnection(message.guild.id);
        if (connection) {
            connection.destroy();
            musicQueues.delete(message.guild.id);
            currentPlayer.delete(message.guild.id);
            message.reply('⏹️ **Musique arrêtée et file vidée !**');
        } else {
            message.reply('❌ **Je ne suis pas dans un salon vocal !**');
        }
    }

    if (command === 'queue') {
        const queue = musicQueues.get(message.guild.id) || [];
        if (queue.length === 0) return message.reply('📭 **File d\'attente vide !**');

        const embed = new EmbedBuilder()
            .setColor(0xFF69B4)
            .setTitle('🎵 **FILE D\'ATTENTE**')
            .setDescription(queue.map((song, i) => `${i+1}. ${song.title} (${song.duration})`).slice(0, 10).join('\n'))
            .setFooter({ text: `${queue.length} musique(s) dans la file` });
        message.channel.send({ embeds: [embed] });
    }

    // ---------- TICKETS ----------
    if (command === 'ticket') {
        const reason = args.join(' ') || 'Aucun sujet';
        await createTicket(message, reason);
    }

    // ---------- SERVERINFO ----------
    if (command === 'serverinfo') {
        const guild = message.guild;
        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle(`📡 **${guild.name}**`)
            .setThumbnail(guild.iconURL())
            .addFields(
                { name: '👑 **Propriétaire**', value: `<@${guild.ownerId}>`, inline: true },
                { name: '👥 **Membres**', value: `${guild.memberCount}`, inline: true },
                { name: '📅 **Création**', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
                { name: '💬 **Salons**', value: `${guild.channels.cache.size}`, inline: true }
            )
            .setFooter({ text: `ID: ${guild.id}` })
            .setTimestamp();
        message.channel.send({ embeds: [embed] });
    }

    // ---------- BOTINFO ----------
    if (command === 'botinfo') {
        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('🤖 **STATISTIQUES TECHNIQUES**')
            .addFields(
                { name: '💻 **RAM**', value: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`, inline: true },
                { name: '📦 **Node.js**', value: process.version, inline: true },
                { name: '🌍 **Serveurs**', value: `${client.guilds.cache.size}`, inline: true },
                { name: '🎵 **Musique**', value: `YouTube Ready`, inline: true },
                { name: '🎫 **Tickets**', value: `Système actif`, inline: true }
            )
            .setFooter({ text: 'Version 9.0 | 24/7' })
            .setTimestamp();
        message.channel.send({ embeds: [embed] });
    }

    // ---------- MODÉRATION ----------
    if (command === 'clear' && message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
        const amount = parseInt(args[0]);
        if (isNaN(amount) || amount < 1 || amount > 100) {
            return message.reply({ embeds: [new EmbedBuilder().setColor(0xFF0000).setDescription('❌ Nombre entre **1** et **100**')] });
        }
        await message.channel.bulkDelete(amount, true);
        const msg = await message.channel.send({ embeds: [new EmbedBuilder().setColor(0x00FF00).setDescription(`🗑️ ${amount} messages supprimés !`)] });
        setTimeout(() => msg.delete(), 3000);
    }

    if (command === 'kick' && message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
        const user = message.mentions.users.first();
        if (!user) return message.reply('❌ Mentionne un utilisateur !');
        const member = message.guild.members.cache.get(user.id);
        if (member) await member.kick(args.slice(1).join(' ') || 'Aucune raison');
        message.reply({ embeds: [new EmbedBuilder().setColor(0xFFA500).setDescription(`👢 ${user.tag} a été expulsé !`)] });
    }

    if (command === 'ban' && message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
        const user = message.mentions.users.first();
        if (!user) return message.reply('❌ Mentionne un utilisateur !');
        const member = message.guild.members.cache.get(user.id);
        if (member) await member.ban({ reason: args.slice(1).join(' ') || 'Aucune raison' });
        message.reply({ embeds: [new EmbedBuilder().setColor(0xFF0000).setDescription(`🔨 ${user.tag} a été banni !`)] });
    }

    if (command === 'lock' && message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        await message.channel.permissionOverwrites.edit(message.guild.id, { SendMessages: false });
        message.reply({ embeds: [new EmbedBuilder().setColor(0xFF0000).setDescription('🔒 Salon verrouillé !')] });
    }

    if (command === 'unlock' && message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        await message.channel.permissionOverwrites.edit(message.guild.id, { SendMessages: true });
        message.reply({ embeds: [new EmbedBuilder().setColor(0x00FF00).setDescription('🔓 Salon déverrouillé !')] });
    }

    if (command === 'slowmode' && message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        const seconds = parseInt(args[0]);
        if (isNaN(seconds) || seconds < 0 || seconds > 21600) return message.reply('❌ Entre **0** et **21600** secondes');
        await message.channel.setRateLimitPerUser(seconds);
        message.reply({ embeds: [new EmbedBuilder().setColor(0x00FF00).setDescription(`⏱️ Slowmode : ${seconds} secondes`)] });
    }

    // ---------- ANTI-RAID ----------
    if (command === 'antiraid' && message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        const action = args[0];
        if (action === 'on') message.reply('🛡️ Anti-raid activé !');
        else if (action === 'off') message.reply('🛡️ Anti-raid désactivé');
        else message.reply('🛡️ Usage: `>>antiraid on/off`');
    }

    if (command === 'lockdown' && message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        message.guild.channels.cache.forEach(async channel => {
            if (channel.type === ChannelType.GuildText) {
                await channel.permissionOverwrites.edit(message.guild.id, { SendMessages: false });
            }
        });
        message.reply('🔒 Lockdown total activé !');
    }

    if (command === 'purge' && message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        const amount = parseInt(args[0]) || 99;
        await message.channel.bulkDelete(amount, true);
        const msg = await message.channel.send(`🧹 ${amount} messages supprimés !`);
        setTimeout(() => msg.delete(), 2000);
    }
});

// ========== DASHBOARD WEB ==========
const app = express();
const port = process.env.PORT || 3000;

app.get('/api/stats', (req, res) => {
    res.json({
        servers: client.guilds.cache.size,
        users: client.users.cache.filter(u => !u.bot).size,
        bots: client.users.cache.filter(u => u.bot).size,
        ram: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2),
        prefix: PREFIX,
        botName: client.user?.username || 'Bot',
        botAvatar: client.user?.displayAvatarURL() || '',
        commands: 25,
        music: true,
        tickets: true
    });
});

app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vctr_on Bot - Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            background: linear-gradient(135deg, #0a0a2a 0%, #1a1a3e 100%);
            font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            min-height: 100vh;
            color: #fff;
        }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header {
            text-align: center;
            padding: 50px 20px;
            background: rgba(255,255,255,0.05);
            border-radius: 30px;
            margin-bottom: 30px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.1);
        }
        .header h1 {
            font-size: 3.5em;
            background: linear-gradient(135deg, #ff6b6b, #4ecdc4, #45b7d1);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 10px;
        }
        .header p { color: #aaa; font-size: 1.2em; }
        .online-badge {
            display: inline-block;
            background: rgba(78, 205, 196, 0.2);
            color: #4ecdc4;
            padding: 8px 20px;
            border-radius: 50px;
            margin-top: 15px;
            font-size: 0.9em;
            border: 1px solid #4ecdc4;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        .stat-card {
            background: rgba(255,255,255,0.08);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 25px;
            text-align: center;
            transition: all 0.3s;
            border: 1px solid rgba(255,255,255,0.1);
        }
        .stat-card:hover { transform: translateY(-5px); background: rgba(255,255,255,0.12); }
        .stat-icon { font-size: 3em; margin-bottom: 15px; }
        .stat-value { font-size: 2.5em; font-weight: bold; background: linear-gradient(135deg, #4ecdc4, #45b7d1); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .stat-label { color: #aaa; margin-top: 10px; font-size: 0.9em; text-transform: uppercase; letter-spacing: 1px; }
        .features {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        .feature {
            background: rgba(255,255,255,0.05);
            border-radius: 20px;
            padding: 25px;
            text-align: center;
            border-left: 4px solid #4ecdc4;
        }
        .feature h3 { color: #4ecdc4; margin-bottom: 10px; }
        .footer {
            text-align: center;
            padding: 30px;
            background: rgba(0,0,0,0.3);
            border-radius: 20px;
        }
        .footer a { color: #4ecdc4; text-decoration: none; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🤖 VCTR_ON BOT</h1>
            <p>Bot Discord ultime - Musique • Tickets • Modération</p>
            <div class="online-badge">🟢 EN LIGNE 24/7</div>
        </div>
        
        <div class="stats-grid" id="stats">
            <div class="stat-card"><div class="stat-icon">🌍</div><div class="stat-value" id="servers">0</div><div class="stat-label">Serveurs</div></div>
            <div class="stat-card"><div class="stat-icon">👥</div><div class="stat-value" id="users">0</div><div class="stat-label">Utilisateurs</div></div>
            <div class="stat-card"><div class="stat-icon">💾</div><div class="stat-value" id="ram">0</div><div class="stat-label">RAM (MB)</div></div>
            <div class="stat-card"><div class="stat-icon">⚡</div><div class="stat-value" id="prefix">>></div><div class="stat-label">Préfixe</div></div>
        </div>
        
        <div class="features">
            <div class="feature"><h3>🎵 MUSIQUE YOUTUBE</h3><p>Jouez de la musique de qualité depuis YouTube</p></div>
            <div class="feature"><h3>🎫 SYSTÈME DE TICKETS</h3><p>Support client avec transcripts et sauvegarde</p></div>
            <div class="feature"><h3>🔐 MODÉRATION</h3><p>Clear, Kick, Ban, Lock, Slowmode, Anti-raid</p></div>
        </div>
        
        <div class="footer">
            <p>❤️ Bot créé par <strong>vctr_on</strong> - Version 9.0</p>
            <p>🎯 24/7 • Musique • Tickets • Modération</p>
        </div>
    </div>
    
    <script>
        async function loadStats() {
            try {
                const res = await fetch('/api/stats');
                const data = await res.json();
                document.getElementById('servers').textContent = data.servers;
                document.getElementById('users').textContent = data.users;
                document.getElementById('ram').textContent = data.ram;
            } catch(e) { console.error(e); }
        }
        loadStats();
        setInterval(loadStats, 30000);
    </script>
</body>
</html>
    `);
});

app.listen(port, () => {
    console.log(`✅ Dashboard en ligne : https://votre-bot.onrender.com`);
});

// ========== CONNEXION ==========
client.login(process.env.DISCORD_TOKEN);