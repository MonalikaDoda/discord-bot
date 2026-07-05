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

async function sendSlackMessage(message) {
	const webhookUrl = process.env.SLACK_WEBHOOK_URL;

	if (!webhookUrl) {
		console.warn('SLACK_WEBHOOK_URL is not set.');
		return;
	}

	try {
		await fetch(webhookUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ text: message }),
		});
	} catch (error) {
		console.error('Failed to send Slack message:', error.message);
	}
}

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

		res.send({
			type: 5,
		});

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

		const senderId = interaction.member?.user?.id || 'unknown';
		const slackMessage = inputText
			? `Slash command /${name} received from user ${senderId} with input: ${inputText}`
			: `Slash command /${name} received from user ${senderId}`;
		await sendSlackMessage(slackMessage);

		try {
			await fetch(`https://discord.com/api/v10/webhooks/${process.env.DISCORD_APP_ID}/${interaction.token}/messages/@original`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					content: `You invoked /${name}`,
				}),
			});
		} catch (error) {
			console.error('Failed to send follow-up Discord message:', error.message);
		}
		return;
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

