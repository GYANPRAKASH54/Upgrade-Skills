'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Users, BookOpen, DollarSign, Edit, Star, Eye } from 'lucide-react';
import styles from './Instructor.module.css';

export default function InstructorDashboardClient({ initialCourses, instructorName }) {
  const router = useRouter();
  const [courses, setCourses] = useState(initialCourses);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPrice, setNewPrice] = useState('499');
  const [loading, setLoading] = useState(false);

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          price: parseFloat(newPrice),
          subtitle: 'Draft Masterclass course.',
          description: 'Master practical skills with real-world guidance.',
        }),
      });

      const data = await res.ok ? await res.json() : null;

      if (data) {
        setCourses([data, ...courses]);
        setShowCreateModal(false);
        setNewTitle('');
        setNewPrice('499');
        // Redirect to course curriculum editor directly!
        router.push(`/instructor/courses/${data.id}`);
      } else {
        alert('Failed to create course. Please try again.');
      }
    } catch (err) {
      console.error(err);
      alert('Error creating course.');
    } finally {
      setLoading(false);
    }
  };

  // Mock earnings & stats calculation
  const totalCoursesCount = courses.length;
  const mockStudentsCount = courses.reduce((acc, c) => acc + (c._count?.enrollments || 3), 0); // Mock 3 students if seed count not present
  const mockEarnings = courses.reduce((acc, c) => acc + (c.price * (c._count?.enrollments || 3)), 0);

  return (
    <div className="container" style={{ paddingBottom: '80px' }}>
      {/* Dashboard Header */}
      <div className={styles.dashboardHeader}>
        <div>
          <h1 className={styles.title}>Instructor Dashboard</h1>
          <p className={styles.subtitle}>Welcome back, {instructorName}. Manage your courses and curriculum builder.</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)} 
          className="btn-primary"
        >
          <Plus size={18} /> Create Course
        </button>
      </div>

      {/* Stats row */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <DollarSign size={24} style={{ color: 'var(--accent)' }} />
          <span className={styles.statVal}>₹{mockEarnings.toLocaleString()}</span>
          <span className={styles.statLabel}>Lifetime Revenue</span>
        </div>
        <div className={styles.statCard}>
          <Users size={24} style={{ color: 'var(--primary)' }} />
          <span className={styles.statVal}>{mockStudentsCount}</span>
          <span className={styles.statLabel}>Total Students</span>
        </div>
        <div className={styles.statCard}>
          <BookOpen size={24} style={{ color: 'var(--text-primary)' }} />
          <span className={styles.statVal}>{totalCoursesCount}</span>
          <span className={styles.statLabel}>Courses Created</span>
        </div>
      </div>

      {/* Course List Section */}
      <div>
        <h2 className={styles.sectionTitle}>Your Uploaded Courses</h2>
        
        {courses.length === 0 ? (
          <div className="glass-card" style={{ padding: '60px', textAlignment: 'center', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <BookOpen size={48} style={{ color: 'var(--text-muted)' }} />
            <h3 style={{ fontSize: '18px', fontWeight: '700' }}>No Courses Created Yet</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Click "Create Course" to initialize your first masterclass curriculum.</p>
          </div>
        ) : (
          <div className={styles.coursesGrid}>
            {courses.map((course) => (
              <div key={course.id} className={styles.courseItem}>
                <img 
                  src={course.thumbnail} 
                  alt={course.title} 
                  className={styles.courseThumbnail} 
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60';
                  }}
                />

                <div className={styles.courseBody}>
                  <h3 className={styles.courseTitle}>{course.title}</h3>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span className={course.published ? 'badge badge-success' : 'badge badge-primary'} style={{ fontSize: '10px' }}>
                      {course.published ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  <div className={styles.courseFooter}>
                    <span style={{ fontWeight: 700, color: 'var(--accent)' }}>₹{course.price}</span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <Link 
                        href={`/courses/${course.id}`} 
                        className="btn-secondary" 
                        style={{ padding: '6px', borderRadius: '4px' }}
                        title="View Course Landing Page"
                      >
                        <Eye size={16} />
                      </Link>
                      <Link 
                        href={`/instructor/courses/${course.id}`} 
                        className="btn-primary" 
                        style={{ padding: '6px 10px', borderRadius: '4px', fontSize: '12px' }}
                      >
                        <Edit size={14} /> Edit
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Course Modal */}
      {showCreateModal && (
        <div className={styles.modalOverlay}>
          <div className={`glass-card ${styles.modalContent}`}>
            <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '16px' }}>Create New Course</h3>
            <form onSubmit={handleCreateCourse} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>Course Title</label>
                <input 
                  type="text" 
                  placeholder="e.g. Mastering Financial Analytics" 
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="form-input" 
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>Course Price (₹)</label>
                <input 
                  type="number" 
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  className="form-input" 
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button 
                  type="button" 
                  onClick={() => setShowCreateModal(false)} 
                  className="btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '13px' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="btn-primary"
                  style={{ padding: '8px 16px', fontSize: '13px' }}
                >
                  {loading ? 'Creating...' : 'Create Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
