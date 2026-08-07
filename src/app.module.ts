import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { ContractModule } from './contract/contract.module';
import { UserModule } from './user/user.module';
import { ConfigurationModule } from './configuration/configuration.module';
import { LoggerModule } from 'nestjs-pino';
import { loggerConfig } from './config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AnalyticModule } from './analytic/analytic.module';
import { PropertyModule } from './property/property.module';
import { RegulationModule } from './regulation/regulation.module';
import { AuctionResultModule } from './auction-result/auction-result.module';
import { AnnouncementModule } from './announcement/announcement.module';

@Module({
  imports: [
    LoggerModule.forRoot(loggerConfig),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => {
        return {
          type: 'postgres',
          host: process.env.DB_HOST,
          port: parseInt(process.env.DB_PORT as string, 10),
          username: process.env.DB_USERNAME,
          password: process.env.DB_PASSWORD,
          database: process.env.DB_NAME,
          autoLoadEntities: true,
          synchronize: process.env.DB_SYNCHRONIZE === 'true',
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
        };
      },
    }),
    AuthModule,
    ContractModule,
    UserModule,
    ConfigurationModule,
    AnalyticModule,
    PropertyModule,
    RegulationModule,
    AuctionResultModule,
    AnnouncementModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
