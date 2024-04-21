import { GuildScheduledEvent, MessageFlags } from 'discord.js'
import { BaseDiscordEvent } from '.'
import { EventNotifyServer } from '@/server'
import { Utils } from '@/utils'

/**
 * イベントが作成されたとき
 */
export class GuildEventCreated extends BaseDiscordEvent<'guildScheduledEventCreate'> {
  readonly eventName = 'guildScheduledEventCreate'

  async execute(event: GuildScheduledEvent) {
    const guild = event.guild
    if (!guild) {
      return
    }

    const server = new EventNotifyServer(guild)
    if (!server.isRegistered()) {
      return
    }

    const channel = await server.getChannel()
    if (!channel) {
      return
    }

    const embed =
      Utils.getEventEmbed(event).setTitle(`:new:イベントが追加されました！`)
    await channel.send({
      embeds: [embed],
      flags: MessageFlags.SuppressNotifications,
    })
  }
}
