import {
  BaseGuild,
  BaseInteraction,
  Client,
  GatewayIntentBits,
  Partials,
  REST,
  SlashCommandBuilder,
  SlashCommandSubcommandBuilder,
  SlashCommandSubcommandGroupBuilder,
} from 'discord.js'
import { Logger } from '@book000/node-utils'
import { Configuration } from './config'
import { BaseDiscordEvent } from './events'
import { GuildEventCreated } from './events/guild-event-created'
import { GuildEventStarted } from './events/guild-event-started'
import { BaseCommand } from './commands'
import { RegisterCommand } from './commands/register'
import { UnregisterCommand } from './commands/unregister'

export class Discord {
  private config: Configuration
  public readonly client: Client
  public readonly rest: REST

  public static readonly routes: BaseCommand[] = [
    new RegisterCommand(),
    new UnregisterCommand(),
  ]

  constructor(config: Configuration) {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildScheduledEvents,
      ],
      partials: [Partials.GuildScheduledEvent],
    })
    this.client.on('ready', this.onReady.bind(this))
    this.client.on('interactionCreate', this.onInteractionCreate.bind(this))

    const events: BaseDiscordEvent<any>[] = [
      new GuildEventCreated(this),
      new GuildEventStarted(this),
    ]
    for (const event of events) {
      event.register()
    }

    this.rest = new REST().setToken(config.get('discord').token)
    this.config = config

    this.client.login(config.get('discord').token).catch((error: unknown) => {
      const logger = Logger.configure('Discord.constructor')
      logger.error('❌ Failed to login', error as Error)
    })
  }

  public getClient() {
    return this.client
  }

  public getConfig() {
    return this.config
  }

  public async close() {
    await this.client.destroy()
  }

  async onReady() {
    const logger = Logger.configure('Discord.onReady')
    logger.info(`👌 ready: ${this.client.user?.tag}`)

    await this.updateAllGuildCommands()

    // 1時間ごとに interactionCreate を再登録する
    setInterval(
      () => {
        const logger = Logger.configure('Discord.onReady.setInterval')
        logger.info('🔄 Re-registering interactionCreate handler')
        this.client.off(
          'interactionCreate',
          this.onInteractionCreate.bind(this)
        )
        this.client.on('interactionCreate', this.onInteractionCreate.bind(this))

        this.updateAllGuildCommands().catch((error: unknown) => {
          logger.error('❌ Failed to update commands', error as Error)
        })
      },
      1000 * 60 * 60
    )
  }

  async onInteractionCreate(interaction: BaseInteraction) {
    if (!interaction.isChatInputCommand()) {
      return
    }

    if (
      !interaction.command ||
      interaction.command.name !== 'discord-event-notifier'
    ) {
      return
    }
    const guild = interaction.guild
    if (!guild) {
      return
    }
    const command = Discord.routes.find((route) => {
      const group = interaction.options.getSubcommandGroup()
      const subcommand = interaction.options.getSubcommand()
      const definition = route.definition(guild)
      return definition && definition.name === (group ?? subcommand)
    })
    if (!command) return

    if (command.permissions) {
      const permissions = command.permissions.map((permission) => {
        if (permission.identifier) {
          switch (permission.type) {
            case 'USER': {
              return interaction.user.id === permission.identifier
            }
            case 'ROLE': {
              if (!interaction.guild) {
                return false
              }
              const user = interaction.guild.members.resolve(interaction.user)
              if (!user) return false
              return user.roles.cache.has(permission.identifier)
            }
            case 'PERMISSION': {
              if (!interaction.guild) {
                return false
              }
              const user = interaction.guild.members.resolve(interaction.user)
              if (!user) return false
              return user.permissions.has(permission.identifier)
            }
          }
        }
        return true
      })
      if (!permissions.every(Boolean)) {
        await interaction.reply({
          content: 'このコマンドを実行する権限がありません。',
          ephemeral: true,
        })
        return
      }
    }
    await command.execute(this, interaction)
  }

  async updateAllGuildCommands() {
    const logger = Logger.configure('Discord.updateAllGuildCommands')
    logger.info('🔄 Updating commands')

    const guilds = await this.client.guilds.fetch()
    for (const guild of guilds.values()) {
      await this.updateCommands(guild)
    }

    logger.info('👌 Commands updated')
  }

  async updateCommands(guild: BaseGuild) {
    const logger = Logger.configure('Discord.updateCommands')
    logger.info(`🖥️ Guild: ${guild.name} (${guild.id})`)

    if (!this.client.application) {
      throw new Error('Client#Application is not found.')
    }

    const builder = new SlashCommandBuilder()
      .setName('discord-event-notifier')
      .setDescription('Discord Event Notifier')

    for (const route of Discord.routes) {
      if (!route.conditions(guild)) {
        continue
      }
      const definition = route.definition(guild)
      if (!definition) {
        continue
      }
      logger.info('🖥️ SubCommand: ' + definition.name)
      if (definition instanceof SlashCommandSubcommandBuilder) {
        builder.addSubcommand(definition)
      }
      if (definition instanceof SlashCommandSubcommandGroupBuilder) {
        builder.addSubcommandGroup(definition)
      }
    }

    await this.client.application.commands.create(builder.toJSON(), guild.id)
  }

  waitReady() {
    return new Promise<void>((resolve) => {
      if (this.client.isReady()) {
        resolve()
      }
      this.client.once('ready', () => {
        resolve()
      })
    })
  }
}
