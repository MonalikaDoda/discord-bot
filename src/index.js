const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const mongoose = require('mongoose');
const { verifyKeyMiddleware, InteractionType, InteractionResponseType } = require('discord-interactions');
const Interaction = require('./models/Interaction');

const DISCORD_PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY;
if (!DISCORD_PUBLIC_KEY) {
	console.error('Missing DISCORD_PUBLIC_KEY in environment.');
	process.exit(1);
}

const app = express();
app.use(express.json());

async function connectToMongoDB() {
	const mongoUrl = process.env.MONGODB_URL;

	if (!mongoUrl) {
		console.error('Missing MONGODB_URL in environment.');
		process.exit(1);
	}

	try {
		await mongoose.connect(mongoUrl);
		console.log('MongoDB connected successfully.');
	} catch (error) {
		console.error('MongoDB connection failed:', error.message);
		process.exit(1);
	}
}

app.post('/interactions', verifyKeyMiddleware(DISCORD_PUBLIC_KEY), async (req, res) => {
	const interaction = req.body;

	if (interaction.type === InteractionType.PING) {
		return res.send({ type: InteractionResponseType.PONG });
	}

	if (interaction.type === InteractionType.APPLICATION_COMMAND) {
		const name = interaction.data && interaction.data.name ? interaction.data.name : 'unknown';
		const options = interaction.data && interaction.data.options ? interaction.data.options : [];
		const inputText = options.find((option) => option.name === 'text')?.value || '';

		try {
			await Interaction.create({
				interactionId: interaction.id,
				commandName: name,
				inputText,
				userId: interaction.member?.user?.id || '',
				guildId: interaction.guild_id || '',
				channelId: interaction.channel_id || '',
			});
		} catch (error) {
			if (error.code !== 11000) {
				console.error('Failed to save interaction:', error.message);
			}
		}

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

async function startServer() {
	await connectToMongoDB();

	app.listen(PORT, () => {
		console.log(`Listening on port ${PORT}`);
	});
}

startServer();

