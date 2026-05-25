import { Controller, Get, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ParkingService } from './parking.service';

@ApiTags('小程序-停车场')
@Controller('parking')
export class ParkingController {
  constructor(private readonly parkingService: ParkingService) {}

  @Get('bounds')
  @ApiOperation({ summary: '按地图视口范围获取停车场点位' })
  @ApiQuery({ name: 'sw_lat', required: true })
  @ApiQuery({ name: 'sw_lng', required: true })
  @ApiQuery({ name: 'ne_lat', required: true })
  @ApiQuery({ name: 'ne_lng', required: true })
  findByBounds(
    @Query('sw_lat') swLat: string,
    @Query('sw_lng') swLng: string,
    @Query('ne_lat') neLat: string,
    @Query('ne_lng') neLng: string,
  ) {
    return this.parkingService.findByBounds(
      parseFloat(swLat),
      parseFloat(swLng),
      parseFloat(neLat),
      parseFloat(neLng),
    );
  }

  @Get('nearby')
  @ApiOperation({ summary: '获取附近停车场' })
  @ApiQuery({ name: 'lat', required: true })
  @ApiQuery({ name: 'lng', required: true })
  @ApiQuery({ name: 'radius', required: false, description: '半径(米)，默认5000' })
  findNearby(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radius: string,
  ) {
    return this.parkingService.findNearby(
      parseFloat(lat),
      parseFloat(lng),
      parseInt(radius) || 5000,
    );
  }

  @Get('search')
  @ApiOperation({ summary: '搜索停车场' })
  @ApiQuery({ name: 'keyword', required: true })
  @ApiQuery({ name: 'city', required: false })
  search(@Query('keyword') keyword: string, @Query('city') city: string) {
    return this.parkingService.search(keyword, city);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取停车场详情' })
  findOne(@Param('id') id: string) {
    return this.parkingService.findOne(parseInt(id));
  }
}
