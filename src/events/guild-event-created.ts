import { GuildScheduledEvent, MessageFlags } from 'discord.js'
import { BaseDiscordEvent } from '.'
import { EventNotifyServer } from '@/server'
import { Utils } from '@/utils'

/**
 * イベントが作成されたとき
 */
export class GuildEventCreated extends BaseDiscordEvent<'guildScheduledEventCreate'> {
  get eventName(): 'guildScheduledEventCreate' {
    return 'guildScheduledEventCreate'
  }

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

    if (event.partial) {
      event = await event.fetch()
    }

    const embed =
      Utils.getEventEmbed(event).setTitle(`:new:イベントが追加されました！`)
    await channel.send({
      embeds: [embed],
      flags: MessageFlags.SuppressNotifications,
    })
  }
}
