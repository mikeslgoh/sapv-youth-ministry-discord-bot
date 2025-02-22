const axios = require("axios");

class CommandFunctions {
    constructor() {}

    // Get specific form results
    async getResult(interaction) {
        const formName = interaction.options.getString("formname");
        const responseQuery = interaction.options.getString("responsequery");

		if (responseQuery === null) {
			return `⚠️ Error: question must be provided to get result for!`;
		}

        try {
            const queryParams = new URLSearchParams({
                formName: formName,
                responseQuery: responseQuery,
            });

            const data = await this.fetchFormData(queryParams);

			if (data.error) {
                await interaction.editReply(`⚠️ Error: ${data.error}`);
            } 
			
			const counts = data.counts;
			if (counts && Object.keys(counts).length > 0) {
				let reply = `📊 **Responses for:** "${responseQuery}"\n\n`;
				for (const [answer, count] of Object.entries(counts)) {
					reply += `- **${answer}**: ${count} response(s)\n`;
				}
				return reply;
			} else {
				return `⚠️ No responses found for the question: "${responseQuery}".`;
			}
		} catch (error) {
			console.error("❌ Error fetching question results:", error);
			return "❌ Failed to retrieve question results.";
		}
    }

    // Get form count
    async getCount(interaction) {
        const formName = interaction.options.getString("formname");

		try {
			await interaction.deferReply();

			const queryParams = new URLSearchParams({
				formName: formName
			});

			const data = await fetchFormData(queryParams);

			if (data.error) {
				await interaction.editReply(`⚠️ Error: ${data.error}`);
			} else if (data.matchingForms?.length > 0) {
				const replyMessage = formatFormResponse(data.matchingForms);
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
module.exports = CommandFunctions;