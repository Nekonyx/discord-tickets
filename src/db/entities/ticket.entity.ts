import { JoinColumn, ManyToOne, Column, Entity, OneToMany } from 'typeorm'

import { PanelCategory } from './panel-category.entity'
import { TicketUser } from './ticket-user.entity'
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

  @Column('boolean', { default: false })
  public isClosed!: boolean

  @Column('uuid')
  public categoryId!: string

  @OneToMany(() => TicketUser, (ticketUser) => ticketUser.ticket)
  public users!: TicketUser[]
}
