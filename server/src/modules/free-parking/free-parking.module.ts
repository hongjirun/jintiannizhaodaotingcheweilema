import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { FreeParkingController } from './free-parking.controller'
import { FreeParkingService } from './free-parking.service'
import { FreeParkingReport } from './free-parking.entity'

@Module({
  imports: [TypeOrmModule.forFeature([FreeParkingReport])],
  controllers: [FreeParkingController],
  providers: [FreeParkingService],
  exports: [FreeParkingService],
})
export class FreeParkingModule {}
