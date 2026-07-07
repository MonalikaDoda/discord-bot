const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const { verifyKeyMiddleware, InteractionType, InteractionResponseType } = require('discord-interactions');
const Interaction = require('./models/Interaction');
const CommandConfig = require('./models/CommandConfig');
const authRoutes = require('./routes/auth');
const configRoutes = require('./routes/config');
const { summarizeAndTagReport } = require('./gemini');

const DISCORD_PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY;
if (!DISCORD_PUBLIC_KEY) {
	console.error('Missing DISCORD_PUBLIC_KEY in environment.');
	process.exit(1);
}

const app = express();
app.set('trust proxy', 1);

const SESSION_SECRET = process.env.SESSION_SECRET || '';
if (!SESSION_SECRET) {
  console.error('Missing SESSION_SECRET in environment.');
  process.exit(1);
}

app.set('view engine', 'ejs');
app.set('views', 'src/views');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
const isProduction = process.env.NODE_ENV === 'production';
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
  },
}));

app.use(authRoutes);
app.use(configRoutes);

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
			let aiTag = null;
			let aiSummary = null;
			if (name === 'report') {
				let geminiResult = { summary: null, urgency: null };
				try {
					geminiResult = await summarizeAndTagReport(inputText || '');
					aiSummary = geminiResult.summary || null;
				} catch (e) {
					aiSummary = null;
				}

				try {
					const configs = await CommandConfig.find().lean().exec();
					const normalizedText = inputText.toLowerCase();
					const matched = configs.find(config => normalizedText.includes(config.keyword.toLowerCase()));
					aiTag = matched ? matched.tag : (geminiResult.urgency || null);
				} catch (e) {
					aiTag = geminiResult.urgency || null;
				}
			}

			await Interaction.create({
				interactionId: interaction.id,
				commandName: name,
				inputText,
				userId: interaction.member?.user?.id || '',
				guildId: interaction.guild_id || '',
				channelId: interaction.channel_id || '',
				aiTag,
				aiSummary,
			});
		} catch (error) {
			if (error.code !== 11000) {
				console.error('Failed to save interaction:', error.message);
			}
		}

		const senderId = interaction.member?.user?.id || 'unknown';
		let slackMessage = inputText
			? `Slash command /${name} received from user ${senderId} with input: ${inputText}`
			: `Slash command /${name} received from user ${senderId}`;
		if (name === 'report') {
			// add AI tag/summary if available on the saved document
			const { aiTag, aiSummary } = await Interaction.findOne({ interactionId: interaction.id }) || {};
			if (aiSummary) slackMessage += `\nAI summary: ${aiSummary}`;
			if (aiTag) slackMessage += `\nAI urgency: ${aiTag}`;
		}
		await sendSlackMessage(slackMessage);

		try {
			let followUpContent;
			if (name === 'report') {
				const doc = await Interaction.findOne({ interactionId: interaction.id }) || {};
				const tagPart = doc.aiTag ? ` (urgency: ${doc.aiTag})` : '';
				const summaryPart = doc.aiSummary ? ` — ${doc.aiSummary}` : '';
				followUpContent = `Got your report${tagPart}${summaryPart} — logged and forwarded to the team.`;
			} else if (name === 'status') {
				followUpContent = 'All systems normal — bot is up and logging.';
			} else {
				followUpContent = `You invoked /${name}`;
			}

			await fetch(`https://discord.com/api/v10/webhooks/${process.env.DISCORD_APP_ID}/${interaction.token}/messages/@original`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					content: followUpContent,
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

