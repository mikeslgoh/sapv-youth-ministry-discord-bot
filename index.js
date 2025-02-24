const { Client, GatewayIntentBits, SlashCommandBuilder } = require("discord.js");
require("dotenv").config();
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v10");

const ScheduleMessageCommandFunctions = require("./schedule_command_functions");
const FormCommandFunctions = require("./form_command_functions");
const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_BOT_TOKEN);

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
        new SlashCommandBuilder()
            .setName('form')
            .setDescription('Fetch form response count from Google Apps Script')
            .addStringOption(option =>
                option.setName('category')
                    .setDescription('Choose what to query')
                    .setRequired(true)
                    .addChoices(
                        { name: 'Count', value: 'count' },
                        { name: 'Get result for a question', value: 'get_result' }
                    ))
            .addStringOption(option =>
                option.setName('formname')
                    .setDescription('A part of the form name to search for')
                    .setRequired(true))
            .addStringOption(option =>
                option.setName('responsequery')
                    .setDescription('Search for specific responses (e.g., email, name)')
                    .setRequired(false)),
        new SlashCommandBuilder()
            .setName('hello')
            .setDescription('Say hello to our YM Bot!'),
        new SlashCommandBuilder()
            .setName('schedule_msg')
            .setDescription('Send a scheduled messaged at a specific time to a specific channel.')
            .addStringOption(option =>
                option.setName('message')
                    .setDescription('The message to send')
                    .setRequired(true)
            )
            .addStringOption(option =>
                option.setName('time')
                    .setDescription('The time to send the message (HH:mm format)')
                    .setRequired(true)
            )
            .addStringOption(option =>
                option.setName('timezone')
                    .setDescription('The timezone (e.g., America/New_York)')
                    .setRequired(true)
            )
            .addChannelOption(option =>
                option.setName('channel')
                    .setDescription('The channel to send the message in')
                    .setRequired(true)
            )
    ];
}

// Register slash commands with Discord API
async function registerCommands() {
    const commands = getCommands();

    try {
        console.log("🔄 Registering slash commands...");
        await rest.put(Routes.applicationCommands(process.env.DISCORD_BOT_CLIENT_ID), { body: commands.map(cmd => cmd.toJSON()) });
        console.log("✅ Slash commands registered!");
    } catch (error) {
        console.error("❌ Failed to register commands:", error);
    }
}

// Handle form command
async function handleFormCommand(interaction) {
    const category = interaction.options.getString("category");
    const formCommandFunctions = new FormCommandFunctions();

    switch(category) {
        case "count":
            await formCommandFunctions.getCount(interaction);
        case "get_result":
            await formCommandFunctions.getResult(interaction);
        default:
            break;
    }
}

async function handleHelloCommand(interaction) {
    await interaction.reply(`👋 Hello!`);
}

async function handleScheduleMsgCommand(interaction) {
    const scheduleMsg = new ScheduleMessageCommandFunctions(client)
    scheduleMsg.schedule(interaction);
}

// Handle interaction events
function setupInteractionHandler() {
    client.on("interactionCreate", async (interaction) => {
        if (!interaction.isCommand()) return;

        switch (interaction.commandName) {
            case "form":
                await handleFormCommand(interaction);
                break;
            case "hello":
                await handleHelloCommand(interaction);
                break;
            case "schedule_msg":
                await handleScheduleMsgCommand(interaction);
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
