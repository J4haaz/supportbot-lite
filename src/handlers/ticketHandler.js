// src/handlers/ticketHandler.js
const fs = require('fs');
const path = require('path');
const { ChannelType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, PermissionsBitField } = require('discord.js');

const configPath = path.join(__dirname, '../../data/guildConfigs.json');
const transcriptFolder = path.join(__dirname, '../../transcripts');
const LOG_CHANNEL_ID = '1384262716146974802'; // Replace with your log channel ID

if (!fs.existsSync(transcriptFolder)) {
  fs.mkdirSync(transcriptFolder);
}

function getGuildConfigs() {
  let guildConfigs = {};
  try {
    if (fs.existsSync(configPath)) {
      const fileData = fs.readFileSync(configPath, 'utf8');
      if (fileData.trim() !== '') {
        guildConfigs = JSON.parse(fileData);
      }
    }
  } catch (error) {
    console.error("Error reading guildConfigs.json:", error);
  }
  return guildConfigs;
}

module.exports = async (interaction) => {
  const guildConfigs = getGuildConfigs();
  const config = guildConfigs[interaction.guildId];

  if (!config) {
    return interaction.reply({
      content: 'This server has not been set up yet. Please ask an admin to run `/setup`.',
      ephemeral: true
    });
  }

  const { supportRoleId, categoryId } = config;

  const existing = interaction.guild.channels.cache.find(
    c => c.name === `ticket-${interaction.user.username.toLowerCase()}`
  );

  if (existing) {
    return interaction.reply({ content: 'You already have a ticket open.', ephemeral: true });
  }

  try {
    const ticketChannel = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username}`,
      type: ChannelType.GuildText,
      parent: categoryId,
      permissionOverwrites: [
        {
          id: interaction.guild.id,
          deny: [PermissionsBitField.Flags.ViewChannel]
        },
        {
          id: interaction.user.id,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
        },
        {
          id: supportRoleId,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
        }
      ]
    });

    const closeButton = new ButtonBuilder()
      .setCustomId('close_ticket')
      .setLabel('Close Ticket')
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(closeButton);

    await ticketChannel.send({
      content: `<@${interaction.user.id}> Your ticket has been created. A staff member will assist you soon.`,
      components: [row]
    });

    await interaction.reply({ content: `Ticket created: ${ticketChannel}`, ephemeral: true });

    const collector = ticketChannel.createMessageComponentCollector({ time: 86400000 });

    collector.on('collect', async i => {
      if (i.customId === 'close_ticket') {
        await i.reply({ content: 'Saving transcript and closing ticket in 5 seconds...', ephemeral: true });

        const allMessages = [];
        let lastId;
        while (true) {
          const fetched = await ticketChannel.messages.fetch({ limit: 100, before: lastId });
          if (fetched.size === 0) break;
          allMessages.push(...fetched.map(msg => msg));
          lastId = fetched.last().id;
        }

        const sorted = allMessages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
        const content = sorted.map(m => {
          const time = new Date(m.createdTimestamp).toLocaleString();
          const author = m.author?.tag || 'Unknown';
          const body = m.content?.trim() || '[No content]';
          return `[${time}] ${author}: ${body}`;
        }).join('\n');

        const filePath = path.join(transcriptFolder, `${ticketChannel.name}.txt`);
        fs.writeFileSync(filePath, content || '[No messages]');

        const logChannel = await interaction.guild.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
        if (logChannel) {
          const attachment = new AttachmentBuilder(filePath);
          await logChannel.send({ content: `Transcript for ${ticketChannel.name}:`, files: [attachment] });
        }

        setTimeout(() => {
          ticketChannel.delete().catch(err => console.error('Failed to delete ticket channel:', err));
        }, 5000);
      }
    });
  } catch (error) {
    console.error("Error creating ticket channel:", error);
    return interaction.reply({ content: 'There was an error creating your ticket. Please try again later.', ephemeral: true });
  }
};
