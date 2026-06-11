import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';

@Module({
  imports: [],
  controllers: [AppointmentsController],
  providers: [PrismaService, AppointmentsService],
})
export class AppModule { }