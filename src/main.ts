import config from 'config'
import {
  Client,
  TextChannel,
  ApplicationCommandOptionType,
  ChannelType,
  PermissionsBitField,
  EmbedBuilder,
  GuildScheduledEventStatus,
  MessageFlags,
} from 'discord.js'
import {
  formatDate,
  getNotifyChannel,
  isRegistered,
  register,
  unregister,
} from './utlis'

const client = new Client({
  intents: ['GuildMessages', 'GuildScheduledEvents', 'GuildMembers'],
})

client.on('ready', async () => {
  console.log(`ready: ${client.user?.tag}`)

  for (const guild of client.guilds.cache.values()) {
    try {
      await guild.commands.create({
        name: 'event-notifier-register',
        description: 'Register the guild',
        options: [
          {
            name: 'channel',
            description: 'The channel to send the message to',
            type: ApplicationCommandOptionType.Channel,
            channel_types: [ChannelType.GuildText],
            required: true,
          },
        ],
      })
      await guild.commands.create({
        name: 'event-notifier-unregister',
        description: 'Unregister this guild',
      })
      console.log(`registered: ${guild.name} (${guild.id})`)
    } catch (e) {
      console.error(`Couldn't create commands: ${guild.name} (${guild.id})`)
    }

    try {
      const events = await guild.scheduledEvents.fetch()
      if (events.size > 0) {
        console.log(`${guild.name} (${guild.id}) has ${events.size} events`)
      }
    } catch (e) {
      console.error(
        `Couldn't fetch scheduled events: ${guild.name} (${guild.id})`
      )
    }
  }
})

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return
  const _guild = interaction.guild
  if (!_guild) return
  const guild = await _guild.fetch()
  console.log(`interactionCreate: ${guild.name} (${guild.id})`)
  const member = interaction.member
  if (!member) return
  if (!(member.permissions instanceof PermissionsBitField)) {
    return
  }
  if (member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    await interaction.reply(
      ':x: You need to be an administrator to use this command.'
    )
    return
  }
  if (interaction.commandName === 'event-notifier-register') {
    await interaction.reply(':pencil: Event notifier registering...')
    const channel = interaction.options.getChannel('channel') as TextChannel
    const registered = await register(guild, channel)
    if (!registered) {
      await interaction.editReply(':x: Event notifier is already registered.')
      return
    }
    await interaction.editReply(
      `:white_check_mark: Event notifier registered. Notify channel: <#${channel.id}>`
    )
  }

  if (interaction.commandName === 'event-notifier-unregister') {
    await interaction.reply(':pencil: Event notifier unregistering...')
    const registered = await unregister(guild)
    if (!registered) {
      await interaction.editReply(':x: Event notifier is not registered.')
      return
    }
    await interaction.editReply(
      ':white_check_mark: Event notifier unregistered.'
    )
  }
})

client.on('guildScheduledEventCreate', async (event) => {
  console.log(`Scheduled event ${event.id} created`)
  const guild = event.guild
  if (!guild) return
  if (!isRegistered(guild)) {
    return
  }
  const channel = await getNotifyChannel(guild)
  if (!channel) {
    return
  }
  const embed = new EmbedBuilder()
    .setTitle(`イベントが追加されました！`)
    .setURL(event.url)
    .addFields({
      name: 'イベントタイトル',
      value: event.name,
    })
    .setColor('#00ff00')
  if (event.scheduledStartAt) {
    embed.addFields({
      name: 'イベント日時',
      value: formatDate(event.scheduledStartAt, 'yyyy/MM/dd HH:mm:ss'),
    })
  }
  if (event.description) {
    embed.addFields({
      name: 'イベント説明',
      value: event.description,
    })
  }
  if (event.creator) {
    embed.addFields({
      name: 'イベント作成者',
      value: `<@${event.creator.id}>`,
    })
  }
  channel.send({
    embeds: [embed],
    flags: MessageFlags.SuppressNotifications,
  })
})

client.on('guildScheduledEventUpdate', async (oldEvent, newEvent) => {
  if (oldEvent == null || newEvent == null) return
  const guild = newEvent.guild
  if (guild == null) return
  if (!isRegistered(guild)) {
    return
  }
  console.log(`Scheduled event ${newEvent.id} updated`)
  if (
    oldEvent.status !== GuildScheduledEventStatus.Scheduled ||
    newEvent.status !== GuildScheduledEventStatus.Active
  ) {
    return
  }
  const subscripbers = await newEvent.fetchSubscribers({
    limit: 100,
  })
  const mentions = subscripbers.map((s) => `<@${s.user.id}>`).join(' ')

  const channel = await getNotifyChannel(guild)
  if (!channel) {
    return
  }
  const embed = new EmbedBuilder()
    .setTitle(`イベントが始まりました！`)
    .setURL(newEvent.url)
    .addFields({
      name: 'イベントタイトル',
      value: newEvent.name,
    })
    .setColor('#00ff00')
  if (newEvent.description) {
    embed.addFields({
      name: 'イベント説明',
      value: newEvent.description,
    })
  }
  if (newEvent.creator) {
    embed.addFields({
      name: 'イベント作成者',
      value: `<@${newEvent.creator.id}>`,
    })
  }
  channel.send({
    content: mentions,
    embeds: [embed],
    flags: MessageFlags.SuppressNotifications,
  })
})

client
  .login(config.get('discordToken'))
  .then(() => console.log('Login Successful.'))
