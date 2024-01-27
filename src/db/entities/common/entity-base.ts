import {
  CreateDateColumn,
  DeleteDateColumn,
  UpdateDateColumn,
  PrimaryColumn
} from 'typeorm'
import { randomUUID } from 'crypto'

export abstract class EntityBase {
  @PrimaryColumn('uuid')
  public id: string = randomUUID()

  @CreateDateColumn()
  public createdAt: Date = new Date()

  @UpdateDateColumn()
  public updatedAt: Date = new Date()

  @DeleteDateColumn()
  public deletedAt?: Date
}
