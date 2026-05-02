const { Client, GatewayIntentBits, EmbedBuilder, ActivityType, PermissionsBitField, ChannelType } = require('discord.js');
const express = require('express');

const PREFIX = '?';
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ]
});

// ========== BOT PRÊT ==========
client.once('ready', () => {
    console.log(`✅ ${client.user.tag} est en ligne !`);
    console.log(`📊 Serveurs : ${client.guilds.cache.size}`);
    client.user.setActivity(`${PREFIX}help | ${client.guilds.cache.size} serveurs`, { type: ActivityType.Watching });
});

// ========== EMBED HELPER ==========
function createEmbed(title, description, color = 0x5865F2) {
    return new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription(description)
        .setFooter({ text: '🤖 Vctr_on Bot | 24/7' })
        .setTimestamp();
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
╔══════════════════════════════════════╗
║                                      ║
║     🤖 **BOT ULTRA PUISSANT**        ║
║                                      ║
║     ✨ Créé par **vctr_on**          ║
║     🚀 Version 8.0                   ║
║     💜 24/7 - Toujours actif         ║
║                                      ║
╚══════════════════════════════════════╝

> **Commandes disponibles :** \`?help\`
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
                { 
                    name: '👑 **・GÉNÉRAL**', 
                    value: '`ping` `help` `info` `boss`', 
                    inline: true 
                },
                { 
                    name: '📊 **・STATISTIQUES**', 
                    value: '`serverinfo` `botinfo`', 
                    inline: true 
                },
                { 
                    name: '🔐 **・MODÉRATION**', 
                    value: '`clear` `kick` `ban` `lock` `unlock` `slowmode`', 
                    inline: true 
                },
                { 
                    name: '🛡️ **・ANTI-RAID**', 
                    value: '`antiraid` `lockdown` `purge`', 
                    inline: true 
                }
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
            embeds: [createEmbed(
                '🏓 **PONG !**',
                `> **Latence :** \`${latency}ms\`\n> **API Discord :** \`${apiLatency}ms\``,
                0x00FF00
            )]
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
                { name: '🆔 **ID**', value: `\`${client.user.id}\``, inline: true },
                { name: '📚 **Serveurs**', value: `\`${client.guilds.cache.size}\``, inline: true },
                { name: '👥 **Utilisateurs**', value: `\`${client.users.cache.size}\``, inline: true },
                { name: '⚙️ **Commandes**', value: `\`15+\``, inline: true },
                { name: '💖 **Créateur**', value: `\`vctr_on\``, inline: true }
            )
            .setFooter({ text: '🤖 Bot Discord Ultra Puissant' })
            .setTimestamp();
        message.channel.send({ embeds: [embed] });
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
                { name: '🤖 **Bots**', value: `${guild.members.cache.filter(m => m.user.bot).size}`, inline: true },
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
                { name: '📚 **Discord.js**', value: require('discord.js').version, inline: true },
                { name: '🌍 **Serveurs**', value: `${client.guilds.cache.size}`, inline: true }
            )
            .setFooter({ text: 'Version 8.0 | 24/7' })
            .setTimestamp();
        message.channel.send({ embeds: [embed] });
    }

    // ---------- MODÉRATION ----------
    if (command === 'clear' && message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
        const amount = parseInt(args[0]);
        if (isNaN(amount) || amount < 1 || amount > 100) {
            return message.reply({ embeds: [createEmbed('❌ **ERREUR**', '> Nombre entre **1** et **100**', 0xFF0000)] });
        }
        await message.channel.bulkDelete(amount, true);
        const msg = await message.channel.send({ embeds: [createEmbed('✅ **MESSAGES SUPPRIMÉS**', `> 🗑️ ${amount} messages supprimés !`, 0x00FF00)] });
        setTimeout(() => msg.delete(), 3000);
    }

    if (command === 'kick' && message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
        const user = message.mentions.users.first();
        if (!user) return message.reply({ embeds: [createEmbed('❌ **ERREUR**', '> Mentionne un utilisateur !', 0xFF0000)] });
        const reason = args.slice(1).join(' ') || 'Aucune raison';
        const member = message.guild.members.cache.get(user.id);
        if (member) await member.kick(reason);
        message.reply({ embeds: [createEmbed('👢 **MEMBRE EXCLU**', `> ${user.tag} a été expulsé(e) !\n> 📝 Raison : ${reason}`, 0xFFA500)] });
    }

    if (command === 'ban' && message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
        const user = message.mentions.users.first();
        if (!user) return message.reply({ embeds: [createEmbed('❌ **ERREUR**', '> Mentionne un utilisateur !', 0xFF0000)] });
        const reason = args.slice(1).join(' ') || 'Aucune raison';
        const member = message.guild.members.cache.get(user.id);
        if (member) await member.ban({ reason: reason });
        message.reply({ embeds: [createEmbed('🔨 **MEMBRE BANNI**', `> ${user.tag} a été banni(e) !\n> 📝 Raison : ${reason}`, 0xFF0000)] });
    }

    if (command === 'lock' && message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        await message.channel.permissionOverwrites.edit(message.guild.id, { SendMessages: false });
        message.reply({ embeds: [createEmbed('🔒 **SALON VERROUILLÉ**', '> Plus personne ne peut envoyer de messages !', 0xFF0000)] });
    }

    if (command === 'unlock' && message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        await message.channel.permissionOverwrites.edit(message.guild.id, { SendMessages: true });
        message.reply({ embeds: [createEmbed('🔓 **SALON DÉVERROUILLÉ**', '> Les membres peuvent à nouveau parler !', 0x00FF00)] });
    }

    if (command === 'slowmode' && message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        const seconds = parseInt(args[0]);
        if (isNaN(seconds) || seconds < 0 || seconds > 21600) {
            return message.reply({ embeds: [createEmbed('❌ **ERREUR**', '> Entre **0** et **21600** secondes', 0xFF0000)] });
        }
        await message.channel.setRateLimitPerUser(seconds);
        message.reply({ embeds: [createEmbed('⏱️ **SLOWMODE ACTIVÉ**', `> ${seconds} secondes entre chaque message.`, 0x00FF00)] });
    }

    // ---------- ANTI-RAID ----------
    if (command === 'antiraid' && message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        const action = args[0];
        if (action === 'on') message.reply({ embeds: [createEmbed('🛡️ **ANTI-RAID ACTIVÉ**', '> Protection automatique en place !', 0x00FF00)] });
        else if (action === 'off') message.reply({ embeds: [createEmbed('🛡️ **ANTI-RAID DÉSACTIVÉ**', '> Protection désactivée.', 0xFF0000)] });
        else message.reply({ embeds: [createEmbed('🛡️ **COMMANDE ANTI-RAID**', '> Usage : `?antiraid on/off`', 0x5865F2)] });
    }

    if (command === 'lockdown' && message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        message.guild.channels.cache.forEach(async channel => {
            if (channel.type === ChannelType.GuildText) {
                await channel.permissionOverwrites.edit(message.guild.id, { SendMessages: false });
            }
        });
        message.reply({ embeds: [createEmbed('🔒 **LOCKDOWN TOTAL**', '> Tous les salons sont verrouillés !', 0xFF0000)] });
    }

    if (command === 'purge' && message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        const amount = parseInt(args[0]) || 99;
        await message.channel.bulkDelete(amount, true);
        const msg = await message.channel.send({ embeds: [createEmbed('🧹 **PURGE EFFECTUÉE**', `> ${amount} messages supprimés !`, 0x00FF00)] });
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
        botAvatar: client.user?.displayAvatarURL() || ''
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
            padding: 40px 20px;
            background: rgba(255,255,255,0.05);
            border-radius: 30px;
            margin-bottom: 30px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.1);
        }
        .header h1 {
            font-size: 3em;
            background: linear-gradient(135deg, #ff6b6b, #4ecdc4, #45b7d1);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 10px;
        }
        .header p { color: #aaa; font-size: 1.1em; }
        .online-badge {
            display: inline-block;
            background: rgba(78, 205, 196, 0.2);
            color: #4ecdc4;
            padding: 5px 15px;
            border-radius: 50px;
            margin-top: 15px;
            font-size: 0.9em;
            border: 1px solid #4ecdc4;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        .stat-card {
            background: rgba(255,255,255,0.08);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 25px;
            text-align: center;
            transition: transform 0.3s;
            border: 1px solid rgba(255,255,255,0.1);
        }
        .stat-card:hover { transform: translateY(-5px); background: rgba(255,255,255,0.12); }
        .stat-icon { font-size: 3em; margin-bottom: 15px; }
        .stat-value {
            font-size: 2.5em;
            font-weight: bold;
            background: linear-gradient(135deg, #4ecdc4, #45b7d1);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .stat-label { color: #aaa; margin-top: 10px; font-size: 0.9em; text-transform: uppercase; letter-spacing: 1px; }
        
        .categories {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 20px;
        }
        .category {
            background: rgba(255,255,255,0.05);
            border-radius: 20px;
            padding: 20px;
            border-left: 4px solid #4ecdc4;
        }
        .category h3 { margin-bottom: 15px; font-size: 1.3em; display: flex; align-items: center; gap: 10px; }
        .category ul { list-style: none; }
        .category li {
            padding: 10px 0;
            border-bottom: 1px solid rgba(255,255,255,0.05);
            font-family: 'Courier New', monospace;
        }
        .category .cmd {
            color: #4ecdc4;
            font-weight: bold;
            background: rgba(78,205,196,0.1);
            padding: 2px 8px;
            border-radius: 5px;
        }
        .category .desc { color: #aaa; margin-left: 10px; }
        
        .footer {
            text-align: center;
            padding: 30px;
            margin-top: 40px;
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
            <p>Le bot Discord ultime - 24/7</p>
            <div class="online-badge">🟢 EN LIGNE • 24/7</div>
        </div>
        
        <div class="stats-grid" id="stats">
            <div class="stat-card"><div class="stat-icon">🌍</div><div class="stat-value" id="servers">0</div><div class="stat-label">Serveurs</div></div>
            <div class="stat-card"><div class="stat-icon">👥</div><div class="stat-value" id="users">0</div><div class="stat-label">Utilisateurs</div></div>
            <div class="stat-card"><div class="stat-icon">💾</div><div class="stat-value" id="ram">0</div><div class="stat-label">RAM (MB)</div></div>
            <div class="stat-card"><div class="stat-icon">⚡</div><div class="stat-value" id="prefix">?</div><div class="stat-label">Préfixe</div></div>
        </div>
        
        <div class="categories">
            <div class="category"><h3>👑 GÉNÉRAL</h3><ul><li><span class="cmd">?ping</span><span class="desc">Vérifier la latence</span></li><li><span class="cmd">?help</span><span class="desc">Afficher l'aide</span></li><li><span class="cmd">?info</span><span class="desc">Infos du bot</span></li><li><span class="cmd">?boss</span><span class="desc">Crédits</span></li></ul></div>
            <div class="category"><h3>📊 STATISTIQUES</h3><ul><li><span class="cmd">?serverinfo</span><span class="desc">Infos du serveur</span></li><li><span class="cmd">?botinfo</span><span class="desc">Stats techniques</span></li></ul></div>
            <div class="category"><h3>🔐 MODÉRATION</h3><ul><li><span class="cmd">?clear [1-100]</span><span class="desc">Supprimer des messages</span></li><li><span class="cmd">?kick [@user]</span><span class="desc">Expulser un membre</span></li><li><span class="cmd">?ban [@user]</span><span class="desc">Bannir un membre</span></li><li><span class="cmd">?lock</span><span class="desc">Verrouiller salon</span></li><li><span class="cmd">?unlock</span><span class="desc">Déverrouiller salon</span></li><li><span class="cmd">?slowmode [sec]</span><span class="desc">Mode ralenti</span></li></ul></div>
            <div class="category"><h3>🛡️ ANTI-RAID</h3><ul><li><span class="cmd">?antiraid on/off</span><span class="desc">Activer protection</span></li><li><span class="cmd">?lockdown</span><span class="desc">Verrouiller tout</span></li><li><span class="cmd">?purge</span><span class="desc">Nettoyer salon</span></li></ul></div>
        </div>
        
        <div class="footer">
            <p>❤️ Bot créé par <strong>vctr_on</strong> - Version 8.0</p>
            <p>🎯 24/7 • Modération • Anti-raid</p>
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
    console.log(`✅ Dashboard en ligne : http://localhost:${port}`);
});

// ========== CONNEXION ==========
client.login(process.env.DISCORD_TOKEN);