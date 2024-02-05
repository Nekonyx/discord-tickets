import { JoinColumn, ManyToOne, Column, Entity } from 'typeorm'

import { Ticket } from './ticket.entity'
import { EntityBase } from './common'

@Entity('ticket-users')
export class TicketUser extends EntityBase {
  @Column('varchar', { length: 21 })
  public userId!: string

  @Column('varchar', { length: 21 })
  public moderatorId!: string

  @Column('uuid')
  public ticketId!: string

  @ManyToOne(() => Ticket, (ticket) => ticket.users)
  @JoinColumn()
  public ticket!: Ticket
}
