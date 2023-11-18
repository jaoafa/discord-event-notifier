import {
  CacheType,
  ChatInputCommandInteraction,
  BaseGuild,
  SlashCommandSubcommandGroupBuilder,
  SlashCommandSubcommandBuilder,
  ChannelType,
  GuildBasedChannel,
  TextBasedChannel,
} from 'discord.js'
import { BaseCommand, Permission } from '.'
import { EventNotifyServer } from '@/server'
import { Discord } from '@/discord'
import { Logger } from '@book000/node-utils'

export class RegisterCommand implements BaseCommand {
  definition():
    | SlashCommandSubcommandBuilder
    | SlashCommandSubcommandGroupBuilder
    | null {
    return new SlashCommandSubcommandBuilder()
      .setName('register')
      .setDescription(
        'このサーバを discord-event-notifier の対象サーバに設定します。'
      )
      .addChannelOption((option) =>
        option
          .setName('channel')
          .setDescription(
            '通知を受け取るチャンネルを指定します。指定しない場合はこのチャンネルが使用されます。'
          )
          .setRequired(false)
          .addChannelTypes(ChannelType.GuildText)
      )
  }

  conditions(guild: BaseGuild): boolean {
    const server = new EventNotifyServer(guild)
    return !server.isRegistered()
  }

  get permissions(): Permission[] {
    return [
      {
        identifier: 'ManageGuild',
        type: 'PERMISSION',
      },
    ]
  }

  async execute(
    discord: Discord,
    interaction: ChatInputCommandInteraction<CacheType>
  ): Promise<void> {
    const logger = Logger.configure(this.constructor.name + '.execute')
    await interaction.deferReply()

    if (!interaction.guild) {
      await interaction.editReply({
        embeds: [
          {
            title: '❌ 登録に失敗',
            description: 'このコマンドはDiscordサーバ内でのみ実行できます。',
            color: 0xff_00_00,
          },
        ],
      })
      return
    }

    const guild = interaction.guild
    const channel = await this.getSelectedChannel(interaction)
    if (!channel) {
      return
    }

    const server = new EventNotifyServer(interaction.guild)
    server.register(channel)

    await interaction.editReply({
      embeds: [
        {
          title: '⏩ 登録に成功',
          description:
            `このサーバを discord-event-notifier の対象サーバに設定し、通知先チャンネルを <#${channel.id}> に設定しました。\n` +
            'このサーバでイベントが作成されたとき、または開始されたときに通知が送信されます。',
          footer: {
            text: 'コマンドの再登録を行っています…',
          },
          color: 0xff_a5_00,
          timestamp: new Date().toISOString(),
        },
      ],
    })
    logger.info(`✅ Registered guild: ${guild.name} (${guild.id})`)

    await discord.updateCommands(guild)

    await interaction.editReply({
      embeds: [
        {
          title: '✅ 登録に成功',
          description:
            `このサーバを discord-event-notifier の対象サーバに設定し、通知先チャンネルを <#${channel.id}> に設定しました。\n` +
            'このサーバでイベントが作成されたとき、または開始されたときに通知が送信されます。',
          footer: {
            text: 'コマンドの再登録が完了しました',
          },
          color: 0x00_ff_00,
          timestamp: new Date().toISOString(),
        },
      ],
    })
  }

  private async getSelectedChannel(
    interaction: ChatInputCommandInteraction
  ): Promise<(GuildBasedChannel & TextBasedChannel) | undefined> {
    const channel = interaction.options.getChannel<ChannelType.GuildText>(
      'channel',
      false
    )
    if (channel) {
      return channel
    }

    if (!interaction.channel) {
      await interaction.editReply({
        embeds: [
          {
            title: '❌ 登録に失敗',
            description: 'チャンネル情報の取得に失敗しました。',
            color: 0xff_00_00,
          },
        ],
      })
      return
    }
    if (!interaction.channel.isTextBased() || interaction.channel.isDMBased()) {
      await interaction.editReply({
        embeds: [
          {
            title: '❌ 登録に失敗',
            description: 'サーバのテキストチャンネルを指定してください。',
            color: 0xff_00_00,
          },
        ],
      })
      return
    }

    return interaction.channel
  }
}
