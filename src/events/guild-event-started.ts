import { GuildScheduledEvent, MessageFlags } from 'discord.js'
import { BaseDiscordEvent } from '.'
import { EventNotifyServer } from '@/server'
import { Utils } from '@/utils'

/**
 * イベントが開始されたとき
 */
export class GuildEventStarted extends BaseDiscordEvent<'guildScheduledEventUpdate'> {
  readonly eventName = 'guildScheduledEventUpdate'

  async execute(oldEvent: GuildScheduledEvent, newEvent: GuildScheduledEvent) {
    const guild = newEvent.guild
    if (!guild) {
      return
    }

    const server = new EventNotifyServer(guild)
    if (!server.isRegistered()) {
      return
    }

    if (!oldEvent.isScheduled() || !newEvent.isActive()) {
      return
    }

    const channel = await server.getChannel()
    if (!channel) {
      return
    }

    const subscribers = await newEvent.fetchSubscribers()
    const mentions = subscribers
      .map((subscriber) => `<@${subscriber.user.id}>`)
      .join(' ')

    const embed =
      Utils.getEventEmbed(newEvent).setTitle(`:tada:イベントが始まりました！`)
    await channel.send({
      content: mentions,
      embeds: [embed],
      flags: MessageFlags.SuppressNotifications,
    })
  }
}
