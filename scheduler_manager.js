const { DateTime } = require('luxon');
const cron = require('node-cron');

class SchedulerManager {
    constructor(client) {
        this.client = client;
		this.scheduledMessages = []; // Store scheduled messages
    }

    async schedule(interaction) {
		const message = interaction.options.getString("message");
		const time = interaction.options.getString("time");
		const timezone = interaction.options.getString("timezone");
		const channel = interaction.options.getChannel("channel");

        try {
            const [hour, minute] = time.split(':').map(Number);
            const now = DateTime.now().setZone(timezone);

            if (!now.isValid) {
                console.error('Invalid timezone provided.');
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
				console.error(`Channel not found or bot lacks access: ${channel.id}`);
				return;
			}

			this.scheduledMessages = this.scheduledMessages || [];

			const job = cron.schedule(cronTime, async () => {
				const targetChannel = await this.client.channels.fetch(channel.id).catch(() => null);
				if (targetChannel) {
					const sentMessage = await targetChannel.send(message);
					await interaction.editReply(`Message sent: ${sentMessage.id}`);
				}
			}, { timezone });
			
			this.scheduledMessages.push({
				message,
				channelId: channel.id,
				cronTime,
				job
			});
			
            await interaction.editReply(`Message scheduled for ${targetTime.toFormat('yyyy-LL-dd HH:mm')} in channel ${channel.id}.`);
        } catch (error) {
            await interaction.editReply(`Error scheduling message: ${error.message}`);
        }
    }

	getScheduledMessages() {
		return this.scheduledMessages.map((msg, index) => ({
			index,
			message: msg.message,
			channelId: msg.channelId,
			cronTime: msg.cronTime
		}));
	}

	cancelScheduledMessage(index) {
		const job = this.scheduledMessages[index]?.job;
		if (job) {
			job.stop();
			this.scheduledMessages.splice(index, 1);
			console.log(`Scheduled message ${index} canceled.`);
			return true;
		}
		return false;
	}
}


module.exports = SchedulerManager;