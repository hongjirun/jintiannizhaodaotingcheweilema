import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, DataSource } from 'typeorm'
import { FreeParkingReport } from './free-parking.entity'

@Injectable()
export class FreeParkingService {
  constructor(
    @InjectRepository(FreeParkingReport)
    private readonly freeParkingRepo: Repository<FreeParkingReport>,
    private readonly dataSource: DataSource,
  ) {}

  // 创建上报
  async createReport(data: Partial<FreeParkingReport>) {
    const report = this.freeParkingRepo.create(data)
    await this.freeParkingRepo.save(report)
    return { code: 0, message: '上报成功', data: report }
  }

  // 获取上报列表（管理员用）
  async getReports(page = 1, limit = 20, status?: number) {
    const queryBuilder = this.freeParkingRepo
      .createQueryBuilder('report')
      .orderBy('report.createdAt', 'DESC')

    if (status !== undefined) {
      queryBuilder.where('report.status = :status', { status })
    }

    const total = await queryBuilder.getCount()
    const reports = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getMany()

    return {
      code: 0,
      data: {
        list: reports,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    }
  }

  // 审核上报
  async reviewReport(id: number, status: number, reviewRemark?: string, reviewerName?: string) {
    await this.freeParkingRepo.update(id, {
      status,
      reviewRemark,
      reviewTime: new Date(),
      reviewerName
    })
    return { code: 0, message: '审核成功' }
  }

  // 删除上报
  async deleteReport(id: number) {
    await this.freeParkingRepo.delete(id)
    return { code: 0, message: '删除成功' }
  }

  // 获取已审核通过的免费停车场（小程序用）
  async getApprovedParking(bounds?: { sw_lat: number, sw_lng: number, ne_lat: number, ne_lng: number }) {
    const queryBuilder = this.freeParkingRepo
      .createQueryBuilder('report')
      .where('report.status = :status', { status: 1 })

    if (bounds) {
      queryBuilder
        .andWhere('report.latitude >= :sw_lat', { sw_lat: bounds.sw_lat })
        .andWhere('report.latitude <= :ne_lat', { ne_lat: bounds.ne_lat })
        .andWhere('report.longitude >= :sw_lng', { sw_lng: bounds.sw_lng })
        .andWhere('report.longitude <= :ne_lng', { ne_lng: bounds.ne_lng })
    }

    const reports = await queryBuilder.getMany()
    return { code: 0, data: reports }
  }

  // 检查上报功能是否开启
  async checkReportEnabled() {
    try {
      const result = await this.dataSource.query(
        'SELECT configValue FROM system_config WHERE configKey = ?',
        ['free_parking_report_enabled']
      )
      const enabled = result.length > 0 ? result[0].configValue === 'true' : true
      return { code: 0, data: { enabled } }
    } catch (error) {
      // 如果配置表不存在，默认开启
      return { code: 0, data: { enabled: true } }
    }
  }

  // 设置上报功能开关
  async setReportEnabled(enabled: boolean) {
    await this.dataSource.query(
      `INSERT INTO system_config (configKey, configValue, description) 
       VALUES ('free_parking_report_enabled', ?, '免费停车点位上报功能开关')
       ON DUPLICATE KEY UPDATE configValue = ?`,
      [enabled.toString(), enabled.toString()]
    )
    return { code: 0, message: '设置成功', data: { enabled } }
  }

  // 更新位置信息
  async updateLocation(id: number, data: { latitude: number, longitude: number, address?: string, name?: string }) {
    const updateData: any = {
      latitude: data.latitude,
      longitude: data.longitude
    }
    if (data.address) {
      updateData.address = data.address
    }
    if (data.name) {
      updateData.name = data.name
    }
    
    await this.freeParkingRepo.update(id, updateData)
    return { code: 0, message: '位置和名称更新成功' }
  }
}
