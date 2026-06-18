import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// Helper to generate 25 mock questions when GEMINI_API_KEY is not defined
function generateMockQuestions(courseTitle) {
  const topics = [
    "Core Concepts and Architecture",
    "Primary Lifecycle Management",
    "Design Principles and Best Practices",
    "Advanced Technical Implementation",
    "Security Protocols and Encryption",
    "Performance Tuning and Caching",
    "Scalability and Cloud Deployment",
    "Database Schemas and Normalization",
    "API Integrations and Webhooks",
    "Error Handling and Debugging",
    "Testing and Automation Pipelines",
    "User Interface Optimization",
    "State Management Strategies",
    "Data Privacy and Regulations",
    "Production Readiness Checklists",
    "System Integration Challenges",
    "Dependency Injection Patterns",
    "Microservices and Serverless",
    "Continuous Integration Workflows",
    "Audit Logging and Monitoring",
    "Resilience and Failover Systems",
    "Asynchronous Processing Tasks",
    "Concurrency and Race Conditions",
    "Legacy System Migration",
    "Future Trends and Developments"
  ];
  
  const mockQuestions = [];
  for (let i = 1; i <= 12; i++) {
    const topic = topics[i - 1];
    mockQuestions.push({
      question: `Question ${i}: Which of the following represents the recommended approach to "${topic}" when working in "${courseTitle}"?`,
      options: [
        `Implementing standard industry-approved patterns for ${topic.toLowerCase()}.`,
        `Skipping ${topic.toLowerCase()} entirely to speed up initial deployment.`,
        `Handling ${topic.toLowerCase()} manually on a case-by-case basis without automation.`,
        `Outsourcing the configuration to third-party consultants without internal reviews.`
      ],
      answerIndex: 0 // Option A is the correct answer
    });
  }
  return mockQuestions;
}

// GET: Fetch quiz questions for a course. Generates them via Gemini AI if they do not exist.
export async function GET(request, { params }) {
  try {
    const { id: courseId } = await params;
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Verify Course Exists
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        sections: {
          include: {
            lectures: {
              select: { title: true }
            }
          }
        }
      }
    });

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Verify Enrollment & Access
    let enrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId: session.user.id,
          courseId,
        },
      },
    });

    const isAdminOrInstructor = session.user.role === 'ADMIN' || course.instructorId === session.user.id;

    if (!enrollment && !isAdminOrInstructor) {
      return NextResponse.json({ error: 'You are not enrolled in this course' }, { status: 403 });
    }

    // Cooldown Auto-Reset Check (resets attempts if 12 hours have passed since last failed attempt)
    if (enrollment && !enrollment.quizPassed && enrollment.quizAttempts >= 2 && enrollment.lastAttemptAt && !isAdminOrInstructor) {
      const lastAttemptTime = new Date(enrollment.lastAttemptAt).getTime();
      const elapsed = Date.now() - lastAttemptTime;
      const twelveHours = 12 * 60 * 60 * 1000;

      if (elapsed >= twelveHours) {
        enrollment = await prisma.enrollment.update({
          where: { id: enrollment.id },
          data: {
            quizAttempts: 0,
            quizScore: null,
            lastAttemptAt: null,
            completed: false
          }
        });
      }
    }

    // Limit attempts check
    if (enrollment && enrollment.quizAttempts >= 2 && !enrollment.quizPassed && !isAdminOrInstructor) {
      return NextResponse.json({ error: 'Maximum attempts (2) reached for this exam.' }, { status: 403 });
    }

    // 2. Fetch or Generate Quiz Questions
    let questions = await prisma.quizQuestion.findMany({
      where: { courseId },
      select: {
        id: true,
        question: true,
        options: true
        // Hiding answerIndex to prevent client-side cheating/inspection
      }
    });

    // If questions count is not exactly 12, clean up and regenerate
    if (questions.length !== 12) {
      await prisma.quizQuestion.deleteMany({
        where: { courseId }
      });

      let generatedQuestions = [];
      const apiKey = process.env.GEMINI_API_KEY;

      if (apiKey) {
        try {
          const syllabus = course.sections.map(sec => 
            `- Section: ${sec.title}\n  Lectures:\n${sec.lectures.map(l => `    * ${l.title}`).join('\n')}`
          ).join('\n');

          const prompt = `You are an expert educator. Create a comprehensive, multiple-choice final exam for the course: "${course.title}".
          Subtitle: "${course.subtitle}"
          Description: "${course.description}"
          
          Syllabus Outline:
          ${syllabus}
          
          Generate exactly 12 multiple-choice questions (MCQs) that cover these topics. 
          Each question must have exactly 4 choices and exactly 1 correct answer (0-indexed: 0, 1, 2, or 3).
          Ensure the questions are challenging and directly test the content of the course syllabus.
          
          You MUST output the result strictly in this JSON format:
          {
            "questions": [
              {
                "question": "Question text?",
                "options": ["Choice A", "Choice B", "Choice C", "Choice D"],
                "answerIndex": 0
              }
            ]
          }`;

          const apiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                  responseMimeType: 'application/json',
                },
              }),
            }
          );

          if (!apiRes.ok) {
            throw new Error(`Gemini API returned status ${apiRes.status}`);
          }

          const apiData = await apiRes.json();
          const text = apiData.candidates?.[0]?.content?.parts?.[0]?.text;
          const parsed = JSON.parse(text);
          
          if (parsed && Array.isArray(parsed.questions)) {
            generatedQuestions = parsed.questions;
          }
        } catch (err) {
          console.error('Gemini AI generation failed, falling back to mock generator:', err);
          generatedQuestions = generateMockQuestions(course.title);
        }
      } else {
        console.log('No GEMINI_API_KEY found. Generating mock questions.');
        generatedQuestions = generateMockQuestions(course.title);
      }

      // Safe fallback validation
      if (generatedQuestions.length === 0) {
        generatedQuestions = generateMockQuestions(course.title);
      }

      // Ensure we have exactly 12 questions
      generatedQuestions = generatedQuestions.slice(0, 12);
      if (generatedQuestions.length < 12) {
        const mockFallback = generateMockQuestions(course.title);
        while (generatedQuestions.length < 12) {
          generatedQuestions.push(mockFallback[generatedQuestions.length]);
        }
      }

      // Save generated questions to DB
      await prisma.$transaction(
        generatedQuestions.map(q => prisma.quizQuestion.create({
          data: {
            question: q.question,
            options: q.options,
            answerIndex: q.answerIndex,
            courseId: courseId
          }
        }))
      );

      // Re-fetch questions with answerIndex hidden
      questions = await prisma.quizQuestion.findMany({
        where: { courseId },
        select: {
          id: true,
          question: true,
          options: true
        }
      });
    }

    return NextResponse.json({ success: true, questions });
  } catch (error) {
    console.error('Get quiz error:', error);
    return NextResponse.json({ error: 'Failed to retrieve quiz questions' }, { status: 500 });
  }
}

