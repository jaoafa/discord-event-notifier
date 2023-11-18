import { Logger } from '@book000/node-utils'
import { BaseGuild, GuildBasedChannel, TextBasedChannel } from 'discord.js'
import fs from 'node:fs'

interface EventNotifyServerData {
  id: string
  name: string
  channelId: string
}

export class EventNotifyServer {
  private readonly path: string
  private readonly guild: BaseGuild

  constructor(guild: BaseGuild) {
    this.guild = guild

    const baseServerDirectory = process.env.BASE_SERVER_DIR
      ? `${process.env.BASE_SERVER_DIR}/`
      : 'data/servers/'
    if (!fs.existsSync(baseServerDirectory)) {
      fs.mkdirSync(baseServerDirectory, { recursive: true })
    }

    this.path = `${baseServerDirectory}${guild.id}.json`
  }

  register(channel: GuildBasedChannel & TextBasedChannel): boolean {
    if (fs.existsSync(this.path)) {
      return false
    }

    const data: EventNotifyServerData = {
      id: this.guild.id,
      name: this.guild.name,
      channelId: channel.id,
    }

    fs.writeFileSync(this.path, JSON.stringify(data, null, 2))
    return true
  }

  unregister(): boolean {
    if (!fs.existsSync(this.path)) {
      return false
    }

    fs.unlinkSync(this.path)
    return true
  }

  private getChannelId(): string | null {
    if (!fs.existsSync(this.path)) {
      return null
    }

    const data: EventNotifyServerData = JSON.parse(
      fs.readFileSync(this.path, 'utf8')
    )
    return data.channelId
  }

  async getChannel(): Promise<(GuildBasedChannel & TextBasedChannel) | null> {
    const logger = Logger.configure(this.constructor.name + '.getChannel')
    const channelId = this.getChannelId()
    if (!channelId) {
      return null
    }

    const guild = await this.guild.fetch()
    const channel = await guild.channels.fetch(channelId)
    if (!channel) {
      logger.warn(
        `Channel not found: ${channelId} in ${guild.name} (${guild.id})`
      )
      return null
    }
    if (!channel.isTextBased()) {
      logger.warn(
        `Channel is not text based: ${channelId} in ${guild.name} (${guild.id})`
      )
      return null
    }

    return channel
  }

  isRegistered() {
    return fs.existsSync(this.path)
  }
}
