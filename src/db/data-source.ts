import { DataSource } from 'typeorm'
import { resolve } from 'path'
import 'reflect-metadata'

const migrate = false

export const dataSource = new DataSource({
  entities: [resolve(__dirname, './entities/**/*.entity.{ts,js}')],
  migrations: [resolve(__dirname, './migrations/**/*.{ts,js}')],
  database: resolve(process.cwd(), './data/sqlite.db'),
  migrationsRun: migrate,
  synchronize: migrate,
  type: 'sqlite',
  logging: true
})
