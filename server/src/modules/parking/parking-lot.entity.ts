import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('parking_lot')
export class ParkingLot {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ name: 'poi_id', length: 50, nullable: true })
  poiId: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 255, nullable: true })
  address: string;

  @Column({ length: 50, nullable: true })
  city: string;

  @Column({ length: 50, nullable: true })
  province: string;

  @Column({ type: 'decimal', precision: 11, scale: 8 })
  longitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 8 })
  latitude: number;

  @Column({ name: 'cover_image', length: 500, nullable: true })
  coverImage: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ type: 'tinyint', default: 1 })
  status: number;

  @Column({ name: 'data_source', length: 20, default: 'manual' })
  dataSource: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
