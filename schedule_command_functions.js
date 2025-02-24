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

            cron.schedule(cronTime, () => {
                const targetChannel = this.client.channels.cache.get(channel.id);
                if (targetChannel) {
                    targetChannel.send(message);
                } else {
                    console.error(`Channel not found: ${channel.id}`);
                }
            }, {
                timezone: timezone
            });

            await interaction.editReply(`Message scheduled for ${targetTime.toFormat('yyyy-LL-dd HH:mm')} in channel ${channel.id}.`);
        } catch (error) {
            await interaction.editReply(`Error scheduling message: ${error.message}`);
        }
    }
}


module.exports = ScheduleMessageCommandFunctions;