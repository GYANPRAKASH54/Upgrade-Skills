'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp, PlayCircle, Lock, Video, ExternalLink } from 'lucide-react';
import styles from './CourseDetail.module.css';

export default function CurriculumAccordion({ sections, isEnrolled, courseId }) {
  const router = useRouter();
  const [openSections, setOpenSections] = useState({ 0: true }); // Open first section by default

  const toggleSection = (index) => {
    setOpenSections((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleLectureClick = (lecture) => {
    if (!isEnrolled) return;

    router.push(`/classroom/${courseId}?lectureId=${lecture.id}`);
  };

  return (
    <div className={styles.accordion}>
      {sections.map((section, sIndex) => {
        const isOpen = !!openSections[sIndex];
        const totalDuration = section.lectures.reduce((acc, l) => acc + l.duration, 0);

        return (
          <div key={section.id} className={styles.accordionItem}>
            {/* Header */}
            <div 
              className={styles.accordionHeader} 
              onClick={() => toggleSection(sIndex)}
            >
              <div className={styles.accordionTitle}>
                {section.title}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', color: 'var(--text-muted)' }}>
                <span>{section.lectures.length} lectures • {formatDuration(totalDuration)}</span>
                {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </div>

            {/* Content Lectures */}
            {isOpen && (
              <div className={styles.accordionContent}>
                {section.lectures.map((lecture) => {
                  const isYouTube = lecture.videoUrl && (lecture.videoUrl.includes('youtube.com') || lecture.videoUrl.includes('youtu.be'));
                  return (
                    <div 
                      key={lecture.id} 
                      className={styles.lectureRow}
                      onClick={() => handleLectureClick(lecture)}
                      style={isEnrolled ? { cursor: 'pointer' } : {}}
                    >
                      <div className={styles.lectureTitle}>
                        <PlayCircle size={16} style={{ color: 'var(--primary)' }} />
                        <span>{lecture.title}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px' }}>
                        <span>{formatDuration(lecture.duration)}</span>
                        {isEnrolled ? (
                          isYouTube ? (
                            <ExternalLink size={14} style={{ color: 'var(--primary)' }} title="Open YouTube Video" />
                          ) : (
                            <Video size={14} style={{ color: 'var(--accent)' }} title="Watch Video" />
                          )
                        ) : (
                          <Lock size={14} style={{ color: 'var(--text-muted)' }} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
