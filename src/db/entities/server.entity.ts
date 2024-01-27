import { OneToMany, Column, Entity } from 'typeorm'

import { Panel } from './panel.entity'
import { EntityBase } from './common'

@Entity('servers')
export class Server extends EntityBase {
  @Column('varchar')
  public guildId!: string

  @OneToMany(() => Panel, (panel) => panel.server)
  public panels!: Panel[]
}
