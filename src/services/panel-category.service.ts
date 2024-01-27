import { FindOptionsWhere, FindManyOptions, FindOneOptions } from 'typeorm'
import { APIButtonComponent, APIEmbed } from 'discord.js'

import { PanelCategory, getRepo } from '../db'

interface IConditionsBase {
  conditions?: FindOptionsWhere<PanelCategory>
  id?: string
}

export interface IGetPanelCategoryListParams extends IConditionsBase {
  opts?: FindManyOptions<PanelCategory>
}

export interface IGetOnePanelCategoryParams extends IConditionsBase {
  opts?: FindOneOptions<PanelCategory>
}

export interface ICreatePanelCategoryParams {
  button: APIButtonComponent
  channelId: string
  embed: APIEmbed
  panelId: string
  name: string
  slug: string
}

export class PanelCategoryService {
  private readonly repo = getRepo(PanelCategory)

  public async getList(
    params: IGetPanelCategoryListParams = {}
  ): Promise<PanelCategory[]> {
    return this.repo.find({
      where: this.makeConditions(params),
      ...params.opts
    })
  }

  public async getOne(
    params: IGetOnePanelCategoryParams = {}
  ): Promise<PanelCategory | undefined> {
    const category = await this.repo.findOne({
      where: this.makeConditions(params),
      ...params.opts
    })

    return category ?? undefined
  }

  public async create(
    params: ICreatePanelCategoryParams
  ): Promise<PanelCategory> {
    const category = this.repo.create(params)
    await this.repo.insert(category)

    return category
  }

  private makeConditions(
    params: IConditionsBase
  ): FindOptionsWhere<PanelCategory> {
    const conditions = params.conditions || {}

    if (typeof params.id !== 'undefined') {
      conditions.id = params.id
    }

    return conditions
  }
}
