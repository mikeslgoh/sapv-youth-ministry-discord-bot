const { DateTime } = require('luxon');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.resolve(__dirname, 'scheduledMessages.json');

class SchedulerManager {
    constructor(client) {
        this.client = client;
        this.scheduledMessages = this.loadScheduledMessages();
        this.restoreScheduledJobs();
    }

    // Load scheduled messages from JSON
    loadScheduledMessages() {
        try {
            if (fs.existsSync(DATA_FILE)) {
                const data = fs.readFileSync(DATA_FILE, 'utf-8');
                return JSON.parse(data);
            }
        } catch (error) {
            console.error('Failed to load scheduled messages:', error);
        }
        return [];
    }

    // Save scheduled messages to JSON
    saveScheduledMessages() {
        try {
            fs.writeFileSync(DATA_FILE, JSON.stringify(this.scheduledMessages, null, 4));
        } catch (error) {
            console.error('Failed to save scheduled messages:', error);
        }
    }

    // Restore valid scheduled jobs on bot restart
    restoreScheduledJobs() {
        const now = DateTime.now();
        this.scheduledMessages = this.scheduledMessages.filter((msg) => {
            const [minute, hour] = msg.cronTime.split(' ')[0].split(' ').map(Number);
            const targetTime = now.set({ hour, minute, second: 0 });

            // Skip past jobs
            if (targetTime <= now) {
                console.log(`Removing outdated job for channel ${msg.channelId}`);
                return false;
            }

            this.scheduleCronJob(msg);
            return true;
        });
        this.saveScheduledMessages();
    }

    async scheduleMessage(interaction) {
        const message = interaction.options.getString("message");
        const time = interaction.options.getString("time");
        const timezone = interaction.options.getString("timezone");
        const channel = interaction.options.getChannel("channel");

        console.log("Start scheduling message...");
        try {
            const [hour, minute] = time.split(':').map(Number);
            const now = DateTime.now().setZone(timezone);

            if (!now.isValid) {
                console.error('Invalid timezone provided.');
                await interaction.reply('Invalid timezone provided.');
                return;
            }

            if (!interaction.replied && !interaction.deferred) {
                await interaction.deferReply();
            }

            const targetTime = now.set({ hour, minute, second: 0 });

            if (targetTime <= now) {
                await interaction.editReply('The scheduled time must be in the future.');
                return;
            }

            const cronTime = `${minute} ${hour} * * *`;
            const targetChannel = await this.client.channels.fetch(channel.id).catch(() => null);

            if (!targetChannel) {
                await interaction.editReply(`Channel not found or bot lacks access: ${channel.id}`);
                return;
            }

            const job = this.scheduleCronJob({ message, channelId: channel.id, cronTime, timezone }, interaction);

            this.scheduledMessages.push({
                message,
                channelId: channel.id,
                cronTime,
                timezone
            });

            this.saveScheduledMessages();
            await interaction.editReply(`Message scheduled for ${targetTime.toFormat('yyyy-LL-dd HH:mm')} in channel ${channel.id}.`);
        } catch (error) {
            await interaction.editReply(`Error scheduling message: ${error.message}`);
        }
    }

    // Schedule the cron job
    scheduleCronJob(msg, interaction = null) {
        const job = cron.schedule(msg.cronTime, async () => {
            console.log("Sending scheduled message...");
            const targetChannel = await this.client.channels.fetch(msg.channelId).catch(() => null);

            if (targetChannel) {
                await targetChannel.send(msg.message);
                console.log(`Message sent to channel ${msg.channelId}`);
            }

            // Cleanup after message is sent
            this.scheduledMessages = this.scheduledMessages.filter(m => m !== msg);
            this.saveScheduledMessages();

            if (interaction) {
                await interaction.editReply(`✅ Message sent and job removed.`);
            }
        }, { timezone: msg.timezone });

        return job;
    }

    getScheduledMessages() {
        return this.scheduledMessages.map((msg, index) => ({
            index,
            message: msg.message,
            channelId: msg.channelId,
            cronTime: msg.cronTime
        }));
    }

    async cancelScheduledMessage(interaction) {
        try {
            const jobId = interaction.options.getString("job_id");
            const job = this.scheduledMessages[jobId]?.job;
            if (job) {
                job.stop();
                this.scheduledMessages.splice(jobId, 1);
                this.saveScheduledMessages();
                await interaction.reply(`✅ Scheduled message canceled.`);
                return;
            }
            await interaction.reply(`❌ Failed to cancel. Message not found.`);
        } catch (error) {
            await interaction.editReply(`Error canceling message: ${error.message}`);
        }
    }
}

module.exports = SchedulerManager;
