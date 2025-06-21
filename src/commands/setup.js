const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../../data/guildConfigs.json');

module.exports = {
  name: 'setup',
  description: 'Set the support role and ticket category for this server.',
  options: [
    {
      name: 'supportrole',
      type: 8, // ROLE
      description: 'Role that handles support tickets',
      required: true,
    },
    {
      name: 'category',
      type: 7, // CHANNEL
      description: 'Category where ticket channels will be created',
      required: true,
    }
  ],
  async execute(interaction) {
    const supportRole = interaction.options.getRole('supportrole');
    const category = interaction.options.getChannel('category');

    if (!interaction.member.permissions.has('Administrator')) {
      return interaction.reply({ content: 'Only admins can run this command.', ephemeral: true });
    }

    const guildConfigs = JSON.parse(fs.readFileSync(configPath));
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
