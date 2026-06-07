import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm'

@Entity('system_config')
export class SystemConfig {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ name: 'config_key', unique: true })
  key: string

  @Column({ name: 'config_value' })
  value: string

  @Column({ name: 'description', nullable: true })
  description: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
