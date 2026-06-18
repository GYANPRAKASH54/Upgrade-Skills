'use client';

export default function InteractiveBackground3D() {
  return (
    <>
      <div className="bg-viewport">
        {/* Soft, Slow-drifting Aurora Blobs */}
        <div className="aurora-blob blob-violet"></div>
        <div className="aurora-blob blob-cyan"></div>
        <div className="aurora-blob blob-green"></div>
      </div>

      <style jsx global>{`
        .bg-viewport {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          pointer-events: none;
          z-index: 0;
        }

        /* Ambient Glowing Aurora Blobs with heavy blur and low opacity */
        .aurora-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(180px);
          mix-blend-mode: plus-lighter;
          will-change: transform;
          opacity: 0.85;
        }

        .blob-violet {
          top: -20%;
          left: -10%;
          width: 900px;
          height: 900px;
          background: radial-gradient(circle, rgba(105, 39, 239, 0.08) 0%, transparent 80%);
          animation: slowBreathing1 50s ease-in-out infinite alternate;
        }

        .blob-cyan {
          bottom: -20%;
          right: -10%;
          width: 1000px;
          height: 1000px;
          background: radial-gradient(circle, rgba(36, 194, 242, 0.06) 0%, transparent 80%);
          animation: slowBreathing2 60s ease-in-out infinite alternate;
        }

        .blob-green {
          top: 25%;
          right: -15%;
          width: 800px;
          height: 800px;
          background: radial-gradient(circle, rgba(85, 218, 155, 0.05) 0%, transparent 80%);
          animation: slowBreathing3 55s ease-in-out infinite alternate;
        }

        /* Extremely Slow, Organic Motions (using hardware accelerated translate3d) */
        @keyframes slowBreathing1 {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          50% {
            transform: translate3d(60px, 40px, 0) scale(1.05);
          }
          100% {
            transform: translate3d(-40px, -50px, 0) scale(0.95);
          }
        }

        @keyframes slowBreathing2 {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          50% {
            transform: translate3d(-50px, 60px, 0) scale(0.95);
          }
          100% {
            transform: translate3d(40px, -40px, 0) scale(1.05);
          }
        }

        @keyframes slowBreathing3 {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          50% {
            transform: translate3d(40px, -60px, 0) scale(1.08);
          }
          100% {
            transform: translate3d(-50px, 30px, 0) scale(0.92);
          }
        }
      `}</style>
    </>
  );
}
