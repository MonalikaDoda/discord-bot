require('dotenv').config();

const { DISCORD_APP_ID, DISCORD_BOT_TOKEN } = process.env;

if (!DISCORD_APP_ID || !DISCORD_BOT_TOKEN) {
  console.error("Missing DISCORD_APP_ID or DISCORD_BOT_TOKEN in environment.");
  process.exit(1);
}

const commands = [
  {
    name: "report",
    description: "Report a message or issue",
    options: [
      {
        name: "text",
        description: "The text to report",
        type: 3,
        required: true,
      },
    ],
  },
  {
    name: "status",
    description: "Check the bot status",
  },
];

const registerCommands = async () => {
  const endpoint = `https://discord.com/api/v10/applications/${DISCORD_APP_ID}/commands`;

  try {
    const response = await fetch(endpoint, {
      method: "PUT",
      headers: {
        "Authorization": `Bot ${DISCORD_BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(commands),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Discord API responded with ${response.status}: ${body}`);
    }

    const data = await response.json();
    console.log(`Registered ${data.length} global commands successfully.`);
  } catch (error) {
    console.error("Failed to register commands:", error);
    process.exit(1);
  }
};

registerCommands();
