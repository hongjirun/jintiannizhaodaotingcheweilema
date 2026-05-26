import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParkingModule } from './modules/parking/parking.module';
import { AuthModule } from './modules/auth/auth.module';
import { AdminModule } from './modules/admin/admin.module';
import { UploadModule } from './modules/upload/upload.module';
import { FreeParkingModule } from './modules/free-parking/free-parking.module';
import { ParkingLot } from './modules/parking/parking-lot.entity';
import { AdminUser } from './modules/admin/admin-user.entity';
import { FreeParkingReport } from './modules/free-parking/free-parking.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 3306),
        username: config.get('DB_USERNAME', 'root'),
        password: config.get('DB_PASSWORD', ''),
        database: config.get('DB_DATABASE', 'parking_db'),
        entities: [ParkingLot, AdminUser, FreeParkingReport],
        synchronize: false,
        charset: 'utf8mb4',
      }),
    }),
    ParkingModule,
    AuthModule,
    AdminModule,
    UploadModule,
    FreeParkingModule,
  ],
})
export class AppModule {}
