'use client';

import { useState, Fragment } from 'react';
import Link from 'next/link';
import { 
  Users, 
  BookOpen, 
  ShoppingCart, 
  IndianRupee, 
  Search, 
  Trash2, 
  PlusCircle, 
  AlertCircle, 
  CheckCircle2, 
  LayoutDashboard,
  ShieldCheck,
  UserX,
  UserCheck,
  Book,
  Plus,
  MessageSquare,
  Trophy,
  Calendar,
  Download,
  RefreshCw,
  RotateCcw,
  Tag
} from 'lucide-react';
import styles from './Admin.module.css';

export default function AdminDashboardClient({ 
  initialCourses, 
  initialEnrollments, 
  initialUsers, 
  initialQuestions = [],
  initialCompetitions = [],
  initialCoupons = [],
  stats 
}) {
  const [activeTab, setActiveTab] = useState('analytics');
  const [enrollments, setEnrollments] = useState(initialEnrollments);
  const [users, setUsers] = useState(initialUsers);
  const [courses, setCourses] = useState(initialCourses);
  const [questions, setQuestions] = useState(initialQuestions);
  const [competitions, setCompetitions] = useState(initialCompetitions);
  const [coupons, setCoupons] = useState(initialCoupons);
  const [compSearch, setCompSearch] = useState('');

  // New Coupon form state
  const [couponCode, setCouponCode] = useState('');
  const [discountType, setDiscountType] = useState('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState('');
  const [couponExpiry, setCouponExpiry] = useState('');
  const [createCouponLoading, setCreateCouponLoading] = useState(false);
  const [couponSearch, setCouponSearch] = useState('');

  // New competition form state
  const [compTitle, setCompTitle] = useState('');
  const [compDescription, setCompDescription] = useState('');
  const [compImage, setCompImage] = useState('');
  const [compRules, setCompRules] = useState('');
  const [compStartDate, setCompStartDate] = useState('');
  const [compEndDate, setCompEndDate] = useState('');
  const [compStatus, setCompStatus] = useState('REGISTRATIONS_OPEN');
  const [createCompLoading, setCreateCompLoading] = useState(false);
  
  // Search state variables
  const [userSearch, setUserSearch] = useState('');
  const [courseSearch, setCourseSearch] = useState('');
  const [accessSearch, setAccessSearch] = useState('');
  const [qaSearch, setQaSearch] = useState('');
  const [expandedEnrollment, setExpandedEnrollment] = useState(null);
  
  // Sorting and Filtering states for purchases
  const [courseFilter, setCourseFilter] = useState('');
  const [sortBy, setSortBy] = useState('date_desc');

  const toggleEnrollmentDetails = (id) => {
    setExpandedEnrollment(expandedEnrollment === id ? null : id);
  };
  
  // Client-side Excel export helper
  const downloadExcel = () => {
    const headers = ['Student Name', 'Student Email', 'Course Name', 'Purchase Date', 'Purchase Time', 'Amount(₹)', 'Payment ID', 'Order ID', 'Billing Details'];
    
    const rows = filteredEnrollments.map(e => [
      e.student?.name || '',
      e.student?.email || '',
      e.course?.title || '',
      new Date(e.joinedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      new Date(e.joinedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      e.billingName ? `₹${e.course?.price}` : 'Manual/Free',
      e.razorpayPaymentId || 'N/A',
      e.razorpayOrderId || 'N/A',
      e.billingName ? `${e.billingName}, Phone: ${e.billingPhone}, Address: ${e.billingAddress}, ${e.billingCity}, ${e.billingState} - ${e.billingZip}` : 'Manually Enrolled'
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    // Add UTF-8 BOM so Excel opens it with correct character encodings
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `course_purchases_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Manual enrollment form state
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  // New course creation form state
  const [courseTitle, setCourseTitle] = useState('');
  const [courseSubtitle, setCourseSubtitle] = useState('');
  const [courseDescription, setCourseDescription] = useState('');
  const [coursePrice, setCoursePrice] = useState('');
  const [courseThumbnail, setCourseThumbnail] = useState('');
  const [courseInstructor, setCourseInstructor] = useState('');
  const [createCourseLoading, setCreateCourseLoading] = useState(false);

  // General notification message
  const [message, setMessage] = useState({ type: '', text: '' });

  // Filtered lists
  const filteredUsers = users.filter((u) => {
    const query = userSearch.toLowerCase();
    return u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query);
  });

  const filteredCourses = courses.filter((c) => {
    const query = courseSearch.toLowerCase();
    const instructorName = c.instructor?.name || '';
    return c.title.toLowerCase().includes(query) || instructorName.toLowerCase().includes(query);
  });

  const filteredEnrollments = enrollments
    .filter((enrollment) => {
      const studentName = enrollment.student?.name || '';
      const studentEmail = enrollment.student?.email || '';
      const courseTitle = enrollment.course?.title || '';
      const query = accessSearch.toLowerCase();
      
      const matchesSearch = (
        studentName.toLowerCase().includes(query) ||
        studentEmail.toLowerCase().includes(query) ||
        courseTitle.toLowerCase().includes(query)
      );

      const matchesCourse = courseFilter ? enrollment.courseId === courseFilter : true;

      return matchesSearch && matchesCourse;
    })
    .sort((a, b) => {
      if (sortBy === 'date_desc') {
        return new Date(b.joinedAt) - new Date(a.joinedAt);
      }
      if (sortBy === 'date_asc') {
        return new Date(a.joinedAt) - new Date(b.joinedAt);
      }
      if (sortBy === 'name_asc') {
        return (a.student?.name || '').localeCompare(b.student?.name || '');
      }
      if (sortBy === 'name_desc') {
        return (b.student?.name || '').localeCompare(a.student?.name || '');
      }
      if (sortBy === 'course_asc') {
        return (a.course?.title || '').localeCompare(b.course?.title || '');
      }
      if (sortBy === 'course_desc') {
        return (b.course?.title || '').localeCompare(a.course?.title || '');
      }
      return 0;
    });

  const filteredQuestions = questions.filter((q) => {
    const query = qaSearch.toLowerCase();
    const studentName = q.student?.name || '';
    const studentEmail = q.student?.email || '';
    const lectureTitle = q.lecture?.title || '';
    const courseTitle = q.lecture?.section?.course?.title || '';
    const content = q.content || '';
    
    return (
      studentName.toLowerCase().includes(query) ||
      studentEmail.toLowerCase().includes(query) ||
      lectureTitle.toLowerCase().includes(query) ||
      courseTitle.toLowerCase().includes(query) ||
      content.toLowerCase().includes(query)
    );
  });

  const filteredCompetitions = competitions.filter((comp) => {
    const query = compSearch.toLowerCase();
    return comp.title.toLowerCase().includes(query) || comp.description.toLowerCase().includes(query);
  });

  const filteredCoupons = coupons.filter((coupon) => {
    const query = couponSearch.toLowerCase();
    return coupon.code.toLowerCase().includes(query);
  });

  // Filtered lists for manual enroll selectors
  const studentsList = users.filter((u) => u.role === 'STUDENT');
  const instructorsList = users.filter((u) => u.role === 'INSTRUCTOR' || u.role === 'ADMIN');

  // Handle User Role Change
  const handleRoleChange = async (userId, newRole, userName) => {
    setMessage({ type: '', text: '' });

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to update user role.' });
      } else {
        setMessage({ type: 'success', text: `Successfully updated ${userName}'s role to ${newRole}!` });
        setUsers(users.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
      }
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'An unexpected error occurred while changing user role.' });
    }
  };

  // Handle User Account Deletion
  const handleDeleteUser = async (userId, userName) => {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete the account of ${userName}? This will cascade delete all their course enrollments and is IRREVERSIBLE.`
    );
    if (!confirmed) return;

    setMessage({ type: '', text: '' });

    try {
      const res = await fetch(`/api/admin/users?id=${userId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to delete user account.' });
      } else {
        setMessage({ type: 'success', text: `Successfully deleted account of ${userName}.` });
        setUsers(users.filter((u) => u.id !== userId));
        setEnrollments(enrollments.filter((e) => e.studentId !== userId));
      }
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'An unexpected error occurred while deleting user.' });
    }
  };

  // Handle Create Course listing
  const handleCreateCourse = async (e) => {
    e.preventDefault();
    if (!courseTitle || !courseInstructor) {
      setMessage({ type: 'error', text: 'Please provide a Course Title and select an Instructor.' });
      return;
    }

    setCreateCourseLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await fetch('/api/admin/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: courseTitle,
          subtitle: courseSubtitle,
          description: courseDescription,
          price: parseFloat(coursePrice) || 0,
          thumbnail: courseThumbnail || '/placeholder-course.jpg',
          instructorId: courseInstructor,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to create course.' });
      } else {
        setMessage({ type: 'success', text: `Course "${courseTitle}" created successfully!` });
        setCourses([...courses, data.course]);
        // Reset form
        setCourseTitle('');
        setCourseSubtitle('');
        setCourseDescription('');
        setCoursePrice('');
        setCourseThumbnail('');
        setCourseInstructor('');
      }
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'An unexpected error occurred while creating the course.' });
    } finally {
      setCreateCourseLoading(false);
    }
  };

  // Handle Course Deletion
  const handleDeleteCourse = async (courseId, courseTitle) => {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete course "${courseTitle}"? This will cascade-delete all sections, lectures, student progress, and active enrollments for this course. This is IRREVERSIBLE.`
    );
    if (!confirmed) return;

    setMessage({ type: '', text: '' });

    try {
      const res = await fetch(`/api/admin/courses?id=${courseId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to delete course.' });
      } else {
        setMessage({ type: 'success', text: `Successfully deleted course "${courseTitle}".` });
        setCourses(courses.filter((c) => c.id !== courseId));
        setEnrollments(enrollments.filter((e) => e.courseId !== courseId));
      }
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'An unexpected error occurred while deleting the course.' });
    }
  };

  // Handle manual enrollment creation
  const handleManualEnroll = async (e) => {
    e.preventDefault();
    if (!selectedStudent || !selectedCourse) {
      setMessage({ type: 'error', text: 'Please select both a student and a course.' });
      return;
    }

    setSubmitLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await fetch('/api/admin/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: selectedStudent, courseId: selectedCourse }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to grant manual access.' });
      } else {
        setMessage({ type: 'success', text: 'Course access granted successfully!' });
        setEnrollments([data.enrollment, ...enrollments]);
        setSelectedStudent('');
        setSelectedCourse('');
      }
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'An unexpected error occurred. Please try again.' });
    } finally {
      setSubmitLoading(false);
    }
  };

  // Handle manual enrollment deletion (revoke access)
  const handleRevokeAccess = async (enrollmentId, studentName, courseTitle) => {
    const confirmed = window.confirm(
      `Are you sure you want to revoke manual access for ${studentName} in "${courseTitle}"?`
    );
    if (!confirmed) return;

    setMessage({ type: '', text: '' });

    try {
      const res = await fetch(`/api/admin/enrollments?id=${enrollmentId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to revoke course access.' });
      } else {
        setMessage({ type: 'success', text: 'Course access revoked successfully!' });
        setEnrollments(enrollments.filter((item) => item.id !== enrollmentId));
      }
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'An unexpected error occurred while revoking access.' });
    }
  };

  // Handle reset student progress
  const handleResetProgress = async (enrollmentId, studentName, courseTitle) => {
    const confirmed = window.confirm(
      `Are you sure you want to reset all course progress and quiz certification scores for ${studentName} in "${courseTitle}"?`
    );
    if (!confirmed) return;

    setMessage({ type: '', text: '' });

    try {
      const res = await fetch('/api/admin/enrollments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enrollmentId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to reset course progress.' });
      } else {
        setMessage({ type: 'success', text: `Successfully reset course progress for ${studentName} in "${courseTitle}"!` });
        setEnrollments(enrollments.map((item) => item.id === enrollmentId ? data.enrollment : item));
      }
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'An unexpected error occurred while resetting progress.' });
    }
  };

  // Handle reset student exam attempts
  const handleResetTest = async (enrollmentId, studentName, courseTitle) => {
    const confirmed = window.confirm(
      `Are you sure you want to reset only the Exam/Test attempts and scores for ${studentName} in "${courseTitle}"?\n(Their lecture watch progress will be preserved.)`
    );
    if (!confirmed) return;

    setMessage({ type: '', text: '' });

    try {
      const res = await fetch('/api/admin/enrollments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enrollmentId, resetType: 'test' }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to reset exam attempts.' });
      } else {
        setMessage({ type: 'success', text: `Successfully reset exam attempts for ${studentName} in "${courseTitle}"!` });
        setEnrollments(enrollments.map((item) => item.id === enrollmentId ? data.enrollment : item));
      }
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'An unexpected error occurred while resetting exam attempts.' });
    }
  };

  // Handle Student Q&A Question Deletion
  const handleDeleteQuestion = async (questionId, questionSnippet) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete this question? "${questionSnippet}"\nThis action cannot be undone.`
    );
    if (!confirmed) return;

    setMessage({ type: '', text: '' });

    try {
      const res = await fetch(`/api/admin/questions?id=${questionId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to delete question.' });
      } else {
        setMessage({ type: 'success', text: 'Successfully deleted question!' });
        setQuestions(questions.filter((q) => q.id !== questionId));
      }
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'An unexpected error occurred while deleting the question.' });
    }
  };

  // Handle Create Competition
  const handleCreateCompetition = async (e) => {
    e.preventDefault();
    if (!compTitle || !compStartDate || !compEndDate) {
      setMessage({ type: 'error', text: 'Please provide an Event Title, Start Date, and End Date.' });
      return;
    }

    setCreateCompLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await fetch('/api/admin/competitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: compTitle,
          description: compDescription,
          image: compImage,
          rules: compRules,
          startDate: compStartDate,
          endDate: compEndDate,
          status: compStatus,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to create competition.' });
      } else {
        setMessage({ type: 'success', text: `Event "${compTitle}" created successfully!` });
        setCompetitions([...competitions, data.competition]);
        // Reset form
        setCompTitle('');
        setCompDescription('');
        setCompImage('');
        setCompRules('');
        setCompStartDate('');
        setCompEndDate('');
        setCompStatus('REGISTRATIONS_OPEN');
      }
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'An unexpected error occurred while creating the competition.' });
    } finally {
      setCreateCompLoading(false);
    }
  };

  // Handle Delete Competition
  const handleDeleteCompetition = async (compId, compTitle) => {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete event "${compTitle}"? This will cascade-delete all student submissions and certificates for this event. This is IRREVERSIBLE.`
    );
    if (!confirmed) return;

    setMessage({ type: '', text: '' });

    try {
      const res = await fetch(`/api/admin/competitions?id=${compId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to delete event.' });
      } else {
        setMessage({ type: 'success', text: `Successfully deleted event "${compTitle}".` });
        setCompetitions(competitions.filter((c) => c.id !== compId));
      }
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'An unexpected error occurred while deleting the event.' });
    }
  };

  // Handle Competition Status Change
  const handleCompStatusChange = async (compId, newStatus, compTitle) => {
    setMessage({ type: '', text: '' });

    try {
      const res = await fetch('/api/admin/competitions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: compId, status: newStatus }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to update event status.' });
      } else {
        const statusLabel = newStatus === 'REGISTRATIONS_OPEN' ? 'Registrations Open' : newStatus === 'REGISTRATIONS_CLOSED' ? 'Registrations Closed' : 'Result Out';
        setMessage({ type: 'success', text: `Successfully updated "${compTitle}" status to ${statusLabel}!` });
        setCompetitions(competitions.map((c) => (c.id === compId ? { ...c, status: newStatus } : c)));
      }
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'An unexpected error occurred while changing event status.' });
    }
  };

  // Handle Create Coupon
  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    if (!couponCode || !discountType || !discountValue) {
      setMessage({ type: 'error', text: 'Please fill in all required fields.' });
      return;
    }

    setCreateCouponLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: couponCode,
          discountType,
          discountValue: parseFloat(discountValue),
          expiresAt: couponExpiry || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to create coupon.' });
      } else {
        setMessage({ type: 'success', text: `Coupon "${couponCode}" created successfully!` });
        setCoupons([data.coupon, ...coupons]);
        // Reset form
        setCouponCode('');
        setDiscountType('PERCENTAGE');
        setDiscountValue('');
        setCouponExpiry('');
      }
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'An unexpected error occurred while creating coupon.' });
    } finally {
      setCreateCouponLoading(false);
    }
  };

  // Handle Delete Coupon
  const handleDeleteCoupon = async (couponId, code) => {
    const confirmed = window.confirm(`Are you sure you want to permanently delete coupon "${code}"?`);
    if (!confirmed) return;

    setMessage({ type: '', text: '' });

    try {
      const res = await fetch(`/api/admin/coupons?id=${couponId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to delete coupon.' });
      } else {
        setMessage({ type: 'success', text: `Successfully deleted coupon "${code}".` });
        setCoupons(coupons.filter((c) => c.id !== couponId));
      }
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'An unexpected error occurred while deleting coupon.' });
    }
  };

  // Calculate live stats summary metrics
  const liveTotalRevenue = courses.reduce((acc, course) => {
    const purchaseCount = enrollments.filter((e) => e.courseId === course.id).length;
    return acc + (purchaseCount * course.price);
  }, 0);

  return (
    <div style={{ paddingBottom: '100px' }}>
      {/* 1. Quick Stats Grid */}
      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} glass-card`}>
          <div className={styles.statIcon}>
            <Users size={24} />
          </div>
          <div>
            <div className={styles.statValue}>{users.length}</div>
            <div className={styles.statLabel}>Total Users</div>
          </div>
        </div>

        <div className={`${styles.statCard} glass-card`}>
          <div className={styles.statIconAccent}>
            <BookOpen size={24} />
          </div>
          <div>
            <div className={styles.statValue}>{courses.length}</div>
            <div className={styles.statLabel}>Total Courses</div>
          </div>
        </div>

        <div className={`${styles.statCard} glass-card`}>
          <div className={styles.statIcon}>
            <ShoppingCart size={24} style={{ color: 'var(--primary)' }} />
          </div>
          <div>
            <div className={styles.statValue}>{enrollments.length}</div>
            <div className={styles.statLabel}>Total Purchases</div>
          </div>
        </div>

        <div className={`${styles.statCard} glass-card`}>
          <div className={styles.statIconRevenue}>
            <IndianRupee size={24} />
          </div>
          <div>
            <div className={styles.statValue}>₹{liveTotalRevenue.toLocaleString()}</div>
            <div className={styles.statLabel}>Estimated Revenue</div>
          </div>
        </div>
      </div>

      {/* 2. Tabs Navigation */}
      <div className={styles.tabsContainer}>
        <button 
          onClick={() => { setActiveTab('analytics'); setMessage({ type: '', text: '' }); }}
          className={`${styles.tabBtn} ${activeTab === 'analytics' ? styles.activeTabBtn : ''}`}
        >
          <LayoutDashboard size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
          Overview
        </button>
        <button 
          onClick={() => { setActiveTab('users'); setMessage({ type: '', text: '' }); }}
          className={`${styles.tabBtn} ${activeTab === 'users' ? styles.activeTabBtn : ''}`}
        >
          <UserCheck size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
          Manage Users
        </button>
        <button 
          onClick={() => { setActiveTab('courses'); setMessage({ type: '', text: '' }); }}
          className={`${styles.tabBtn} ${activeTab === 'courses' ? styles.activeTabBtn : ''}`}
        >
          <Book size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
          Manage Courses
        </button>
        <button 
          onClick={() => { setActiveTab('access'); setMessage({ type: '', text: '' }); }}
          className={`${styles.tabBtn} ${activeTab === 'access' ? styles.activeTabBtn : ''}`}
        >
          <ShieldCheck size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
          Access Control
        </button>
        <button 
          onClick={() => { setActiveTab('qa'); setMessage({ type: '', text: '' }); }}
          className={`${styles.tabBtn} ${activeTab === 'qa' ? styles.activeTabBtn : ''}`}
        >
          <MessageSquare size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
          Student Q&A
        </button>
        <button 
          onClick={() => { setActiveTab('competitions'); setMessage({ type: '', text: '' }); }}
          className={`${styles.tabBtn} ${activeTab === 'competitions' ? styles.activeTabBtn : ''}`}
        >
          <Trophy size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
          InnoTech Events
        </button>
        <button 
          onClick={() => { setActiveTab('coupons'); setMessage({ type: '', text: '' }); }}
          className={`${styles.tabBtn} ${activeTab === 'coupons' ? styles.activeTabBtn : ''}`}
        >
          <Tag size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
          Coupon Codes
        </button>
      </div>

      {/* 3. Messages */}
      {message.text && (
        <div className={`${styles.alert} ${message.type === 'success' ? styles.alertSuccess : styles.alertError}`}>
          {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* 4. Tab Contents */}
      <div className={styles.tabContent}>
        
        {/* Tab 1: Analytics / Overview */}
        {activeTab === 'analytics' && (
          <div className={`${styles.tableCard} glass-card`}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px' }}>Course Performance & Revenue</h3>
            <table className={styles.adminTable}>
              <thead>
                <tr>
                  <th className={styles.th}>Course Title</th>
                  <th className={styles.th}>Instructor</th>
                  <th className={styles.th}>Price</th>
                  <th className={styles.th}>Purchases (Users)</th>
                  <th className={styles.th}>Revenue Generated</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((course) => {
                  const enrollmentsCount = enrollments.filter((e) => e.courseId === course.id).length;
                  const courseRevenue = enrollmentsCount * course.price;
                  return (
                    <tr key={course.id} className={styles.tr}>
                      <td className={`${styles.td} ${styles.tdHighlight}`}>{course.title}</td>
                      <td className={styles.td}>{course.instructor?.name || 'N/A'}</td>
                      <td className={styles.td}>₹{course.price}</td>
                      <td className={styles.td} style={{ fontWeight: '700', color: 'var(--primary)' }}>
                        {enrollmentsCount}
                      </td>
                      <td className={styles.td} style={{ fontWeight: '700', color: '#4ade80' }}>
                        ₹{courseRevenue.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: User Accounts Directory */}
        {activeTab === 'users' && (
          <div className={`${styles.tableCard} glass-card`}>
            <div className={styles.searchHeader}>
              <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Site Users Database</h3>
              <div className={styles.searchInputWrapper}>
                <Search size={16} className={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Search users by name or email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '42px', fontSize: '13px' }}
                />
              </div>
            </div>

            {filteredUsers.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No user accounts match your search.
              </div>
            ) : (
              <table className={styles.adminTable}>
                <thead>
                  <tr>
                    <th className={styles.th}>User ID</th>
                    <th className={styles.th}>Name</th>
                    <th className={styles.th}>Email Address</th>
                    <th className={styles.th}>Role / Status</th>
                    <th className={styles.th}>Change Role</th>
                    <th className={styles.th} style={{ textAlign: 'center' }}>Remove</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className={styles.tr}>
                      <td className={styles.td} style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                        {user.id.substring(0, 8)}...
                      </td>
                      <td className={`${styles.td} ${styles.tdHighlight}`}>{user.name}</td>
                      <td className={styles.td}>{user.email}</td>
                      <td className={styles.td}>
                        <span className={`${styles.roleBadge} ${
                          user.role === 'ADMIN' 
                            ? styles.roleAdmin 
                            : user.role === 'INSTRUCTOR' 
                              ? styles.roleInstructor 
                              : user.role === 'TESTER'
                                ? styles.roleTester
                                : styles.roleStudent
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className={styles.td}>
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value, user.name)}
                          className={styles.roleSelectInline}
                        >
                          <option value="STUDENT">Student</option>
                          <option value="INSTRUCTOR">Instructor</option>
                          <option value="ADMIN">Admin</option>
                          <option value="TESTER">Tester</option>
                        </select>
                      </td>
                      <td className={styles.td}>
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          <button
                            onClick={() => handleDeleteUser(user.id, user.name)}
                            className={styles.revokeBtn}
                            title="Delete User Account"
                          >
                            <UserX size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab 3: Catalog Course Manager */}
        {activeTab === 'courses' && (
          <div className={styles.courseCreationContainer}>
            {/* Left side: Course list */}
            <div className={`${styles.tableCard} glass-card`}>
              <div className={styles.searchHeader}>
                <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Active Courses</h3>
                <div className={styles.searchInputWrapper}>
                  <Search size={16} className={styles.searchIcon} />
                  <input
                    type="text"
                    placeholder="Search courses by title or instructor..."
                    value={courseSearch}
                    onChange={(e) => setCourseSearch(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: '42px', fontSize: '13px' }}
                  />
                </div>
              </div>

              {filteredCourses.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No courses found.
                </div>
              ) : (
                <table className={styles.adminTable}>
                  <thead>
                    <tr>
                      <th className={styles.th}>Course Details</th>
                      <th className={styles.th}>Instructor</th>
                      <th className={styles.th}>Price</th>
                      <th className={styles.th} style={{ textAlign: 'center' }}>Delete</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCourses.map((course) => (
                      <tr key={course.id} className={styles.tr}>
                        <td className={styles.td}>
                          <div className={styles.courseRow}>
                            <img src={course.thumbnail} alt="" className={styles.courseThumbnailMini} />
                            <div>
                              <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{course.title}</div>
                              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{course.subtitle}</div>
                            </div>
                          </div>
                        </td>
                        <td className={styles.td}>{course.instructor?.name || 'N/A'}</td>
                        <td className={styles.td} style={{ fontWeight: '700' }}>₹{course.price}</td>
                        <td className={styles.td}>
                          <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <button
                              onClick={() => handleDeleteCourse(course.id, course.title)}
                              className={styles.revokeBtn}
                              title="Delete Course listing"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Right side: Add Course Form */}
            <div className={`${styles.formCard} glass-card`}>
              <h3 className={styles.formTitle}>
                <PlusCircle size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                Create New Course
              </h3>
              <form onSubmit={handleCreateCourse} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className={styles.formGroup}>
                  <label className={styles.label} style={{ fontSize: '13px' }}>Course Title *</label>
                  <input
                    type="text"
                    placeholder="e.g. Next.js 16 Boot Camp"
                    value={courseTitle}
                    onChange={(e) => setCourseTitle(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label} style={{ fontSize: '13px' }}>Subtitle</label>
                  <input
                    type="text"
                    placeholder="e.g. Build real world applications"
                    value={courseSubtitle}
                    onChange={(e) => setCourseSubtitle(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label} style={{ fontSize: '13px' }}>Instructor *</label>
                  <select
                    value={courseInstructor}
                    onChange={(e) => setCourseInstructor(e.target.value)}
                    className={styles.selectInput}
                    required
                  >
                    <option value="">-- Choose Instructor --</option>
                    {instructorsList.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.name} ({inst.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className={styles.label} style={{ fontSize: '13px' }}>Price (INR) *</label>
                    <input
                      type="number"
                      placeholder="e.g. 499"
                      value={coursePrice}
                      onChange={(e) => setCoursePrice(e.target.value)}
                      className="form-input"
                      required
                    />
                  </div>
                  <div>
                    <label className={styles.label} style={{ fontSize: '13px' }}>Thumbnail Path</label>
                    <input
                      type="text"
                      placeholder="/nextjs-course.jpg"
                      value={courseThumbnail}
                      onChange={(e) => setCourseThumbnail(e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label} style={{ fontSize: '13px' }}>Course Description</label>
                  <textarea
                    placeholder="Provide a detailed syllabus description..."
                    value={courseDescription}
                    onChange={(e) => setCourseDescription(e.target.value)}
                    className={styles.textareaInput}
                  />
                </div>

                <button
                  type="submit"
                  disabled={createCourseLoading}
                  className="btn-primary"
                  style={{ width: '100%', padding: '12px', marginTop: '10px', fontSize: '13px' }}
                >
                  {createCourseLoading ? 'Creating Course...' : 'Create Course'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Tab 4: Access Control (Manual Enrollment) */}
        {activeTab === 'access' && (
          <div className={styles.layoutGrid}>
            {/* Left side: Enrollments List */}
            <div className={`${styles.tableCard} glass-card`}>
              <div className={styles.searchHeader}>
                <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Course Purchases & Access</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                  <div className={styles.searchInputWrapper}>
                    <Search size={16} className={styles.searchIcon} />
                    <input
                      type="text"
                      placeholder="Search by student name, email, or course..."
                      value={accessSearch}
                      onChange={(e) => setAccessSearch(e.target.value)}
                      className="form-input"
                      style={{ paddingLeft: '42px', fontSize: '13px' }}
                    />
                  </div>
                  
                  {/* Sorting, filtering and excel download controls */}
                  <div className={styles.filterControlsBar}>
                    <select
                      value={courseFilter}
                      onChange={(e) => setCourseFilter(e.target.value)}
                      className={styles.filterSelect}
                    >
                      <option value="">All Courses</option>
                      {courses.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.title}
                        </option>
                      ))}
                    </select>

                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className={styles.filterSelect}
                    >
                      <option value="date_desc">Purchase Date: Newest</option>
                      <option value="date_asc">Purchase Date: Oldest</option>
                      <option value="name_asc">Student Name: A-Z</option>
                      <option value="name_desc">Student Name: Z-A</option>
                      <option value="course_asc">Course Title: A-Z</option>
                      <option value="course_desc">Course Title: Z-A</option>
                    </select>

                    <button 
                      onClick={downloadExcel} 
                      className={styles.exportBtn}
                      type="button"
                    >
                      <Download size={15} /> Export to Excel
                    </button>
                  </div>
                </div>
              </div>

              {filteredEnrollments.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No active enrollment access rights found.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className={styles.adminTable}>
                    <thead>
                      <tr>
                        <th className={styles.th}>Student</th>
                        <th className={styles.th}>Course Enrolled</th>
                        <th className={styles.th}>Amount</th>
                        <th className={styles.th}>Purchase Date & Time</th>
                        <th className={styles.th} style={{ textAlign: 'center' }}>Revoke</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEnrollments.map((enrollment) => {
                        const isExpanded = expandedEnrollment === enrollment.id;
                        const hasBilling = !!enrollment.billingName;
                        return (
                          <Fragment key={enrollment.id}>
                            <tr 
                              className={styles.tr} 
                              onClick={() => toggleEnrollmentDetails(enrollment.id)}
                              style={{ cursor: 'pointer' }}
                            >
                              <td className={`${styles.td} ${styles.tdHighlight}`}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                    {isExpanded ? '▼' : '▶'}
                                  </span>
                                  <div>
                                    <div style={{ fontWeight: '600' }}>{enrollment.student?.name}</div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{enrollment.student?.email}</div>
                                  </div>
                                </div>
                              </td>
                              <td className={styles.td} style={{ color: 'var(--text-primary)', fontWeight: '500' }}>{enrollment.course?.title}</td>
                              <td className={styles.td} style={{ fontWeight: '700', color: enrollment.billingName ? '#4ade80' : 'var(--text-muted)' }}>
                                {enrollment.billingName ? `₹${enrollment.course?.price}` : 'Free'}
                              </td>
                              <td className={styles.td} style={{ fontSize: '13px' }}>
                                <div>{new Date(enrollment.joinedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
                                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{new Date(enrollment.joinedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
                              </td>
                              <td className={styles.td} onClick={(e) => e.stopPropagation()}>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                                  <button
                                    onClick={() => handleResetTest(enrollment.id, enrollment.student?.name, enrollment.course?.title)}
                                    className={styles.resetTestBtn}
                                    title="Reset Test Attempts Only"
                                  >
                                    <RotateCcw size={16} />
                                  </button>
                                  <button
                                    onClick={() => handleResetProgress(enrollment.id, enrollment.student?.name, enrollment.course?.title)}
                                    className={styles.resetBtn}
                                    title="Reset Student Progress"
                                  >
                                    <RefreshCw size={16} />
                                  </button>
                                  <button
                                    onClick={() => handleRevokeAccess(enrollment.id, enrollment.student?.name, enrollment.course?.title)}
                                    className={styles.revokeBtn}
                                    title="Revoke Student Access"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.01)' }}>
                                <td colSpan="5" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-trans)' }}>
                                  <div className={styles.enrollmentDetailsGrid}>
                                    <div>
                                      <h4 style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent)', textTransform: 'uppercase', marginBottom: '10px' }}>
                                        Billing Information
                                      </h4>
                                      {hasBilling ? (
                                        <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px', color: 'var(--text-secondary)' }}>
                                          <div><strong>Billing Name:</strong> {enrollment.billingName}</div>
                                          <div><strong>Phone Number:</strong> {enrollment.billingPhone}</div>
                                          <div>
                                            <strong>Address:</strong> {enrollment.billingAddress}, {enrollment.billingCity}, {enrollment.billingState} - {enrollment.billingZip}
                                          </div>
                                        </div>
                                      ) : (
                                        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                          No custom billing details saved (Manually enrolled).
                                        </div>
                                      )}
                                    </div>
                                    <div>
                                      <h4 style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent)', textTransform: 'uppercase', marginBottom: '10px' }}>
                                        Exam / Certification Stats
                                      </h4>
                                      <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px', color: 'var(--text-secondary)' }}>
                                        <div><strong>Attempts Used:</strong> {enrollment.quizAttempts} / 2</div>
                                        <div><strong>Best Score:</strong> {enrollment.quizScore !== null && enrollment.quizScore !== undefined ? `${enrollment.quizScore}%` : 'N/A'}</div>
                                        <div><strong>Status:</strong> {enrollment.quizPassed ? <span style={{ color: '#4ade80', fontWeight: '700' }}>PASSED</span> : <span style={{ color: '#f87171', fontWeight: '700' }}>NOT PASSED</span>}</div>
                                        {enrollment.lastAttemptAt && (
                                          <div><strong>Last Attempt:</strong> {new Date(enrollment.lastAttemptAt).toLocaleString()}</div>
                                        )}
                                      </div>
                                    </div>
                                    <div className={styles.metadataColumn}>
                                      <div className={styles.metadataInfo}>
                                        <h4 style={{ fontSize: '12px', fontWeight: '700', color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '4px' }}>
                                          Payment Metadata
                                        </h4>
                                        <div><strong>Amount Paid:</strong> {enrollment.billingName ? `₹${enrollment.course?.price}` : 'Manual/Free'}</div>
                                        <div><strong>Gateway:</strong> Razorpay Sandbox</div>
                                        <div><strong>Payment ID:</strong> {enrollment.razorpayPaymentId || 'N/A'}</div>
                                        <div><strong>Order ID:</strong> {enrollment.razorpayOrderId || 'N/A'}</div>
                                      </div>
                                      
                                      {hasBilling && (
                                        <a
                                          href={`/invoices/invoice_${enrollment.id}.html`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="btn-secondary"
                                          style={{ padding: '8px 12px', fontSize: '12px', width: 'fit-content', marginTop: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                        >
                                          📄 View Generated Invoice ↗
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Right side: Grant Access Form */}
            <div className={`${styles.formCard} glass-card`}>
              <h3 className={styles.formTitle}>
                <PlusCircle size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                Grant Manual Access
              </h3>
              <form onSubmit={handleManualEnroll} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className={styles.formGroup}>
                  <label className={styles.label} style={{ fontSize: '13px' }}>Select Student</label>
                  <select 
                    value={selectedStudent} 
                    onChange={(e) => setSelectedStudent(e.target.value)}
                    className={styles.selectInput}
                    required
                  >
                    <option value="">-- Choose Student --</option>
                    {studentsList.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.name} ({student.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label} style={{ fontSize: '13px' }}>Select Course</label>
                  <select 
                    value={selectedCourse} 
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    className={styles.selectInput}
                    required
                  >
                    <option value="">-- Choose Course --</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.title} (₹{course.price})
                      </option>
                    ))}
                  </select>
                </div>

                <button 
                  type="submit" 
                  disabled={submitLoading}
                  className="btn-primary" 
                  style={{ width: '100%', padding: '12px', marginTop: '10px', fontSize: '13px' }}
                >
                  {submitLoading ? 'Granting Access...' : 'Grant Access'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Tab 5: Student Q&A Moderation */}
        {activeTab === 'qa' && (
          <div className={`${styles.tableCard} glass-card`}>
            <div className={styles.searchHeader}>
              <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Student Q&A Moderation</h3>
              <div className={styles.searchInputWrapper}>
                <Search size={16} className={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Search by student, course, lecture, or content..."
                  value={qaSearch}
                  onChange={(e) => setQaSearch(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '42px', fontSize: '13px' }}
                />
              </div>
            </div>

            {filteredQuestions.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No Q&A questions found.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className={styles.adminTable}>
                  <thead>
                    <tr>
                      <th className={styles.th}>Student Details</th>
                      <th className={styles.th}>Course & Lecture</th>
                      <th className={styles.th}>Question Content</th>
                      <th className={styles.th}>Date Posted</th>
                      <th className={styles.th} style={{ textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredQuestions.map((q) => {
                      const courseTitle = q.lecture?.section?.course?.title || 'Unknown Course';
                      const lectureTitle = q.lecture?.title || 'Unknown Lecture';
                      const courseId = q.lecture?.section?.course?.id;
                      return (
                        <tr key={q.id} className={styles.tr}>
                          <td className={styles.td}>
                            <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{q.student?.name || 'N/A'}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{q.student?.email || 'N/A'}</div>
                          </td>
                          <td className={styles.td}>
                            <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{courseTitle}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{lectureTitle}</div>
                          </td>
                          <td className={styles.td} style={{ maxWidth: '300px', wordBreak: 'break-word', color: 'var(--text-secondary)' }}>
                            {q.content}
                          </td>
                          <td className={styles.td}>
                            {new Date(q.createdAt).toLocaleDateString()}
                          </td>
                          <td className={styles.td}>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', alignItems: 'center' }}>
                              {courseId && (
                                <Link
                                  href={`/classroom/${courseId}?lectureId=${q.lectureId}`}
                                  target="_blank"
                                  className="btn-primary"
                                  style={{ padding: '6px 12px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}
                                >
                                  Reply ↗
                                </Link>
                              )}
                              <button
                                onClick={() => handleDeleteQuestion(q.id, q.content.substring(0, 30))}
                                className={styles.revokeBtn}
                                title="Delete Question"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 6: InnoTech Events Management */}
        {activeTab === 'competitions' && (
          <div className={styles.layoutGrid}>
            {/* Left side: Competitions List */}
            <div className={`${styles.tableCard} glass-card`}>
              <div className={styles.searchHeader}>
                <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Active InnoTech Challenges</h3>
                <div className={styles.searchInputWrapper}>
                  <Search size={16} className={styles.searchIcon} />
                  <input
                    type="text"
                    placeholder="Search events by title..."
                    value={compSearch}
                    onChange={(e) => setCompSearch(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: '42px', fontSize: '13px' }}
                  />
                </div>
              </div>

              {filteredCompetitions.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No competitions or events found.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className={styles.adminTable}>
                    <thead>
                      <tr>
                        <th className={styles.th}>Event Details</th>
                        <th className={styles.th}>Timeline</th>
                        <th className={styles.th}>Submissions</th>
                        <th className={styles.th}>Status</th>
                        <th className={styles.th} style={{ textAlign: 'center' }}>Remove</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCompetitions.map((comp) => {
                        const now = new Date();
                        const isUpcoming = now < new Date(comp.startDate);
                        const isExpired = now > new Date(comp.endDate);
                        const isActive = !isUpcoming && !isExpired;
                        
                        let statusText = 'Active';
                        let statusStyle = styles.roleInstructor; // Orange-ish
                        if (isUpcoming) {
                          statusText = 'Upcoming';
                          statusStyle = styles.roleStudent; // Cyan-ish
                        } else if (isExpired) {
                          statusText = 'Completed';
                          statusStyle = styles.roleAdmin; // Purple-ish
                        }

                        return (
                          <tr key={comp.id} className={styles.tr}>
                            <td className={styles.td}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <img 
                                  src={comp.image} 
                                  alt={comp.title} 
                                  style={{ width: '48px', height: '32px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border-trans)' }} 
                                />
                                <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{comp.title}</div>
                              </div>
                            </td>
                            <td className={styles.td} style={{ fontSize: '12px' }}>
                              <div><strong>Start:</strong> {new Date(comp.startDate).toLocaleDateString()}</div>
                              <div><strong>End:</strong> {new Date(comp.endDate).toLocaleDateString()}</div>
                            </td>
                            <td className={styles.td} style={{ fontWeight: '700', color: 'var(--primary)' }}>
                              {comp._count?.submissions || 0}
                            </td>
                            <td className={styles.td}>
                              <select
                                value={comp.status || 'REGISTRATIONS_OPEN'}
                                onChange={(e) => handleCompStatusChange(comp.id, e.target.value, comp.title)}
                                className={styles.roleSelectInline}
                                style={{ fontSize: '11.5px', padding: '5px 8px', borderRadius: '6px' }}
                              >
                                <option value="REGISTRATIONS_OPEN">Registrations Open</option>
                                <option value="REGISTRATIONS_CLOSED">Registrations Closed</option>
                                <option value="RESULT">Result Out</option>
                              </select>
                            </td>
                            <td className={styles.td}>
                              <div style={{ display: 'flex', justifyContent: 'center' }}>
                                <button
                                  onClick={() => handleDeleteCompetition(comp.id, comp.title)}
                                  className={styles.revokeBtn}
                                  title="Delete Competition event"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Right side: Add Competition Form */}
            <div className={`${styles.formCard} glass-card`}>
              <h3 className={styles.formTitle}>
                <PlusCircle size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                Create New Event
              </h3>
              <form onSubmit={handleCreateCompetition} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className={styles.formGroup}>
                  <label className={styles.label} style={{ fontSize: '13px' }}>Event Title *</label>
                  <input
                    type="text"
                    placeholder="e.g. GLAM LENS 2026 Mobile Challenge"
                    value={compTitle}
                    onChange={(e) => setCompTitle(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label} style={{ fontSize: '13px' }}>Start Date *</label>
                  <input
                    type="datetime-local"
                    value={compStartDate}
                    onChange={(e) => setCompStartDate(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label} style={{ fontSize: '13px' }}>End Date *</label>
                  <input
                    type="datetime-local"
                    value={compEndDate}
                    onChange={(e) => setCompEndDate(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label} style={{ fontSize: '13px' }}>Event Status *</label>
                  <select 
                    value={compStatus} 
                    onChange={(e) => setCompStatus(e.target.value)}
                    className={styles.selectInput}
                    required
                  >
                    <option value="REGISTRATIONS_OPEN">Registrations Open</option>
                    <option value="REGISTRATIONS_CLOSED">Registrations Closed</option>
                    <option value="RESULT">Result Out</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label} style={{ fontSize: '13px' }}>Cover Image URL</label>
                  <input
                    type="text"
                    placeholder="https://images.unsplash.com/..."
                    value={compImage}
                    onChange={(e) => setCompImage(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label} style={{ fontSize: '13px' }}>Competition Rules</label>
                  <textarea
                    placeholder="Provide bullet rules (e.g. 1. No AI-gen. 2. Must be original...)"
                    value={compRules}
                    onChange={(e) => setCompRules(e.target.value)}
                    className={styles.textareaInput}
                    style={{ minHeight: '60px' }}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label} style={{ fontSize: '13px' }}>Event Description</label>
                  <textarea
                    placeholder="Provide a detailed description of the contest details..."
                    value={compDescription}
                    onChange={(e) => setCompDescription(e.target.value)}
                    className={styles.textareaInput}
                    style={{ minHeight: '80px' }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={createCompLoading}
                  className="btn-primary"
                  style={{ width: '100%', padding: '12px', marginTop: '10px', fontSize: '13px' }}
                >
                  {createCompLoading ? 'Creating Event...' : 'Create Event'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Tab 7: Coupons Management */}
        {activeTab === 'coupons' && (
          <div className={styles.layoutGrid}>
            {/* Left side: Coupons List */}
            <div className={`${styles.tableCard} glass-card`}>
              <div className={styles.searchHeader}>
                <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Active Coupon Codes</h3>
                <div className={styles.searchInputWrapper}>
                  <Search size={16} className={styles.searchIcon} />
                  <input
                    type="text"
                    placeholder="Search coupons by code..."
                    value={couponSearch}
                    onChange={(e) => setCouponSearch(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: '42px', fontSize: '13px' }}
                  />
                </div>
              </div>

              {filteredCoupons.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No coupon codes found.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className={styles.adminTable}>
                    <thead>
                      <tr>
                        <th className={styles.th}>Code</th>
                        <th className={styles.th}>Type</th>
                        <th className={styles.th}>Value</th>
                        <th className={styles.th}>Status</th>
                        <th className={styles.th}>Expiry</th>
                        <th className={styles.th}>Uses</th>
                        <th className={styles.th} style={{ textAlign: 'center' }}>Remove</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCoupons.map((coupon) => {
                        const isExpired = coupon.expiresAt && new Date() > new Date(coupon.expiresAt);
                        const statusText = isExpired ? 'Expired' : coupon.active ? 'Active' : 'Inactive';
                        const statusStyle = isExpired ? styles.roleAdmin : coupon.active ? styles.roleStudent : styles.roleTester;

                        return (
                          <tr key={coupon.id} className={styles.tr}>
                            <td className={styles.td} style={{ fontWeight: '700', color: 'var(--primary)' }}>
                              {coupon.code}
                            </td>
                            <td className={styles.td} style={{ fontSize: '13px' }}>
                              {coupon.discountType}
                            </td>
                            <td className={styles.td} style={{ fontWeight: '700' }}>
                              {coupon.discountType === 'PERCENTAGE' ? `${coupon.discountValue}%` : `₹${coupon.discountValue}`}
                            </td>
                            <td className={styles.td}>
                              <span className={`${styles.roleBadge} ${statusStyle}`}>
                                {statusText}
                              </span>
                            </td>
                            <td className={styles.td} style={{ fontSize: '12px' }}>
                              {coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString() : 'Never'}
                            </td>
                            <td className={styles.td} style={{ fontWeight: '700', color: 'var(--primary)' }}>
                              {coupon._count?.enrollments || 0}
                            </td>
                            <td className={styles.td}>
                              <div style={{ display: 'flex', justifyContent: 'center' }}>
                                <button
                                  onClick={() => handleDeleteCoupon(coupon.id, coupon.code)}
                                  className={styles.revokeBtn}
                                  title="Delete Coupon"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Right side: Add Coupon Form */}
            <div className={`${styles.formCard} glass-card`}>
              <h3 className={styles.formTitle}>
                <PlusCircle size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                Create New Coupon
              </h3>
              <form onSubmit={handleCreateCoupon} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className={styles.formGroup}>
                  <label className={styles.label} style={{ fontSize: '13px' }}>Coupon Code *</label>
                  <input
                    type="text"
                    placeholder="e.g. DISCOUNT10"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    className="form-input"
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label} style={{ fontSize: '13px' }}>Discount Type *</label>
                  <select 
                    value={discountType} 
                    onChange={(e) => setDiscountType(e.target.value)}
                    className={styles.selectInput}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      backgroundColor: 'var(--bg-inputs)',
                      border: '2px solid var(--border-trans)',
                      borderRadius: 'var(--radius-inputs)',
                      color: 'var(--text-primary)',
                      fontWeight: '700',
                      outline: 'none',
                    }}
                    required
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED">Fixed Amount (₹)</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label} style={{ fontSize: '13px' }}>Discount Value *</label>
                  <input
                    type="number"
                    placeholder={discountType === 'PERCENTAGE' ? 'e.g. 10' : 'e.g. 299'}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    className="form-input"
                    min="1"
                    max={discountType === 'PERCENTAGE' ? '100' : undefined}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label} style={{ fontSize: '13px' }}>Expiry Date (Optional)</label>
                  <input
                    type="date"
                    value={couponExpiry}
                    onChange={(e) => setCouponExpiry(e.target.value)}
                    className="form-input"
                  />
                </div>

                <button
                  type="submit"
                  disabled={createCouponLoading}
                  className="btn-primary"
                  style={{ width: '100%', padding: '12px', marginTop: '10px', fontSize: '13px' }}
                >
                  {createCouponLoading ? 'Creating Coupon...' : 'Create Coupon'}
                </button>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

