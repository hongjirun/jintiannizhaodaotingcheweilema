import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ParkingLot } from './parking-lot.entity';

@Injectable()
export class ParkingService {
  constructor(
    @InjectRepository(ParkingLot)
    private readonly parkingRepo: Repository<ParkingLot>,
  ) {}

  async findAllLite() {
    const list = await this.parkingRepo
      .createQueryBuilder('p')
      .where('p.status = 1')
      .select(['p.id', 'p.name', 'p.latitude', 'p.longitude'])
      .getMany();
    return { code: 0, data: list };
  }

  async findByBounds(swLat: number, swLng: number, neLat: number, neLng: number) {
    const list = await this.parkingRepo
      .createQueryBuilder('p')
      .where('p.latitude BETWEEN :swLat AND :neLat', { swLat, neLat })
      .andWhere('p.longitude BETWEEN :swLng AND :neLng', { swLng, neLng })
      .andWhere('p.status = 1')
      .select(['p.id', 'p.name', 'p.latitude', 'p.longitude'])
      .limit(2000)
      .getMany();
    return { code: 0, data: list };
  }

  async findNearby(lat: number, lng: number, radius: number) {
    const radiusDeg = radius / 111000;
    const list = await this.parkingRepo
      .createQueryBuilder('p')
      .where('p.latitude BETWEEN :minLat AND :maxLat', {
        minLat: lat - radiusDeg,
        maxLat: lat + radiusDeg,
      })
      .andWhere('p.longitude BETWEEN :minLng AND :maxLng', {
        minLng: lng - radiusDeg,
        maxLng: lng + radiusDeg,
      })
      .andWhere('p.status = 1')
      .select(['p.id', 'p.name', 'p.address', 'p.latitude', 'p.longitude', 'p.phone'])
      .limit(2000)
      .getMany();
    return { code: 0, data: list };
  }

  async search(keyword: string, city?: string) {
    const qb = this.parkingRepo
      .createQueryBuilder('p')
      .where('p.name LIKE :keyword', { keyword: `%${keyword}%` })
      .andWhere('p.status = 1');
    if (city) {
      qb.andWhere('p.city = :city', { city });
    }
    const raw = await qb
      .select(['p.id', 'p.name', 'p.address', 'p.city', 'p.latitude', 'p.longitude'])
      .limit(200)
      .getMany();
    const seen = new Set<string>()
    const list = raw.filter(item => {
      const key = `${item.name}||${item.address || ''}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    }).slice(0, 50)
    return { code: 0, data: list };
  }

  async findOne(id: number) {
    const item = await this.parkingRepo.findOne({ where: { id, status: 1 } });
    if (!item) throw new NotFoundException('停车场不存在');
    return { code: 0, data: item };
  }

  async findAll(page: number, pageSize: number, keyword?: string, city?: string, status?: number) {
    const qb = this.parkingRepo.createQueryBuilder('p');
    if (keyword) qb.andWhere('p.name LIKE :keyword', { keyword: `%${keyword}%` });
    if (city) qb.andWhere('p.city = :city', { city });
    if (status !== undefined && status !== null) qb.andWhere('p.status = :status', { status });
    const [list, total] = await qb
      .orderBy('p.id', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();
    return { code: 0, data: { list, total, page, pageSize } };
  }

  async create(dto: Partial<ParkingLot>) {
    const entity = this.parkingRepo.create(dto);
    const saved = await this.parkingRepo.save(entity);
    return { code: 0, data: saved };
  }

  async update(id: number, dto: Partial<ParkingLot>) {
    await this.parkingRepo.update(id, dto);
    return { code: 0, message: '更新成功' };
  }

  async remove(id: number) {
    await this.parkingRepo.delete(id);
    return { code: 0, message: '删除成功' };
  }

  async batchRemove(ids: number[]) {
    await this.parkingRepo.delete(ids);
    return { code: 0, message: `已删除 ${ids.length} 条` };
  }

  async batchCreate(items: Partial<ParkingLot>[]) {
    if (!items || items.length === 0) return { code: 0, message: '成功导入 0 条' };
    const deduped = Array.from(
      new Map(items.map(i => [`${i.name}||${i.latitude}||${i.longitude}`, i])).values()
    );
    const existing = await this.parkingRepo
      .createQueryBuilder('p')
      .select(['p.name', 'p.latitude', 'p.longitude'])
      .where('p.name IN (:...names)', { names: deduped.map(i => i.name) })
      .getMany();
    const existKeys = new Set(existing.map(e => `${e.name}||${e.latitude}||${e.longitude}`));
    const newItems = deduped.filter(i => !existKeys.has(`${i.name}||${i.latitude}||${i.longitude}`));
    if (newItems.length > 0) {
      const entities = this.parkingRepo.create(newItems);
      await this.parkingRepo.save(entities, { chunk: 200 });
    }
    return { code: 0, message: `成功导入 ${newItems.length} 条` };
  }

  async getStats() {
    const total = await this.parkingRepo.count({ where: { status: 1 } });
    const cityStats = await this.parkingRepo
      .createQueryBuilder('p')
      .select('p.city', 'city')
      .addSelect('COUNT(*)', 'count')
      .where('p.status = 1')
      .groupBy('p.city')
      .orderBy('count', 'DESC')
      .limit(20)
      .getRawMany();
    return { code: 0, data: { total, cityStats } };
  }
}
