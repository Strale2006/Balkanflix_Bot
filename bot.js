const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');
const express = require('express');
require('dotenv').config({path: "./config.env"});
const cron = require('node-cron');


const app = express();
app.use(express.json());

app.get('/', (req, res) => {
    res.send("Express on Vercel with Discord Bot");
});

// Flag to check if bot is already initialized
let botInitialized = false;

if (!botInitialized) {
    // Create a Discord client instance
    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent,
        ],
    });

    const genreChannels = {
        'Akcija': '💥》akcija',
        'Horor': '😱》horori',
        'Romansa': '🌹》romansa',
        'Sportski': '⚽》sportski',
        'Komedija': '😂》komedija',
        'Avantura': '🧭》avantura',
        'Triler': '🕵🏻》triler',
        'Istorijski': '⏳》istorijski',
        'Fantazija': '🌌》fantazija'
    };
    
    // Function to fetch a random anime for each genre
    async function fetchRandomSeriesByGenre(genre) {
        try {
            const { data } = await axios.get('https://balkanflix-server.vercel.app/api/content/series');
            const seriesList = data.series.filter(series => series.genre.includes(genre));
    
            if (seriesList.length === 0) {
                return null;
            }
    
            // Pick a random series from the filtered list
            const randomIndex = Math.floor(Math.random() * seriesList.length);
            return seriesList[randomIndex];
        } catch (error) {
            console.error(`Error fetching series for genre ${genre}:`, error);
            return null;
        }
    }
    
    // Function to send series recommendation to the relevant genre channel
    async function sendRecommendation(channelName, series, genre) {
        if (!series) {
            console.log(`No series found for genre: ${genre}`);
            return;
        }
    
        const channel = client.channels.cache.find(ch => ch.name === channelName);
        if (!channel) {
            console.log(`Channel ${channelName} not found`);
            return;
        }
    
        const imageUrl = `https://raw.githubusercontent.com/Strale2006/SlikeStranice/refs/heads/main/${series.poster}`;
    
        await channel.send({
            content: `**Nasumična preporuka iz žanra ${genre}:**\n**Serijal:** ${series.title}\n**Opis:** ${series.description}\n**Studio:** ${series.studio}\n**Broj epizoda:** ${series.ep}\n**Ocena:** ${series.MAL_ocena}\n`,
            files: [imageUrl]
        });
    }
    
    // Schedule to run 4 times a day (e.g., at 00:00, 06:00, 12:00, 18:00)
    cron.schedule('0 0,6,12,18 * * *', async () => {
        for (const [genre, channelName] of Object.entries(genreChannels)) {
            const series = await fetchRandomSeriesByGenre(genre);
            await sendRecommendation(channelName, series, genre);
        }
    });

    // Log the bot in
    client.login(process.env.DISCORD_TOKEN).then(() => {
        console.log(`Bot logged in as ${client.user.tag}!`);
        botInitialized = true;  // Set the flag to prevent reinitialization
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
                const { data } = await axios.get('https://balkanflix-server.vercel.app/api/content/series');
                const seriesList = data.series;

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
                    content: `***Evo nasumičnog serijala:*** **${series.title}**\n\n***Opis:*** ${series.description}\n\n***Datum izlaska:*** ${series.date}\n***Žanrovi:*** ${genreList}\n***Broj epizoda:*** ${series.ep}\n***Status:*** ${series.status}\n***Studio:*** ${series.studio}\n***Ocena:*** ${series.MAL_ocena}\n***Pregledi:*** ${series.totalViews}`,
                    files: [imageUrl]
                });
            } catch (error) {
                console.error('Error fetching series:', error);
                message.channel.send('Sorry, I could not fetch a random series at the moment.');
            }
        }
        else if (message.content === '!uskoro') {
            try {
                // Fetch the scheduled episodes from your API
                const { data } = await axios.get('https://balkanflix-server.vercel.app/api/schedule/animeSchedule');

                if (data.length === 0) {
                    message.channel.send('Ni jedna epizoda ne izlazi uskoro.');
                    return;
                }

                // Get the current time
                const currentTime = new Date();

                // Find the next episode with a release time in the future
                const upcomingEpisodes = data.filter(episode => new Date(episode.time) > currentTime);

                if (upcomingEpisodes.length === 0) {
                    message.channel.send('Ni jedna epizoda ne izlazi uskoro.');
                    return;
                }

                // Sort the upcoming episodes by their release time
                upcomingEpisodes.sort((a, b) => new Date(a.time) - new Date(b.time));

                // Take the first episode in the sorted list (the next upcoming episode)
                const nextEpisode = upcomingEpisodes[0];

                // Format the date for a user-friendly display
                const episodeDate = new Date(nextEpisode.time).toLocaleString('sr-RS', {
                    day: 'numeric',
                    month: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: 'numeric',
                    hour12: false // This ensures 24-hour format
                });

                // Construct the image URL
                const imageUrl = `https://raw.githubusercontent.com/Strale2006/SlikeStranice/refs/heads/main/${nextEpisode.img}`;

                // Send the message to the channel
                message.channel.send({
                    content: `Sledeća epizoda na sajtu je:\n**${nextEpisode.title}**\n**Epizoda:** ${nextEpisode.ep}\n**Datum izlaska:** ${episodeDate}`,
                    files: [imageUrl]  // Send the episode image
                });
            } catch (error) {
                console.error('Error fetching episodes:', error);
                message.channel.send('Sorry, I could not fetch the next episode at the moment.');
            }
        }
    });

    app.post('/new-episode', async (req, res) => {
        const { anime, episodeNumber, img, url } = req.body;

        if (!anime || !episodeNumber || !img || !url) {
            return res.status(400).json({ error: "Invalid data provided" });
        }

        // Get the channel by name
        const channel = client.channels.cache.find(channel => channel.name === "🆕》nove-epizode");
        if (!channel) {
            return res.status(500).json({ error: "Channel not found" });
        }

        try {
            // Send message to the channel
            await channel.send({
                content: `@everyone **Novi prevod je spreman i dostupan na Balkanflixu!🔥**\n\n**Serijal:** ${anime}\n**Epizoda:** ${episodeNumber}\n\n**Gledajte ovde:** ${url}\n\nUživajte u gledanju i hvala što pratite naše prevode! 😊 Ako imate bilo kakve povratne informacije, slobodno ih podelite sa nama.`,
                files: [`https://raw.githubusercontent.com/Strale2006/SlikeStranice/refs/heads/main/${img}`]  // Send the image
            });

            res.status(200).json({ message: "Message sent successfully!" });
        } catch (error) {
            console.error('Error sending message:', error);
            res.status(500).json({ error: 'Error sending message' });
        }
    });
}

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
