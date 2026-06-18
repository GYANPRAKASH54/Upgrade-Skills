'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Award, ArrowLeft, Printer } from 'lucide-react';

export default function CertificateClient({ 
  studentName, 
  courseTitle, 
  issueDate, 
  verificationId, 
  courseId 
}) {
  const [verificationUrl, setVerificationUrl] = useState(`https://upgradeskills.co.in/verify?id=${verificationId}`);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setVerificationUrl(`${window.location.origin}/verify?id=${verificationId}`);
    }
  }, [verificationId]);

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <>
      {/* Load visual typography from Google Fonts */}
      <link 
        href="https://fonts.googleapis.com/css2?family=Alex+Brush&family=Cinzel:wght@500;600;700&family=Playfair+Display:ital,wght@0,600;0,700;1,600;1,700&family=Montserrat:wght@400;500;600;700&display=swap" 
        rel="stylesheet" 
      />

      <div className="certificate-page-wrapper">
        {/* Floating action bar (hidden during printing) */}
        <div className="floating-actions-bar">
          <Link href={`/classroom/${courseId}`} className="btn-back">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <ArrowLeft size={16} /> Back to Classroom
            </span>
          </Link>
          <button onClick={handlePrint} className="btn-download">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Printer size={16} /> Download / Print (PDF)
            </span>
          </button>
        </div>

        {/* Certificate Frame */}
        <div className="certificate-outer-container">
          <div className="certificate-frame">
            <div className="certificate-inner-border">
              {/* Content Box */}
              <div className="certificate-content">
                {/* Top header row */}
                <div className="cert-header-row">
                  <div className="cert-number-id">
                    Certificate no.- {verificationId}
                  </div>
                  <div className="cert-header-right">
                    <span className="cert-course-type">{courseTitle}</span>
                    <div className="cert-header-divider"></div>
                    <div className="cert-logo-text">
                      <span className="logo-upgrade">upgrade</span>
                      <span className="logo-skills">skills</span>
                    </div>
                  </div>
                </div>
                
                {/* Middle Content (Vertically Centered Group) */}
                <div className="cert-middle-content">
                  {/* Certificate Title */}
                  <h1 className="cert-title">Certificate of Achievement</h1>
                  
                  {/* Presented to */}
                  <p className="presented-to">Presented to</p>
                  
                  {/* Student Name */}
                  <div className="student-name-container">
                    <div className="student-name-wrapper">
                      <div className="student-name">{studentName}</div>
                      <div className="student-name-underline"></div>
                    </div>
                  </div>
                  
                  {/* Body Text */}
                  <p className="completion-text">
                    This certificate is presented for recognition of their performance and outstanding achievements in <strong>{courseTitle}</strong> held on <strong>{issueDate}</strong> organized by <strong>upgradeskills</strong>. Your hard work, dedication, and perseverance have been instrumental in your success, and we are honored to recognize your accomplishments.
                  </p>
                </div>

                {/* Bottom Row (Signature, Seal, QR Code) */}
                <div className="cert-bottom-row">
                  {/* Left Side: SVG Wave Graphic */}
                  <div className="wave-graphic-container">
                    <svg className="wave-graphic" viewBox="0 0 400 240" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
                        </pattern>
                      </defs>
                      {/* Dark blue wave */}
                      <path d="M 0 240 L 0 120 C 60 110, 100 230, 180 180 C 250 140, 300 220, 400 240 Z" fill="#3f4d8c"/>
                      {/* Grid overlay */}
                      <path d="M 0 240 L 0 120 C 60 110, 100 230, 180 180 C 250 140, 300 220, 400 240 Z" fill="url(#grid)"/>
                      {/* Mint green line */}
                      <path d="M 0 120 C 60 110, 100 230, 180 180 C 250 140, 300 220, 400 240" fill="none" stroke="#66c4a9" stroke-width="3"/>
                    </svg>
                  </div>

                  {/* Right Side Info: Signature & Seal */}
                  <div className="cert-signatures-seals">
                    {/* Instructor Signature */}
                    <div className="signature-block">
                      <div className="signature-font">teamsUpgradeSkills</div>
                      <div className="signature-line"></div>
                      <div className="signer-role">Course Instructor</div>
                    </div>

                    {/* UGS Seal Badge */}
                    <div className="seal-container">
                      <div className="gold-seal">
                        <div className="seal-ribbon left"></div>
                        <div className="seal-ribbon right"></div>
                        <div className="seal-circle">
                          <div className="seal-inner">
                            <span className="seal-text-top">VERIFIED</span>
                            <span className="seal-star">★</span>
                            <span className="seal-text-bottom">UGS SEAL</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* QR Code Verification */}
                    <div className="qr-container">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(verificationUrl)}`}
                        alt="Verification QR Code" 
                        className="qr-code" 
                      />
                      <div className="qr-text">Scan to Verify</div>
                    </div>
                  </div>
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
          width: 100%;
          overflow-x: auto;
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
          background: linear-gradient(135deg, #66c4a9 0%, #5768b0 100%);
          color: white;
          border: none;
          padding: 10px 20px;
          font-size: 13px;
          font-weight: 700;
          border-radius: 4px;
          cursor: pointer;
          box-shadow: 0 4px 15px rgba(102, 196, 169, 0.3);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .btn-download:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(102, 196, 169, 0.4);
        }

        /* Certificate outer layout frame (Landscape ratio) */
        .certificate-outer-container {
          background-color: #fff;
          color: #1e293b;
          width: 100%;
          max-width: 960px;
          min-width: 800px; /* Prevent layout squishing on mobile */
          aspect-ratio: 1.414 / 1; /* A4 Landscape Ratio */
          padding: 24px;
          box-sizing: border-box;
          box-shadow: 0 20px 50px rgba(0,0,0,0.5);
          border-radius: 6px;
        }

        .certificate-frame {
          border: 3px solid #5768b0; /* Primary Logo Blue border line */
          height: 100%;
          box-sizing: border-box;
          border-radius: 4px;
        }

        .certificate-inner-border {
          border: 1.5px solid #66c4a9; /* Secondary Logo Mint Green border line */
          margin: 6px;
          width: calc(100% - 12px); /* Explicit width for guaranteed alignment across all browsers */
          height: calc(100% - 12px);
          box-sizing: border-box;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 2px;
        }

        /* Certificate Content Area */
        .certificate-content {
          text-align: center;
          padding: 10px 24px;
          width: 100%;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          height: 100%;
        }

        /* Header Row */
        .cert-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          margin-bottom: 12px;
        }

        .cert-number-id {
          font-size: 11px;
          font-weight: 500;
          color: #64748b;
          letter-spacing: 0.05em;
        }

        .cert-header-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .cert-course-type {
          font-size: 13.5px;
          font-weight: 700;
          font-style: italic;
          color: #0f172a;
          max-width: 320px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .cert-header-divider {
          height: 20px;
          width: 1.5px;
          background-color: #0f172a;
        }

        .cert-logo-text {
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.02em;
          display: flex;
          align-items: center;
        }

        .logo-upgrade {
          color: #5768b0;
        }

        .logo-skills {
          color: #66c4a9;
        }

        /* Vertically Centered Middle Content Group */
        .cert-middle-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          flex-grow: 1;
          width: 100%;
        }

        /* Titles */
        .cert-title {
          font-family: 'Playfair Display', serif;
          font-size: 38px;
          font-weight: 600;
          color: #5768b0;
          margin-top: 0; /* Centered dynamically within the group */
          letter-spacing: 0.02em;
        }

        .presented-to {
          font-size: 13px;
          font-style: italic;
          color: #64748b;
          margin-top: 8px; /* Balanced spacing */
        }

        /* Name block */
        .student-name-container {
          margin-top: 12px; /* Increased margin for elegance */
          width: 100%;
          display: flex;
          justify-content: center;
        }

        .student-name-wrapper {
          display: inline-flex;
          flex-direction: column;
          align-items: center;
        }

        .student-name {
          font-family: 'Cinzel', 'Playfair Display', serif;
          font-size: 38px;
          font-weight: 700;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: #0f172a;
          line-height: 1.2;
          padding: 0 10px;
          text-align: center;
        }

        .student-name-underline {
          height: 2.5px;
          background: linear-gradient(90deg, #5768b0 0%, #66c4a9 100%); /* Logo color gradient underline */
          width: 100%; /* Dynamically matches the name width */
          margin-top: 8px;
        }

        .completion-text {
          font-size: 12.5px;
          color: #475569;
          line-height: 1.65;
          max-width: 660px;
          margin-top: 18px; /* Balanced spacing from name underline */
          text-align: center; /* Explicit centering */
        }

        /* Bottom Row */
        .cert-bottom-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-top: 0; /* Remove auto-margin since flex-grow handles distribution */
          width: 100%;
          position: relative;
        }

        /* Wave container */
        .wave-graphic-container {
          position: absolute;
          bottom: -24px; /* Offset the padding of the outer container */
          left: -24px;   /* Offset the padding of the outer container */
          width: 360px;
          height: auto;
          z-index: 1;
          pointer-events: none;
        }

        .wave-graphic {
          width: 100%;
          height: auto;
          display: block;
        }

        /* Signatures and Seals */
        .cert-signatures-seals {
          display: flex;
          align-items: flex-end;
          justify-content: flex-end;
          gap: 24px;
          margin-left: auto;
          z-index: 10;
          position: relative;
        }

        .signature-block {
          width: 190px;
          text-align: center;
        }

        .signature-font {
          font-family: 'Cinzel', 'Playfair Display', serif;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 1px;
          color: #0f172a;
          display: block;
          line-height: 1.2;
          margin-bottom: 2px;
          white-space: nowrap;
        }

        .signature-line {
          border-bottom: 1.5px solid #cbd5e1;
          margin-bottom: 6px;
        }

        .signer-role {
          font-size: 10px;
          color: #94a3b8;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        /* Gold Seal Badge Stamp */
        .seal-container {
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .gold-seal {
          position: relative;
          width: 72px;
          height: 72px;
        }

        .seal-circle {
          width: 72px;
          height: 72px;
          background: radial-gradient(circle, #ffe082 0%, #b59410 100%);
          border-radius: 50%;
          border: 2.5px double #fff;
          box-shadow: 0 4px 10px rgba(181, 148, 16, 0.3), inset 0 0 6px rgba(0,0,0,0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2;
          position: relative;
        }

        .seal-ribbon {
          position: absolute;
          width: 16px;
          height: 48px;
          background: linear-gradient(to bottom, #d97706 0%, #92400e 100%);
          z-index: 1;
          bottom: -24px;
        }

        .seal-ribbon.left {
          left: 18px;
          transform: rotate(-15deg);
          border-bottom: 8px solid transparent;
        }

        .seal-ribbon.right {
          right: 18px;
          transform: rotate(15deg);
          border-bottom: 8px solid transparent;
        }

        .seal-inner {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #78350f;
          font-weight: 800;
          line-height: 1;
        }

        .seal-text-top {
          font-size: 7px;
          letter-spacing: 0.08em;
          font-weight: 900;
        }

        .seal-star {
          font-size: 12px;
          color: #78350f;
          margin: 2px 0;
        }

        .seal-text-bottom {
          font-size: 6px;
          letter-spacing: 0.05em;
          font-weight: 900;
        }

        /* QR container */
        .qr-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
        }

        .qr-code {
          width: 60px;
          height: 60px;
          padding: 3px;
          background: #fff;
          border: 1.5px solid #e2e8f0;
          border-radius: 4px;
        }

        .qr-text {
          font-size: 7.5px;
          font-weight: 600;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        @media print {
          @page {
            size: landscape;
            margin: 0;
          }

          html, body {
            height: auto !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            display: block !important;
          }

          header,
          footer,
          nav,
          .header,
          .footer,
          [class*="Header"],
          [class*="Footer"] {
            display: none !important;
          }

          main {
            display: block !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          body {
            background-color: #fff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .certificate-page-wrapper {
            background-color: #fff !important;
            padding: 0 !important;
            margin: 0 !important;
            min-height: 0 !important;
            height: auto !important;
            width: 100% !important;
            display: block !important;
          }

          .floating-actions-bar {
            display: none !important;
          }

          .certificate-outer-container {
            box-shadow: none !important;
            border-radius: 0 !important;
            width: 95% !important;
            max-width: 95% !important;
            height: 67vw !important;
            padding: 20px !important;
            margin: 10px auto !important;
            min-width: 0 !important;
            display: block !important;
          }

          .wave-graphic-container {
            bottom: -20px !important;
            left: -20px !important;
            width: 320px !important;
          }
        }
      `}</style>
    </>
  );
}
