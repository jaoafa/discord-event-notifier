import config from 'config'
import {
  Client,
  Intents,
  MessageEmbed,
  Permissions,
  TextChannel,
} from 'discord.js'
import {
  ApplicationCommandOptionTypes,
  ChannelTypes,
} from 'discord.js/typings/enums'
import {
  formatDate,
  getNotifyChannel,
  isRegistered,
  register,
  unregister,
} from './utlis'

const client = new Client({
  intents: [
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_SCHEDULED_EVENTS,
    Intents.FLAGS.GUILD_MEMBERS,
  ],
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
            type: ApplicationCommandOptionTypes.CHANNEL,
            channel_types: [ChannelTypes.GUILD_TEXT],
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
  if (!interaction.isCommand()) return
  const _guild = interaction.guild
  if (!_guild) return
  const guild = await _guild.fetch()
  console.log(`interactionCreate: ${guild.name} (${guild.id})`)
  const member = interaction.member
  if (!member) return
  if (
    !(member.permissions as unknown as Permissions).has(
      Permissions.FLAGS.ADMINISTRATOR
    )
  ) {
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
  const embed = new MessageEmbed()
    .setTitle(`イベントが追加されました！`)
    .setURL(event.url)
    .addField('イベントタイトル', event.name)
    .setColor('#00ff00')
  if (event.scheduledStartTimestamp) {
    embed.addField(
      'イベント日時',
      formatDate(event.scheduledStartAt, 'yyyy/MM/dd HH:mm:ss')
    )
  }
  if (event.description) {
    embed.addField('イベント説明', event.description)
  }
  if (event.creator) {
    embed.addField('イベント作成者', `<@${event.creator.id}>`)
  }
  channel.send({
    embeds: [embed],
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
  if (oldEvent.status !== 'SCHEDULED' || newEvent.status !== 'ACTIVE') {
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
  const embed = new MessageEmbed()
    .setTitle(`イベントが始まりました！`)
    .setURL(newEvent.url)
    .addField('イベントタイトル', newEvent.name)
    .setColor('#00ff00')
  if (newEvent.description) {
    embed.addField('イベント説明', newEvent.description)
  }
  if (newEvent.creator) {
    embed.addField('イベント作成者', `<@${newEvent.creator.id}>`)
  }
  channel.send({
    content: mentions,
    embeds: [embed],
  })
})

client
  .login(config.get('discordToken'))
  .then(() => console.log('Login Successful.'))
