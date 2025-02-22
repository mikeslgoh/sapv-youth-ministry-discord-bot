const { Client, GatewayIntentBits } = require("discord.js");
require("dotenv").config();
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v10");
const { CommandFunctions } = require("./command_functions");

// Initialize the bot client
function initializeClient() {
    return new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent,
        ],
    });
}

const client = initializeClient();

// Define slash commands
function getCommands() {
    return [
        {
            name: "form",
            description: "Fetch form response count from Google Apps Script",
            options: [
                {
                    type: 3,
                    name: "category",
                    description: "Choose what to query",
                    required: true,
                    choices: [
                        { name: "Count", value: "count" },
                        { name: "Get result for a question", value: "get_result" },
                    ],
                },
                {
                    type: 3,
                    name: "formname",
                    description: "A part of the form name to search for",
                    required: true,
                },
                {
                    type: 3,
                    name: "responsequery",
                    description: "Search for specific responses (e.g., email, name)",
                    required: false,
                },
            ],
        },
    ];
}

// Register slash commands with Discord API
async function registerCommands() {
    const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_BOT_TOKEN);
    const commands = getCommands();

    try {
        console.log("🔄 Registering slash commands...");
        await rest.put(Routes.applicationCommands(process.env.DISCORD_BOT_CLIENT_ID), { body: commands });
        console.log("✅ Slash commands registered!");
    } catch (error) {
        console.error("❌ Failed to register commands:", error);
    }
}

// Handle form command
async function handleFormCommand(interaction) {
    const category = interaction.options.getString("category");

    switch(category) {
        case "count":
            await CommandFunctions.getCount(interaction);
        case "get_result":
            await CommandFunctions.getResult(interaction);
    }
}

// Handle interaction events
function setupInteractionHandler() {
    client.on("interactionCreate", async (interaction) => {
        if (!interaction.isCommand()) return;

        switch (interaction.commandName) {
            case "form":
                await handleFormCommand(interaction);
                break;
            default:
                await interaction.reply("❓ Unknown command.");
                break;
        }
    });
}

// Start the bot
async function startBot() {
    await registerCommands();
    setupInteractionHandler();

    client.once("ready", () => {
        console.log(`✅ Logged in as ${client.user.tag}`);
    });

    client.login(process.env.DISCORD_BOT_TOKEN);
}

startBot();
