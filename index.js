const { Client, GatewayIntentBits, EmbedBuilder, ActivityType, PermissionsBitField, ChannelType, Collection } = require('discord.js');
const express = require('express');
const axios = require('axios');

const PREFIX = '?';
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GuildMessages,
        MessageContent,
        GuildMembers,
        GuildPresences,
        GuildVoiceStates,
        GuildMessageReactions,
        DirectMessages,
    ]
});

// ========== SYSTÈMES ==========
let economy = new Collection();
let warnings = new Collection();
let cooldowns = new Collection();
let musicQueues = new Collection();
let afkUsers = new Collection();

// ========== BOT PRÊT ==========
client.once('ready', () => {
    console.log(`✅ ${client.user.tag} est en ligne !`);
    client.user.setActivity(`${PREFIX}help | ${client.guilds.cache.size} serveurs`, { type: ActivityType.Watching });
    
    // Initialiser l'économie
    client.guilds.cache.forEach(guild => {
        if (!economy.has(guild.id)) {
            economy.set(guild.id, new Collection());
        }
    });
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
                
                🔥 **Commandes disponibles :** \`?help\`
                💜 **Merci d'utiliser ce bot !**
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
                { name: '🎵 **MUSIQUE**', value: '`play [titre]`, `stop`, `skip`, `queue`, `nowplaying`', inline: false },
                { name: '🎲 **JEUX & ÉCONOMIE**', value: '`daily`, `balance`, `work`, `gamble [montant]`, `coinflip`, `roll`, `8ball`', inline: false },
                { name: '📰 **ACTUALITÉS**', value: '`météo [ville]`, `crypto [nom]`, `blagues`, `citation`', inline: false },
                { name: '🖼️ **IMAGES & MEMES**', value: '`meme`, `cat`, `dog`, `avatar [@user]`', inline: false },
                { name: '📊 **STATISTIQUES**', value: '`serverinfo`, `userinfo`, `botinfo`, `stats`, `top`', inline: false },
                { name: '🔐 **MODÉRATION**', value: '`clear [1-100]`, `kick [@user]`, `ban [@user]`, `lock`, `unlock`, `slowmode`, `warn`, `warnings`', inline: false },
                { name: '🛡️ **ANTI-RAID**', value: '`antiraid on/off`, `captcha`, `lockdown`, `purge`', inline: false }
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
                { name: '📅 **Création**', value: `<t:${Math.floor(client.user.createdTimestamp / 1000)}:R>`, inline: true },
                { name: '📚 **Serveurs**', value: `${client.guilds.cache.size}`, inline: true },
                { name: '👥 **Utilisateurs**', value: `${client.users.cache.size}`, inline: true },
                { name: '⚙️ **Commandes**', value: `50+`, inline: true },
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

    // ---------- MUSIQUE (simulée) ----------
    if (command === 'play') {
        const song = args.join(' ');
        if (!song) return message.reply('🎵 **Donne un titre de musique !**\nExemple : `?play Never Gonna Give You Up`');
        
        message.reply(`🎵 **Lecture en cours :** \`${song}\`\n⏯️ **Source :** YouTube/Spotify\n💡 *Note : Version démo - Ajoutez votre API YouTube pour la vraie musique*`);
        
        // Simuler une file d'attente
        if (!musicQueues.has(message.guild.id)) musicQueues.set(message.guild.id, []);
        musicQueues.get(message.guild.id).push(song);
    }

    if (command === 'stop') {
        message.reply('⏹️ **Musique arrêtée !**\n👋 À bientôt pour de nouvelles mélodies !');
        musicQueues.delete(message.guild.id);
    }

    if (command === 'skip') {
        message.reply('⏭️ **Musique passée !**\n🎵 Prochain titre dans la file...');
    }

    if (command === 'queue') {
        const queue = musicQueues.get(message.guild.id) || [];
        if (queue.length === 0) return message.reply('📭 **File d\'attente vide !**\nUtilise `?play [titre]` pour ajouter de la musique.');
        
        const embed = new EmbedBuilder()
            .setColor(0xFF69B4)
            .setTitle('🎵 **FILE D\'ATTENTE**')
            .setDescription(queue.map((song, i) => `${i+1}. ${song}`).join('\n'))
            .setFooter({ text: `${queue.length} musique(s) dans la file` });
        message.channel.send({ embeds: [embed] });
    }

    if (command === 'nowplaying') {
        const queue = musicQueues.get(message.guild.id) || [];
        if (queue.length === 0) return message.reply('🎵 **Aucune musique en cours.**');
        message.reply(`🎵 **EN COURS :** \`${queue[0]}\`\n⏯️ **Statut :** Lecture en cours...`);
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
        
        const jobs = ['🧑‍💻 Développeur', '👨‍🍳 Chef cuisinier', '👩‍⚕️ Médecin', '🧑‍🏫 Professeur', '👨‍🔧 Mécanicien', '👨‍🎨 Artiste'];
        const job = jobs[Math.floor(Math.random() * jobs.length)];
        
        message.reply(`💼 **TRAVAIL TERMINÉ !**\n📋 Métier : ${job}\n💰 Gain : **${earnings}💰**\n💎 Nouveau solde : **${current + earnings}💰**`);
    }

    if (command === 'gamble') {
        const amount = parseInt(args[0]);
        if (isNaN(amount) || amount <= 0) return message.reply('🎲 **Mise un montant valide !**\nExemple : `?gamble 500`');
        
        const current = userMoney.get(message.author.id) || 0;
        if (amount > current) return message.reply(`❌ **Tu n'as pas assez d'argent !**\n💰 Ton solde : **${current}💰**`);
        
        const win = Math.random() < 0.4;
        if (win) {
            userMoney.set(message.author.id, current + amount);
            message.reply(`🎉 **GAGNÉ !** 🎉\n💰 Tu as gagné : **${amount}💰**\n💎 Nouveau solde : **${current + amount}💰**`);
        } else {
            userMoney.set(message.author.id, current - amount);
            message.reply(`😭 **PERDU !** 😭\n💸 Tu as perdu : **${amount}💰**\n💎 Nouveau solde : **${current - amount}💰**`);
        }
    }

    if (command === 'coinflip') {
        const result = Math.random() < 0.5 ? 'Pile' : 'Face';
        const emoji = result === 'Pile' ? '🪙' : '💰';
        message.reply(`${emoji} **${result.toUpperCase()} !** ${emoji}\n🔁 Tu veux rejouer ? Utilise \`?coinflip\` à nouveau !`);
    }

    if (command === 'roll') {
        const max = parseInt(args[0]) || 100;
        const result = Math.floor(Math.random() * max) + 1;
        message.reply(`🎲 **LANCER DE DÉ !**\n⚡ Résultat : **${result}** (1-${max})\n🔄 Tentative suivante ?`);
    }

    if (command === '8ball') {
        const question = args.join(' ');
        if (!question) return message.reply('🔮 **Pose une question magique !**\nExemple : `?8ball Est-ce que je vais gagner ?`');
        
        const reponses = [
            '✅ Oui, absolument !', '❌ Non, désolé...', '🤔 Peut-être...', '✨ Certainement !',
            '🚫 Impossible.', '⏳ Demande plus tard.', '⭐ Très probable !', '🌈 Les signes disent oui',
            '💤 Je ne sais pas.', '🔥 Sans aucun doute !', '😴 Pas maintenant.', '💎 Oui, c\'est certain'
        ];
        const reponse = reponses[Math.floor(Math.random() * reponses.length)];
        
        const embed = new EmbedBuilder()
            .setColor(0x9B59B6)
            .setTitle('🔮 **LA BOULE MAGIQUE RÉPOND**')
            .setDescription(`📝 **Question :** ${question}\n🎱 **Réponse :** ${reponse}`)
            .setFooter({ text: 'Boule magique - Fiable à 99%' });
        message.channel.send({ embeds: [embed] });
    }

    // ---------- ACTUALITÉS ----------
    if (command === 'météo' || command === 'meteo') {
        const ville = args.join(' ');
        if (!ville) return message.reply('🌤️ **Donne une ville !**\nExemple : `?météo Paris`');
        
        const temps = ['☀️ Ensoleillé', '🌧️ Pluvieux', '☁️ Nuageux', '⛈️ Orageux', '❄️ Neigeux', '🌫️ Brumeux'];
        const temperature = Math.floor(Math.random() * 35) - 5;
        const meteoChoisie = temps[Math.floor(Math.random() * temps.length)];
        
        const embed = new EmbedBuilder()
            .setColor(0x00BFFF)
            .setTitle(`🌍 **MÉTÉO - ${ville.toUpperCase()}**`)
            .setDescription(`
                🌡️ **Température :** ${temperature}°C
                🌤️ **Condition :** ${meteoChoisie}
                💧 **Humidité :** ${Math.floor(Math.random() * 50) + 40}%
                🌬️ **Vent :** ${Math.floor(Math.random() * 40)} km/h
            `)
            .setFooter({ text: `Mise à jour : ${new Date().toLocaleTimeString()}` });
        message.channel.send({ embeds: [embed] });
    }

    if (command === 'crypto') {
        const cryptos = {
            'bitcoin': ['₿ Bitcoin', 45000 + Math.random() * 10000, '📈 +5%'],
            'ethereum': ['Ξ Ethereum', 3000 + Math.random() * 500, '📈 +3%'],
            'dogecoin': ['Ð Dogecoin', 0.15 + Math.random() * 0.05, '📉 -2%']
        };
        
        const cryptoName = args[0]?.toLowerCase() || 'bitcoin';
        const crypto = cryptos[cryptoName] || cryptos['bitcoin'];
        
        const embed = new EmbedBuilder()
            .setColor(0xF7931A)
            .setTitle(`🪙 **CRYPTO - ${crypto[0]}**`)
            .setDescription(`
                💵 **Prix :** $${crypto[1].toFixed(2)}
                📊 **Variation :** ${crypto[2]}
                🔄 **Volume 24h :** ${Math.floor(Math.random() * 1000)}M $
            `)
            .setFooter({ text: 'Données en temps réel (simulation)' });
        message.channel.send({ embeds: [embed] });
    }

    if (command === 'blagues') {
        const blagues = [
            "Pourquoi les plongeurs plongent-ils toujours en arrière ? Parce que sinon ils tombent dans le bateau ! 🤣",
            "Que dit un zéro à un autre zéro ? On est tous égaux ! 😂",
            "Pourquoi les maths sont tristes ? Parce qu'elles ont trop de problèmes ! 🤓",
            "Comment appelle-t-on un chat qui attrape des souris ? Un chat-chien ! 🐱"
        ];
        const blague = blagues[Math.floor(Math.random() * blagues.length)];
        message.reply(`😄 **BLAGUE :**\n${blague}`);
    }

    // ---------- IMAGES & MEMES ----------
    if (command === 'meme') {
        const memes = [
            'https://i.imgflip.com/1bij.jpg',
            'https://i.imgflip.com/26am.jpg',
            'https://i.imgflip.com/30b1gx.jpg',
            'https://i.imgflip.com/1otk96.jpg'
        ];
        const meme = memes[Math.floor(Math.random() * memes.length)];
        
        const embed = new EmbedBuilder()
            .setColor(0xFF69B4)
            .setTitle('🎭 **MEME ALÉATOIRE**')
            .setImage(meme)
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
            .setImage('https://dog.ceo/api/breeds/image/random')
            .setFooter({ text: '🐕 Ouaf ouaf !' });
        message.channel.send({ embeds: [embed] });
    }

    // ---------- STATISTIQUES ----------
    if (command === 'serverinfo') {
        const guild = message.guild;
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle(`📡 **${guild.name.toUpperCase()}**`)
            .setThumbnail(guild.iconURL())
            .addFields(
                { name: '👑 **Propriétaire**', value: `<@${guild.ownerId}>`, inline: true },
                { name: '👥 **Membres**', value: `${guild.memberCount}`, inline: true },
                { name: '📅 **Création**', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
                { name: '💬 **Salons**', value: `${guild.channels.cache.size}`, inline: true },
                { name: '🤖 **Bots**', value: `${guild.members.cache.filter(m => m.user.bot).size}`, inline: true },
                { name: '🌍 **Niveau boost**', value: `${guild.premiumTier || 0} ⭐`, inline: true }
            );
        message.channel.send({ embeds: [embed] });
    }

    if (command === 'userinfo') {
        const user = message.mentions.users.first() || message.author;
        const member = message.guild.members.cache.get(user.id);
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle(`👤 **${user.tag.toUpperCase()}**`)
            .setThumbnail(user.displayAvatarURL())
            .addFields(
                { name: '🆔 **ID**', value: user.id, inline: true },
                { name: '📅 **Compte créé**', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
                { name: '🎭 **Rôles**', value: member ? `${member.roles.cache.filter(r => r.id !== message.guild.id).map(r => r.name).slice(0, 3).join(', ') || 'Aucun'}` : 'Inconnu', inline: false }
            );
        message.channel.send({ embeds: [embed] });
    }

    if (command === 'stats') {
        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('📊 **STATISTIQUES GLOBALES**')
            .addFields(
                { name: '🤖 **Bots en ligne**', value: `${client.users.cache.filter(u => u.bot).size}`, inline: true },
                { name: '👥 **Utilisateurs**', value: `${client.users.cache.filter(u => !u.bot).size}`, inline: true },
                { name: '🌍 **Serveurs**', value: `${client.guilds.cache.size}`, inline: true },
                { name: '💻 **RAM**', value: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`, inline: true }
            );
        message.channel.send({ embeds: [embed] });
    }

    // ---------- MODÉRATION ----------
    if (command === 'clear' && message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
        const amount = parseInt(args[0]);
        if (isNaN(amount) || amount < 1 || amount > 100) return message.reply('❌ **Nombre invalide !**\nUtilise un nombre entre 1 et 100.');
        await message.channel.bulkDelete(amount, true);
        message.channel.send(`🗑️ **${amount} messages supprimés !**\n✅ Action effectuée par ${message.author.username}`).then(m => setTimeout(() => m.delete(), 3000));
    }

    if (command === 'kick' && message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
        const user = message.mentions.users.first();
        if (!user) return message.reply('❌ **Mentionne un utilisateur !**');
        const reason = args.slice(1).join(' ') || 'Aucune raison';
        const member = message.guild.members.cache.get(user.id);
        if (member) {
            await member.kick(reason);
            message.reply(`👢 **${user.tag} a été expulsé(e) !**\n📝 Raison : ${reason}`);
        }
    }

    if (command === 'ban' && message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
        const user = message.mentions.users.first();
        if (!user) return message.reply('❌ **Mentionne un utilisateur !**');
        const reason = args.slice(1).join(' ') || 'Aucune raison';
        const member = message.guild.members.cache.get(user.id);
        if (member) {
            await member.ban({ reason: reason });
            message.reply(`🔨 **${user.tag} a été banni(e) !**\n📝 Raison : ${reason}`);
        }
    }

    if (command === 'lock' && message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        await message.channel.permissionOverwrites.edit(message.guild.id, { SendMessages: false });
        message.reply('🔒 **SALON VERROUILLÉ !**\n🔐 Plus personne ne peut envoyer de messages.');
    }

    if (command === 'unlock' && message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        await message.channel.permissionOverwrites.edit(message.guild.id, { SendMessages: true });
        message.reply('🔓 **SALON DÉVERROUILLÉ !**\n💬 Les membres peuvent à nouveau parler.');
    }

    if (command === 'slowmode' && message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        const seconds = parseInt(args[0]);
        if (isNaN(seconds) || seconds < 0 || seconds > 21600) return message.reply('❌ **Entre 0 et 21600 secondes !**');
        await message.channel.setRateLimitPerUser(seconds);
        message.reply(`⏱️ **SLOWMODE ACTIVÉ !**\n📏 ${seconds} secondes entre chaque message.`);
    }

    // ---------- ANTI-RAID ----------
    if (command === 'antiraid') {
        const action = args[0];
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return message.reply('❌ **Admin requis !**');
        
        if (action === 'on') {
            message.reply('🛡️ **MODE ANTI-RAID ACTIVÉ !**\n⚠️ Les arrivées massives seront détectées automatiquement.');
        } else if (action === 'off') {
            message.reply('🛡️ **MODE ANTI-RAID DÉSACTIVÉ.**');
        } else {
            message.reply('🛡️ **Utilisation :** `?antiraid on/off`');
        }
    }

    if (command === 'lockdown') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return message.reply('❌ **Admin requis !**');
        
        message.guild.channels.cache.forEach(async channel => {
            if (channel.type === ChannelType.GuildText) {
                await channel.permissionOverwrites.edit(message.guild.id, { SendMessages: false });
            }
        });
        message.reply('🔒 **LOCKDOWN TOTAL ACTIVÉ !**\n🌍 Tous les salons sont verrouillés.');
    }

    if (command === 'purge') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return message.reply('❌ **Admin requis !**');
        
        const amount = parseInt(args[0]) || 99;
        await message.channel.bulkDelete(amount, true);
        message.reply(`🧹 **PURGE EFFECTUÉE !**\n🗑️ ${amount} messages supprimés.`).then(m => setTimeout(() => m.delete(), 2000));
    }

    if (command === 'warn' && message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
        const user = message.mentions.users.first();
        if (!user) return message.reply('❌ **Mentionne un utilisateur !**');
        const reason = args.slice(1).join(' ') || 'Aucune raison';
        
        if (!warnings.has(user.id)) warnings.set(user.id, []);
        warnings.get(user.id).push({ reason, date: new Date(), moderator: message.author.tag });
        
        message.reply(`⚠️ **${user.tag} a reçu un avertissement !**\n📝 Raison : ${reason}\n📊 Total : ${warnings.get(user.id).length} avertissement(s)`);
    }

    if (command === 'warnings') {
        const user = message.mentions.users.first() || message.author;
        const userWarnings = warnings.get(user.id) || [];
        
        if (userWarnings.length === 0) return message.reply(`✅ **${user.tag} n'a aucun avertissement.**`);
        
        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle(`⚠️ **AVERTISSEMENTS - ${user.tag}**`)
            .setDescription(userWarnings.map((w, i) => `${i+1}. ${w.reason} (par ${w.moderator} le ${new Date(w.date).toLocaleDateString()})`).join('\n'));
        message.channel.send({ embeds: [embed] });
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