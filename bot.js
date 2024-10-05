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
            const { data } = await axios.get('https://balkanflix-server.vercel.app/series'); // Your API endpoint
            const seriesList = data; // Assuming `data` is an array of series
            
            if (seriesList.length === 0) {
                message.channel.send('No series available to display.');
                return;
            }
    
            // Pick a random series from the fetched list
            const randomIndex = Math.floor(Math.random() * seriesList.length);
            const series = seriesList[randomIndex];
    
            // Assuming series has a property 'title'; adjust accordingly
            message.channel.send(`Here's a random series: ${series.title}`); 
        } catch (error) {
            console.error('Error fetching series:', error);
            message.channel.send('Sorry, I could not fetch a random series at the moment.');
        }
    }
});

// Log in to Discord with your app's token
client.login('MTI5MjA0MTM3OTUwOTQzNjQzNw.G8VFar.rXMRZGwVXZOg-2pZopg-Fd7Wh1NAKbdIWJkL3Y').then(() => {
    console.log('Bot logged in successfully');
}).catch((err) => {
    console.error('Error logging in:', err);
});

// Define the serverless function
module.exports = (req, res) => {
    res.status(200).send('Discord bot is running.');
};
