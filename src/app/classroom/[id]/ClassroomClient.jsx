'use client';

import { useState, useEffect, useRef } from 'react';
import { PlayCircle, CheckSquare, Square, ChevronRight, MessageSquare, Download, Info, CheckCircle2, Award, CornerDownRight, Trash2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import styles from './Classroom.module.css';

export default function ClassroomClient({ course, initialProgress, currentUser, enrollment }) {
  const [activeLecture, setActiveLecture] = useState(null);
  const [completedLectures, setCompletedLectures] = useState(initialProgress);
  const [activeTab, setActiveTab] = useState('about');
  
  // Discussion state
  const [discussions, setDiscussions] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [ytApiReady, setYtApiReady] = useState(typeof window !== 'undefined' && !!window.YT && !!window.YT.Player);

  const ytPlayerRef = useRef(null);
  const youtubeContainerRef = useRef(null);

  const isStaff = currentUser?.role === 'ADMIN' || currentUser?.role === 'INSTRUCTOR';
  const canToggleProgress = isStaff || currentUser?.role === 'TESTER';
  const isActiveLectureCompleted = activeLecture && completedLectures.includes(activeLecture.id);

  const getYouTubeId = (url) => {
    if (!url) return null;
    
    const patterns = [
      /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([^#\&\?]{11})/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([^#\&\?]{11})/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/v\/([^#\&\?]{11})/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([^#\&\?]{11})/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([^#\&\?]{11})/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/video\/([^#\&\?]{11})/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/.*[?&]v=([^#\&\?]{11})/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    // Fallback legacy regex
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    if (match && match[2] && match[2].length === 11) {
      return match[2];
    }
    
    return null;
  };

  const isYouTubeUrl = (url) => {
    if (!url) return false;
    const lowerUrl = url.toLowerCase();
    return lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be') || lowerUrl.includes('youtube-nocookie.com');
  };

  // Load YouTube script once
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const scriptId = 'youtube-iframe-api-script';
      let scriptTag = document.getElementById(scriptId);
      if (!scriptTag) {
        scriptTag = document.createElement('script');
        scriptTag.id = scriptId;
        scriptTag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(scriptTag, firstScriptTag);
      }
    }
  }, []);

  // Poll for YT API readiness
  useEffect(() => {
    if (ytApiReady) return;

    const checkYT = setInterval(() => {
      if (window.YT && window.YT.Player) {
        setYtApiReady(true);
        clearInterval(checkYT);
      }
    }, 200);

    const originalCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      setYtApiReady(true);
      if (originalCallback) originalCallback();
    };

    return () => {
      clearInterval(checkYT);
    };
  }, [ytApiReady]);

  // Initialize and manage YouTube Player
  useEffect(() => {
    if (!activeLecture || !isYouTubeUrl(activeLecture.videoUrl)) {
      return;
    }

    if (!ytApiReady) return;

    const videoId = getYouTubeId(activeLecture.videoUrl);
    if (!videoId) return;

    const container = youtubeContainerRef.current;
    if (!container) return;

    container.innerHTML = '';
    const placeholder = document.createElement('div');
    container.appendChild(placeholder);

    let player = null;

    try {
      player = new window.YT.Player(placeholder, {
        width: '100%',
        height: '100%',
        videoId: videoId,
        playerVars: {
          autoplay: 1,
          controls: 1,
          rel: 0,
          modestbranding: 1,
        },
        events: {
          onStateChange: (event) => {
            // 1 is the numerical constant for YT.PlayerState.PLAYING
            if (event.data === 1) {
              setIsPlaying(true);
            } else {
              setIsPlaying(false);
            }
          },
        },
      });
      ytPlayerRef.current = player;
    } catch (error) {
      console.error('Failed to create YouTube player:', error);
    }

    return () => {
      if (player && typeof player.destroy === 'function') {
        try {
          player.destroy();
        } catch (err) {
          console.error('Error destroying YT player:', err);
        }
      }
      ytPlayerRef.current = null;
      setIsPlaying(false);
    };
  }, [activeLecture, ytApiReady]);

  // Reset playing state when lecture changes
  useEffect(() => {
    setIsPlaying(false);
  }, [activeLecture]);

  // Progress tracker heartbeat
  useEffect(() => {
    if (!activeLecture || isStaff || isActiveLectureCompleted || !isPlaying) {
      return;
    }

    const intervalDuration = 15000; // 15 seconds
    const incrementAmount = 15;

    const intervalId = setInterval(async () => {
      try {
        const res = await fetch('/api/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lectureId: activeLecture.id,
            watchTimeIncrement: incrementAmount,
          }),
        });
        const data = await res.json();
        if (res.ok && data.success && data.progress?.completed) {
          setCompletedLectures((prev) => {
            if (!prev.includes(activeLecture.id)) {
              return [...prev, activeLecture.id];
            }
            return prev;
          });
        }
      } catch (err) {
        console.error('Error reporting video progress:', err);
      }
    }, intervalDuration);

    return () => {
      clearInterval(intervalId);
    };
  }, [activeLecture, isPlaying, isActiveLectureCompleted, isStaff]);
  const [newQuestion, setNewQuestion] = useState('');
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [activeReplyToId, setActiveReplyToId] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [submittingReplyId, setSubmittingReplyId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [expandedSections, setExpandedSections] = useState({});

  // Auto-expand the section containing the active lecture
  useEffect(() => {
    if (activeLecture) {
      const sectionContainingActive = course.sections?.find(sec => 
        sec.lectures?.some(lec => lec.id === activeLecture.id)
      );
      if (sectionContainingActive) {
        setExpandedSections(prev => ({
          ...prev,
          [sectionContainingActive.id]: true
        }));
      }
    }
  }, [activeLecture, course.sections]);

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const getSectionDuration = (lectures) => {
    const totalSecs = lectures.reduce((acc, lec) => acc + lec.duration, 0);
    const mins = Math.floor(totalSecs / 60);
    return `${mins}m`;
  };

  // Fetch questions when activeLecture changes
  useEffect(() => {
    if (!activeLecture) return;

    const fetchQuestions = async () => {
      setLoadingQuestions(true);
      try {
        const res = await fetch(`/api/questions?lectureId=${activeLecture.id}`);
        const data = await res.json();
        if (res.ok && data.success) {
          setDiscussions(data.questions);
        }
      } catch (err) {
        console.error('Error fetching questions:', err);
      } finally {
        setLoadingQuestions(false);
      }
    };

    fetchQuestions();
  }, [activeLecture]);


  // Set first lecture of first section as active by default
  // Set first lecture or query param lecture as active
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const lectureId = params.get('lectureId');
      if (lectureId) {
        let foundLecture = null;
        for (const sec of course.sections || []) {
          const lec = sec.lectures?.find((l) => l.id === lectureId);
          if (lec) {
            foundLecture = lec;
            break;
          }
        }
        if (foundLecture) {
          setActiveLecture(foundLecture);
          return;
        }
      }
    }

    if (course.sections?.length > 0 && course.sections[0].lectures?.length > 0) {
      setActiveLecture(course.sections[0].lectures[0]);
    }
  }, [course]);

  const handleLectureSelect = (lecture) => {
    setActiveLecture(lecture);
  };

  const handleToggleComplete = async (lectureId, e) => {
    // Prevent lecture click trigger if checkbox is clicked directly
    e.stopPropagation();
    
    if (!canToggleProgress) {
      return; // Block standard students from toggling manually
    }
    
    const isCompleted = completedLectures.includes(lectureId);
    const updated = isCompleted 
      ? completedLectures.filter(id => id !== lectureId)
      : [...completedLectures, lectureId];
      
    setCompletedLectures(updated);

    try {
      await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lectureId, completed: !isCompleted }),
      });
    } catch (error) {
      console.error('Failed to save progress:', error);
    }
  };

  const handlePostQuestion = async (e) => {
    e.preventDefault();
    if (!newQuestion.trim() || !activeLecture) return;

    const questionContent = newQuestion.trim();
    setNewQuestion(''); // Snippy UI: clear input immediately

    try {
      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: questionContent,
          lectureId: activeLecture.id,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setDiscussions((prev) => [...prev, data.question]);
      } else {
        alert(data.error || 'Failed to post question. Please try again.');
        setNewQuestion(questionContent); // Restore on error
      }
    } catch (error) {
      console.error('Error posting question:', error);
      alert('An unexpected error occurred. Please try again.');
      setNewQuestion(questionContent); // Restore on error
    }
  };

  const handlePostReply = async (parentQuestionId, e) => {
    e.preventDefault();
    if (!replyContent.trim() || !activeLecture) return;

    const content = replyContent.trim();
    setReplyContent('');
    setActiveReplyToId(null);
    setSubmittingReplyId(parentQuestionId);

    try {
      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          lectureId: activeLecture.id,
          parentId: parentQuestionId,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setDiscussions((prev) => [...prev, data.question]);
      } else {
        alert(data.error || 'Failed to post reply. Please try again.');
        setReplyContent(content); // Restore content on error
        setActiveReplyToId(parentQuestionId); // Keep form open on error
      }
    } catch (error) {
      console.error('Error posting reply:', error);
      alert('An unexpected error occurred. Please try again.');
      setReplyContent(content);
      setActiveReplyToId(parentQuestionId);
    } finally {
      setSubmittingReplyId(null);
    }
  };

  const handleDeleteDiscussion = (questionId, content) => {
    setDeleteTarget({ id: questionId, content });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const questionId = deleteTarget.id;
    setDeleteTarget(null);

    try {
      const res = await fetch(`/api/admin/questions?id=${questionId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDiscussions((prev) => prev.filter((q) => q.id !== questionId));
      } else {
        alert(data.error || 'Failed to delete question/reply.');
      }
    } catch (error) {
      console.error('Error deleting question:', error);
      alert('An unexpected error occurred.');
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Calculate percent completed
  const totalLecturesCount = course.sections.reduce((acc, sec) => acc + sec.lectures.length, 0);
  const percentCompleted = totalLecturesCount > 0 
    ? Math.round((completedLectures.length / totalLecturesCount) * 100) 
    : 0;

  // Threading helpers
  const rootQuestions = discussions.filter(q => !q.parentId);
  const getRepliesForQuestion = (parentId) => discussions.filter(q => q.parentId === parentId);

  return (
    <div className={styles.pageLayout}>
      {/* Left Column: Player & Details */}
      <div className={styles.mainContent}>
        {activeLecture ? (
          <>
            {/* Player Wrapper */}
            <div className={styles.playerWrapper}>
              {activeLecture.videoUrl && isYouTubeUrl(activeLecture.videoUrl) ? (
                <div 
                  ref={youtubeContainerRef} 
                  className={styles.videoElement} 
                  style={{ width: '100%', height: '100%', minHeight: '360px', overflow: 'hidden', backgroundColor: '#000' }}
                />
              ) : (
                <video 
                  src={activeLecture.videoUrl} 
                  controls 
                  className={styles.videoElement}
                  poster={course.thumbnail}
                  key={activeLecture.id} // Re-mounts player on lecture change
                  autoPlay
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => setIsPlaying(false)}
                />
              )}
            </div>
            
            <h1 style={{ fontSize: '24px', fontWeight: '800', marginTop: '16px' }}>{activeLecture.title}</h1>
          </>
        ) : (
          <div className={styles.playerWrapper} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            Select a lecture from the curriculum sidebar to begin learning.
          </div>
        )}

        {/* Tabs Block */}
        <div className={styles.tabsContainer}>
          <div className={styles.tabsHeader}>
            <button 
              onClick={() => setActiveTab('about')}
              className={`${styles.tabBtn} ${activeTab === 'about' ? styles.activeTabBtn : ''}`}
            >
              <Info size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
              About Course
            </button>
            <button 
              onClick={() => setActiveTab('discussion')}
              className={`${styles.tabBtn} ${activeTab === 'discussion' ? styles.activeTabBtn : ''}`}
            >
              <MessageSquare size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
              Q&A Discussion
            </button>
            <button 
              onClick={() => setActiveTab('resources')}
              className={`${styles.tabBtn} ${activeTab === 'resources' ? styles.activeTabBtn : ''}`}
            >
              <Download size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
              Resources
            </button>
          </div>

          <div className={styles.tabContent}>
            {activeTab === 'about' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '700' }}>{course.title}</h3>
                <p style={{ color: 'var(--text-secondary)' }}>{course.subtitle}</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.6' }}>{course.description}</p>
              </div>
            )}

            {activeTab === 'discussion' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Ask Form */}
                <form onSubmit={handlePostQuestion} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <textarea 
                    placeholder="Ask a question about this lecture..." 
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    className="form-input"
                    style={{ minHeight: '80px', resize: 'vertical' }}
                    required
                  />
                  <button type="submit" className="btn-primary" style={{ alignSelf: 'flex-end', padding: '8px 16px', fontSize: '13px' }}>
                    Post Question
                  </button>
                </form>

                {/* Discussions List */}
                <div>
                  {loadingQuestions ? (
                    <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '10px 0' }}>Loading questions...</div>
                  ) : rootQuestions.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>
                      No questions asked yet for this lecture. Be the first to ask!
                    </div>
                  ) : (
                    rootQuestions.map((post) => {
                      const userRole = post.student?.role;
                      const replies = getRepliesForQuestion(post.id);
                      const isReplying = activeReplyToId === post.id;

                      return (
                        <div key={post.id} className={styles.discussionPost}>
                          {/* Parent Question Card */}
                          <div>
                            <div className={styles.postHeader}>
                              <span className={styles.postUser}>
                                {post.student?.name || 'Unknown Student'}
                                {userRole && userRole !== 'STUDENT' && (
                                  <span className={`${styles.roleBadge} ${
                                    userRole === 'ADMIN' ? styles.roleAdmin : styles.roleInstructor
                                  }`}>
                                    {userRole}
                                  </span>
                                )}
                              </span>
                              <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                            </div>
                            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{post.content}</p>
                            
                            {/* Actions bar (Reply & Delete) */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                              <button 
                                onClick={() => {
                                  setActiveReplyToId(isReplying ? null : post.id);
                                  setReplyContent('');
                                }}
                                className={styles.replyActionBtn}
                                style={{ marginTop: 0 }}
                              >
                                <MessageSquare size={14} /> Reply
                              </button>
                              {currentUser?.role === 'ADMIN' && (
                                <button 
                                  onClick={() => handleDeleteDiscussion(post.id, post.content)}
                                  className={styles.deleteActionBtn}
                                  title="Delete Question"
                                >
                                  <Trash2 size={14} /> Delete
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Replies List */}
                          {replies.length > 0 && (
                            <div className={styles.repliesContainer}>
                              {replies.map((reply) => {
                                const replyUserRole = reply.student?.role;
                                return (
                                  <div key={reply.id} className={styles.replyPost}>
                                    <div className={styles.postHeader}>
                                      <span className={styles.postUser}>
                                        <CornerDownRight size={14} style={{ marginRight: '6px', color: 'var(--text-muted)' }} />
                                        {reply.student?.name || 'Unknown User'}
                                        {replyUserRole && replyUserRole !== 'STUDENT' && (
                                          <span className={`${styles.roleBadge} ${
                                            replyUserRole === 'ADMIN' ? styles.roleAdmin : styles.roleInstructor
                                          }`}>
                                            {replyUserRole}
                                          </span>
                                        )}
                                      </span>
                                      <span>{new Date(reply.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', paddingLeft: '20px' }}>
                                      {reply.content}
                                    </p>
                                    {currentUser?.role === 'ADMIN' && (
                                      <div style={{ paddingLeft: '20px', marginTop: '6px' }}>
                                        <button 
                                          onClick={() => handleDeleteDiscussion(reply.id, reply.content)}
                                          className={styles.deleteActionBtn}
                                          title="Delete Reply"
                                        >
                                          <Trash2 size={12} /> Delete
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Reply Form */}
                          {isReplying && (
                            <form onSubmit={(e) => handlePostReply(post.id, e)} className={styles.replyForm} style={{ marginLeft: replies.length > 0 ? '20px' : '0' }}>
                              <textarea
                                placeholder="Write your reply..."
                                value={replyContent}
                                onChange={(e) => setReplyContent(e.target.value)}
                                className={styles.replyTextarea}
                                required
                              />
                              <div className={styles.replyFormActions}>
                                <button 
                                  type="button" 
                                  onClick={() => setActiveReplyToId(null)} 
                                  className="btn-secondary"
                                  style={{ padding: '6px 12px', fontSize: '12px' }}
                                >
                                  Cancel
                                </button>
                                <button 
                                  type="submit" 
                                  disabled={submittingReplyId === post.id}
                                  className="btn-primary" 
                                  style={{ padding: '6px 12px', fontSize: '12px' }}
                                >
                                  {submittingReplyId === post.id ? 'Replying...' : 'Post Reply'}
                                </button>
                              </div>
                            </form>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {activeTab === 'resources' && (
              <div className="glass-card" style={{ padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: '700' }}>Lecture Resources Kit (PDF)</h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>Downloadable slides, business plan drafts, and study materials.</p>
                </div>
                <a 
                  href="#" 
                  onClick={(e) => { e.preventDefault(); alert('Resource downloading simulated!'); }}
                  className="btn-primary" 
                  style={{ padding: '8px 16px', fontSize: '13px' }}
                >
                  <Download size={14} /> Download
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Column: Outline Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <div className={styles.sidebarTitle}>Course Curriculum</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '12px' }}>
            <div style={{ flex: 1, height: '6px', backgroundColor: 'var(--border-trans)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: `${percentCompleted}%`, height: '100%', background: 'linear-gradient(90deg, var(--primary), var(--accent))' }} />
            </div>
            <span style={{ fontSize: '12px', fontWeight: '700' }}>{percentCompleted}%</span>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
            {completedLectures.length} of {totalLecturesCount} completed
          </span>
          
          {percentCompleted >= 90 && (
            <div className="glass-card" style={{ 
              padding: '14px', 
              marginTop: '16px', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '10px', 
              borderColor: enrollment?.quizPassed || isStaff ? 'var(--accent)' : '#fbbf24', 
              background: enrollment?.quizPassed || isStaff ? 'hsla(180, 100%, 48%, 0.02)' : 'rgba(251, 191, 36, 0.02)',
              textAlign: 'left'
            }}>
              {enrollment?.quizPassed || isStaff ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Award size={18} style={{ color: 'var(--accent)' }} />
                    <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>Certificate Unlocked!</span>
                  </div>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                    Congratulations! You have completed the course and passed the final exam{enrollment?.quizScore !== null && enrollment?.quizScore !== undefined && ` (Score: ${enrollment.quizScore}%)`}. Click below to claim your certificate.
                  </p>
                  <Link 
                    href={`/classroom/${course.id}/certificate`} 
                    target="_blank" 
                    className="btn-primary" 
                    style={{ 
                      padding: '8px 12px', 
                      fontSize: '12px', 
                      textAlign: 'center', 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      gap: '6px',
                      background: 'linear-gradient(135deg, var(--accent), var(--primary))'
                    }}
                  >
                    <Award size={14} /> Download Certificate
                  </Link>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Award size={18} style={{ color: '#fbbf24' }} />
                    <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>Final Exam Required</span>
                  </div>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                    You have completed {percentCompleted}% of the lectures! You must now pass a 25-question final exam with a score of 70% or higher to unlock your certificate.
                    {enrollment?.quizAttempts > 0 && ` (Last Score: ${enrollment.quizScore}%, Attempts: ${enrollment.quizAttempts})`}
                  </p>
                  <Link 
                    href={`/classroom/${course.id}/quiz`} 
                    className="btn-primary" 
                    style={{ 
                      padding: '8px 12px', 
                      fontSize: '12px', 
                      textAlign: 'center', 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      gap: '6px',
                      background: 'linear-gradient(135deg, #fbbf24, #d97706)',
                      color: '#000',
                      fontWeight: '700'
                    }}
                  >
                    <Award size={14} /> Take Final Exam
                  </Link>
                </>
              )}
            </div>
          )}
        </div>

        <div className={styles.outlineAccordion}>
          {course.sections.map((sec) => {
            const isExpanded = !!expandedSections[sec.id];
            const sectionLectures = sec.lectures || [];
            const durationText = getSectionDuration(sectionLectures);
            
            return (
              <div key={sec.id} className={styles.sectionBlock}>
                {/* Accordion Toggle Header */}
                <div 
                  onClick={() => toggleSection(sec.id)}
                  className={styles.sectionHeader}
                >
                  <div className={styles.sectionTitleBlock}>
                    <div className={styles.sectionTitle}>{sec.title}</div>
                    <div className={styles.sectionMeta}>
                      {sectionLectures.length} lessons • {durationText}
                    </div>
                  </div>
                  <div className={styles.sectionRight}>
                    <ChevronRight 
                      size={18} 
                      className={`${styles.chevronIcon} ${isExpanded ? styles.chevronExpanded : ''}`} 
                    />
                  </div>
                </div>

                {/* Collapsible Lectures List */}
                <div className={`${styles.lecturesList} ${isExpanded ? styles.lecturesListExpanded : ''}`}>
                  {sectionLectures.map((lec) => {
                    const isActive = activeLecture?.id === lec.id;
                    const isCompleted = completedLectures.includes(lec.id);
                    const isYouTube = isYouTubeUrl(lec.videoUrl);

                    return (
                      <div 
                        key={lec.id} 
                        onClick={() => handleLectureSelect(lec)}
                        className={`${styles.lectureRow} ${isActive ? styles.lectureActive : ''}`}
                      >
                        {/* Checkbox wrapper */}
                        <div 
                          onClick={(e) => canToggleProgress && handleToggleComplete(lec.id, e)} 
                          style={{ cursor: canToggleProgress ? 'pointer' : 'default', display: 'flex', alignItems: 'center', zIndex: 10 }}
                        >
                          {isCompleted ? (
                            <CheckSquare size={18} style={{ color: 'var(--accent)' }} />
                          ) : (
                            <Square size={18} style={{ color: 'var(--text-muted)' }} />
                          )}
                        </div>

                        <div className={styles.lectureDetails}>
                          <span className={styles.lectureTitleText} style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                            {lec.title}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                            <span className={styles.lectureMeta}>
                              {formatDuration(lec.duration)}
                            </span>
                            {isYouTube && (
                              <span style={{ fontSize: '9px', fontWeight: '800', backgroundColor: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', padding: '1px 4px', borderRadius: '3px', textTransform: 'uppercase' }}>
                                YouTube
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* Custom Confirm Delete Modal */}
      {deleteTarget && (
        <div className={styles.modalOverlay} onClick={() => setDeleteTarget(null)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalIconWrapper}>
                <AlertTriangle size={20} />
              </div>
              <h3 className={styles.modalTitle}>Confirm Deletion</h3>
            </div>
            <div className={styles.modalBody}>
              Are you sure you want to delete this question or reply? This action cannot be undone.
              <span className={styles.modalSnippet}>
                "{deleteTarget.content.length > 80 ? deleteTarget.content.substring(0, 80) + '...' : deleteTarget.content}"
              </span>
            </div>
            <div className={styles.modalActions}>
              <button 
                onClick={() => setDeleteTarget(null)} 
                className="btn-secondary"
                style={{ padding: '10px 16px', fontSize: '13px' }}
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteConfirm}
                className="btn-primary" 
                style={{ padding: '10px 16px', fontSize: '13px', background: 'linear-gradient(135deg, #ef4444, #b91c1c)', borderColor: '#ef4444' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
