import { importx } from '@discordx/importer'
import { resolve } from 'path'
import 'reflect-metadata'
import 'dotenv/config'

import { dataSource } from './db'
import { bot } from './bot'

run()
  .then(() => {
    console.log('ready')
  })
  .catch((error) => {
    console.error('fatal:', error)
    process.exit(1)
  })

async function run() {
  console.log('importing commands and events...')
  await importx(
    resolve(__dirname, './bot/commands/**/*.command.{ts,js}'),
    resolve(__dirname, './bot/events/**/*.{ts,js}')
  )

  console.log('initializing database...')
  await dataSource.initialize()

  console.log('logging in...')
  await bot.login(process.env.DISCORD_TOKEN!)

  console.log('initializing application commands...')
  await bot.initApplicationCommands()
}
