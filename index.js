const { Client, GatewayIntentBits } = require("discord.js");
const axios = require("axios");
require("dotenv").config();
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v10");

// Initialize the bot client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// Define slash commands
const commands = [
    {
        name: "form",
        description: "Fetch form response count from Google Apps Script",
        options: [
            {
                type: 3, // STRING type
                name: "formname",
                description: "A part of the form name to search for",
                required: true,
            },
        ],
    },
];

// Register slash commands with Discord API
const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_BOT_TOKEN);

(async () => {
    try {
        console.log("🔄 Registering slash commands...");

        // Register commands for a specific guild
        await rest.put(Routes.applicationCommands(process.env.DISCORD_BOT_CLIENT_ID), { body: commands });

        console.log("✅ Slash commands registered!");
    } catch (error) {
        console.error("❌ Failed to register commands:", error);
    }
})();

// Handle interactions
client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) return; // Only handle commands

    if (interaction.commandName === "form") {
        const formName = interaction.options.getString("formname");

        try {
            // Immediately defer the reply to indicate to the user the bot is working
            await interaction.deferReply();

            // Query the Web App with the partial form name
            const response = await axios.get(`${process.env.WEB_APP_URL}?formName=${encodeURIComponent(formName)}`);
            const data = response.data;

            if (data.error) {
                // If an error occurs, reply with the error message
                await interaction.editReply(`⚠️ Error: ${data.error}`);
            } else if (data.matchingForms && data.matchingForms.length > 0) {
                console.log("Matching forms found ...")
                // If matching forms were found, list them
                let replyMessage = "🔍 Matching forms found:\n";
                data.matchingForms.forEach((form) => {
                    replyMessage += `**Form Name**: ${form.name}\n**Responses Count**: ${form.responseCount}\n\n`;
                });
                await interaction.editReply(replyMessage);
            } else {
                // If no forms were found, let the user know
                await interaction.editReply(`⚠️ No matching forms found for "${formName}".`);
            }
        } catch (error) {
            console.error("Error fetching form responses:", error);
        }
    }
});

// Log the bot in
client.once("ready", () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
});

// Log the bot in
client.login(process.env.DISCORD_BOT_TOKEN);
