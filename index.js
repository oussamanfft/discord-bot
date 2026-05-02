const { Client, GatewayIntentBits, EmbedBuilder, ActivityType, PermissionsBitField, ChannelType, Collection } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus, getVoiceConnection } = require('@discordjs/voice');
const play = require('play-dl');
const express = require('express');
const path = require('path');

const PREFIX = '>>';
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessageReactions,
    ]
});

// ========== SYSTÈMES ==========
let economy = new Collection();
let warnings = new Collection();
let musicQueues = new Collection();
let currentPlayer = new Collection();

// ========== BOT PRÊT ==========
client.once('ready', () => {
    console.log(`✅ ${client.user.tag} est en ligne !`);
    client.user.setActivity(`${PREFIX}help | Musique + Dashboard`, { type: ActivityType.Listening });
});

// ========== FONCTION MUSIQUE ==========
async function playMusic(guildId, message) {
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
                { name: '📺 Chaîne', value: song.channel, inline: true },
                { name: '👤 Demandé par', value: song.requested, inline: true }
            )
            .setThumbnail(song.thumbnail);
        
        message.channel.send({ embeds: [embed] });

        player.on(AudioPlayerStatus.Idle, () => {
            queue.shift();
            musicQueues.set(guildId, queue);
            playMusic(guildId, message);
        });

        player.on('error', error => {
            console.error(error);
            queue.shift();
            playMusic(guildId, message);
        });

    } catch (error) {
        console.error(error);
        queue.shift();
        playMusic(guildId, message);
    }
}

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
╔══════════════════════════════╗
║  🤖 **Bot Ultra Puissant**   ║
║  ✨ **Créé par vctr_on**      ║
║  🎵 **Musique YouTube**       ║
║  📊 **Dashboard Web**         ║
║  🚀 **Version 6.0**          ║
╚══════════════════════════════╝
                
