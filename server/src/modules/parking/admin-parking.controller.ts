import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ParkingService } from './parking.service';
import { TencentPoiService } from './tencent-poi.service';

@ApiTags('后台-停车场管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin/parking')
export class AdminParkingController {
  constructor(
    private readonly parkingService: ParkingService,
    private readonly tencentPoiService: TencentPoiService,
  ) {}

  @Get('list')
  @ApiOperation({ summary: '停车场列表（分页）' })
  findAll(
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @Query('keyword') keyword?: string,
    @Query('city') city?: string,
    @Query('status') status?: string,
  ) {
    return this.parkingService.findAll(
      parseInt(page),
      parseInt(pageSize),
      keyword,
      city,
      status !== undefined ? parseInt(status) : undefined,
    );
  }

  @Get('stats')
  @ApiOperation({ summary: '数据统计' })
  getStats() {
    return this.parkingService.getStats();
  }

  @Post()
  @ApiOperation({ summary: '新增停车场' })
  create(@Body() body: any) {
    return this.parkingService.create(body);
  }

  @Put(':id')
  @ApiOperation({ summary: '编辑停车场' })
  update(@Param('id') id: string, @Body() body: any) {
    return this.parkingService.update(parseInt(id), body);
  }

  @Delete('batch')
  @ApiOperation({ summary: '批量删除' })
  batchRemove(@Body() body: { ids: number[] }) {
    return this.parkingService.batchRemove(body.ids);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除停车场' })
  remove(@Param('id') id: string) {
    return this.parkingService.remove(parseInt(id));
  }

  @Post('import/poi')
  @ApiOperation({ summary: '从腾讯POI按城市批量导入' })
  async importFromPoi(@Body() body: { city: string }) {
    const rawList = await this.tencentPoiService.fetchParkingByCity(body.city);
    const formatted = rawList.map((item) => this.tencentPoiService.formatPoiToParking(item));
    return this.parkingService.batchCreate(formatted);
  }

  @Post('import/excel')
  @ApiOperation({ summary: 'Excel批量导入（前端解析后传数组）' })
  importExcel(@Body() body: { list: any[] }) {
    const formatted = body.list.map((row) => ({
      name: row.name || row['停车场名称'],
      address: row.address || row['地址'],
      city: row.city || row['城市'],
      province: row.province || row['省份'],
      longitude: parseFloat(row.longitude || row['经度']) || 0,
      latitude: parseFloat(row.latitude || row['纬度']) || 0,
      phone: row.phone || row['电话'] || '',
      status: 1,
      dataSource: 'excel',
    }));
    return this.parkingService.batchCreate(formatted);
  }
}
