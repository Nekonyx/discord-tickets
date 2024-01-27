import { JoinColumn, ManyToOne, Column, Entity } from 'typeorm'

import { PanelCategory } from './panel-category.entity'
import { EntityBase } from './common'

@Entity('tickets')
export class Ticket extends EntityBase {
  @ManyToOne(() => PanelCategory, (category) => category.tickets)
  @JoinColumn()
  public category!: PanelCategory

  @Column('varchar', { length: 21 })
  public channelId!: string

  @Column('varchar', { length: 21 })
  public userId!: string

  @Column('uuid')
  public categoryId!: string
}
