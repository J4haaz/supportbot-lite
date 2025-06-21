const fs = require('fs');
const path = require('path');
const { ChannelType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const configPath = path.join(__dirname, '../../data/guildConfigs.json');

module.exports = async (interaction) => {
  const guildConfigs = JSON.parse(fs.readFileSync(configPath));
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

  const ticketChannel = await interaction.guild.channels.create({
    name: `ticket-${interaction.user.username}`,
    type: ChannelType.GuildText,
    parent: categoryId,
    permissionOverwrites: [
      {
        id: interaction.guild.id,
        deny: [PermissionFlagsBits.ViewChannel]
      },
      {
        id: interaction.user.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
      },
      {
        id: supportRoleId,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
      }
    ]
  });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('close_ticket')
      .setLabel('Close Ticket')
      .setStyle(ButtonStyle.Danger)
  );

  await ticketChannel.send({
    content: `<@${interaction.user.id}> Your ticket has been created. A staff member will assist you shortly.`,
    components: [row]
  });

  await interaction.reply({ content: `Ticket created: ${ticketChannel}`, ephemeral: true });

  const collector = ticketChannel.createMessageComponentCollector({ time: 86400000 });

  collector.on('collect', async i => {
    if (i.customId === 'close_ticket') {
      await i.reply({ content: 'Closing ticket in 5 seconds...', ephemeral: true });
      setTimeout(() => ticketChannel.delete(), 5000);
    }
  });
};
