import { JoinColumn, ManyToOne, Column, Entity } from 'typeorm'

import { PanelCategory } from './panel-category.entity'
import { EntityBase } from './common'

@Entity('category-roles')
export class CategoryRole extends EntityBase {
  @Column('varchar', { length: 21 })
  public roleId!: string

  @Column('uuid')
  public categoryId!: string

  @ManyToOne(() => PanelCategory, (category) => category.roles)
  @JoinColumn()
  public category!: PanelCategory
}
