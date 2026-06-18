'use client';

import { useState, useEffect, useRef } from 'react';
import { Award, ArrowLeft, CheckCircle2, AlertCircle, RefreshCw, ChevronLeft, ChevronRight, HelpCircle, FileText, Camera, ShieldAlert, Monitor, Sparkles, Eye } from 'lucide-react';
import Link from 'next/link';

// Floating Webcam Feed helper component to prevent stream restarts on state change
function WebcamFeed({ stream }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="webcam-container">
      <div className="webcam-badge">
        <span className="live-dot"></span>
        <span>PROCTOR FEED (LIVE)</span>
      </div>
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="webcam-video"
        />
      ) : (
        <div className="webcam-fallback">
          <Camera size={24} style={{ color: 'rgba(255, 255, 255, 0.2)' }} />
          <span>Feed Disconnected</span>
        </div>
      )}
    </div>
  );
}

export default function QuizClient({ courseTitle, courseId, enrollment, isStaff }) {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  // Proctoring & Security States
  const [isExamStarted, setIsExamStarted] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraError, setCameraError] = useState('');
  const [violations, setViolations] = useState(0);
  const [proctorLogs, setProctorLogs] = useState([]);
  const [showViolationModal, setShowViolationModal] = useState(false);
  const [lastViolationReason, setLastViolationReason] = useState('');
  const [startingExam, setStartingExam] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  const attempts = enrollment ? enrollment.quizAttempts : 0;
  const passed = enrollment ? enrollment.quizPassed : false;
  const hasReachedLimit = attempts >= 2 && !passed && !isStaff;

  const logProctor = (message) => {
    const timeString = new Date().toLocaleTimeString();
    const logEntry = `[${timeString}] ${message}`;
    setProctorLogs((prev) => {
      // Prevent duplicate log insertion from Strict Mode or double triggers
      if (prev.length > 0 && prev[0].includes(message)) {
        return prev;
      }
      return [logEntry, ...prev.slice(0, 19)];
    });
  };

  // Calculate remaining cooldown timer in seconds (for 12 hours lock)
  useEffect(() => {
    if (!enrollment || enrollment.quizPassed || enrollment.quizAttempts < 2) return;
    if (!enrollment.lastAttemptAt) return;

    const lastAttemptTime = new Date(enrollment.lastAttemptAt).getTime();
    const cooldownDuration = 12 * 60 * 60 * 1000; // 12 hours in ms

    const updateTimer = () => {
      const now = Date.now();
      const elapsed = now - lastAttemptTime;
      const remaining = cooldownDuration - elapsed;

      if (remaining > 0) {
        setCooldownRemaining(Math.ceil(remaining / 1000));
      } else {
        setCooldownRemaining(0);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [enrollment]);

  // If countdown timer drops to 0, reload the page to refresh server component state and unlock attempts
  useEffect(() => {
    if (hasReachedLimit && cooldownRemaining === 0 && enrollment?.lastAttemptAt) {
      const timer = setTimeout(() => {
        window.location.reload();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldownRemaining, hasReachedLimit, enrollment]);

  const formatCooldown = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 1. Fetch questions on mount (if attempts remaining or cooldown has expired)
  useEffect(() => {
    if (hasReachedLimit && cooldownRemaining > 0) {
      setLoading(false);
      return;
    }

    const fetchQuestions = async () => {
      try {
        const res = await fetch(`/api/courses/${courseId}/quiz`);
        const data = await res.json();
        
        if (res.ok && data.success) {
          setQuestions(data.questions);
        } else {
          setError(data.error || 'Failed to load exam questions.');
        }
      } catch (err) {
        console.error(err);
        setError('An unexpected error occurred. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [courseId, hasReachedLimit, cooldownRemaining]);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  // Initialize camera and enter fullscreen to start exam
  const handleStartExam = async () => {
    if (startingExam || isExamStarted) return;
    setStartingExam(true);
    setCameraError('');
    
    let fullscreenSucceeded = false;
    
    try {
      // 1. Request fullscreen first (under direct user gesture context)
      try {
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
          await elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
          await elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) {
          await elem.msRequestFullscreen();
        }
        fullscreenSucceeded = true;
        logProctor('Exam session locked in Fullscreen.');
      } catch (fsErr) {
        console.warn('Fullscreen request failed:', fsErr);
        logProctor('WARNING: Fullscreen request failed/denied.');
      }

      // 2. Request camera permission
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: 'user' }
      });
      setCameraStream(stream);
      logProctor('Camera feed initialized successfully.');
      
      setIsExamStarted(true);
      logProctor('AI proctoring initialized.');
    } catch (err) {
      console.error('Proctor initialization failed:', err);
      setCameraError('Webcam access is strictly required to pass this proctored course exam.');
      logProctor('ERROR: Camera initialization failed.');
      
      // Exit fullscreen if we entered it but camera failed
      if (fullscreenSucceeded && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    } finally {
      setStartingExam(false);
    }
  };

  // Listen for fullscreen escape, tab focus changes, and visibility hide
  useEffect(() => {
    if (!isExamStarted || result) return;

    const handleFullscreenChange = () => {
      const isFullscreenNow = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
      if (!isFullscreenNow) {
        handleViolation('Exited Fullscreen mode.');
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleViolation('Tab switched or browser minimized.');
      }
    };

    const handleWindowBlur = () => {
      handleViolation('Window focus lost (switched app).');
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [isExamStarted, result]);

  const handleViolation = (reason) => {
    if (isStaff) {
      logProctor(`PREVIEW NOTICE: Violation detected: ${reason} (Staff bypassed)`);
      return;
    }

    setViolations((prev) => {
      const nextVal = prev + 1;
      logProctor(`VIOLATION DETECTED: ${reason} (Count: ${nextVal}/3)`);

      if (nextVal >= 3) {
        logProctor('CRITICAL EXCEEDED: Auto-submitting exam due to multiple violations.');
        triggerAutoSubmit();
      } else {
        setLastViolationReason(reason);
        setShowViolationModal(true);
      }
      return nextVal;
    });
  };

  const triggerAutoSubmit = async () => {
    setSubmitting(true);
    setError('');

    // Stop camera stream
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }

    // Exit fullscreen
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }

    try {
      const res = await fetch(`/api/courses/${courseId}/quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setResult({
          ...data,
          autoSubmitted: true
        });
      } else {
        setError(data.error || 'Failed to auto-submit.');
      }
    } catch (err) {
      console.error(err);
      setError('Connection failed. Current selections were cached.');
    } finally {
      setSubmitting(false);
      setShowViolationModal(false);
      setIsExamStarted(false);
    }
  };

  const handleSelectOption = (questionId, optionIdx) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionIdx
    }));
  };

  const handlePrev = () => {
    if (currentIdx > 0) setCurrentIdx(currentIdx - 1);
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) setCurrentIdx(currentIdx + 1);
  };

  const handleSubmit = async () => {
    const unansweredCount = questions.length - Object.keys(answers).length;
    if (unansweredCount > 0) {
      if (!confirm(`You have left ${unansweredCount} questions unanswered. Are you sure you want to submit the exam?`)) {
        return;
      }
    }

    setSubmitting(true);
    setError('');

    // Stop camera stream
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }

    // Exit fullscreen
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }

    try {
      const res = await fetch(`/api/courses/${courseId}/quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setResult(data);
      } else {
        setError(data.error || 'Failed to submit exam grading.');
      }
    } catch (err) {
      console.error(err);
      setError('Connection failed. Please check your internet and try again.');
    } finally {
      setSubmitting(false);
      setIsExamStarted(false);
    }
  };

  const handleRetry = () => {
    setAnswers({});
    setCurrentIdx(0);
    setResult(null);
    setIsExamStarted(false);
    setViolations(0);
    setProctorLogs([]);
  };

  // Re-enter fullscreen when student clicks "I understand" on warning modal
  const handleAcknowledgeViolation = async () => {
    setShowViolationModal(false);
    try {
      const elem = document.documentElement;
      if (!document.fullscreenElement) {
        if (elem.requestFullscreen) {
          await elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
          await elem.webkitRequestFullscreen();
        }
      }
      logProctor('Fullscreen lock re-established.');
    } catch (err) {
      console.error(err);
    }
  };

  // 2. Loading State
  if (loading) {
    return (
      <div className="quiz-page-container flex-center">
        <div className="glass-card text-center" style={{ maxWidth: '500px', padding: '40px' }}>
          <RefreshCw className="animate-spin" size={48} style={{ color: 'var(--accent)', margin: '0 auto 20px auto' }} />
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' }}>Generating Final Exam</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '12px', lineHeight: '1.6' }}>
            Our AI engine is analyzing the course contents and lectures to generate 12 unique multiple-choice questions for your evaluation...
          </p>
        </div>
        {globalStyles}
      </div>
    );
  }

  // 3. Locked State: Maximum Attempts Reached / Cooldown Active
  if (hasReachedLimit) {
    if (cooldownRemaining > 0) {
      return (
        <div className="quiz-page-container flex-center">
          <div className="glass-card text-center" style={{ maxWidth: '520px', padding: '40px', borderColor: '#fbbf24' }}>
            <ShieldAlert size={48} style={{ color: '#fbbf24', margin: '0 auto 20px auto' }} />
            <h2 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)' }}>Exam Cooldown Active</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14.5px', marginTop: '16px', lineHeight: '1.6' }}>
              You did not pass the exam on your previous attempts. Please wait 12 hours for the system to automatically reset your attempts.
            </p>
            <div style={{ backgroundColor: 'rgba(251, 191, 36, 0.08)', border: '1px solid rgba(251, 191, 36, 0.2)', padding: '16px', borderRadius: '8px', marginTop: '20px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em' }}>
                Attempts Will Reset In
              </div>
              <div style={{ fontSize: '32px', fontWeight: '800', fontFamily: 'monospace', color: '#fbbf24', marginTop: '8px' }}>
                {formatCooldown(cooldownRemaining)}
              </div>
            </div>
            <div style={{ marginTop: '24px' }}>
              <Link href={`/classroom/${courseId}`} className="btn-secondary">
                Back to Classroom
              </Link>
            </div>
          </div>
          {globalStyles}
        </div>
      );
    }

    return (
      <div className="quiz-page-container flex-center">
        <div className="glass-card text-center" style={{ maxWidth: '520px', padding: '40px', borderColor: '#ef4444' }}>
          <ShieldAlert size={48} style={{ color: '#ef4444', margin: '0 auto 20px auto' }} />
          <h2 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)' }}>Exam Attempts Locked</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14.5px', marginTop: '16px', lineHeight: '1.6' }}>
            You have used all of your **{attempts} exam attempts** for this course and did not reach the passing score of 70%.
          </p>
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '12px', borderRadius: '6px', marginTop: '16px', fontSize: '13px', color: '#f87171' }}>
            To unlock further attempts, please contact your course instructor or school administrator to reset your exam state.
          </div>
          <div style={{ marginTop: '24px' }}>
            <Link href={`/classroom/${courseId}`} className="btn-secondary">
              Back to Classroom
            </Link>
          </div>
        </div>
        {globalStyles}
      </div>
    );
  }

  // 4. Error State
  if (error && questions.length === 0) {
    return (
      <div className="quiz-page-container flex-center">
        <div className="glass-card text-center" style={{ maxWidth: '480px', padding: '40px' }}>
          <AlertCircle size={48} style={{ color: '#ef4444', margin: '0 auto 20px auto' }} />
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' }}>Failed to Load Quiz</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '10px' }}>{error}</p>
          <Link href={`/classroom/${courseId}`} className="btn-primary" style={{ marginTop: '20px', display: 'inline-block' }}>
            Back to Classroom
          </Link>
        </div>
        {globalStyles}
      </div>
    );
  }

  // 5. Result Summary State
  if (result) {
    const isPass = result.passed;
    return (
      <div className="quiz-page-container flex-center">
        <div className="glass-card text-center" style={{ maxWidth: '540px', padding: '40px' }}>
          <div className="flex-center" style={{ marginBottom: '24px' }}>
            <div className={`score-ring flex-center ${isPass ? 'pass-ring' : 'fail-ring'}`}>
              <div className="score-text">
                <span className="score-num">{result.score}%</span>
                <span className="score-label">Score</span>
              </div>
            </div>
          </div>

          {result.autoSubmitted && (
            <div className="violation-flag">
              🚨 Submitted Automatically Due to Proctor Violations
            </div>
          )}

          {isPass ? (
            <>
              <CheckCircle2 size={48} style={{ color: '#4ade80', margin: '0 auto 16px auto' }} />
              <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)' }}>Congratulations, You Passed!</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14.5px', marginTop: '12px', lineHeight: '1.6' }}>
                Awesome work! You got <strong>{result.correctCount} of {result.totalCount}</strong> answers correct (70% required). Your completion certificate is now unlocked.
              </p>
              <div className="action-row" style={{ marginTop: '30px', display: 'flex', gap: '16px', justifyContent: 'center' }}>
                <Link href={`/classroom/${courseId}`} className="btn-secondary">
                  Back to Course
                </Link>
                <Link href={`/classroom/${courseId}/certificate`} target="_blank" className="btn-primary" style={{ background: 'linear-gradient(135deg, var(--accent), var(--primary))' }}>
                  <Award size={16} /> Claim Certificate
                </Link>
              </div>
            </>
          ) : (
            <>
              <AlertCircle size={48} style={{ color: '#fbbf24', margin: '0 auto 16px auto' }} />
              <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)' }}>Exam Not Passed</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14.5px', marginTop: '12px', lineHeight: '1.6' }}>
                You scored <strong>{result.score}%</strong>. You need at least <strong>70%</strong> ({Math.ceil(result.totalCount * 0.70)} of {result.totalCount} correct) to pass the exam and unlock your certificate.
              </p>
              <div className="attempts-badge" style={{ marginTop: '12px', fontSize: '13px', color: 'var(--text-muted)' }}>
                Attempts made: {result.attempts} / 2
              </div>
              <div className="action-row" style={{ marginTop: '30px', display: 'flex', gap: '16px', justifyContent: 'center' }}>
                <Link href={`/classroom/${courseId}`} className="btn-secondary">
                  Back to Course
                </Link>
                {result.attempts < 2 ? (
                  <button onClick={handleRetry} className="btn-primary" style={{ background: 'linear-gradient(135deg, #fbbf24, #d97706)', color: '#000', fontWeight: '700' }}>
                    <RefreshCw size={14} /> Retry Exam
                  </button>
                ) : (
                  <div style={{ color: '#ef4444', fontSize: '13px', fontWeight: '700', padding: '10px 16px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '6px' }}>
                    No attempts remaining
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        {globalStyles}
      </div>
    );
  }

  // 6. Pre-Exam Start Rules Screen
  if (!isExamStarted) {
    return (
      <div className="quiz-page-container flex-center">
        <div className="glass-card rules-card" style={{ maxWidth: '620px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div className="proctor-badge flex-center">
              <Sparkles size={14} /> SECURITY LIVE
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.05em' }}>PROCTORED EVALUATION</span>
          </div>

          <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>{courseTitle}</h1>
          <h2 style={{ fontSize: '16px', color: 'var(--accent)', fontWeight: '600', marginBottom: '24px' }}>AI-Proctored Final Certification Exam</h2>

          <div className="rules-box">
            <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Eye size={16} style={{ color: 'var(--accent)' }} /> Strict Examination Protocol:
            </h3>
            <ul className="rules-list">
              <li>
                <strong>Webcam Proctoring Required:</strong> You must grant camera access. The AI proctor logs your activity via your webcam feed throughout the exam.
              </li>
              <li>
                <strong>Fullscreen Locked:</strong> Exiting fullscreen is logged as a violation. Fullscreen is automatically requested when you start.
              </li>
              <li>
                <strong>No Tab Swapping / App Switching:</strong> Navigating away from this exam tab, minimizing the browser, or opening other programs triggers an automatic proctor violation warning.
              </li>
              <li>
                <strong>Three Strikes Policy:</strong> Accumulating <strong>3 violations</strong> will immediately auto-submit your exam with your current progress.
              </li>
              <li>
                <strong>Cheating Protections:</strong> Text selection, copying, pasting, and right-clicking are fully disabled.
              </li>
              <li>
                <strong>Grading:</strong> Contains 12 multiple-choice questions. A score of **70% or higher** (9 correct) is required to unlock your certificate. Max **2 attempts** allowed.
              </li>
            </ul>
          </div>

          {cameraError && (
            <div className="proctor-error-banner">
              <AlertCircle size={16} />
              <span>{cameraError}</span>
            </div>
          )}

          <div className="rules-action-row">
            <Link href={`/classroom/${courseId}`} className="btn-secondary" style={{ padding: '10px 20px' }}>
              <ArrowLeft size={14} /> Back to Classroom
            </Link>
            <button
              onClick={handleStartExam}
              disabled={startingExam}
              className="btn-submit-exam"
              style={{ padding: '12px 28px', fontSize: '14px', background: 'linear-gradient(135deg, var(--accent), var(--primary))', opacity: startingExam ? 0.6 : 1, cursor: startingExam ? 'not-allowed' : 'pointer' }}
            >
              {startingExam ? 'Initializing...' : 'Start Proctored Exam'} <ChevronRight size={16} />
            </button>
          </div>
          <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '11px', color: 'var(--text-muted)' }}>
            Attempt {attempts + 1} of 2. Make sure your face is clearly visible and your lighting is adequate.
          </div>
        </div>
        {globalStyles}
      </div>
    );
  }

  // 7. Active Proctor Exam Board
  const activeQuestion = questions[currentIdx];
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(answers).length;
  const percentAnswered = Math.round((answeredCount / totalQuestions) * 100);

  const preventCheatingEvents = {
    onCopy: (e) => {
      e.preventDefault();
      alert("Copying questions is disabled during this exam.");
    },
    onPaste: (e) => {
      e.preventDefault();
      alert("Paste is disabled during this exam.");
    },
    onCut: (e) => {
      e.preventDefault();
      alert("Cut is disabled during this exam.");
    },
    onContextMenu: (e) => {
      e.preventDefault();
      alert("Right-click menu is disabled during this exam.");
    }
  };

  return (
    <div className="proctor-quiz-layout" {...preventCheatingEvents}>
      {/* Top Session Security Header */}
      <header className="proctor-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ShieldAlert className="live-pulse" size={18} style={{ color: '#ef4444' }} />
          <span className="live-glow-text" style={{ fontSize: '13px', fontWeight: '800' }}>LIVE PROCTORING SECURE SESSION ACTIVE</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div className="security-counter flex-center">
            <Monitor size={14} />
            <span>Fullscreen: Locked</span>
          </div>
          <div className={`security-counter flex-center ${violations > 0 ? 'violation-warn' : ''}`}>
            <AlertCircle size={14} />
            <span>Violations: <strong style={{ color: violations > 0 ? '#ef4444' : '#fff' }}>{violations} / 3</strong></span>
          </div>
          <div className="security-counter flex-center">
            <span>Attempts Used: {attempts + 1} / 2</span>
          </div>
        </div>
      </header>

      {/* Main Grid: Left Proctor sidebar, Right question board */}
      <div className="proctor-main-grid">
        <aside className="proctor-sidebar">
          {/* 1. Webcam View */}
          <WebcamFeed stream={cameraStream} />

          {/* Proctor Audit Terminal Logs hidden from students */}

          {/* 3. Question grid map */}
          <div className="grid-header">Questions Index</div>
          <div className="proctor-questions-grid">
            {questions.map((q, idx) => {
              const isCurrent = idx === currentIdx;
              const isAnswered = answers[q.id] !== undefined;
              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIdx(idx)}
                  className={`grid-number-btn ${isCurrent ? 'btn-active' : ''} ${isAnswered ? 'btn-answered' : ''}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          {/* 4. Progress tracker */}
          <div className="proctor-progress-box">
            <div className="progress-label">
              <span>Selections Saved</span>
              <span>{answeredCount} / {totalQuestions}</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${percentAnswered}%` }} />
            </div>
          </div>
        </aside>

        {/* Question Panel */}
        <main className="proctor-quiz-board">
          <div className="proctor-course-title-row">
            <span style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: '700' }}>QUESTION BOARD</span>
            <h1 className="board-course-title">{courseTitle}</h1>
          </div>

          {error && (
            <div className="quiz-error-banner">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className="proctor-question-card">
            <div className="question-number">Question {currentIdx + 1} of {totalQuestions}</div>
            <h2 className="proctor-question-text">{activeQuestion.question}</h2>

            <div className="options-list">
              {activeQuestion.options.map((option, idx) => {
                const isSelected = answers[activeQuestion.id] === idx;
                return (
                  <div
                    key={idx}
                    onClick={() => handleSelectOption(activeQuestion.id, idx)}
                    className={`option-item ${isSelected ? 'option-selected' : ''}`}
                  >
                    <div className={`option-check ${isSelected ? 'check-selected' : ''}`}>
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <span className="option-label">{option}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Navigation Bar */}
          <footer className="proctor-footer">
            <button
              onClick={handlePrev}
              disabled={currentIdx === 0}
              className="btn-nav"
            >
              <ChevronLeft size={16} /> Previous
            </button>

            {currentIdx === totalQuestions - 1 ? (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="btn-submit-exam"
                style={{ background: 'linear-gradient(135deg, var(--accent), var(--primary))' }}
              >
                {submitting ? (
                  <>
                    <RefreshCw className="animate-spin" size={14} /> Grading Exam...
                  </>
                ) : (
                  'Submit Finished Exam'
                )}
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="btn-nav"
              >
                Next <ChevronRight size={16} />
              </button>
            )}
          </footer>
        </main>
      </div>

      {/* Violation Alert Modal Overlay */}
      {showViolationModal && (
        <div className="proctor-modal-overlay">
          <div className="proctor-modal-card">
            <div className="proctor-modal-header">
              <ShieldAlert size={36} style={{ color: '#ef4444' }} />
              <h2>SECURITY VIOLATION DETECTED</h2>
            </div>
            <p className="proctor-modal-body">
              A violation occurred: <strong>"{lastViolationReason}"</strong>.
            </p>
            <p className="proctor-modal-body" style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
              Your browser has lost focus, or you have exited fullscreen mode. Your camera stream is still being monitored. 
            </p>
            <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '6px', fontSize: '13.5px', color: '#f87171', fontWeight: '700' }}>
              Warning: You have committed {violations} / 3 violations. Exceeding 3 violations will immediately auto-submit your exam with a failing grade.
            </div>
            <button onClick={handleAcknowledgeViolation} className="btn-acknowledge">
              I Understand, Re-Lock Session
            </button>
          </div>
        </div>
      )}

      {globalStyles}
    </div>
  );
}

// Full page styled variables targeting secure exam board
const globalStyles = (
  <style>{`
    .quiz-page-container {
      min-height: 100vh;
      background-color: var(--bg-deep);
      color: var(--text-primary);
      font-family: system-ui, -apple-system, sans-serif;
    }
    .flex-center {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .text-center {
      text-align: center;
    }
    .animate-spin {
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    /* Start rules box */
    .proctor-badge {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.05em;
      background-color: rgba(0, 242, 254, 0.12);
      border: 1px solid rgba(0, 242, 254, 0.25);
      color: var(--accent);
      padding: 4px 8px;
      border-radius: 4px;
      text-transform: uppercase;
    }
    .rules-box {
      background-color: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border-trans);
      border-radius: 10px;
      padding: 24px;
      margin-bottom: 24px;
    }
    [data-theme='light'] .rules-box {
      background-color: rgba(0, 0, 0, 0.03);
    }
    .rules-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding-left: 18px;
      margin: 0;
      color: var(--text-secondary);
      font-size: 13.5px;
      line-height: 1.6;
    }
    .rules-list li strong {
      color: var(--text-primary);
    }
    .proctor-error-banner {
      background-color: rgba(239, 68, 68, 0.08);
      border: 1px solid rgba(239, 68, 68, 0.18);
      padding: 10px 14px;
      border-radius: 6px;
      color: #f87171;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      margin-bottom: 15px;
    }

    /* Securing main board UI */
    .proctor-quiz-layout {
      min-height: 100vh;
      background-color: var(--bg-deep);
      color: var(--text-primary);
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      flex-direction: column;
      user-select: none;
      -webkit-user-select: none;
    }

    .proctor-header {
      height: 52px;
      background-color: var(--bg-surface);
      border-bottom: 1px solid var(--border-trans);
      padding: 0 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }
    .live-pulse {
      animation: pulse-glow 1.5s infinite alternate;
    }
    @keyframes pulse-glow {
      from { opacity: 0.5; filter: drop-shadow(0 0 1px #ef4444); }
      to { opacity: 1; filter: drop-shadow(0 0 6px #ef4444); }
    }
    .live-glow-text {
      color: #ef4444;
      text-shadow: 0 0 8px rgba(239, 68, 68, 0.3);
      letter-spacing: 0.02em;
    }
    .security-counter {
      font-size: 11.5px;
      font-weight: 700;
      color: var(--text-secondary);
      background-color: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.05);
      padding: 4px 10px;
      border-radius: 4px;
      gap: 6px;
    }
    .violation-warn {
      background-color: rgba(239, 68, 68, 0.12) !important;
      border-color: rgba(239, 68, 68, 0.25) !important;
      animation: alert-flash 1s infinite alternate;
    }
    @keyframes alert-flash {
      from { box-shadow: 0 0 2px rgba(239, 68, 68, 0); }
      to { box-shadow: 0 0 8px rgba(239, 68, 68, 0.25); }
    }

    /* Main Grid Split */
    .proctor-main-grid {
      flex: 1;
      display: grid;
      grid-template-columns: 290px 1fr;
      overflow: hidden;
    }

    .proctor-sidebar {
      background-color: #070b14;
      border-right: 1px solid rgba(255, 255, 255, 0.05);
      display: flex;
      flex-direction: column;
      padding: 16px;
      gap: 16px;
      overflow-y: auto;
    }

    /* Webcam Box */
    .webcam-container {
      position: relative;
      aspect-ratio: 4/3;
      background-color: #03050a;
      border: 1.5px solid rgba(0, 242, 254, 0.25);
      box-shadow: 0 0 12px rgba(0, 242, 254, 0.1);
      border-radius: 8px;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .webcam-video {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transform: scaleX(-1); /* Mirror camera stream */
    }
    .webcam-fallback {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      color: var(--text-muted);
    }
    .webcam-badge {
      position: absolute;
      top: 10px;
      left: 10px;
      background-color: rgba(0, 0, 0, 0.7);
      border: 1px solid rgba(0, 242, 254, 0.4);
      border-radius: 4px;
      padding: 3px 6px;
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 9px;
      font-weight: 800;
      color: var(--accent);
      z-index: 10;
    }
    .live-dot {
      width: 6px;
      height: 6px;
      background-color: #4ade80;
      border-radius: 50%;
      box-shadow: 0 0 6px #4ade80;
      animation: pulse 1s infinite alternate;
    }
    @keyframes pulse {
      from { opacity: 0.4; }
      to { opacity: 1; }
    }

    /* Proctor Logs Terminal */
    .logs-container {
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 6px;
      background-color: #04060b;
      height: 130px;
    }
    .logs-header {
      font-size: 11px;
      font-weight: 700;
      background-color: rgba(255, 255, 255, 0.02);
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      padding: 6px 10px;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }
    .logs-terminal {
      flex: 1;
      padding: 8px;
      font-family: monospace;
      font-size: 10.5px;
      line-height: 1.4;
      overflow-y: auto;
      color: #9ca3af;
      display: flex;
      flex-direction: column-reverse;
      gap: 4px;
    }
    .log-line {
      word-break: break-all;
    }

    .grid-header {
      font-size: 11px;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      margin-top: 4px;
      margin-bottom: -4px;
    }

    /* Questions grid in proctor */
    .proctor-questions-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 6px;
      flex-shrink: 0;
    }
    .grid-number-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 38px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;
      background-color: var(--bg-input);
      border: 1px solid var(--border-trans);
      color: var(--text-secondary);
    }
    .grid-number-btn:hover {
      background-color: rgba(255, 255, 255, 0.08);
      border-color: var(--border-glow);
      color: var(--text-primary);
    }
    .grid-number-btn.btn-answered {
      background-color: var(--accent-glow);
      border-color: var(--accent);
      color: var(--accent);
      box-shadow: 0 0 8px var(--accent-glow);
    }
    .grid-number-btn.btn-answered:hover {
      background-color: rgba(0, 242, 254, 0.15);
      border-color: var(--accent);
    }
    .grid-number-btn.btn-active {
      background-color: var(--accent);
      border-color: var(--accent);
      color: #000000 !important;
      box-shadow: 0 0 12px var(--accent);
    }
    .grid-number-btn.btn-active:hover {
      background-color: var(--accent);
      color: #000000 !important;
    }

    .proctor-progress-box {
      margin-top: auto;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      padding-top: 12px;
    }

    /* Right main quiz board */
    .proctor-quiz-board {
      display: flex;
      flex-direction: column;
      padding: 36px 40px;
      overflow-y: auto;
      background-color: var(--bg-deep);
    }
    .proctor-course-title-row {
      margin-bottom: 24px;
    }
    .board-course-title {
      font-size: 20px;
      font-weight: 800;
      color: var(--text-primary);
      margin-top: 4px;
    }

    /* Proctor question card */
    .proctor-question-card {
      background: var(--bg-card);
      border: 1px solid var(--border-trans);
      border-radius: 12px;
      padding: 30px;
      margin-bottom: 30px;
      flex: 1;
      box-shadow: var(--shadow-lg);
    }
    .proctor-question-text {
      font-size: 17.5px;
      font-weight: 600;
      color: var(--text-primary);
      line-height: 1.55;
      margin-bottom: 24px;
    }

    /* Proctor footer bar */
    /* Option selections style */
    .options-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 20px;
    }
    .option-item {
      display: flex;
      align-items: center;
      gap: 16px;
      background-color: var(--bg-input);
      border: 1px solid var(--border-trans);
      padding: 16px 20px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      text-align: left;
    }
    .option-item:hover {
      background-color: rgba(255, 255, 255, 0.04);
      border-color: var(--border-glow);
    }
    [data-theme='light'] .option-item:hover {
      background-color: rgba(0, 0, 0, 0.02);
    }
    .option-selected {
      border-color: var(--accent) !important;
      background-color: var(--accent-glow) !important;
      box-shadow: 0 0 10px var(--accent-glow);
    }
    .option-check {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background-color: var(--bg-deep);
      border: 1.5px solid var(--border-trans);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 800;
      color: var(--text-secondary);
      flex-shrink: 0;
      transition: all 0.2s ease;
    }
    .check-selected {
      background-color: var(--accent) !important;
      border-color: var(--accent) !important;
      color: #000 !important;
      box-shadow: 0 0 8px var(--accent);
    }
    .option-label {
      font-size: 14.5px;
      color: var(--text-secondary);
      line-height: 1.45;
      font-weight: 500;
    }
    .option-selected .option-label {
      color: var(--text-primary);
    }

    .proctor-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 10px;
      flex-shrink: 0;
    }
    .btn-nav {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 10px 20px;
      border-radius: 6px;
      font-size: 13.5px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;
      background-color: var(--bg-surface);
      border: 1px solid var(--border-trans);
      color: var(--text-secondary);
    }
    .btn-nav:hover:not(:disabled) {
      background-color: var(--bg-input);
      border-color: var(--border-glow);
      color: var(--text-primary);
      transform: translateY(-1px);
    }
    .btn-nav:active:not(:disabled) {
      transform: translateY(0);
    }
    .btn-nav:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }
    .btn-submit-exam {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px 28px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      border: none;
      color: #000000 !important;
      transition: all 0.2s ease;
    }
    .btn-submit-exam:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 0 15px var(--accent-glow);
      opacity: 0.95;
    }
    .btn-submit-exam:active:not(:disabled) {
      transform: translateY(0);
    }
    .btn-submit-exam:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    /* Violation Modal Overlay */
    .proctor-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(5, 7, 13, 0.9);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    }
    .proctor-modal-card {
      width: 90%;
      max-width: 480px;
      background: var(--bg-card);
      border: 2px solid #ef4444;
      border-radius: 12px;
      padding: 30px;
      box-shadow: 0 0 30px rgba(239, 68, 68, 0.25);
      display: flex;
      flex-direction: column;
      gap: 16px;
      animation: modalShake 0.4s ease;
    }
    @keyframes modalShake {
      0%, 100% { transform: translateX(0); }
      20%, 60% { transform: translateX(-6px); }
      40%, 80% { transform: translateX(6px); }
    }
    .proctor-modal-header {
      display: flex;
      align-items: center;
      gap: 12px;
      border-bottom: 1px solid rgba(255, 74, 74, 0.15);
      padding-bottom: 12px;
    }
    .proctor-modal-header h2 {
      font-size: 18px;
      font-weight: 800;
      color: #ef4444;
      letter-spacing: 0.05em;
      margin: 0;
    }
    .proctor-modal-body {
      font-size: 14.5px;
      line-height: 1.5;
      color: var(--text-primary);
    }
    .btn-acknowledge {
      background-color: #ef4444;
      border: none;
      color: #fff;
      font-weight: 700;
      padding: 12px 20px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13.5px;
      margin-top: 10px;
      transition: background-color 0.2s ease;
    }
    .btn-acknowledge:hover {
      background-color: #dc2626;
    }

    .violation-flag {
      background-color: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      padding: 10px;
      border-radius: 6px;
      color: #f87171;
      font-weight: 700;
      font-size: 13px;
      margin-bottom: 20px;
      text-transform: uppercase;
    }

    /* Rules Card Layout */
    .rules-card {
      padding: 36px;
      margin: 20px;
      width: 100%;
      border: 1px solid var(--border-trans);
    }

    .rules-action-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 30px;
    }

    /* Responsive Media Queries */
    @media (max-width: 1024px) {
      .proctor-main-grid {
        grid-template-columns: 1fr;
        overflow-y: auto;
      }
      .proctor-sidebar {
        border-right: none;
        border-bottom: 1px solid var(--border-trans);
        overflow-y: visible;
        max-height: none;
      }
      .proctor-quiz-board {
        padding: 24px 20px;
      }
    }

    @media (max-width: 768px) {
      .proctor-header {
        height: auto;
        padding: 12px 16px;
        flex-direction: column;
        gap: 12px;
        align-items: flex-start;
      }
      .proctor-header > div {
        width: 100%;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 8px !important;
      }
      .proctor-questions-grid {
        grid-template-columns: repeat(6, 1fr);
      }
      .rules-action-row {
        flex-direction: column-reverse;
        gap: 12px;
        align-items: stretch !important;
      }
      .rules-action-row > a,
      .rules-action-row > button {
        width: 100%;
        text-align: center;
        justify-content: center;
      }
    }

    @media (max-width: 480px) {
      .rules-card {
        padding: 24px 16px !important;
        margin: 16px;
        width: calc(100% - 32px);
      }
      .rules-box {
        padding: 16px;
      }
      .proctor-questions-grid {
        grid-template-columns: repeat(4, 1fr);
      }
    }
  `}</style>
);
