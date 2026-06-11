import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class AppointmentsService {
  constructor(private prisma: PrismaService) {}

  async getAvailableSlots(businessId: string, dateStr: string) {
    // 1. משיכת שעות הפעילות של העסק
    const hours = await this.prisma.businessHours.findMany({
      where: { businessId },
    });

    // 2. משיכת התורים הקיימים לאותו יום (נבדוק טווח של יום שלם)
    const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);

    const existingAppointments = await this.prisma.appointment.findMany({
      where: {
        businessId,
        startTime: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    // --- הדפסת דיבאג לטרמינל ---
    console.log('--- בדיקת תורים מהדאטה-בייס ---');
    console.log('התאריך המבוקש:', dateStr);
    console.log('תורים שנמצאו בטווח היום הזה:', JSON.stringify(existingAppointments, null, 2));

    // אם אין שעות פעילות, נחזיר מערך ריק
    if (hours.length === 0) return [];

    // 3. ייצור חלונות זמן (Slots) קבועים (לדוגמה בין 09:00 ל-17:00)
    const slots = [];
    let current = new Date(`${dateStr}T09:00:00.000Z`);
    const end = new Date(`${dateStr}T17:00:00.000Z`);

    while (current < end) {
      const timeString = current.toISOString().substring(11, 16); // מחזיר למשל "10:00"
      
      // בדיקה האם קיים תור תפוס שמתחיל בדיוק בזמן הזה
      const isTaken = existingAppointments.some(app => {
        const appTime = new Date(app.startTime).toISOString().substring(11, 16);
        return appTime === timeString;
      });

      if (!isTaken) {
        slots.push(timeString);
      }

      // קפיצה של 30 דקות קדימה לחלון הבא
      current = new Date(current.getTime() + 30 * 60 * 1000);
    }

    return slots;
  }


  async createAppointment(businessId: string, customerId: string, timeStr: string) {
    // 1. הגדרת זמן התחלה וסיום ב-UTC (לפי ה-15 ביוני 2026 שבו אנחנו בודקים)
    const startTime = new Date(`2026-06-15T${timeStr}:00.000Z`);
    const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);
  
    // הגדרת טווח היום לבדיקת כפל תורים ללקוח
    const startOfDay = new Date(`2026-06-15T00:00:00.000Z`);
    const endOfDay = new Date(`2026-06-15T23:59:59.999Z`);
  
    // בדיקה א': האם ללקוח הספציפי הזה כבר יש תור ביום הזה? (חסימת כפל תורים)
    const existingCustomerAppointment = await this.prisma.appointment.findFirst({
      where: {
        customerId,
        startTime: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });
  
    if (existingCustomerAppointment) {
      throw new BadRequestException('הלקוח כבר קבע תור ליום זה. לא ניתן לקבוע תור כפול!');
    }
  
    // בדיקה ב': האם השעה הספציפית הזו כבר תפוסה על ידי לקוח אחר בעסק? (חסימת התנגשות)
    const slotIsTaken = await this.prisma.appointment.findFirst({
      where: {
        businessId,
        startTime: startTime, // בדיקה אם יש תור שמתחיל בדיוק באותה דקה
      },
    });
  
    if (slotIsTaken) {
      throw new BadRequestException('מצטערים, חלון זמן זה כבר נתפס על ידי לקוח אחר!');
    }
  
    // 2. אם שתי הבדיקות עברו בהצלחה - יוצרים את התור
    return this.prisma.appointment.create({
      data: {
        businessId,
        customerId,
        startTime,
        endTime,
      },
    });
  }
}