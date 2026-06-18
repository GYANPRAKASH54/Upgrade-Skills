const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  // 1. Create/Upsert Users
  const hashedPassword = bcrypt.hashSync('password123', 10);

  const student = await prisma.user.upsert({
    where: { email: 'student@upgradeskills.co.in' },
    update: {},
    create: {
      name: 'John Doe',
      email: 'student@upgradeskills.co.in',
      password: hashedPassword,
      role: 'STUDENT',
    },
  });

  const instructor = await prisma.user.upsert({
    where: { email: 'team@upgradeskills.co.in' },
    update: {
      name: 'teamsUpgradeSkills',
    },
    create: {
      name: 'teamsUpgradeSkills',
      email: 'team@upgradeskills.co.in',
      password: hashedPassword,
      role: 'INSTRUCTOR',
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@upgradeskills.co.in' },
    update: {},
    create: {
      name: 'UpgradeSkills Admin',
      email: 'admin@upgradeskills.co.in',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });

  const tester = await prisma.user.upsert({
    where: { email: 'tester@upgradeskills.co.in' },
    update: {},
    create: {
      name: 'UpgradeSkills Tester',
      email: 'tester@upgradeskills.co.in',
      password: hashedPassword,
      role: 'TESTER',
    },
  });

  console.log('Seeded Users:', { student: student.email, instructor: instructor.email, admin: admin.email, tester: tester.email });

  // 2. Create Courses (Only if empty)
  const courseCount = await prisma.course.count();
  if (courseCount === 0) {
    const course1 = await prisma.course.create({
      data: {
        title: 'Business Plan for Start-up',
        subtitle: 'Learn how to create a winning business plan from scratch to pitch to real-world investors.',
        description: 'Upgrade your skills from real-world experts from around the globe. We have experts from NIFT, IIT, IIM and various reputed industries like Raymond, Reliance, ITC, etc. This course will cover everything from business validation, executive summaries, marketing strategy, to detailed financial projections.',
        price: 399,
        thumbnail: 'https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?w=800&auto=format&fit=crop&q=60',
        published: true,
        instructorId: instructor.id,
      },
    });

    const course2 = await prisma.course.create({
      data: {
        title: 'Full Stack React & Next.js Masterclass',
        subtitle: 'Build high-performance web applications with production-level databases and authentication.',
        description: 'Become a professional full-stack web developer. In this course you will master React, Next.js App Router, Prisma ORM, SQLite/Postgres databases, and secure authentication flows (OAuth & Credentials). Perfect for launching your own software products.',
        price: 499,
        thumbnail: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&auto=format&fit=crop&q=60',
        published: true,
        instructorId: instructor.id,
      },
    });

    console.log('Created Default Courses.');

    // Create Sections & Lectures for Course 1
    const c1sec1 = await prisma.section.create({
      data: {
        title: 'Introduction & Business Ideation',
        sortOrder: 1,
        courseId: course1.id,
      },
    });

    await prisma.lecture.createMany({
      data: [
        {
          title: 'Welcome & Course Overview',
          videoUrl: 'https://res.cloudinary.com/demo/video/upload/q_auto/cld_sample_video.mp4',
          duration: 240, // 4 mins
          sortOrder: 1,
          sectionId: c1sec1.id,
        },
        {
          title: 'How to Validate Your Business Idea',
          videoUrl: 'https://res.cloudinary.com/demo/video/upload/q_auto/cld_sample_video.mp4',
          duration: 580, // 9.6 mins
          sortOrder: 2,
          sectionId: c1sec1.id,
        },
      ],
    });

    const c1sec2 = await prisma.section.create({
      data: {
        title: 'Writing Your Business Plan document',
        sortOrder: 2,
        courseId: course1.id,
      },
    });

    await prisma.lecture.createMany({
      data: [
        {
          title: 'Drafting the Executive Summary',
          videoUrl: 'https://res.cloudinary.com/demo/video/upload/q_auto/cld_sample_video.mp4',
          duration: 720, // 12 mins
          sortOrder: 1,
          sectionId: c1sec2.id,
        },
        {
          title: 'Building a Simple Financial Model',
          videoUrl: 'https://res.cloudinary.com/demo/video/upload/q_auto/cld_sample_video.mp4',
          duration: 940, // 15.6 mins
          sortOrder: 2,
          sectionId: c1sec2.id,
        },
      ],
    });

    // Create Sections & Lectures for Course 2
    const c2sec1 = await prisma.section.create({
      data: {
        title: 'Getting Started with Next.js',
        sortOrder: 1,
        courseId: course2.id,
      },
    });

    await prisma.lecture.createMany({
      data: [
        {
          title: 'Why Next.js? App Router Overview',
          videoUrl: 'https://res.cloudinary.com/demo/video/upload/q_auto/cld_sample_video.mp4',
          duration: 350,
          sortOrder: 1,
          sectionId: c2sec1.id,
        },
        {
          title: 'Creating Your First Project',
          videoUrl: 'https://res.cloudinary.com/demo/video/upload/q_auto/cld_sample_video.mp4',
          duration: 620,
          sortOrder: 2,
          sectionId: c2sec1.id,
        },
      ],
    });

    console.log('Created Default Sections & Lectures.');

    // Create default Enrollment and mock Progress
    await prisma.enrollment.create({
      data: {
        studentId: student.id,
        courseId: course1.id,
      },
    });

    const firstLecture = await prisma.lecture.findFirst({
      where: { section: { courseId: course1.id } },
    });

    if (firstLecture) {
      await prisma.progress.create({
        data: {
          studentId: student.id,
          lectureId: firstLecture.id,
          completed: true,
          watchTime: firstLecture.duration,
        },
      });
    }

    console.log('Created Default Student Enrollment & Progress.');
  } else {
    console.log('Courses already exist in database. Skipping course/lecture seeding.');
  }

  // 3. Create Competitions (Only if empty)
  const competitionCount = await prisma.competition.count();
  if (competitionCount === 0) {
    const oneMonthFromNow = new Date();
    oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);

    const twoWeeksFromNow = new Date();
    twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);

    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const comp1 = await prisma.competition.create({
      data: {
        title: 'GLAM LENS 2026 - Mobile Fashion Photography Competition',
        description: 'Participate in the ultimate national mobile fashion photography competition. Capture stunning fashion shots using only your smartphone. Submit your best shots and stand a chance to win exciting cash prizes and get featured on upgradeskills.co.in!',
        image: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=800&auto=format&fit=crop&q=60',
        rules: '1. All photos must be shot on a smartphone. 2. Minimal editing is allowed (cropping, color correction). 3. No watermark or signature. 4. Plagiarism will lead to immediate disqualification.',
        startDate: new Date(),
        endDate: oneMonthFromNow,
      },
    });

    const comp2 = await prisma.competition.create({
      data: {
        title: 'Global Innovation Design Hackathon',
        description: 'Beyond the quest for victory, this hackathon cultivates collaboration, sparks innovation, and fosters lasting relationships with peers worldwide. Design and prototype a digital solution targeting sustainability and green technology.',
        image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&auto=format&fit=crop&q=60',
        rules: '1. Teams of 1 to 4 members are allowed. 2. Projects must be open-source. 3. Submissions must include a functional prototype link and a video pitch (2-3 mins).',
        startDate: new Date(),
        endDate: twoWeeksFromNow,
      },
    });

    const comp3 = await prisma.competition.create({
      data: {
        title: 'LOGO Design Competition for Startups',
        description: 'Help a rising clean-tech startup build their brand. Design a modern, clean, and memorable logo that represents green energy. Winners receive certificates, cash rewards, and official branding credits.',
        image: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=800&auto=format&fit=crop&q=60',
        rules: '1. Deliverables must be vector formats (SVG, PDF, AI). 2. Submissions must present both light and dark mode logo variations. 3. Work must be 100% original.',
        startDate: tenDaysAgo,
        endDate: threeDaysAgo,
      },
    });

    console.log('Created Default Competitions.');

    // Add submissions for completed LOGO competition
    const mockStudent2 = await prisma.user.create({
      data: {
        name: 'Alice Smith',
        email: 'alice@upgradeskills.co.in',
        password: hashedPassword,
        role: 'STUDENT',
      },
    });

    const mockStudent3 = await prisma.user.create({
      data: {
        name: 'Bob Johnson',
        email: 'bob@upgradeskills.co.in',
        password: hashedPassword,
        role: 'STUDENT',
      },
    });

    await prisma.submission.createMany({
      data: [
        {
          competitionId: comp3.id,
          studentId: mockStudent2.id,
          projectTitle: 'EcoFlow Branding Kit',
          description: 'A sleek geometric leaf combined with water flow curves representing green energy and hydraulic flow.',
          projectLink: 'https://github.com/example/ecoflow-logo',
          imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=60',
          score: 92.5,
          certificateIssued: true,
        },
        {
          competitionId: comp3.id,
          studentId: mockStudent3.id,
          projectTitle: 'Solaria Energy Mark',
          description: 'Minimalistic sun emblem highlighting solar grids and futuristic tech accents.',
          projectLink: 'https://github.com/example/solaria-logo',
          imageUrl: 'https://images.unsplash.com/photo-1618005198143-e52834644027?w=400&auto=format&fit=crop&q=60',
          score: 88.0,
          certificateIssued: true,
        },
      ],
    });

    console.log('Created Mock Submissions.');
  } else {
    console.log('Competitions already exist. Skipping competition/submissions seeding.');
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
