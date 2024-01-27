import { FindOptionsWhere, FindManyOptions, FindOneOptions } from 'typeorm'

import { getRepo, Server } from '../db'

interface IConditionsBase {
  conditions?: FindOptionsWhere<Server>
  guildId?: string
  id?: string
}

export interface IGetOneServerParams extends IConditionsBase {
  opts?: FindOneOptions<Server>
}

export interface IGetServerListParams extends IConditionsBase {
  opts?: FindManyOptions<Server>
}

export interface ICreateServerParams {
  guildId: string
}

export interface IDeleteServerParams extends IConditionsBase {}

export class ServerService {
  private readonly repo = getRepo(Server)

  public async getOne(
    params: IGetOneServerParams = {}
  ): Promise<undefined | Server> {
    const server = await this.repo.findOne({
      where: this.makeConditions(params),
      ...params.opts
    })

    return server ?? undefined
  }

  public async getList(params: IGetServerListParams = {}): Promise<Server[]> {
    return this.repo.find({
      where: this.makeConditions(params),
      ...params.opts
    })
  }

  public async create(params: ICreateServerParams): Promise<Server> {
    const server = this.repo.create(params)

    await this.repo.insert(server)

    return server
  }

  public async delete(params: IDeleteServerParams): Promise<void> {
    await this.repo.softDelete(this.makeConditions(params))
    return
  }

  private makeConditions(params: IConditionsBase): FindOptionsWhere<Server> {
    const conditions = params.conditions || {}

    if (typeof params.id !== 'undefined') {
      conditions.id = params.id
    }

    if (typeof params.guildId !== 'undefined') {
      conditions.guildId = params.guildId
    }

    return conditions
  }
}