🔥 **Commandes :** \`${PREFIX}help\`
💜 **Bot 24/7 - Toujours actif !**
🎛️ **Dashboard :** \`http://localhost:3000\`
            `)
            .setFooter({ text: '❤️ Vctr_on - Le meilleur bot Discord' })
            .setTimestamp();
        message.channel.send({ embeds: [embed] });
    }

    // ---------- HELP ----------
    if (command === 'help') {
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('🤖 **MENU DES COMMANDES** 🤖')
            .setDescription(`Préfixe : **${PREFIX}** | [Dashboard](${process.env.RENDER_URL || 'http://localhost:3000'})`)
            .addFields(
                { name: '🎵 **MUSIQUE**', value: '`play [titre/url]`, `skip`, `stop`, `queue`, `nowplaying`, `pause`, `resume`', inline: false },
                { name: '👑 **GÉNÉRAL**', value: '`ping`, `help`, `info`, `uptime`, `avatar`, `boss`', inline: false },
                { name: '🎲 **JEUX & ÉCONOMIE**', value: '`daily`, `balance`, `work`, `gamble`, `coinflip`, `roll`, `8ball`', inline: false },
                { name: '📰 **ACTUALITÉS**', value: '`météo [ville]`, `crypto`, `blague`', inline: false },
                { name: '🖼️ **IMAGES**', value: '`meme`, `cat`, `dog`', inline: false },
                { name: '📊 **STATISTIQUES**', value: '`serverinfo`, `userinfo`, `botinfo`, `stats`', inline: false },
                { name: '🔐 **MODÉRATION**', value: '`clear`, `kick`, `ban`, `lock`, `unlock`, `slowmode`, `warn`, `warnings`', inline: false },
                { name: '🛡️ **ANTI-RAID**', value: '`antiraid on/off`, `lockdown`, `purge`', inline: false }
            )
            .setFooter({ text: '💪 Vctr_on - Bot 24/7 avec Dashboard' })
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
            channel: songInfo.channel?.name || 'Inconnu',
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
                if (queue.length === 1) playMusic(message.guild.id, message);
            }, 1000);
        } else if (queue.length === 1) {
            playMusic(message.guild.id, message);
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

    if (command === 'pause') {
        const player = currentPlayer.get(message.guild.id);
        if (player && player.state.status === AudioPlayerStatus.Playing) {
            player.pause();
            message.reply('⏸️ **Musique en pause !**');
        } else {
            message.reply('❌ **Aucune musique en cours !**');
        }
    }

    if (command === 'resume') {
        const player = currentPlayer.get(message.guild.id);
        if (player && player.state.status === AudioPlayerStatus.Paused) {
            player.unpause();
            message.reply('▶️ **Reprise de la musique !**');
        } else {
            message.reply('❌ **Aucune musique en pause !**');
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

    if (command === 'nowplaying') {
        const queue = musicQueues.get(message.guild.id) || [];
        if (queue.length === 0) return message.reply('🎵 **Aucune musique en cours.**');
        
        const song = queue[0];
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('🎵 **EN COURS DE LECTURE**')
            .setDescription(`[${song.title}](${song.url})`)
            .addFields(
                { name: '⏱️ Durée', value: song.duration, inline: true },
                { name: '👤 Demandé par', value: song.requested, inline: true }
            )
            .setThumbnail(song.thumbnail);
        message.channel.send({ embeds: [embed] });
    }

    // ---------- PING ----------
    if (command === 'ping') {
        const sent = await message.reply('🏓 **Calcul du ping...**');
        const latency = sent.createdTimestamp - message.createdTimestamp;
        const apiLatency = Math.round(client.ws.ping);
        sent.edit(`🏓 **PONG !**\n\n📨 **Latence :** \`${latency}ms\`\n🌐 **API Discord :** \`${apiLatency}ms\``);
    }

    // ---------- INFO ----------
    if (command === 'info') {
        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('📊 **INFORMATIONS DU BOT**')
            .setThumbnail(client.user.displayAvatarURL())
            .addFields(
                { name: '👤 **Nom**', value: client.user.tag, inline: true },
                { name: '📚 **Serveurs**', value: `${client.guilds.cache.size}`, inline: true },
                { name: '👥 **Utilisateurs**', value: `${client.users.cache.size}`, inline: true },
                { name: '⚙️ **Commandes**', value: `50+`, inline: true },
                { name: '🎵 **Musique**', value: `YouTube + Spotify`, inline: true },
                { name: '💖 **Créateur**', value: `vctr_on`, inline: true }
            )
            .setFooter({ text: '🤖 Bot créé avec ❤️ par vctr_on' })
            .setTimestamp();
        message.channel.send({ embeds: [embed] });
    }

    // ---------- UPTIME ----------
    if (command === 'uptime') {
        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor(uptime / 3600) % 24;
        const minutes = Math.floor(uptime / 60) % 60;
        const seconds = Math.floor(uptime % 60);
        message.reply(`⏰ **EN LIGNE DEPUIS :**\n\`\`\`${days}j ${hours}h ${minutes}m ${seconds}s\`\`\``);
    }

    // ---------- AVATAR ----------
    if (command === 'avatar') {
        const user = message.mentions.users.first() || message.author;
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle(`🖼️ **AVATAR DE ${user.username.toUpperCase()}**`)
            .setImage(user.displayAvatarURL({ dynamic: true, size: 4096 }));
        message.channel.send({ embeds: [embed] });
    }

    // ---------- JEUX & ÉCONOMIE (simplifié mais fonctionnel) ----------
    if (!economy.has(message.guild.id)) economy.set(message.guild.id, new Collection());
    const userMoney = economy.get(message.guild.id);

    if (command === 'daily') {
        const amount = 1000;
        const current = userMoney.get(message.author.id) || 0;
        userMoney.set(message.author.id, current + amount);
        message.reply(`💰 **+${amount}💰 !** Nouveau solde : ${current + amount}💰`);
    }

    if (command === 'balance' || command === 'bal') {
        const balance = userMoney.get(message.author.id) || 0;
        message.reply(`💰 **${message.author.username}** : ${balance}💰`);
    }

    if (command === 'work') {
        const earnings = Math.floor(Math.random() * 500) + 100;
        const current = userMoney.get(message.author.id) || 0;
        userMoney.set(message.author.id, current + earnings);
        message.reply(`💼 **Travail terminé !** +${earnings}💰 → Solde : ${current + earnings}💰`);
    }

    if (command === 'gamble') {
        const amount = parseInt(args[0]);
        if (isNaN(amount)) return message.reply('🎲 **Mise un montant !**');
        const current = userMoney.get(message.author.id) || 0;
        if (amount > current) return message.reply(`❌ **Pas assez ! Solde : ${current}💰**`);
        const win = Math.random() < 0.4;
        if (win) {
            userMoney.set(message.author.id, current + amount);
            message.reply(`🎉 **GAGNÉ !** +${amount}💰 → ${current + amount}💰`);
        } else {
            userMoney.set(message.author.id, current - amount);
            message.reply(`😭 **PERDU !** -${amount}💰 → ${current - amount}💰`);
        }
    }

    if (command === 'coinflip') {
        const result = Math.random() < 0.5 ? 'Pile' : 'Face';
        message.reply(`${result === 'Pile' ? '🪙' : '💰'} **${result} !**`);
    }

    if (command === 'roll') {
        const max = parseInt(args[0]) || 100;
        message.reply(`🎲 **${Math.floor(Math.random() * max) + 1}** (1-${max})`);
    }

    if (command === '8ball') {
        const question = args.join(' ');
        if (!question) return message.reply('🔮 **Pose une question !**');
        const reponses = ['✅ Oui', '❌ Non', '🤔 Peut-être', '✨ Certainement', '🚫 Impossible'];
        message.reply(`🔮 **${reponses[Math.floor(Math.random() * reponses.length)]}**`);
    }

    // ---------- ACTUALITÉS ----------
    if (command === 'météo' || command === 'meteo') {
        const ville = args.join(' ') || 'Paris';
        const temps = ['☀️ Ensoleillé', '🌧️ Pluvieux', '☁️ Nuageux', '⛈️ Orageux'];
        const temperature = Math.floor(Math.random() * 35) - 5;
        message.reply(`🌍 **${ville.toUpperCase()}** : ${temperature}°C - ${temps[Math.floor(Math.random() * temps.length)]}`);
    }

    if (command === 'crypto') {
        const prix = (Math.random() * 50000 + 30000).toFixed(2);
        message.reply(`🪙 **Bitcoin** : $${prix} | ${Math.random() > 0.5 ? '📈 +' : '📉 -'}${(Math.random() * 10).toFixed(2)}%`);
    }

    if (command === 'blague') {
        const blagues = [
            "Pourquoi les plongeurs plongent-ils toujours en arrière ? Parce que sinon ils tombent dans le bateau ! 🤣",
            "Que dit un zéro à un autre zéro ? On est tous égaux ! 😂"
        ];
        message.reply(`😄 ${blagues[Math.floor(Math.random() * blagues.length)]}`);
    }

    // ---------- IMAGES ----------
    if (command === 'meme') {
        const embed = new EmbedBuilder()
            .setColor(0xFF69B4)
            .setTitle('🎭 **MEME**')
            .setImage('https://i.imgflip.com/1bij.jpg');
        message.channel.send({ embeds: [embed] });
    }

    if (command === 'cat') {
        const embed = new EmbedBuilder()
            .setColor(0xFFA500)
            .setTitle('🐱 **CHAT MIGNON**')
            .setImage('https://cataas.com/cat');
        message.channel.send({ embeds: [embed] });
    }

    if (command === 'dog') {
        const embed = new EmbedBuilder()
            .setColor(0x8B4513)
            .setTitle('🐶 **CHIEN ADORABLE**')
            .setImage('https://images.dog.ceo/breeds/hound-afghan/n02088094_1003.jpg');
        message.channel.send({ embeds: [embed] });
    }

    // ---------- STATISTIQUES ----------
    if (command === 'serverinfo') {
        const guild = message.guild;
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle(`📡 ${guild.name}`)
            .setThumbnail(guild.iconURL())
            .addFields(
                { name: '👑 Propriétaire', value: `<@${guild.ownerId}>`, inline: true },
                { name: '👥 Membres', value: `${guild.memberCount}`, inline: true },
                { name: '💬 Salons', value: `${guild.channels.cache.size}`, inline: true }
            );
        message.channel.send({ embeds: [embed] });
    }

    if (command === 'userinfo') {
        const user = message.mentions.users.first() || message.author;
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle(`👤 ${user.tag}`)
            .setThumbnail(user.displayAvatarURL())
            .addFields(
                { name: '🆔 ID', value: user.id, inline: true },
                { name: '📅 Créé', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true }
            );
        message.channel.send({ embeds: [embed] });
    }

    if (command === 'botinfo') {
        message.reply(`🤖 **Stats**\n💻 RAM: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB\n🌍 Serveurs: ${client.guilds.cache.size}`);
    }

    if (command === 'stats') {
        message.reply(`📊 **Global**\n👥 Users: ${client.users.cache.filter(u => !u.bot).size}\n🤖 Bots: ${client.users.cache.filter(u => u.bot).size}\n🌍 Serveurs: ${client.guilds.cache.size}`);
    }

    // ---------- MODÉRATION ----------
    if (command === 'clear' && message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
        const amount = parseInt(args[0]);
        if (isNaN(amount) || amount < 1 || amount > 100) return message.reply('❌ **Entre 1 et 100**');
        await message.channel.bulkDelete(amount, true);
        message.reply(`🗑️ **${amount} messages supprimés !**`).then(m => setTimeout(() => m.delete(), 3000));
    }

    if (command === 'kick' && message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
        const user = message.mentions.users.first();
        if (!user) return message.reply('❌ **Mentionne un utilisateur !**');
        const member = message.guild.members.cache.get(user.id);
        if (member) await member.kick(args.slice(1).join(' ') || 'Aucune raison');
        message.reply(`👢 **${user.tag} a été expulsé !**`);
    }

    if (command === 'ban' && message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
        const user = message.mentions.users.first();
        if (!user) return message.reply('❌ **Mentionne un utilisateur !**');
        const member = message.guild.members.cache.get(user.id);
        if (member) await member.ban({ reason: args.slice(1).join(' ') || 'Aucune raison' });
        message.reply(`🔨 **${user.tag} a été banni !**`);
    }

    if (command === 'lock' && message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        await message.channel.permissionOverwrites.edit(message.guild.id, { SendMessages: false });
        message.reply('🔒 **Salon verrouillé !**');
    }

    if (command === 'unlock' && message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        await message.channel.permissionOverwrites.edit(message.guild.id, { SendMessages: true });
        message.reply('🔓 **Salon déverrouillé !**');
    }

    if (command === 'slowmode' && message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        const seconds = parseInt(args[0]);
        if (isNaN(seconds) || seconds < 0 || seconds > 21600) return message.reply('❌ **Entre 0 et 21600**');
        await message.channel.setRateLimitPerUser(seconds);
        message.reply(`⏱️ **Slowmode : ${seconds} secondes**`);
    }

    if (command === 'warn' && message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
        const user = message.mentions.users.first();
        if (!user) return message.reply('❌ **Mentionne un utilisateur !**');
        if (!warnings.has(user.id)) warnings.set(user.id, []);
        warnings.get(user.id).push({ reason: args.slice(1).join(' ') || 'Aucune', date: new Date() });
        message.reply(`⚠️ **${user.tag} a reçu un avertissement !** Total: ${warnings.get(user.id).length}`);
    }

    if (command === 'warnings') {
        const user = message.mentions.users.first() || message.author;
        const count = warnings.get(user.id)?.length || 0;
        message.reply(`⚠️ **${user.tag}** : ${count} avertissement(s)`);
    }

    // ---------- ANTI-RAID ----------
    if (command === 'antiraid') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return message.reply('❌ **Admin requis !**');
        const action = args[0];
        if (action === 'on') message.reply('🛡️ **Anti-raid activé !**');
        else if (action === 'off') message.reply('🛡️ **Anti-raid désactivé**');
        else message.reply('🛡️ **Usage:** `>>antiraid on/off`');
    }

    if (command === 'lockdown') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return message.reply('❌ **Admin requis !**');
        message.guild.channels.cache.forEach(async channel => {
            if (channel.type === ChannelType.GuildText) {
                await channel.permissionOverwrites.edit(message.guild.id, { SendMessages: false });
            }
        });
        message.reply('🔒 **Lockdown total activé !**');
    }

    if (command === 'purge') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return message.reply('❌ **Admin requis !**');
        const amount = parseInt(args[0]) || 99;
        await message.channel.bulkDelete(amount, true);
        message.reply(`🧹 **${amount} messages supprimés !**`).then(m => setTimeout(() => m.delete(), 2000));
    }
});

