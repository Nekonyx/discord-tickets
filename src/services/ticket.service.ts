import { FindOptionsWhere, FindManyOptions, FindOneOptions } from 'typeorm'

import { getRepo, Ticket } from '../db'

interface IConditionsBase {
  conditions?: FindOptionsWhere<Ticket>
  channelId?: string
  userId?: string
  id?: string
}

export interface IGetTicketListParams extends IConditionsBase {
  opts?: FindManyOptions<Ticket>
}

export interface IGetOneTicketParams extends IConditionsBase {
  opts?: FindOneOptions<Ticket>
}

export interface ICreateTicketParams {
  categoryId: string
  channelId: string
  userId: string
}

export class TicketService {
  private readonly repo = getRepo(Ticket)
  private makeConditions(params: IConditionsBase): FindOptionsWhere<Ticket> {
    const conditions = params.conditions || {}
    if (typeof params.id !== 'undefined') {
      conditions.id = params.id
    }
    return conditions
  }

  public async create(params: ICreateTicketParams): Promise<Ticket> {
    const ticket = this.repo.create(params)
    await this.repo.insert(ticket)
    return ticket
  }

  public async getOne(
    params: IGetOneTicketParams = {}
  ): Promise<undefined | Ticket> {
    const ticket = await this.repo.findOne({
      where: this.makeConditions(params),
      ...params.opts
    })
    return ticket ?? undefined
  }

  public async getList(params: IGetTicketListParams = {}): Promise<Ticket[]> {
    return this.repo.find({
      where: [this.makeConditions(params)],
      ...params.opts
    })
  }

  public async getListByUnknownId(
    params: IGetTicketListParams = {}
  ): Promise<Ticket[]> {
    const { id } = params
    return this.repo.find({
      where: [{ id }, { userId: id }, { channelId: id }],
      ...params.opts
    })
  }
}
