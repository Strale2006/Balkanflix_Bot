const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const express = require('express');
require('dotenv').config({path: "./config.env"});
const cron = require('node-cron');
const cors = require('cors');


const app = express();
app.use(express.json());

app.use(cors({
    origin: ['https://www.balkanflix.com', 'https://www.balkanflix-server.vercel.app', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

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
        // 'Akcija': '💥》akcija',
        // 'Horor': '😱》horori',
        // 'Romansa': '🌹》romansa',
        // 'Sport': '⚽》sportski',
        // 'Komedija': '😂》komedija',
        // 'Avantura': '🧭》avantura',
        // 'Triler': '🕵🏻》triler',
        // 'Istorija': '⏳》istorijski',
        // 'Fantazija': '🌌》fantazija'
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
    }, {
        scheduled: true,
        timezone: "Europe/Belgrade"
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
                console.log(message.content, "PORUKAAAA");

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

    client.on('messageCreate', async (message) => {
        // Ignore messages from the bot or from other channels
        if (message.author.bot || message.channel.name !== '🎮●ᴘᴏɢᴏᴅɪ-ᴀɴɪᴍᴇ●') return;
    
        // Command to start the game
        if (message.content === '!igra') {
            try {
                // Fetch anime data from your API or database
                const { data } = await axios.get('https://balkanflix-server.vercel.app/api/content/series');
                const seriesList = data.series;
    
                if (seriesList.length < 3) {
                    message.channel.send('Not enough anime data to play the game.');
                    return;
                }
    
                // Randomly select an anime for the question
                const randomIndex = Math.floor(Math.random() * seriesList.length);
                const selectedAnime = seriesList[randomIndex];
                let description = selectedAnime.description;
    
                // Replace the title in the description with asterisks
                const titleAsterisks = '*'.repeat(selectedAnime.title.length); // Create a string of asterisks with the same length as the title
                description = description.replace(new RegExp(selectedAnime.title, 'gi'), titleAsterisks); // Replace title with asterisks
                description = description.trim(); // Clean up any leading/trailing whitespace
    
                // Select two incorrect options
                const otherAnime = seriesList.filter((_, index) => index !== randomIndex);
                const shuffledOtherAnime = otherAnime.sort(() => 0.5 - Math.random()).slice(0, 2);
                
                // Combine the correct and incorrect answers
                const choices = [selectedAnime.title, ...shuffledOtherAnime.map(anime => anime.title)];
                const shuffledChoices = choices.sort(() => 0.5 - Math.random());
    
                // Utility function to truncate a string if it's too long
                function truncateText(text, maxLength) {
                    return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text;
                }
    
                // Create buttons for the user to choose
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('button_0')
                        .setLabel(truncateText(shuffledChoices[0], 80))  // Truncate to 80 characters max
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('button_1')
                        .setLabel(truncateText(shuffledChoices[1], 80))  // Truncate to 80 characters max
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('button_2')
                        .setLabel(truncateText(shuffledChoices[2], 80))  // Truncate to 80 characters max
                        .setStyle(ButtonStyle.Primary)
                );
    
                // Send the question and choices to the channel
                await message.channel.send({
                    content: `***Pogodi anime iz opisa:***\n\n${description}`,
                    components: [row]
                });
                
                // Set up a collector to listen for button clicks
                const filter = i => i.customId.startsWith('button') && i.isButton();
                const collector = message.channel.createMessageComponentCollector({ filter, time: 25000 });
                
                collector.on('collect', async i => {
                    const chosenAnswer = shuffledChoices[parseInt(i.customId.split('_')[1], 10)];
                    
                    if (chosenAnswer === selectedAnime.title) {
                        await i.reply({ content: `Čestitamo, ${i.user.username}, pogodili ste tačno!`, ephemeral: true });
                    } else {
                        await i.reply({ content: `Pogrešno! Tačan odgovor je: **${selectedAnime.title}**.`, ephemeral: true });
                    }
                    collector.stop();  // Stop collecting after the first response
                });
                
                collector.on('end', collected => {
                    if (collected.size === 0) {
                        message.channel.send('Niko nije odgovorio na vreme.');
                    }
                });
            } catch (error) {
                console.error('Error fetching anime:', error);
                message.channel.send('Sorry, I could not fetch anime data at the moment.');
            }
        }
    });

    client.on('messageCreate', async (message) => {
        if (message.content === '!login') {
            const loginButton = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel('Login to Balkanflix')
                    .setStyle(ButtonStyle.Link)
                    .setURL(`https://www.balkanflix.com/login?discordId=${message.author.id}`) // Append the Discord ID
            );
            
            await message.channel.send({
                content: 'Kliknite dugme ispod da povežete nalog na Balkanflix(ako ste već ulogovani na Balkanflix, prvo se izlogujte):',
                components: [loginButton]
            });
        }
    });

    client.on('messageCreate', async (message) => {
        if (message.content === '!statistika') {
            // Fetch all users from the Balkanflix database
            try {
                const discordId = message.author.id;
                const { data } = await axios.get(`https://balkanflix-server.vercel.app/api/auth/byDiscord/${discordId}`);
                const user = data.data;
                
                if (user) {
                    // Display the user's stats
                    await message.channel.send({
                        content: `***Korisničke statistike za ${message.author.username}:***\n\n **-Korisničko ime na Balkanflixu:** *${user.username}*\n **-Odgledano celih epizoda:** *${user.f_episode.length}*\n **-Omiljeni serijali:** *${user.favorites.join(', ')}*\n **- Profilna slika:**`,
                        files: [user.pfp]
                    });
                } else {
                    message.channel.send('Korisnik nije pronađen. Molimo vas ulogujte se sa !login.');
                }
            } catch (error) {
                console.error('Error fetching user stats:', error);
                message.channel.send('Could not retrieve your stats at the moment.');
            }
        }
    });


    app.post('/new-episode', async (req, res) => {
        const { anime, episodeNumber, img, url } = req.body;

        if (!anime || !episodeNumber || !img || !url) {
            return res.status(400).json({ error: "Invalid data provided" });
        }

        const channel = client.channels.cache.find(channel => channel.name === "🆕●ɴᴏᴠᴇ-ᴇᴘɪᴢᴏᴅᴇ●");
        if (!channel) {
            return res.status(500).json({ error: "Channel not found" });
        }

        try {
            const encodedImageUrl = encodeURI(`https://raw.githubusercontent.com/Strale2006/SlikeStranice/main/${img}`);
            console.log('Encoded image URL:', encodedImageUrl);
            // Fetch the image from the URL
            const imageResponse = await axios.get(encodedImageUrl, { responseType: 'arraybuffer' });
            const attachment = new AttachmentBuilder(Buffer.from(imageResponse.data), { name: 'anime.jpg' });

            // Send message to the channel
            await channel.send({
                content: `@everyone **Novi prevod je spreman i dostupan na Balkanflixu!🔥**\n\n**Serijal:** ${anime}\n**Epizoda:** ${episodeNumber}\n\n**Gledajte ovde:** ${url}\n\nUživajte u gledanju i hvala što pratite naše prevode! 😊 Ako imate bilo kakve povratne informacije, slobodno ih podelite sa nama.`,
                files: [attachment],
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
