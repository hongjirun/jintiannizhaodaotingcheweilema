import { Controller, Get, Post, Body, Query, Param, UseGuards } from '@nestjs/common'
import { FreeParkingService } from './free-parking.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'

@Controller('free-parking')
export class FreeParkingController {
  constructor(private readonly freeParkingService: FreeParkingService) {}

  // 小程序端：创建上报
  @Post('report')
  async createReport(@Body() body: any) {
    // 检查功能是否开启
    const checkResult = await this.freeParkingService.checkReportEnabled()
    if (!checkResult.data.enabled) {
      return { code: -1, message: '上报功能已关闭' }
    }

    return this.freeParkingService.createReport({
      ...body,
      status: 0 // 默认待审核
    })
  }

  // 小程序端：获取已审核通过的免费停车场
  @Get('approved')
  async getApprovedParking(@Query() query: any) {
    const bounds = query.sw_lat ? {
      sw_lat: parseFloat(query.sw_lat),
      sw_lng: parseFloat(query.sw_lng),
      ne_lat: parseFloat(query.ne_lat),
      ne_lng: parseFloat(query.ne_lng)
    } : undefined

    return this.freeParkingService.getApprovedParking(bounds)
  }

  // 小程序端：检查上报功能是否开启
  @Get('check-enabled')
  async checkEnabled() {
    return this.freeParkingService.checkReportEnabled()
  }

  // 管理员端：获取上报列表
  @Get('admin/reports')
  @UseGuards(JwtAuthGuard)
  async getReports(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string
  ) {
    return this.freeParkingService.getReports(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      status !== undefined ? parseInt(status) : undefined
    )
  }

  // 管理员端：审核上报
  @Post('admin/review/:id')
  @UseGuards(JwtAuthGuard)
  async reviewReport(
    @Param('id') id: string,
    @Body() body: { status: number, reviewRemark?: string, reviewerName?: string }
  ) {
    return this.freeParkingService.reviewReport(parseInt(id), body.status, body.reviewRemark, body.reviewerName)
  }

  // 管理员端：删除上报
  @Post('admin/delete/:id')
  @UseGuards(JwtAuthGuard)
  async deleteReport(@Param('id') id: string) {
    return this.freeParkingService.deleteReport(parseInt(id))
  }

  // 管理员端：切换上报功能开关
  @Post('admin/toggle-enabled')
  @UseGuards(JwtAuthGuard)
  async toggleEnabled(@Body() body: { enabled: boolean }) {
    return this.freeParkingService.setReportEnabled(body.enabled)
  }

  // 管理员端：获取当前开关状态
  @Get('admin/enabled-status')
  @UseGuards(JwtAuthGuard)
  async getEnabledStatus() {
    return this.freeParkingService.checkReportEnabled()
  }

  // 管理员端：更新位置信息
  @Post('admin/update-location/:id')
  @UseGuards(JwtAuthGuard)
  async updateLocation(
    @Param('id') id: string,
    @Body() body: { latitude: number, longitude: number, address?: string, name?: string }
  ) {
    return this.freeParkingService.updateLocation(parseInt(id), body)
  }
}
