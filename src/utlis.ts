import config from 'config'
import { Guild, TextChannel } from 'discord.js'
import fs from 'fs'

const SERVERS_FILE = config.get<string>('serversFile')

export async function register(guild: Guild, channel: TextChannel) {
  if (!fs.existsSync(SERVERS_FILE)) {
    fs.writeFileSync(SERVERS_FILE, JSON.stringify({}))
  }
  const servers: { [key: string]: string } = JSON.parse(
    fs.readFileSync(SERVERS_FILE, 'utf8')
  )
  if (servers[guild.id]) return false
  servers[guild.id] = channel.id
  fs.writeFileSync(SERVERS_FILE, JSON.stringify(servers))
  return true
}

export async function unregister(guild: Guild) {
  if (!fs.existsSync(SERVERS_FILE)) {
    fs.writeFileSync(SERVERS_FILE, JSON.stringify({}))
  }
  const servers: { [key: string]: string } = JSON.parse(
    fs.readFileSync(SERVERS_FILE, 'utf8')
  )
  if (!servers[guild.id]) return false
  delete servers[guild.id]
  fs.writeFileSync(SERVERS_FILE, JSON.stringify(servers))
  return true
}

export async function getNotifyChannel(
  guild: Guild
): Promise<TextChannel | null> {
  if (!fs.existsSync(SERVERS_FILE)) {
    fs.writeFileSync(SERVERS_FILE, JSON.stringify({}))
  }
  const servers: { [key: string]: string } = JSON.parse(
    fs.readFileSync(SERVERS_FILE, 'utf8')
  )
  if (!servers[guild.id]) return null
  const channel = await guild.channels.fetch(servers[guild.id])
  if (!channel) return null
  return channel as TextChannel
}

export async function isRegistered(guild: Guild) {
  if (!fs.existsSync(SERVERS_FILE)) {
    fs.writeFileSync(SERVERS_FILE, JSON.stringify([]))
  }
  const servers: { [key: string]: string } = JSON.parse(
    fs.readFileSync(SERVERS_FILE, 'utf8')
  )
  return servers[guild.id] !== undefined
}

export function formatDate(date: Date, format: string): string {
  format = format.replace(/yyyy/g, String(date.getFullYear()))
  format = format.replace(/MM/g, ('0' + (date.getMonth() + 1)).slice(-2))
  format = format.replace(/dd/g, ('0' + date.getDate()).slice(-2))
  format = format.replace(/HH/g, ('0' + date.getHours()).slice(-2))
  format = format.replace(/mm/g, ('0' + date.getMinutes()).slice(-2))
  format = format.replace(/ss/g, ('0' + date.getSeconds()).slice(-2))
  format = format.replace(/SSS/g, ('00' + date.getMilliseconds()).slice(-3))
  return format
}
