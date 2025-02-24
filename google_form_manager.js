const axios = require("axios");

class GoogleFormManager {
    constructor() {}

    // Get specific form results
    async getResult(interaction) {
        const formName = interaction.options.getString("formname");
        const responseQuery = interaction.options.getString("responsequery");

        try {
			if (!interaction.replied && !interaction.deferred) {
                await interaction.deferReply();
            }

            const queryParams = new URLSearchParams({
                formName: formName,
                responseQuery: responseQuery,
				category: "get_result"
            });

            const data = await this.fetchFormData(queryParams);

			if (data.error) {
                await interaction.editReply(`⚠️ Error: ${data.error}`);
            } 
			
			const counts = data.counts;
			if (counts && Object.keys(counts).length > 0) {
				let reply = `📊 **Responses for:** "${responseQuery}"\n`;
				for (const [answer, count] of Object.entries(counts)) {
					reply += `- **${answer}**: ${count} response(s)\n`;
				}
				await interaction.editReply(reply);
			} else {
				await interaction.editReply(`⚠️ No responses found for the question: "${responseQuery}".`);
			}
		} catch (error) {
			console.error("❌ Error fetching question results:", error);
			await interaction.editReply("❌ Failed to retrieve question results.");
		}
    }

    // Get form count
    async getCount(interaction) {
        const formName = interaction.options.getString("formname");

		try {
			if (!interaction.replied && !interaction.deferred) {
                await interaction.deferReply();
            }

			const queryParams = new URLSearchParams({
				formName: formName,
				category: "count"
			});

			const data = await this.fetchFormData(queryParams);

			if (data.error) {
				await interaction.editReply(`⚠️ Error: ${data.error}`);
			} else if (data.matchingForms?.length > 0) {
				const replyMessage = this.formatFormResponse(data.matchingForms);
				await interaction.editReply(replyMessage);
			} else {
				await interaction.editReply(`⚠️ No matching forms found for "${formName}".`);
			}
		} catch (error) {
			console.error("❌ Error handling form command:", error);
			await interaction.editReply("❌ An error occurred while processing your request.");
		}
    }

    // Fetch form data from Google Apps Script endpoint
    async fetchFormData(queryParams) {
        const url = `${process.env.WEB_APP_URL}?${queryParams}`;
        const response = await axios.get(url);
        return response.data;
    }

    // Format form response output
    formatFormResponse(forms) {
        let replyMessage = "🔍 Matching forms found:\n";
        forms.forEach((form) => {
            replyMessage += `**Form Name**: ${form.name}\n**Responses Count**: ${form.responseCount}\n\n`;
        });
        return replyMessage;
    }
}

// Export the entire class
module.exports = GoogleFormManager;