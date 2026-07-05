const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const { verifyKeyMiddleware, InteractionType, InteractionResponseType } = require('discord-interactions');

const DISCORD_PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY;
if (!DISCORD_PUBLIC_KEY) {
	console.error('Missing DISCORD_PUBLIC_KEY in environment.');
	process.exit(1);
}

const app = express();

app.post('/interactions', verifyKeyMiddleware(DISCORD_PUBLIC_KEY), (req, res) => {
	const interaction = req.body;

	if (interaction.type === InteractionType.PING) {
		return res.send({ type: InteractionResponseType.PONG });
	}

	if (interaction.type === InteractionType.APPLICATION_COMMAND) {
		const name = interaction.data && interaction.data.name ? interaction.data.name : 'unknown';

		return res.send({
			type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
			data: {
				content: `You invoked /${name}`,
			},
		});
	}

	return res.status(400).send('Unsupported interaction type');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	console.log(`Listening on port ${PORT}`);
});

