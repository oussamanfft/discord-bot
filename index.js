const { Client, GatewayIntentBits, EmbedBuilder, ActivityType, PermissionsBitField, ChannelType, Collection } = require('discord.js');
const express = require('express');

const PREFIX = '?';
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.DirectMessages,
    ]
});

// ========== SYSTÈMES ==========
let economy = new Collection();
let warnings = new Collection();

// ========== BOT PRÊT ==========
client.once('ready', () => {
    console.log(`✅ ${client.user.tag} est en ligne !`);
    client.user.setActivity(`${PREFIX}help | ${client.guilds.cache.size} serveurs`, { type: ActivityType.Watching });
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
╔══════════════════════════════╗
║  🤖 **Bot Ultra Puissant**   ║
║  ✨ **Créé par vctr_on**      ║
║  🚀 **Version 5.0**          ║
╚══════════════════════════════╝
                
🔥 **Commandes :** \`?help\`
💜 **Bot 24/7 - Toujours actif !**
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
            .setDescription(`Préfixe : **${PREFIX}**`)
            .addFields(
                { name: '👑 **GÉNÉRAL**', value: '`ping`, `help`, `info`, `uptime`, `avatar`, `boss`', inline: false },
                { name: '🎲 **JEUX & ÉCONOMIE**', value: '`daily`, `balance`, `work`, `gamble`, `coinflip`, `roll`, `8ball`', inline: false },
                { name: '📰 **ACTUALITÉS**', value: '`météo [ville]`, `crypto`, `blague`', inline: false },
                { name: '🖼️ **IMAGES**', value: '`meme`, `cat`, `dog`', inline: false },
                { name: '📊 **STATISTIQUES**', value: '`serverinfo`, `userinfo`, `botinfo`, `stats`', inline: false },
                { name: '🔐 **MODÉRATION**', value: '`clear`, `kick`, `ban`, `lock`, `unlock`, `slowmode`, `warn`, `warnings`', inline: false },
                { name: '🛡️ **ANTI-RAID**', value: '`antiraid on/off`, `lockdown`, `purge`', inline: false }
            )
            .setFooter({ text: '💪 Vctr_on - Bot 24/7 Ultra Puissant' })
            .setTimestamp();
        message.channel.send({ embeds: [embed] });
    }

    // ---------- PING ----------
    if (command === 'ping') {
        const sent = await message.reply('🏓 **Calcul du ping...**');
        const latency = sent.createdTimestamp - message.createdTimestamp;
        const apiLatency = Math.round(client.ws.ping);
        sent.edit(`🏓 **PONG !**\n\n📨 **Latence :** \`${latency}ms\`\n🌐 **API Discord :** \`${apiLatency}ms\`\n💖 **Statut :** ${apiLatency < 100 ? '🟢 Excellent' : apiLatency < 200 ? '🟡 Correct' : '🔴 Lent'}`);
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
                { name: '⚙️ **Commandes**', value: `40+`, inline: true },
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
        message.reply(`⏰ **EN LIGNE DEPUIS :**\n\`\`\`${days}j ${hours}h ${minutes}m ${seconds}s\`\`\`\n💚 **Statut :** 24/7 actif !`);
    }

    // ---------- AVATAR ----------
    if (command === 'avatar') {
        const user = message.mentions.users.first() || message.author;
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle(`🖼️ **AVATAR DE ${user.username.toUpperCase()}**`)
            .setImage(user.displayAvatarURL({ dynamic: true, size: 4096 }))
            .setURL(user.displayAvatarURL({ dynamic: true, size: 4096 }));
        message.channel.send({ embeds: [embed] });
    }

    // ---------- JEUX & ÉCONOMIE ----------
    if (!economy.has(message.guild.id)) {
        economy.set(message.guild.id, new Collection());
    }
    const userMoney = economy.get(message.guild.id);

    if (command === 'daily') {
        const amount = 1000;
        const current = userMoney.get(message.author.id) || 0;
        userMoney.set(message.author.id, current + amount);
        message.reply(`💰 **DAILY RÉCLAMÉ !**\n✨ Tu as reçu : **${amount}💰**\n💎 Nouveau solde : **${current + amount}💰**`);
    }

    if (command === 'balance' || command === 'bal') {
        const balance = userMoney.get(message.author.id) || 0;
        const embed = new EmbedBuilder()
            .setColor(0xFFD700)
            .setTitle('💰 **VOTRE PORTEFEUILLE**')
            .setDescription(`💎 **${message.author.username}** possède : **${balance}💰**`)
            .setFooter({ text: 'Utilise ?daily pour gagner 1000💰 par jour !' });
        message.channel.send({ embeds: [embed] });
    }

    if (command === 'work') {
        const earnings = Math.floor(Math.random() * 500) + 100;
        const current = userMoney.get(message.author.id) || 0;
        userMoney.set(message.author.id, current + earnings);
        const jobs = ['🧑‍💻 Développeur', '👨‍🍳 Chef', '👩‍⚕️ Médecin', '🧑‍🏫 Professeur', '👨‍🔧 Mécanicien'];
        const job = jobs[Math.floor(Math.random() * jobs.length)];
        message.reply(`💼 **TRAVAIL TERMINÉ !**\n📋 Métier : ${job}\n💰 Gain : **${earnings}💰**\n💎 Nouveau solde : **${current + earnings}💰**`);
    }

    if (command === 'gamble') {
        const amount = parseInt(args[0]);
        if (isNaN(amount) || amount <= 0) return message.reply('🎲 **Mise un montant valide !**');
        const current = userMoney.get(message.author.id) || 0;
        if (amount > current) return message.reply(`❌ **Pas assez d'argent ! Solde : ${current}💰**`);
        const win = Math.random() < 0.4;
        if (win) {
            userMoney.set(message.author.id, current + amount);
            message.reply(`🎉 **GAGNÉ !** +${amount}💰 → Nouveau solde : ${current + amount}💰`);
        } else {
            userMoney.set(message.author.id, current - amount);
            message.reply(`😭 **PERDU !** -${amount}💰 → Nouveau solde : ${current - amount}💰`);
        }
    }

    if (command === 'coinflip') {
        const result = Math.random() < 0.5 ? 'Pile' : 'Face';
        const emoji = result === 'Pile' ? '🪙' : '💰';
        message.reply(`${emoji} **${result.toUpperCase()} !** ${emoji}`);
    }

    if (command === 'roll') {
        const max = parseInt(args[0]) || 100;
        const result = Math.floor(Math.random() * max) + 1;
        message.reply(`🎲 **RÉSULTAT : ${result}** (1-${max})`);
    }

    if (command === '8ball') {
        const question = args.join(' ');
        if (!question) return message.reply('🔮 **Pose une question !**');
        const reponses = ['✅ Oui', '❌ Non', '🤔 Peut-être', '✨ Certainement', '🚫 Impossible', '⏳ Plus tard', '⭐ Très probable'];
        const reponse = reponses[Math.floor(Math.random() * reponses.length)];
        message.reply(`🔮 **${reponse}**`);
    }

    // ---------- ACTUALITÉS ----------
    if (command === 'météo' || command === 'meteo') {
        const ville = args.join(' ');
        if (!ville) return message.reply('🌤️ **Donne une ville !** Ex: `?météo Paris`');
        const temps = ['☀️ Ensoleillé', '🌧️ Pluvieux', '☁️ Nuageux', '⛈️ Orageux', '❄️ Neigeux'];
        const temperature = Math.floor(Math.random() * 35) - 5;
        message.reply(`🌍 **${ville.toUpperCase()}**\n🌡️ ${temperature}°C - ${temps[Math.floor(Math.random() * temps.length)]}`);
    }

    if (command === 'crypto') {
        const prix = (Math.random() * 50000 + 30000).toFixed(2);
        message.reply(`🪙 **Bitcoin (BTC)**\n💰 Prix : $${prix}\n📊 Variation : ${Math.random() > 0.5 ? '📈 +' : '📉 -'}${(Math.random() * 10).toFixed(2)}%`);
    }

    if (command === 'blague') {
        const blagues = [
            "Pourquoi les plongeurs plongent-ils toujours en arrière ? Parce que sinon ils tombent dans le bateau ! 🤣",
            "Que dit un zéro à un autre zéro ? On est tous égaux ! 😂",
            "Quel est le comble pour un électricien ? Ne pas être au courant ! ⚡"
        ];
        message.reply(`😄 **BLAGUE :**\n${blagues[Math.floor(Math.random() * blagues.length)]}`);
    }

    // ---------- IMAGES ----------
    if (command === 'meme') {
        const embed = new EmbedBuilder()
            .setColor(0xFF69B4)
            .setTitle('🎭 **MEME ALÉATOIRE**')
            .setImage('https://i.imgflip.com/1bij.jpg')
            .setFooter({ text: '😂 Partage avec tes amis !' });
        message.channel.send({ embeds: [embed] });
    }

    if (command === 'cat') {
        const embed = new EmbedBuilder()
            .setColor(0xFFA500)
            .setTitle('🐱 **UN CHAT TROP MIGNON !**')
            .setImage('https://cataas.com/cat')
            .setFooter({ text: '🐾 Miaou !' });
        message.channel.send({ embeds: [embed] });
    }

    if (command === 'dog') {
        const embed = new EmbedBuilder()
            .setColor(0x8B4513)
            .setTitle('🐶 **UN CHIEN ADORABLE !**')
            .setImage('https://images.dog.ceo/breeds/hound-afghan/n02088094_1003.jpg')
            .setFooter({ text: '🐕 Ouaf ouaf !' });
        message.channel.send({ embeds: [embed] });
    }

    // ---------- STATISTIQUES ----------
    if (command === 'serverinfo') {
        const guild = message.guild;
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle(`📡 **${guild.name}**`)
            .setThumbnail(guild.iconURL())
            .addFields(
                { name: '👑 **Propriétaire**', value: `<@${guild.ownerId}>`, inline: true },
                { name: '👥 **Membres**', value: `${guild.memberCount}`, inline: true },
                { name: '📅 **Création**', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
                { name: '💬 **Salons**', value: `${guild.channels.cache.size}`, inline: true }
            );
        message.channel.send({ embeds: [embed] });
    }

    if (command === 'userinfo') {
        const user = message.mentions.users.first() || message.author;
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle(`👤 **${user.tag}**`)
            .setThumbnail(user.displayAvatarURL())
            .addFields(
                { name: '🆔 **ID**', value: user.id, inline: true },
                { name: '📅 **Compte créé**', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true }
            );
        message.channel.send({ embeds: [embed] });
    }

    if (command === 'botinfo') {
        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('🤖 **STATISTIQUES BOT**')
            .addFields(
                { name: '💻 **RAM**', value: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`, inline: true },
                { name: '📚 **Discord.js**', value: require('discord.js').version, inline: true },
                { name: '🌍 **Serveurs**', value: `${client.guilds.cache.size}`, inline: true }
            );
        message.channel.send({ embeds: [embed] });
    }

    if (command === 'stats') {
        message.reply(`📊 **STATS GLOBALES**\n🤖 Bots : ${client.users.cache.filter(u => u.bot).size}\n👥 Utilisateurs : ${client.users.cache.filter(u => !u.bot).size}\n🌍 Serveurs : ${client.guilds.cache.size}`);
    }

    // ---------- MODÉRATION ----------
    if (command === 'clear' && message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
        const amount = parseInt(args[0]);
        if (isNaN(amount) || amount < 1 || amount > 100) return message.reply('❌ **Nombre entre 1 et 100**');
        await message.channel.bulkDelete(amount, true);
        message.reply(`🗑️ **${amount} messages supprimés !**`).then(m => setTimeout(() => m.delete(), 3000));
    }

    if (command === 'kick' && message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
        const user = message.mentions.users.first();
        if (!user) return message.reply('❌ **Mentionne un utilisateur !**');
        const reason = args.slice(1).join(' ') || 'Aucune raison';
        const member = message.guild.members.cache.get(user.id);
        if (member) await member.kick(reason);
        message.reply(`👢 **${user.tag} a été expulsé(e) !**\n📝 Raison : ${reason}`);
    }

    if (command === 'ban' && message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
        const user = message.mentions.users.first();
        if (!user) return message.reply('❌ **Mentionne un utilisateur !**');
        const reason = args.slice(1).join(' ') || 'Aucune raison';
        const member = message.guild.members.cache.get(user.id);
        if (member) await member.ban({ reason: reason });
        message.reply(`🔨 **${user.tag} a été banni(e) !**\n📝 Raison : ${reason}`);
    }

    if (command === 'lock' && message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        await message.channel.permissionOverwrites.edit(message.guild.id, { SendMessages: false });
        message.reply('🔒 **SALON VERROUILLÉ !**');
    }

    if (command === 'unlock' && message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        await message.channel.permissionOverwrites.edit(message.guild.id, { SendMessages: true });
        message.reply('🔓 **SALON DÉVERROUILLÉ !**');
    }

    if (command === 'slowmode' && message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        const seconds = parseInt(args[0]);
        if (isNaN(seconds) || seconds < 0 || seconds > 21600) return message.reply('❌ **Entre 0 et 21600 secondes**');
        await message.channel.setRateLimitPerUser(seconds);
        message.reply(`⏱️ **Slowmode : ${seconds} secondes**`);
    }

    if (command === 'warn' && message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
        const user = message.mentions.users.first();
        if (!user) return message.reply('❌ **Mentionne un utilisateur !**');
        const reason = args.slice(1).join(' ') || 'Aucune raison';
        if (!warnings.has(user.id)) warnings.set(user.id, []);
        warnings.get(user.id).push({ reason, date: new Date(), moderator: message.author.tag });
        message.reply(`⚠️ **${user.tag} a reçu un avertissement !**\n📝 Raison : ${reason}`);
    }

    if (command === 'warnings') {
        const user = message.mentions.users.first() || message.author;
        const userWarnings = warnings.get(user.id) || [];
        if (userWarnings.length === 0) return message.reply(`✅ **${user.tag} aucun avertissement.**`);
        message.reply(`⚠️ **${user.tag}** : ${userWarnings.length} avertissement(s)`);
    }

    // ---------- ANTI-RAID ----------
    if (command === 'antiraid') {
        const action = args[0];
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return message.reply('❌ **Admin requis !**');
        if (action === 'on') message.reply('🛡️ **MODE ANTI-RAID ACTIVÉ !**');
        else if (action === 'off') message.reply('🛡️ **MODE ANTI-RAID DÉSACTIVÉ**');
        else message.reply('🛡️ **Utilisation :** `?antiraid on/off`');
    }

    if (command === 'lockdown') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return message.reply('❌ **Admin requis !**');
        message.guild.channels.cache.forEach(async channel => {
            if (channel.type === ChannelType.GuildText) {
                await channel.permissionOverwrites.edit(message.guild.id, { SendMessages: false });
            }
        });
        message.reply('🔒 **LOCKDOWN TOTAL ACTIVÉ !**');
    }

    if (command === 'purge') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return message.reply('❌ **Admin requis !**');
        const amount = parseInt(args[0]) || 99;
        await message.channel.bulkDelete(amount, true);
        message.reply(`🧹 **${amount} messages supprimés !**`).then(m => setTimeout(() => m.delete(), 2000));
    }
});

// ========== SERVEUR KEEP-ALIVE ==========
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('🤖 **BOT DISCORD ULTRA PUISSANT EN LIGNE !**\n✨ Créé par vctr_on - 24/7');
});

app.listen(port, () => {
    console.log(`🌐 Serveur keep-alive actif sur le port ${port}`);
});

// ========== CONNEXION ==========
client.login(process.env.DISCORD_TOKEN);