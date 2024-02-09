import { JoinColumn, ManyToOne, OneToMany, Column, Entity } from 'typeorm'
import { APIButtonComponent, APIEmbed } from 'discord.js'

import { CategoryRole } from './category-role.entity'
import { Ticket } from './ticket.entity'
import { Panel } from './panel.entity'
import { EntityBase } from './common'

@Entity('panel-categories')
export class PanelCategory extends EntityBase {
  @Column('text')
  public name!: string

  @Column('text')
  public slug!: string

  @Column('json')
  public button!: APIButtonComponent

  @Column('json')
  public embed!: APIEmbed

  @ManyToOne(() => Panel, (panel) => panel.categories)
  @JoinColumn()
  public panel!: Panel

  @Column('uuid')
  public panelId!: string

  @Column('varchar', { length: 21 })
  public channelId!: string

  @Column('varchar', { length: 21 })
  public logChannelId!: string

  @OneToMany(() => Ticket, (ticket) => ticket.category)
  public tickets!: Ticket[]

  @OneToMany(() => CategoryRole, (categoryRole) => categoryRole.category)
  public roles!: CategoryRole[]
}
