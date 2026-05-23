import fs from 'fs';
import path from 'path';
import { prisma } from './db';

/**
 * Simulates sending an email notification to all registered students when a new course is launched.
 * Logs output to console and appends log statements to server.log.
 * 
 * @param {object} course - The course object created.
 */
export async function notifyStudentsOfNewCourse(course) {
  try {
    const students = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: { name: true, email: true },
    });

    console.log(`\n[NOTIFICATION SEARCH] Found ${students.length} students to notify about new course: "${course.title}".`);

    const logFilePath = path.resolve(process.cwd(), 'server.log');

    for (const student of students) {
      const subject = `New Course Launched: Learn ${course.title} today!`;
      
      console.log('\n=============================================================');
      console.log(`[EMAIL DISPATCH] Simulating email sending to: ${student.email}`);
      console.log(`[EMAIL DISPATCH] Subject: ${subject}`);
      console.log(`[EMAIL DISPATCH] Content: Hello ${student.name}, we are excited to announce a new course launch on UpgradeSkills! Check out "${course.title}" - ${course.subtitle || ''}. Price: INR ${course.price}.`);
      console.log('=============================================================\n');
      
      const logMsg = `[${new Date().toISOString()}] EMAIL SENT to ${student.email} - New Course Announcement: "${course.title}" (Price: ₹${course.price})\n`;
      fs.appendFileSync(logFilePath, logMsg);
    }
  } catch (error) {
    console.error('Failed to notify students of new course:', error);
  }
}

/**
 * Simulates sending an email notification to all registered students when a new InnoTech event is launched.
 * Logs output to console and appends log statements to server.log.
 * 
 * @param {object} event - The competition/event object created.
 */
export async function notifyStudentsOfNewEvent(event) {
  try {
    const students = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: { name: true, email: true },
    });

    console.log(`\n[NOTIFICATION SEARCH] Found ${students.length} students to notify about new event: "${event.title}".`);

    const logFilePath = path.resolve(process.cwd(), 'server.log');

    for (const student of students) {
      const subject = `New InnoTech Challenge: ${event.title} is now Open!`;
      
      console.log('\n=============================================================');
      console.log(`[EMAIL DISPATCH] Simulating email sending to: ${student.email}`);
      console.log(`[EMAIL DISPATCH] Subject: ${subject}`);
      console.log(`[EMAIL DISPATCH] Content: Hello ${student.name}, a new InnoTech challenge has been launched on UpgradeSkills! Participate in "${event.title}" and showcase your skills. Cover image: ${event.image || 'N/A'}`);
      console.log('=============================================================\n');
      
      const logMsg = `[${new Date().toISOString()}] EMAIL SENT to ${student.email} - New InnoTech Event Announcement: "${event.title}" (Start: ${new Date(event.startDate).toLocaleDateString()})\n`;
      fs.appendFileSync(logFilePath, logMsg);
    }
  } catch (error) {
    console.error('Failed to notify students of new event:', error);
  }
}
