import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParkingLot } from './parking-lot.entity';
import { ParkingService } from './parking.service';
import { ParkingController } from './parking.controller';
import { AdminParkingController } from './admin-parking.controller';
import { TencentPoiService } from './tencent-poi.service';

@Module({
  imports: [TypeOrmModule.forFeature([ParkingLot])],
  providers: [ParkingService, TencentPoiService],
  controllers: [ParkingController, AdminParkingController],
  exports: [ParkingService],
})
export class ParkingModule {}