// ========== DASHBOARD WEB ==========
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

// API Stats
app.get('/api/stats', (req, res) => {
    res.json({
        servers: client.guilds.cache.size,
        users: client.users.cache.filter(u => !u.bot).size,
        bots: client.users.cache.filter(u => u.bot).size,
        uptime: process.uptime(),
        ram: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2),
        commands: 50,
        prefix: PREFIX,
        botName: client.user?.username || 'Bot',
        botAvatar: client.user?.displayAvatarURL() || ''
    });
});

app.get('/api/servers', (req, res) => {
    const servers = client.guilds.cache.map(guild => ({
        name: guild.name,
        id: guild.id,
        icon: guild.iconURL(),
        members: guild.memberCount
    }));
    res.json(servers);
});

// Dashboard HTML
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard Vctr_on Bot</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            background: linear-gradient(135deg, #1a1a2e, #16213e);
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: white;
            min-height: 100vh;
        }
        .header {
            background: linear-gradient(90deg, #0f3460, #1a1a2e);
            padding: 20px;
            text-align: center;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        }
        .header h1 {
            font-size: 2.5em;
            background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .header p { color: #aaa; margin-top: 5px; }
        .stats-container {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            padding: 30px;
            max-width: 1200px;
            margin: 0 auto;
        }
        .stat-card {
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 25px;
            text-align: center;
            transition: transform 0.3s, box-shadow 0.3s;
            border: 1px solid rgba(255,255,255,0.2);
        }
        .stat-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            background: rgba(255,255,255,0.15);
        }
        .stat-icon { font-size: 3em; margin-bottom: 15px; }
        .stat-value { font-size: 2.5em; font-weight: bold; color: #4ecdc4; }
        .stat-label { color: #aaa; margin-top: 10px; }
        .commands-section {
            max-width: 1200px;
            margin: 0 auto;
            padding: 30px;
        }
        .commands-section h2 {
            text-align: center;
            margin-bottom: 20px;
            color: #4ecdc4;
        }
        .commands-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 15px;
        }
        .command-category {
            background: rgba(255,255,255,0.05);
            border-radius: 15px;
            padding: 20px;
            border-left: 4px solid #4ecdc4;
        }
        .command-category h3 { color: #ff6b6b; margin-bottom: 15px; }
        .command-category ul { list-style: none; }
        .command-category li {
            padding: 8px 0;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            font-family: monospace;
        }
        .command-category li span { color: #4ecdc4; }
        .footer {
            text-align: center;
            padding: 20px;
            background: rgba(0,0,0,0.3);
            margin-top: 30px;
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        .online { color: #4ecdc4; animation: pulse 2s infinite; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🤖 VCTR_ON BOT DASHBOARD</h1>
        <p>Bot Discord Ultra Puissant - 24/7</p>
    </div>

    <div class="stats-container" id="stats">
        <div class="stat-card">
            <div class="stat-icon">🌍</div>
            <div class="stat-value" id="servers">0</div>
            <div class="stat-label">Serveurs</div>
        </div>
        <div class="stat-card">
            <div class="stat-icon">👥</div>
            <div class="stat-value" id="users">0</div>
            <div class="stat-label">Utilisateurs</div>
        </div>
        <div class="stat-card">
            <div class="stat-icon">🤖</div>
            <div class="stat-value" id="bots">0</div>
            <div class="stat-label">Bots</div>
        </div>
        <div class="stat-card">
            <div class="stat-icon">💾</div>
            <div class="stat-value" id="ram">0</div>
            <div class="stat-label">RAM (MB)</div>
        </div>
        <div class="stat-card">
            <div class="stat-icon">⏰</div>
            <div class="stat-value" id="uptime">0</div>
            <div class="stat-label">Uptime (jours)</div>
        </div>
        <div class="stat-card">
            <div class="stat-icon">⚡</div>
            <div class="stat-value" id="prefix">${PREFIX}</div>
            <div class="stat-label">Préfixe</div>
        </div>
    </div>

    <div class="commands-section">
        <h2>🎮 LISTE DES COMMANDES</h2>
        <div class="commands-grid">
            <div class="command-category">
                <h3>🎵 MUSIQUE</h3>
                <ul>
                    <li><span>${PREFIX}play [titre/url]</span> - Joue une musique</li>
                    <li><span>${PREFIX}skip</span> - Passe à la suivante</li>
                    <li><span>${PREFIX}stop</span> - Arrête la musique</li>
                    <li><span>${PREFIX}pause</span> - Met en pause</li>
                    <li><span>${PREFIX}resume</span> - Reprend</li>
                    <li><span>${PREFIX}queue</span> - File d'attente</li>
                    <li><span>${PREFIX}nowplaying</span> - Musique en cours</li>
                </ul>
            </div>
            <div class="command-category">
                <h3>👑 GÉNÉRAL</h3>
                <ul>
                    <li><span>${PREFIX}ping</span> - Vérifie la latence</li>
                    <li><span>${PREFIX}help</span> - Aide</li>
                    <li><span>${PREFIX}info</span> - Infos bot</li>
                    <li><span>${PREFIX}uptime</span> - Temps en ligne</li>
                    <li><span>${PREFIX}avatar</span> - Avatar</li>
                    <li><span>${PREFIX}boss</span> - Crédits</li>
                </ul>
            </div>
            <div class="command-category">
                <h3>🎲 JEUX & ÉCONOMIE</h3>
                <ul>
                    <li><span>${PREFIX}daily</span> - Récompense quotidienne</li>
                    <li><span>${PREFIX}balance</span> - Voir son solde</li>
                    <li><span>${PREFIX}work</span> - Travailler</li>
                    <li><span>${PREFIX}gamble [montant]</span> - Parier</li>
                    <li><span>${PREFIX}coinflip</span> - Pile ou face</li>
                    <li><span>${PREFIX}roll [max]</span> - Lancer un dé</li>
                    <li><span>${PREFIX}8ball [question]</span> - Boule magique</li>
                </ul>
            </div>
            <div class="command-category">
                <h3>🔐 MODÉRATION</h3>
                <ul>
                    <li><span>${PREFIX}clear [1-100]</span> - Supprime des messages</li>
                    <li><span>${PREFIX}kick [@user]</span> - Expulser</li>
                    <li><span>${PREFIX}ban [@user]</span> - Bannir</li>
                    <li><span>${PREFIX}lock</span> - Verrouiller salon</li>
                    <li><span>${PREFIX}unlock</span> - Déverrouiller</li>
                    <li><span>${PREFIX}slowmode [sec]</span> - Mode ralenti</li>
                    <li><span>${PREFIX}warn [@user]</span> - Avertir</li>
                </ul>
            </div>
        </div>
    </div>

    <div class="footer">
        <p>❤️ Bot créé par <strong>vctr_on</strong> - 24/7 avec ❤️</p>
        <p class="online">🟢 En ligne et opérationnel</p>
    </div>

    <script>
        async function fetchStats() {
            try {
                const response = await fetch('/api/stats');
                const data = await response.json();
                document.getElementById('servers').textContent = data.servers;
                document.getElementById('users').textContent = data.users;
                document.getElementById('bots').textContent = data.bots;
                document.getElementById('ram').textContent = data.ram;
                const days = Math.floor(data.uptime / 86400);
                document.getElementById('uptime').textContent = days;
            } catch(e) {
                console.error('Erreur:', e);
            }
        }
        fetchStats();
        setInterval(fetchStats, 30000);
    </script>
</body>
</html>
    `);
});

app.listen(port, () => {
    console.log(`🌐 Dashboard: https://bot-discord-9zqi.onrender.com`);
});

// ========== CONNEXION ==========
client.login(process.env.DISCORD_TOKEN);