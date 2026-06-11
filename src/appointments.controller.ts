import { Controller, Get, Post, Query, Body } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';

@Controller('appointments')
export class AppointmentsController {
    constructor(private readonly appointmentsService: AppointmentsService) { }

    // 1. הנתיב הקיים לבדיקת שעות פנויות
    @Get('slots')
    async getSlots(
        @Query('businessId') businessId: string,
        @Query('date') date: string,
    ) {
        return this.appointmentsService.getAvailableSlots(businessId, date);
    }

    // 2. הנתיב החדש לקביעת תור ועקיפת הבאגים!
    @Post('book')
    async bookAppointment(
        @Body('businessId') businessId: string,
        @Body('customerId') customerId: string,
        @Body('time') time: string, // ישלח כ-"10:00"
    ) {
        return this.appointmentsService.createAppointment(businessId, customerId, time);
    }
}