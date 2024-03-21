import { FindOptionsWhere, FindManyOptions, FindOneOptions } from 'typeorm'

import { TicketUser, getRepo } from '../db'

interface IConditionsBase {
  conditions?: FindOptionsWhere<TicketUser>
  id?: string
}

export interface IGetTicketUserListParams extends IConditionsBase {
  opts?: FindManyOptions<TicketUser>
}

export interface IGetOneTicketUserParams extends IConditionsBase {
  opts?: FindOneOptions<TicketUser>
}

export interface ICreateTicketUserParams {
  moderatorId: string
  userId: string
  ticketId: string
}

export class TicketUserService {
  private readonly repo = getRepo(TicketUser)

  public async getList(params: IGetTicketUserListParams = {}): Promise<TicketUser[]> {
    return this.repo.find({
      where: this.makeConditions(params),
      ...params.opts
    })
  }

  public async delete(params: IGetOneTicketUserParams): Promise<void> {
    await this.repo.softDelete(this.makeConditions(params))
  }

  public async getOne(params: IGetOneTicketUserParams = {}): Promise<TicketUser | undefined> {
    const ticketUserService = await this.repo.findOne({
      where: this.makeConditions(params),
      ...params.opts
    })

    return ticketUserService ?? undefined
  }

  public async create(params: ICreateTicketUserParams): Promise<TicketUser> {
    const ticketUserService = this.repo.create(params)

    await this.repo.insert(ticketUserService)

    return ticketUserService
  }

  private makeConditions(params: IConditionsBase): FindOptionsWhere<TicketUser> {
    const conditions = params.conditions || {}

    if (typeof params.id !== 'undefined') {
      conditions.id = params.id
    }

    return conditions
  }
}
