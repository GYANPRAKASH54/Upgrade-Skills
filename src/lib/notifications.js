import { prisma } from './db';
import { sendEmail } from './email';

/**
 * Sends an email notification to all registered students when a new course is launched.
 * Utilizes Resend API or simulated fallback.
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

    const emailPromises = students.map((student) => {
      const subject = `New Course Launched: Learn ${course.title} today!`;
      
      const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>New Course Launch - Upgrade Skills</title>
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #3c3c3c; line-height: 1.6; padding: 20px; background-color: #f9f9f9; margin: 0; }
    .email-container { max-width: 600px; margin: auto; background: #ffffff; border: 2px solid #e5e5e5; border-radius: 12px; box-shadow: 0 4px 0 #e5e5e5; overflow: hidden; }
    .header { background-color: #58cc02; padding: 30px; text-align: center; color: white; }
    .logo { font-size: 26px; font-weight: 800; margin: 0 0 10px 0; }
    .badge { background: rgba(255,255,255,0.2); border-radius: 99px; padding: 4px 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; display: inline-block; }
    .content { padding: 30px; }
    .headline { font-size: 22px; font-weight: 800; color: #3c3c3c; margin: 0 0 16px 0; }
    .course-card { background: #fcfcfc; border: 2px solid #e5e5e5; border-radius: 12px; padding: 20px; margin: 20px 0; display: flex; gap: 16px; align-items: center; }
    .course-thumb { width: 80px; height: 80px; border-radius: 8px; object-fit: cover; border: 2px solid #e5e5e5; }
    .course-details { flex: 1; }
    .course-title { font-size: 16px; font-weight: 700; margin: 0 0 4px 0; color: #3c3c3c; }
    .course-subtitle { font-size: 13px; color: #777777; margin: 0 0 8px 0; }
    .course-price { font-size: 14px; font-weight: 800; color: #58cc02; }
    .btn { display: inline-block; padding: 12px 24px; background-color: #58cc02; color: white; text-decoration: none; font-weight: 700; border-radius: 12px; text-transform: uppercase; font-size: 14px; letter-spacing: 0.08em; border-bottom: 4px solid #3f8f01; margin-top: 10px; }
    .footer { text-align: center; font-size: 12px; color: #777777; padding: 20px 30px; border-top: 2px solid #e5e5e5; background: #fafafa; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <div class="logo">Upgrade Skills</div>
      <span class="badge">New Release</span>
    </div>
    <div class="content">
      <h2 class="headline">Hi ${student.name || 'Learner'},</h2>
      <p>We are thrilled to announce a brand-new masterclass launched on Upgrade Skills! Join our global industry experts and expand your tech portfolio today.</p>
      
      <div class="course-card">
        <img src="${course.thumbnail || 'https://upgradeskills.co.in/icon.png'}" alt="${course.title}" class="course-thumb" />
        <div class="course-details">
          <h3 class="course-title">${course.title}</h3>
          <p class="course-subtitle">${course.subtitle || ''}</p>
          <div class="course-price">Special Offer: ₹${course.price.toFixed(2)}</div>
        </div>
      </div>

      <p style="text-align: center;">
        <a href="https://upgradeskills.co.in/courses/${course.id}" class="btn">Explore Course</a>
      </p>
    </div>
    <div class="footer">
      You received this because you are a registered student at Upgrade Skills.<br>
      © ${new Date().getFullYear()} Upgrade Skills LMS. All rights reserved.
    </div>
  </div>
</body>
</html>`;

      const plainText = `Hello ${student.name}, a new course has been launched on Upgrade Skills: "${course.title}". Check it out at: https://upgradeskills.co.in/courses/${course.id}`;
      
      return sendEmail({
        to: student.email,
        subject,
        html: htmlContent,
        text: plainText
      });
    });

    await Promise.allSettled(emailPromises);
  } catch (error) {
    console.error('Failed to notify students of new course:', error);
  }
}

/**
 * Sends an email notification to all registered students when a new InnoTech challenge is launched.
 * Utilizes Resend API or simulated fallback.
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

    const emailPromises = students.map((student) => {
      const subject = `New InnoTech Challenge: ${event.title} is now Open!`;
      
      const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>New InnoTech Challenge - Upgrade Skills</title>
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #3c3c3c; line-height: 1.6; padding: 20px; background-color: #f9f9f9; margin: 0; }
    .email-container { max-width: 600px; margin: auto; background: #ffffff; border: 2px solid #e5e5e5; border-radius: 12px; box-shadow: 0 4px 0 #e5e5e5; overflow: hidden; }
    .header { background-color: #1cb0f6; padding: 30px; text-align: center; color: white; }
    .logo { font-size: 26px; font-weight: 800; margin: 0 0 10px 0; }
    .badge { background: rgba(255,255,255,0.2); border-radius: 99px; padding: 4px 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; display: inline-block; }
    .content { padding: 30px; }
    .headline { font-size: 22px; font-weight: 800; color: #3c3c3c; margin: 0 0 16px 0; }
    .event-card { background: #fcfcfc; border: 2px solid #e5e5e5; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center; }
    .event-img { max-width: 100%; height: 180px; border-radius: 8px; object-fit: cover; border: 2px solid #e5e5e5; margin-bottom: 12px; }
    .event-title { font-size: 18px; font-weight: 700; margin: 0 0 8px 0; color: #3c3c3c; }
    .event-rules { font-size: 13px; color: #777777; margin: 0 0 16px 0; text-align: left; }
    .btn { display: inline-block; padding: 12px 24px; background-color: #1cb0f6; color: white; text-decoration: none; font-weight: 700; border-radius: 12px; text-transform: uppercase; font-size: 14px; letter-spacing: 0.08em; border-bottom: 4px solid #189aca; margin-top: 10px; }
    .footer { text-align: center; font-size: 12px; color: #777777; padding: 20px 30px; border-top: 2px solid #e5e5e5; background: #fafafa; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <div class="logo">InnoTechXperience</div>
      <span class="badge">Live Challenge</span>
    </div>
    <div class="content">
      <h2 class="headline">Hi ${student.name || 'Learner'},</h2>
      <p>A new national design and tech competition has been launched on Upgrade Skills! Ready to test your coding, design, and product portfolio?</p>
      
      <div class="event-card">
        <img src="${event.image || 'https://upgradeskills.co.in/icon.png'}" alt="${event.title}" class="event-img" />
        <h3 class="event-title">${event.title}</h3>
        <p class="event-rules"><strong>Rules:</strong> ${event.rules || 'Check portal for rules.'}</p>
      </div>

      <p style="text-align: center;">
        <a href="https://upgradeskills.co.in/innotechxperience/${event.id}" class="btn">Join Challenge</a>
      </p>
    </div>
    <div class="footer">
      You received this because you are a registered student at Upgrade Skills.<br>
      © ${new Date().getFullYear()} Upgrade Skills LMS. All rights reserved.
    </div>
  </div>
</body>
</html>`;

      const plainText = `Hello ${student.name}, a new InnoTech challenge has been launched: "${event.title}". Participate now: https://upgradeskills.co.in/innotechxperience/${event.id}`;
      
      return sendEmail({
        to: student.email,
        subject,
        html: htmlContent,
        text: plainText
      });
    });

    await Promise.allSettled(emailPromises);
  } catch (error) {
    console.error('Failed to notify students of new event:', error);
  }
}
