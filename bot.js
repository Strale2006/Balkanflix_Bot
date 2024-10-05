const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios'); // Import axios
const express = require('express');
require('dotenv').config({path: "./config.env"})

const app = express();
app.use(express.json());

// Define the API endpoint for testing
app.get('/', (req, res) => {
    res.send("Express on Vercel with Discord Bot");
});

// Create a Discord client instance
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// Log the bot in
client.login(process.env.DISCORD_TOKEN).then(() => {
    console.log(`Bot logged in as ${client.user.tag}!`);
}).catch((err) => {
    console.error('Error logging in:', err);
});

// Listen for messages
client.on('messageCreate', async (message) => {
    // Ignore messages from the bot itself
    if (message.author.bot) return;

    // Respond to the !random command
    if (message.content === '!random') {
        try {
            const { data } = await axios.get('https://balkanflix-server.vercel.app/api/content/series'); // Your API endpoint
            const seriesList = data.series; // Assuming `data` is an array of series
            
            if (seriesList.length === 0) {
                message.channel.send('No series available to display.');
                return;
            }

            // Pick a random series from the fetched list
            const randomIndex = Math.floor(Math.random() * seriesList.length);
            const series = seriesList[randomIndex];

            const imageUrl = `https://raw.githubusercontent.com/Strale2006/SlikeStranice/refs/heads/main/${series.poster}`;

            const genreList = series.genre.join(', ');

    
            message.channel.send({
                content: `***Evo nasumičnog serijala:*** **${series.title}**\n\n***Opis:*** ${series.description}\n\n***Datum izlaska:*** ${series.date}\n***Žanrovi:*** ${genreList}\n***Broj epizoda:*** ${series.ep}\n***Status:*** ${series.status}\n***Studio:*** ${series.studio}\n***Ocena:*** ${series.MAL_ocena} ***Pregledi:*** ${series.totalViews}`,
                files: [imageUrl] // Send the image as an attachment
            });
        } catch (error) {
            console.error('Error fetching series:', error);
            message.channel.send('Sorry, I could not fetch a random series at the moment.');
        }
    }
});

// Set up a function to handle serverless requests
module.exports = (req, res) => {
    res.status(200).send('Discord bot is running.');
};

// Start the Express server
const PORT = process.env.PORT || 8002; // Use Vercel's PORT environment variable if available
app.listen(PORT, () => console.log(`Listening on the port ${PORT}`));

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.log(`Logged error: ${err}`);
    process.exit(1);
});
