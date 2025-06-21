// src/commands/setup.js
const fs = require('fs');
const path = require('path');
const { SlashCommandBuilder } = require('discord.js');

const configPath = path.join(__dirname, '../../data/guildConfigs.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Set the support role and ticket category for this server.')
    .addRoleOption(option =>
      option.setName('supportrole')
        .setDescription('Role that handles support tickets')
        .setRequired(true)
    )
    .addChannelOption(option =>
      option.setName('category')
        .setDescription('Category where ticket channels will be created')
        .setRequired(true)
    ),

  async execute(interaction) {
    const supportRole = interaction.options.getRole('supportrole');
    const category = interaction.options.getChannel('category');

    if (!interaction.member.permissions.has('Administrator')) {
      return interaction.reply({ content: 'Only admins can run this command.', ephemeral: true });
    }

    let guildConfigs = {};
    if (fs.existsSync(configPath) && fs.readFileSync(configPath, 'utf8').trim() !== '') {
      guildConfigs = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }

    guildConfigs[interaction.guildId] = {
      supportRoleId: supportRole.id,
      categoryId: category.id
    };
    fs.writeFileSync(configPath, JSON.stringify(guildConfigs, null, 2));

    return interaction.reply({
      content: `✅ Setup complete. Tickets will go to <#${category.id}> and mention ${supportRole}.`,
      ephemeral: true
    });
  }
};
