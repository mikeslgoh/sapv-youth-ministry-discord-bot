const { Client, GatewayIntentBits, SlashCommandBuilder } = require("discord.js");
require("dotenv").config();
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v10");
const moment = require('moment-timezone');

const SchedulerManager = require("./scheduler_manager");
const GoogleFormManager = require("./google_form_manager");
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
            .setDescription('Fetch form response data from Google Apps Script.')
            .addSubcommand(subcommand =>
                subcommand
                    .setName('count')
                    .setDescription('Get the total count of form responses.')
                    .addStringOption(option =>
                        option.setName('formname')
                            .setDescription('A part of the form name to search for.')
                            .setRequired(true)
                    )
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName('get_result')
                    .setDescription('Get responses for a specific question.')
                    .addStringOption(option =>
                        option.setName('formname')
                            .setDescription('A part of the form name to search for.')
                            .setRequired(true)
                    )
                    .addStringOption(option =>
                        option.setName('responsequery')
                            .setDescription('Search for specific responses (e.g., email, name).')
                            .setRequired(true)
                    )
            ),
        new SlashCommandBuilder()
            .setName('hello')
            .setDescription('Say hello to our YM Bot!'),
        new SlashCommandBuilder()
            .setName('schedule')
            .setDescription('Manage scheduled messages.')
            .addSubcommand(subcommand =>
                subcommand
                    .setName('send')
                    .setDescription('Schedule a message to be sent at a specific time.')
                    .addStringOption(option =>
                        option.setName('message')
                            .setDescription('The message to send.')
                            .setRequired(true)
                    )
                    .addStringOption(option =>
                        option.setName('time')
                            .setDescription('The time to send the message (HH:mm format).')
                            .setRequired(true)
                    )
                    .addStringOption(option =>
                        option.setName('timezone')
                            .setDescription('The timezone (e.g., America/New_York).')
                            .setRequired(true)
                            .setAutocomplete(true)
                    )
                    .addChannelOption(option =>
                        option.setName('channel')
                            .setDescription('The channel to send the message in.')
                            .setRequired(true)
                    )
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName('cancel')
                    .setDescription('Cancel a scheduled message.')
                    .addStringOption(option =>
                        option.setName('job_id')
                            .setDescription('The ID of the scheduled message to cancel.')
                            .setRequired(true)
                            .setAutocomplete(true)
                    )
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
    const googleFormManager = new GoogleFormManager();

    switch(category) {
        case "count":
            await googleFormManager.getCount(interaction);
            break;
        case "get_result":
            await googleFormManager.getResult(interaction);
            break;
        default:
            break;
    }
}

async function handleHelloCommand(interaction) {
    await interaction.reply(`👋 Hello!`);
}

const schedulerManager = new SchedulerManager(client);

async function handleschedulerManagerCommand(interaction) {
    const action = interaction.options.getString("action");

    switch(action) {
        case "send":
            schedulerManager.schedule(interaction);
            break;
        case "cancel":
            const jobId = interaction.options.getString("job_id");
            const success = this.scheduleManager.cancelMessage(jobId);

            if (success) {
                await interaction.reply(`✅ Scheduled message canceled.`);
            } else {
                await interaction.reply(`❌ Failed to cancel. Message not found.`);
            }
            break;
        default:
            break;   
    }
}

async function handleScheduledMsgAutocomplete(interaction) {
    const focusedValue = interaction.options.getFocused().toLowerCase();
    const scheduledMessages = schedulerManager.getScheduledMessages();

    // Filter scheduled messages based on user input
    const choices = scheduledMessages.map((msg) => ({
        name: `${msg.message.slice(0, 20)} in #${msg.channelId} (${msg.cronTime})`,
        value: msg.id
    }));

    const filtered = choices.filter(choice =>
        choice.name.toLowerCase().includes(focusedValue)
    );

    await interaction.respond(filtered.slice(0, 25)); // Show up to 25 options
}

async function handleTimezoneAutocomplete(interaction) {
    const focusedValue = options.getFocused();

    // Filter timezones based on user input
    const choices = moment.tz.names()
        .filter((tz) => tz.toLowerCase().includes(focusedValue.toLowerCase()))
        .slice(0, 25) // Discord limits autocomplete to 25 results
        .map((tz) => ({ name: tz, value: tz }));

    await interaction.respond(choices);
}

// Handle interaction events
function setupInteractionHandler() {
    client.on("interactionCreate", async (interaction) => {
        if (interaction.isAutocomplete()) {
            const { commandName, options } = interaction;
            if (commandName === "schedule") {
                const action = options.getString("action");
                switch(action){
                    case "send":
                        await handleTimezoneAutocomplete(interaction);
                        break;
                    case "cancel":
                        await handleScheduledMsgAutocomplete(interaction);
                        break;
                    default:
                        break;
                }
            }
        } else if (interaction.isCommand()) {
            switch (interaction.commandName) {
                case "form":
                    await handleFormCommand(interaction);
                    break;
                case "hello":
                    await handleHelloCommand(interaction);
                    break;
                case "schedule":
                    await handleschedulerManagerCommand(interaction);
                    break;
                default:
                    await interaction.reply("❓ Unknown command.");
                    break;
            }
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
