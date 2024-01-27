import { FindOptionsWhere, FindManyOptions, FindOneOptions } from 'typeorm'
import { APIEmbed } from 'discord.js'

import { getRepo, Panel } from '../db'

interface IConditionsBase {
  conditions?: FindOptionsWhere<Panel>
  id?: string
}

export interface IGetPanelListParams extends IConditionsBase {
  opts?: FindManyOptions<Panel>
}

export interface IGetOnePanelParams extends IConditionsBase {
  opts?: FindOneOptions<Panel>
}

export interface ICreatePanelParams {
  serverId: string
  embed: APIEmbed
  name: string
}

export interface IDeleteServerParams extends IConditionsBase {}

export class PanelService {
  private readonly repo = getRepo(Panel)

  private makeConditions(params: IConditionsBase): FindOptionsWhere<Panel> {
    const conditions = params.conditions || {}

    if (typeof params.id !== 'undefined') {
      conditions.id = params.id
    }

    return conditions
  }

  public async create(params: ICreatePanelParams): Promise<Panel> {
    const panel = this.repo.create({
      serverId: params.serverId,
      embed: params.embed,
      name: params.name
    })

    await this.repo.insert(panel)

    return panel
  }

  public async save(panel: Panel): Promise<Panel> {
    return this.repo.save(panel)
  }

  public async delete(params: IDeleteServerParams): Promise<void> {
    await this.repo.softDelete(this.makeConditions(params))
  }

  public async getOne(
    params: IGetOnePanelParams = {}
  ): Promise<undefined | Panel> {
    const panel = await this.repo.findOne({
      where: this.makeConditions(params),
      ...params.opts
    })

    return panel ?? undefined
  }

  public async getList(params: IGetPanelListParams = {}): Promise<Panel[]> {
    return this.repo.find({
      where: this.makeConditions(params),
      ...params.opts
    })
  }
}
