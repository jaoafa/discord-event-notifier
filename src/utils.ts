import { EmbedBuilder, GuildScheduledEvent } from 'discord.js'

export const Utils = {
  formatDate(date: Date, format: string): string {
    format = format.replaceAll('yyyy', String(date.getFullYear()))
    format = format.replaceAll('MM', ('0' + (date.getMonth() + 1)).slice(-2))
    format = format.replaceAll('dd', ('0' + date.getDate()).slice(-2))
    format = format.replaceAll('HH', ('0' + date.getHours()).slice(-2))
    format = format.replaceAll('mm', ('0' + date.getMinutes()).slice(-2))
    format = format.replaceAll('ss', ('0' + date.getSeconds()).slice(-2))
    format = format.replaceAll('SSS', ('00' + date.getMilliseconds()).slice(-3))
    return format
  },
  getEventEmbed(event: GuildScheduledEvent): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setURL(event.url)
      .addFields({
        name: 'イベントタイトル',
        value: event.name,
      })
      .setColor('#00ff00')
    if (event.scheduledStartAt) {
      embed.addFields({
        name: 'イベント開始日時',
        value: Utils.formatDate(event.scheduledStartAt, 'yyyy/MM/dd HH:mm:ss'),
      })
    }
    if (event.scheduledEndAt) {
      embed.addFields({
        name: 'イベント終了日時',
        value: Utils.formatDate(event.scheduledEndAt, 'yyyy/MM/dd HH:mm:ss'),
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
    return embed
  },
}
