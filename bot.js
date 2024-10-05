const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios'); // Import axios

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

// Listen for messages
client.on('messageCreate', async (message) => {
    // Ignore messages from the bot itself
    if (message.author.bot) return;

    // Respond to the !ping command
    if (message.content === '!ping') {
        message.channel.send('Pong!');
    }

    // Respond to the !hello command
    else if (message.content === '!hello') {
        message.channel.send(`Hello, ${message.author.username}!`);
    }

    // Respond to the !info command
    else if (message.content === '!info') {
        message.channel.send('This is a Discord bot created using Discord.js!');
    }

    // Respond to the !random command
    else if (message.content === '!random') {
        try {
            const response = await axios.get('https://balkanflix-server.vercel.app'); // Replace with your API endpoint
            const randomSeries = response.data; // Adjust based on your API's response structure
            
            // Assuming the series is an array, pick a random one
            const randomIndex = Math.floor(Math.random() * randomSeries.length);
            const series = randomSeries[randomIndex];

            message.channel.send(`Here's a random series: ${series.title}`); // Adjust based on how you want to display the series
        } catch (error) {
            console.error('Error fetching series:', error);
            message.channel.send('Sorry, I could not fetch a random series at the moment.');
        }
    }
});

// Log in to Discord with your app's token
client.login('YOUR_DISCORD_BOT_TOKEN').then(() => {
    console.log('Bot logged in successfully');
}).catch((err) => {
    console.error('Error logging in:', err);
});

// Define the serverless function
module.exports = (req, res) => {
    res.status(200).send('Discord bot is running.');
};
