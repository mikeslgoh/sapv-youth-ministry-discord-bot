const { DateTime } = require('luxon');
const cron = require('node-cron');

class ScheduleMessageCommandFunctions {
    constructor(client) {
        this.client = client;
    }

    async schedule(interaction) {
		const message = interaction.options.getString("message");
		const time = interaction.options.getString("time");
		const timezone = interaction.options.getString("timezone");
		const channel = interaction.options.getString("channel");

        try {
            const [hour, minute] = time.split(':').map(Number);
            const now = DateTime.now().setZone(timezone);

            if (!now.isValid) {
                console.error('Invalid timezone provided.');
                return;
            }

            const targetTime = now.set({ hour, minute, second: 0 });

            if (targetTime <= now) {
                await interaction.reply('The scheduled time must be in the future.');
                return;
            }

            const cronTime = `${minute} ${hour} * * *`;

            cron.schedule(cronTime, () => {
                const channel = this.client.channels.cache.get(channelId);
                if (channel) {
                    channel.send(message);
                }
            }, {
                timezone: timezone
            });

            await interaction.reply(`Message scheduled for ${targetTime.toFormat('yyyy-LL-dd HH:mm')} in channel ${channelId}.`);
        } catch (error) {
            await interaction.reply('Error scheduling message:', error);
        }
    }
}