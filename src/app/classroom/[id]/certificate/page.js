import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import Link from 'next/link';

export const revalidate = 0;

export default async function CertificatePage({ params }) {
  const { id: courseId } = await params;
  const session = await getServerSession(authOptions);

  // 1. Session Security Check
  if (!session) {
    redirect(`/auth/signin?callbackUrl=/classroom/${courseId}/certificate`);
  }

  // 2. Fetch Course Details
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      instructor: {
        select: { name: true },
      },
      sections: {
        include: {
          lectures: {
            select: { id: true },
          },
        },
      },
    },
  });

  if (!course) {
    return <div style={{ padding: '40px', color: 'white', textAlign: 'center' }}>Course not found.</div>;
  }

  // 3. Fetch Enrollment & Verify
  const enrollment = await prisma.enrollment.findUnique({
    where: {
      studentId_courseId: {
        studentId: session.user.id,
        courseId,
      },
    },
  });

  if (!enrollment) {
    return <div style={{ padding: '40px', color: 'white', textAlign: 'center' }}>You are not enrolled in this course.</div>;
  }

  // 4. Recalculate Student Progress percentage
  const lectureIds = course.sections.flatMap((section) => 
    section.lectures.map((lecture) => lecture.id)
  );
  
  const totalLectures = lectureIds.length;

  const completedProgress = await prisma.progress.findMany({
    where: {
      studentId: session.user.id,
      completed: true,
      lectureId: { in: lectureIds },
    },
  });

  const completedCount = completedProgress.length;
  const percentCompleted = totalLectures > 0 ? Math.round((completedCount / totalLectures) * 100) : 0;

  // 5. Enforce 90% progress threshold
  if (percentCompleted < 90) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#0b0f19', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: '24px', 
        color: 'white',
        fontFamily: 'system-ui, sans-serif'
      }}>
        <div className="glass-card" style={{ maxWidth: '480px', padding: '40px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
          <div style={{ fontSize: '48px' }}>🔒</div>
          <h2 style={{ fontSize: '22px', fontWeight: '800' }}>Certificate Locked</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            You have only completed <strong>{percentCompleted}%</strong> of this course. A minimum of <strong>90% progress</strong> is required to generate and claim your graduation certificate.
          </p>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            ({completedCount} of {totalLectures} lectures completed)
          </p>
          <Link href={`/classroom/${courseId}`} className="btn-primary" style={{ padding: '10px 20px', fontSize: '13px' }}>
            Resume Learning
          </Link>
        </div>
      </div>
    );
  }

  // 6. Generate Issue Date and Verification Hash
  const issueDate = new Date(enrollment.joinedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const verificationId = `US-CERT-${enrollment.id.substring(0, 8).toUpperCase()}-${courseId.substring(0, 4).toUpperCase()}`;

  return (
    <>
      {/* Load visual typography from Google Fonts */}
      <link 
        href="https://fonts.googleapis.com/css2?family=Great+Vibes&family=Cinzel:wght@600;700;800&family=Montserrat:wght@400;500;600;700&display=swap" 
        rel="stylesheet" 
      />

      <div className="certificate-page-wrapper">
        {/* Floating action bar (hidden during printing) */}
        <div className="floating-actions-bar">
          <Link href={`/classroom/${courseId}`} className="btn-back">
            ← Back to Classroom
          </Link>
          <button onClick={() => window.print()} className="btn-download">
            🖨️ Download Certificate (PDF)
          </button>
        </div>

        {/* Certificate Frame */}
        <div className="certificate-outer-container">
          <div className="certificate-frame">
            <div className="certificate-inner-border">
              {/* Corner Ornaments */}
              <div className="corner-ornament top-left"></div>
              <div className="corner-ornament top-right"></div>
              <div className="corner-ornament bottom-left"></div>
              <div className="corner-ornament bottom-right"></div>

              {/* Content Box */}
              <div className="certificate-content">
                <div className="platform-name">UPGRADESKILLS</div>
                
                <h1 className="cert-title">Certificate of Completion</h1>
                
                <p className="presented-to">This is proudly presented to</p>
                
                <div className="student-name">{session.user.name}</div>
                
                <p className="completion-text">
                  for successfully completing all curriculum requirements, project reviews, and learning modules for the masterclass course:
                </p>
                
                <h2 className="course-title">{course.title}</h2>
                
                <p className="graduation-date">Given on this day, {issueDate}</p>

                {/* Signatures and Badge Row */}
                <div className="signature-badge-row">
                  <div className="signature-block">
                    <div className="signature-line">
                      <span className="signature-font">Sarah Jenkins</span>
                    </div>
                    <div className="signer-role">Course Instructor</div>
                  </div>

                  <div className="seal-container">
                    <div className="gold-seal">
                      <div className="seal-inner">
                        <div className="seal-star">★</div>
                        <div className="seal-text">VERIFIED</div>
                      </div>
                    </div>
                  </div>

                  <div className="signature-block">
                    <div className="signature-line">
                      <span className="signature-font">UpgradeSkills Admin</span>
                    </div>
                    <div className="signer-role">Academic Director</div>
                  </div>
                </div>

                <div className="verification-hash">
                  Verification ID: {verificationId} &nbsp;|&nbsp; Authenticity secured via upgradeskills.co.in/verify
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        /* Page Styling */
        .certificate-page-wrapper {
          min-height: 100vh;
          background-color: #0b0f19;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 24px 40px 24px;
          box-sizing: border-box;
          font-family: 'Montserrat', sans-serif;
        }

        /* Floating action header */
        .floating-actions-bar {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          background: rgba(11, 15, 25, 0.85);
          backdrop-filter: blur(8px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding: 14px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-sizing: border-box;
          z-index: 100;
        }

        .btn-back {
          color: rgba(255, 255, 255, 0.8);
          text-decoration: none;
          font-size: 14px;
          font-weight: 600;
          transition: color 0.2s ease;
        }
        .btn-back:hover {
          color: #fff;
        }

        .btn-download {
          background: linear-gradient(135deg, #00f2fe 0%, #7c3aed 100%);
          color: white;
          border: none;
          padding: 10px 20px;
          font-size: 13px;
          font-weight: 700;
          border-radius: 4px;
          cursor: pointer;
          box-shadow: 0 4px 15px rgba(0, 242, 254, 0.3);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .btn-download:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(0, 242, 254, 0.4);
        }

        /* Certificate outer layout frame (Landscape ratio) */
        .certificate-outer-container {
          background-color: #fff;
          color: #1e293b;
          width: 100%;
          max-width: 960px;
          aspect-ratio: 1.414 / 1; /* A4 Landscape Ratio */
          padding: 24px;
          box-sizing: border-box;
          box-shadow: 0 20px 50px rgba(0,0,0,0.5);
          border-radius: 6px;
        }

        .certificate-frame {
          border: 12px double #b59410; /* Elegant gold double border */
          height: 100%;
          box-sizing: border-box;
        }

        .certificate-inner-border {
          border: 2px solid #b59410;
          margin: 6px;
          height: calc(100% - 16px);
          box-sizing: border-box;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Certificate Ornaments */
        .corner-ornament {
          position: absolute;
          width: 30px;
          height: 30px;
          border-color: #b59410;
          border-style: solid;
        }
        .top-left { top: 12px; left: 12px; border-width: 3px 0 0 3px; }
        .top-right { top: 12px; right: 12px; border-width: 3px 3px 0 0; }
        .bottom-left { bottom: 12px; left: 12px; border-width: 0 0 3px 3px; }
        .bottom-right { bottom: 12px; right: 12px; border-width: 0 3px 3px 0; }

        /* Certificate Content Area */
        .certificate-content {
          text-align: center;
          padding: 30px 60px;
          width: 100%;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 100%;
        }

        .platform-name {
          font-family: 'Cinzel', serif;
          font-size: 16px;
          font-weight: 700;
          letter-spacing: 0.25em;
          color: #7c3aed;
        }

        .cert-title {
          font-family: 'Cinzel', serif;
          font-size: 32px;
          font-weight: 700;
          color: #b59410;
          margin-top: 8px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .presented-to {
          font-family: 'Montserrat', sans-serif;
          font-size: 13px;
          font-style: italic;
          color: #64748b;
          margin-top: 10px;
        }

        .student-name {
          font-family: 'Great Vibes', cursive;
          font-size: 48px;
          color: #1e1b4b;
          margin-top: 4px;
          line-height: 1.1;
        }

        .completion-text {
          font-size: 12px;
          color: #64748b;
          line-height: 1.6;
          max-width: 680px;
          margin: 10px auto 0 auto;
        }

        .course-title {
          font-family: 'Cinzel', serif;
          font-size: 20px;
          font-weight: 800;
          color: #1e1b4b;
          margin-top: 8px;
          line-height: 1.3;
        }

        .graduation-date {
          font-size: 12px;
          color: #64748b;
          margin-top: 10px;
          font-weight: 500;
        }

        /* Signatures and Badge */
        .signature-badge-row {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          margin-top: 24px;
        }

        .signature-block {
          width: 200px;
          text-align: center;
        }

        .signature-line {
          border-bottom: 1.5px solid #cbd5e1;
          padding-bottom: 8px;
          margin-bottom: 6px;
        }

        .signature-font {
          font-family: 'Great Vibes', cursive;
          font-size: 26px;
          color: #3b82f6;
          display: block;
          line-height: 0.8;
        }

        .signer-role {
          font-size: 11px;
          color: #94a3b8;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        /* Gold Seal Stamp */
        .seal-container {
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .gold-seal {
          width: 70px;
          height: 70px;
          background: radial-gradient(circle, #fcd34d 0%, #b59410 100%);
          border-radius: 50%;
          border: 3px double #fff;
          box-shadow: 0 0 10px rgba(181, 148, 16, 0.4), inset 0 0 8px rgba(0,0,0,0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .seal-inner {
          text-align: center;
          color: #78350f;
          font-weight: 800;
          font-size: 8px;
        }

        .seal-star {
          font-size: 14px;
          color: #78350f;
          line-height: 1;
        }

        .seal-text {
          font-size: 7px;
          letter-spacing: 0.05em;
          font-weight: 900;
        }

        .verification-hash {
          font-size: 9px;
          color: #94a3b8;
          margin-top: 14px;
          border-top: 1px solid #f1f5f9;
          padding-top: 10px;
        }

        /* ========================================================
           PRINT CONFIGURATION
           Hides everything else and forces landscape printing
           ======================================================== */
        @media print {
          @page {
            size: landscape;
            margin: 0;
          }

          body {
            background-color: #fff !important;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact; /* Preserve gold colors */
            print-color-adjust: exact;
          }

          .certificate-page-wrapper {
            background-color: #fff !important;
            padding: 0 !important;
            min-height: 0 !important;
            height: 100vh !important;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .floating-actions-bar {
            display: none !important; /* Hide back and print buttons */
          }

          .certificate-outer-container {
            box-shadow: none !important;
            border-radius: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            padding: 20px !important;
            max-width: none !important;
            aspect-ratio: auto !important;
          }
        }
      `}</style>
    </>
  );
}
