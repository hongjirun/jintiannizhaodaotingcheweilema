import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParkingLot } from './parking-lot.entity';
import { ParkingService } from './parking.service';
import { ParkingController } from './parking.controller';
import { AdminParkingController } from './admin-parking.controller';
import { TencentPoiService } from './tencent-poi.service';
import { FreeParkingReport } from '../free-parking/free-parking.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ParkingLot, FreeParkingReport])],
  providers: [ParkingService, TencentPoiService],
  controllers: [ParkingController, AdminParkingController],
  exports: [ParkingService],
})
export class ParkingModule {}