// POST: Submit quiz answers and grade results
export async function POST(request, { params }) {
  try {
    const { id: courseId } = await params;
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { answers } = await request.json(); // Map of { [questionId]: selectedOptionIndex }

    if (!answers || typeof answers !== 'object') {
      return NextResponse.json({ error: 'Answers payload is required' }, { status: 400 });
    }

    // 1. Fetch correct answers from DB
    const correctQuestions = await prisma.quizQuestion.findMany({
      where: { courseId },
      select: {
        id: true,
        answerIndex: true
      }
    });

    if (correctQuestions.length === 0) {
      return NextResponse.json({ error: 'Quiz has not been initialized for this course' }, { status: 400 });
    }

    // 2. Grade answers
    let correctCount = 0;
    correctQuestions.forEach(q => {
      if (answers[q.id] !== undefined && parseInt(answers[q.id]) === q.answerIndex) {
        correctCount++;
      }
    });

    const scorePercentage = Math.round((correctCount / correctQuestions.length) * 100);
    const passed = scorePercentage >= 70;

    // 3. Upsert Enrollment Stats
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId: session.user.id,
          courseId
        }
      }
    });

    if (!enrollment) {
      return NextResponse.json({ error: 'Student is not enrolled in this course' }, { status: 400 });
    }

    const isAdminOrInstructor = session.user.role === 'ADMIN' || session.user.role === 'INSTRUCTOR';

    // Prevent submission during active 12-hour cooldown
    if (enrollment.quizAttempts >= 2 && !enrollment.quizPassed && enrollment.lastAttemptAt && !isAdminOrInstructor) {
      const lastAttemptTime = new Date(enrollment.lastAttemptAt).getTime();
      const elapsed = Date.now() - lastAttemptTime;
      const twelveHours = 12 * 60 * 60 * 1000;

      if (elapsed < twelveHours) {
        return NextResponse.json({ error: 'Please wait for the 12-hour cooldown before attempting again.' }, { status: 403 });
      }
    }

    const updatedEnrollment = await prisma.enrollment.update({
      where: {
        id: enrollment.id
      },
      data: {
        quizScore: scorePercentage,
        quizPassed: passed || enrollment.quizPassed, // retain passing status if they already passed
        quizAttempts: {
          increment: 1
        },
        lastAttemptAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      score: scorePercentage,
      passed,
      correctCount,
      totalCount: correctQuestions.length,
      attempts: updatedEnrollment.quizAttempts
    });
  } catch (error) {
    console.error('Grade quiz error:', error);
    return NextResponse.json({ error: 'Failed to process quiz grading' }, { status: 500 });
  }
}
