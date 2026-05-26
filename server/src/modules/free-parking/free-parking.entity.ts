import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm'

@Entity('free_parking_report')
export class FreeParkingReport {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ length: 100, comment: '停车场名称' })
  name: string

  @Column({ length: 200, comment: '详细地址' })
  address: string

  @Column({ type: 'decimal', precision: 10, scale: 6, comment: '纬度' })
  latitude: number

  @Column({ type: 'decimal', precision: 10, scale: 6, comment: '经度' })
  longitude: number

  @Column({ length: 20, comment: '免费开始时间' })
  freeTimeStart: string

  @Column({ length: 20, comment: '免费结束时间' })
  freeTimeEnd: string

  @Column({ type: 'int', nullable: true, comment: '车位数量' })
  parkingSpaces: number

  @Column({ length: 20, default: 'night', comment: '免费类型: night/weekend/allday/holiday' })
  freeType: string

  @Column({ type: 'text', nullable: true, comment: '备注说明' })
  remark: string

  @Column({ type: 'json', nullable: true, comment: '上传图片URL列表' })
  images: string[]

  @Column({ length: 50, nullable: true, comment: '上报人微信昵称' })
  reporterName: string

  @Column({ length: 100, nullable: true, comment: '上报人微信头像' })
  reporterAvatar: string

  @Column({ type: 'int', default: 0, comment: '审核状态: 0-待审核, 1-已通过, 2-已拒绝' })
  status: number

  @Column({ type: 'text', nullable: true, comment: '审核备注' })
  reviewRemark: string

  @Column({ type: 'datetime', nullable: true, comment: '审核时间' })
  reviewTime: Date

  @Column({ length: 50, nullable: true, comment: '审核管理员' })
  reviewerName: string

  @CreateDateColumn({ comment: '创建时间' })
  createdAt: Date

  @UpdateDateColumn({ comment: '更新时间' })
  updatedAt: Date
}
