'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Trash2, Save, ArrowLeft, AlertTriangle, Eye, Globe, Lock } from 'lucide-react';
import styles from '../../Instructor.module.css';

export default function CourseEditorClient({ course }) {
  const router = useRouter();

  // 1. Course Info Form State
  const [title, setTitle] = useState(course.title);
  const [subtitle, setSubtitle] = useState(course.subtitle || '');
  const [description, setDescription] = useState(course.description || '');
  const [price, setPrice] = useState(course.price.toString());
  const [thumbnail, setThumbnail] = useState(course.thumbnail || '');
  const [published, setPublished] = useState(course.published);
  const [infoLoading, setInfoLoading] = useState(false);

  // 2. Curriculum Builder State
  // Format initial sections list properly for editing
  const [sections, setSections] = useState(
    course.sections.map((sec) => ({
      id: sec.id,
      title: sec.title,
      lectures: sec.lectures.map((lec) => ({
        id: lec.id,
        title: lec.title,
        videoUrl: lec.videoUrl,
        duration: lec.duration.toString(),
      })),
    }))
  );
  const [currLoading, setCurrLoading] = useState(false);

  // --- Curriculum Action Handlers ---
  const handleAddSection = () => {
    setSections([
      ...sections,
      {
        id: 'new-sec-' + Date.now(),
        title: 'New Section',
        lectures: [],
      },
    ]);
  };

  const handleRemoveSection = (sectionIndex) => {
    setSections(sections.filter((_, idx) => idx !== sectionIndex));
  };

  const handleSectionTitleChange = (sectionIndex, newText) => {
    const updated = [...sections];
    updated[sectionIndex].title = newText;
    setSections(updated);
  };

  const handleAddLecture = (sectionIndex) => {
    const updated = [...sections];
    updated[sectionIndex].lectures.push({
      id: 'new-lec-' + Date.now(),
      title: 'New Lecture',
      videoUrl: 'https://res.cloudinary.com/demo/video/upload/q_auto/cld_sample_video.mp4',
      duration: '300', // Default 5 mins
    });
    setSections(updated);
  };

  const handleRemoveLecture = (sectionIndex, lectureIndex) => {
    const updated = [...sections];
    updated[sectionIndex].lectures = updated[sectionIndex].lectures.filter(
      (_, idx) => idx !== lectureIndex
    );
    setSections(updated);
  };

  const handleLectureChange = (sectionIndex, lectureIndex, field, value) => {
    const updated = [...sections];
    updated[sectionIndex].lectures[lectureIndex][field] = value;
    setSections(updated);
  };

  // --- Save API Calls ---
  const handleSaveCourseInfo = async (e) => {
    e.preventDefault();
    setInfoLoading(true);

    try {
      const res = await fetch(`/api/courses/${course.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          subtitle,
          description,
          price: parseFloat(price),
          thumbnail,
          published,
        }),
      });

      if (res.ok) {
        alert('Course details updated successfully!');
        router.refresh();
      } else {
        alert('Failed to update course details.');
      }
    } catch (err) {
      console.error(err);
      alert('Error saving course details.');
    } finally {
      setInfoLoading(false);
    }
  };

  const handleSaveCurriculum = async () => {
    setCurrLoading(true);

    try {
      const res = await fetch(`/api/courses/${course.id}/curriculum`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections }),
      });

      if (res.ok) {
        alert('Curriculum builders saved successfully!');
        router.refresh();
      } else {
        alert('Failed to save curriculum builder.');
      }
    } catch (err) {
      console.error(err);
      alert('Error saving curriculum builder.');
    } finally {
      setCurrLoading(false);
    }
  };

  return (
    <div className="container" style={{ paddingBottom: '100px' }}>
      {/* Top navbar */}
      <div className={styles.editorHeader}>
        <Link href="/instructor" className="btn-secondary" style={{ padding: '8px 12px' }}>
          <ArrowLeft size={16} /> Back
        </Link>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800' }}>Edit Course: {course.title}</h1>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>ID: {course.id}</span>
        </div>
      </div>

      <div className={styles.editorGrid}>
        {/* Left Side: Course Info Form */}
        <div className={styles.editorSection}>
          <h2 style={{ fontSize: '18px', fontWeight: '800', borderBottom: '1px solid var(--border-trans)', paddingBottom: '10px' }}>
            Course Information
          </h2>

          <form onSubmit={handleSaveCourseInfo} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label className={styles.label}>Title</label>
              <input 
                type="text" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                className="form-input" 
                required 
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label className={styles.label}>Subtitle</label>
              <input 
                type="text" 
                value={subtitle} 
                onChange={(e) => setSubtitle(e.target.value)} 
                className="form-input" 
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label className={styles.label}>Description</label>
              <textarea 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                className="form-input" 
                style={{ minHeight: '120px', resize: 'vertical' }}
              />
            </div>

            <div className={styles.priceStatusGrid}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label className={styles.label}>Price (INR)</label>
                <input 
                  type="number" 
                  value={price} 
                  onChange={(e) => setPrice(e.target.value)} 
                  className="form-input" 
                  required 
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label className={styles.label}>Status</label>
                <div className={styles.statusBtnWrapper}>
                  <button
                    type="button"
                    onClick={() => setPublished(!published)}
                    className={published ? 'btn-primary' : 'btn-secondary'}
                    style={{ padding: '10px', width: '100%', fontSize: '13px' }}
                  >
                    {published ? (
                      <>
                        <Globe size={14} style={{ display: 'inline', marginRight: '4px' }} /> Published
                      </>
                    ) : (
                      <>
                        <Lock size={14} style={{ display: 'inline', marginRight: '4px' }} /> Draft / Private
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label className={styles.label}>Course Cover Image</label>
              
              {/* Image Preview */}
              <div 
                className="glass-card" 
                style={{ 
                  width: '100%', 
                  aspectRatio: '16/9', 
                  borderRadius: 'var(--radius-sm)', 
                  overflow: 'hidden', 
                  position: 'relative',
                  border: '1px solid var(--border-trans)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(255,255,255,0.02)'
                }}
              >
                {thumbnail ? (
                  <img 
                    src={thumbnail} 
                    alt="Course Preview" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      const parent = e.target.parentElement;
                      let errorDiv = parent.querySelector('.preview-error');
                      if (!errorDiv) {
                        errorDiv = document.createElement('div');
                        errorDiv.className = 'preview-error';
                        errorDiv.innerHTML = '<span style="color: var(--text-muted); font-size: 13px;">⚠️ Invalid or Broken Image Link</span>';
                        parent.appendChild(errorDiv);
                      }
                    }}
                    onLoad={(e) => {
                      const parent = e.target.parentElement;
                      const errorDiv = parent.querySelector('.preview-error');
                      if (errorDiv) errorDiv.remove();
                      e.target.style.display = 'block';
                    }}
                  />
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: '13px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <span>No Image Selected</span>
                    <span style={{ fontSize: '11px', opacity: 0.7 }}>(Paste a link or upload a local file)</span>
                  </div>
                )}
              </div>

              {/* Upload & Paste Inputs */}
              <div className={styles.thumbnailInputs}>
                <input 
                  type="text" 
                  placeholder="Paste Image URL..."
                  value={thumbnail} 
                  onChange={(e) => setThumbnail(e.target.value)} 
                  className="form-input" 
                  style={{ flex: 1, width: '100%' }}
                />
                
                <label 
                  className="btn-secondary" 
                  style={{ 
                    padding: '12px 16px', 
                    fontSize: '13px', 
                    cursor: 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px',
                    margin: 0,
                    whiteSpace: 'nowrap'
                  }}
                >
                  <Plus size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> Upload File
                  <input 
                    type="file" 
                    accept="image/*" 
                    style={{ display: 'none' }} 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const img = new Image();
                          img.onload = () => {
                            const canvas = document.createElement('canvas');
                            const targetWidth = 800;
                            const targetHeight = 450;
                            
                            canvas.width = targetWidth;
                            canvas.height = targetHeight;
                            
                            const ctx = canvas.getContext('2d');
                            const imgAspect = img.width / img.height;
                            const targetAspect = targetWidth / targetHeight;
                            
                            let sourceX = 0;
                            let sourceY = 0;
                            let sourceWidth = img.width;
                            let sourceHeight = img.height;
                            
                            if (imgAspect > targetAspect) {
                              sourceWidth = img.height * targetAspect;
                              sourceX = (img.width - sourceWidth) / 2;
                            } else if (imgAspect < targetAspect) {
                              sourceHeight = img.width / targetAspect;
                              sourceY = (img.height - sourceHeight) / 2;
                            }
                            
                            ctx.drawImage(
                              img,
                              sourceX, sourceY, sourceWidth, sourceHeight,
                              0, 0, targetWidth, targetHeight
                            );
                            
                            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.75);
                            setThumbnail(compressedBase64);
                          };
                          img.src = event.target.result;
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />

                </label>
              </div>
            </div>


            <button 
              type="submit" 
              disabled={infoLoading} 
              className="btn-primary" 
              style={{ width: '100%', padding: '12px', marginTop: '10px' }}
            >
              <Save size={16} /> {infoLoading ? 'Saving...' : 'Save Course Details'}
            </button>
          </form>
        </div>

        {/* Right Side: Curriculum Builder */}
        <div className={styles.editorSection}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-trans)', paddingBottom: '10px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '800' }}>Curriculum Builder</h2>
            <button 
              onClick={handleSaveCurriculum} 
              disabled={currLoading}
              className="btn-primary"
              style={{ padding: '8px 16px', fontSize: '13px', background: 'linear-gradient(135deg, var(--accent), var(--primary))' }}
            >
              <Save size={14} /> {currLoading ? 'Saving...' : 'Save Curriculum'}
            </button>
          </div>

          <div className="glass-card" style={{ padding: '14px', background: 'rgba(234, 67, 53, 0.05)', borderColor: 'rgba(234, 67, 53, 0.2)', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <AlertTriangle size={18} style={{ color: '#EA4335', flexShrink: 0, marginTop: '2px' }} />
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              WARNING: Saving the curriculum will overwrite the sections and lectures list for this course. Any deleted lectures will cascade-delete their respective student watch logs.
            </p>
          </div>

          {/* Builder */}
          <div className={styles.curriculumBuilder}>
            {sections.map((sec, sIdx) => (
              <div key={sec.id} className={styles.builderSectionCard}>
                {/* Section Header */}
                <div className={styles.builderSectionHeader}>
                  <input
                    type="text"
                    value={sec.title}
                    onChange={(e) => handleSectionTitleChange(sIdx, e.target.value)}
                    className={styles.sectionInput}
                    placeholder="Chapter Title"
                  />
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button 
                      onClick={() => handleAddLecture(sIdx)}
                      className="btn-secondary" 
                      style={{ padding: '6px', fontSize: '11px' }}
                      title="Add Lecture"
                    >
                      <Plus size={14} /> Add Lecture
                    </button>
                    <button 
                      onClick={() => handleRemoveSection(sIdx)}
                      className={styles.deleteBtn}
                      title="Remove Chapter"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Section Lectures */}
                <div className={styles.builderLecturesList}>
                  {sec.lectures.length === 0 ? (
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
                      No lectures added yet. Click "Add Lecture".
                    </span>
                  ) : (
                    sec.lectures.map((lec, lIdx) => (
                      <div key={lec.id} className={styles.builderLectureCard}>
                        {/* Lecture row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--primary)' }}>Lecture #{lIdx + 1}</span>
                          <button 
                            onClick={() => handleRemoveLecture(sIdx, lIdx)}
                            className={styles.deleteBtn}
                            title="Remove Lecture"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>

                        {/* Title and Duration inputs */}
                        <div className={styles.lectureInputGroup}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Lecture Title</span>
                            <input
                              type="text"
                              placeholder="e.g. Introduction to React"
                              value={lec.title}
                              onChange={(e) => handleLectureChange(sIdx, lIdx, 'title', e.target.value)}
                              className={styles.lectureSubInput}
                              required
                            />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Duration (in seconds)</span>
                            <input
                              type="number"
                              placeholder="e.g. 350 (for 5m 50s)"
                              value={lec.duration}
                              onChange={(e) => handleLectureChange(sIdx, lIdx, 'duration', e.target.value)}
                              className={styles.lectureSubInput}
                              required
                            />
                          </div>
                        </div>

                        {/* Video URL */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Video Stream / YouTube Link</span>
                          <input
                            type="text"
                            placeholder="e.g. https://www.youtube.com/watch?v=..."
                            value={lec.videoUrl}
                            onChange={(e) => handleLectureChange(sIdx, lIdx, 'videoUrl', e.target.value)}
                            className={styles.lectureSubInput}
                            required
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}

            <button 
              onClick={handleAddSection}
              className="btn-secondary" 
              style={{ width: '100%', padding: '10px', fontSize: '13px', borderStyle: 'dashed' }}
            >
              <Plus size={16} /> Add New Chapter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
