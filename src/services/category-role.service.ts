import { FindOptionsWhere, FindManyOptions, FindOneOptions } from 'typeorm'

import { CategoryRole, getRepo } from '../db'

interface IConditionsBase {
  conditions?: FindOptionsWhere<CategoryRole>
  id?: string
}

export interface IGetCategoryRoleListParams extends IConditionsBase {
  opts?: FindManyOptions<CategoryRole>
}

export interface IGetOneCategoryRoleParams extends IConditionsBase {
  opts?: FindOneOptions<CategoryRole>
}

export interface ICreateCategoryRoleParams {
  roleId: string
  categoryId: string
}

export class CategoryRoleService {
  private readonly repo = getRepo(CategoryRole)

  public async getList(params: IGetCategoryRoleListParams = {}): Promise<CategoryRole[]> {
    return this.repo.find({
      where: this.makeConditions(params),
      ...params.opts
    })
  }

  public async delete(params: IGetOneCategoryRoleParams): Promise<void> {
    await this.repo.softDelete(this.makeConditions(params))
  }

  public async getOne(params: IGetOneCategoryRoleParams = {}): Promise<CategoryRole | undefined> {
    const categoryRoleService = await this.repo.findOne({
      where: this.makeConditions(params),
      ...params.opts
    })

    return categoryRoleService ?? undefined
  }

  public async create(params: ICreateCategoryRoleParams): Promise<CategoryRole> {
    const categoryRoleService = this.repo.create(params)
    await this.repo.insert(categoryRoleService)

    return categoryRoleService
  }

  private makeConditions(params: IConditionsBase): FindOptionsWhere<CategoryRole> {
    const conditions = params.conditions || {}

    if (typeof params.id !== 'undefined') {
      conditions.id = params.id
    }

    return conditions
  }
}
