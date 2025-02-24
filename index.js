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
    const subcommand = interaction.options.getSubcommand();
    const googleFormManager = new GoogleFormManager();

    switch(subcommand) {
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
    const subcommand = interaction.options.getSubcommand();

    switch(subcommand) {
        case "send":
            schedulerManager.scheduleMessage(interaction);
            break;
        case "cancel":
            schedulerManager.cancelScheduledMessage(interaction);
            break;
        default:
            break;   
    }
}

async function handleScheduledMsgAutocomplete(interaction) {
    const focusedValue = interaction.options.getFocused().toLowerCase();

    try {
        const scheduledMessages = schedulerManager.getScheduledMessages();

        // Map the scheduled messages to choices
        const choices = scheduledMessages.map((msg) => ({
            name: `${msg.message.slice(0, 20)} in #${msg.channelName} (${msg.cronTime})`,
            value: msg.id
        }));

        // Filter choices based on the focused value
        const filteredChoices = choices.filter(choice =>
            choice.name.toLowerCase().includes(focusedValue)
        );

        // Respond with up to 25 filtered results
        await interaction.respond(filteredChoices.slice(0, 25));
    } catch (error) {
        console.error("❌ Autocomplete failed:", error);
        await interaction.respond([]);
    }
}

let lastTimezoneAutocompleteTime = 0;

const timezoneNames = moment.tz.names();
const commonTimezones = [
    'America/Vancouver', 'America/Los_Angeles', 'Europe/London',
    'Asia/Singapore', 'Asia/Tokyo', 'UTC'
];

// Preprocess timezone names to lowercase for faster filtering
const lowercasedTimezones = timezoneNames.map(tz => ({ name: tz, lower: tz.toLowerCase() }));
const lowercasedCommon = commonTimezones.map(tz => ({ name: tz, lower: tz.toLowerCase() }));

async function handleTimezoneAutocomplete(interaction) {
    const focusedValue = interaction.options.getFocused().toLowerCase();

    // Debounce requests (500ms)
    const now = Date.now();
    if (now - lastTimezoneAutocompleteTime < 500) return;
    lastTimezoneAutocompleteTime = now;

    try {
        // Filter common timezones first
        const prioritizedChoices = lowercasedCommon
            .filter(tz => tz.lower.includes(focusedValue))
            .map(tz => ({ name: tz.name, value: tz.name }));

        // Filter all timezones
        const filteredChoices = lowercasedTimezones
            .filter(tz => tz.lower.includes(focusedValue))
            .map(tz => ({ name: tz.name, value: tz.name }));

        // Combine, remove duplicates, and limit to 25
        const uniqueChoices = Array.from(new Set([...prioritizedChoices, ...filteredChoices].map(c => c.name)))
            .slice(0, 25)
            .map(name => ({ name, value: name }));

        await interaction.respond(uniqueChoices);
    } catch (error) {
        console.error("❌ Autocomplete failed:", error);
        await interaction.respond([]);
    }
}

// Handle interaction events
function setupInteractionHandler() {
    client.on("interactionCreate", async (interaction) => {
        if (interaction.isAutocomplete()) {
            console.log('Autocomplete triggered:', interaction.options.getFocused());

            const { commandName, options } = interaction;
            if (commandName === "schedule") {
                const action = options.getSubcommand();
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
