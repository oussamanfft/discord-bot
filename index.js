const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');

// Configuration du bot Discord
const PREFIX = '?';
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ]
});

client.once('ready', () => {
    console.log(`✅ Bot connecté en tant que ${client.user.tag}`);
    console.log(`🌐 Serveur Web démarré pour garder le bot actif`);
});

client.on('messageCreate', async (message) => {
    // Ignorer les messages du bot lui-même ou qui ne commencent pas par le préfixe
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // Commande ping
    if (command === 'ping') {
        await message.reply('Pong ! 🏓');
    }
});

client.login(process.env.DISCORD_TOKEN);

// --- Serveur Web Express (pour le keep-alive) ---
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Bot Discord est en ligne !');
});

app.listen(port, () => {
    console.log(`Serveur keep-alive démarré sur le port ${port}`);
});