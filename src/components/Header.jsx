'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useState, useRef, useEffect } from 'react';
import { useCart } from './Providers';
import { 
  Search, 
  ShoppingCart, 
  User, 
  LogOut, 
  BookOpen, 
  Award, 
  LayoutDashboard, 
  Trash2, 
  Play,
  Sun,
  Moon
} from 'lucide-react';
import styles from './Header.module.css';
export default function Header() {
  const pathname = usePathname();
  const isActive = (path) => pathname === path || pathname?.startsWith(path + '/');
  const router = useRouter();
  const { data: session } = useSession();
  const { cart, removeFromCart } = useCart();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCart, setShowCart] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const cartRef = useRef(null);
  const userMenuRef = useRef(null);
  const [theme, setTheme] = useState('dark');
  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('upgradeskills_theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);
  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('upgradeskills_theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };
  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (cartRef.current && !cartRef.current.contains(event.target)) {
        setShowCart(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/courses?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push('/courses');
    }
  };
  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };
  const totalCartPrice = cart.reduce((acc, item) => acc + item.price, 0);
  return (
    <header className={styles.header}>
      <div className={styles.container}>
        {/* Logo */}
        <Link href="/" className={styles.logo}>
          <img 
            src="/logo.png" 
            alt="UpgradeSkills Logo" 
            style={{ height: '36px', objectFit: 'contain' }} 
          />
        </Link>
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className={styles.searchForm}>
          <Search size={18} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search for business plans, code, tech, design..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </form>
        {/* Navigation */}
        <nav className={styles.nav}>
          <Link 
            href="/courses" 
            className={`${styles.navLink} ${pathname === '/courses' ? styles.navLinkActive : ''}`}
          >
            Courses
          </Link>
          <Link 
            href="/innotechxperience" 
            className={`${styles.navLink} ${pathname.startsWith('/innotechxperience') ? styles.navLinkActive : ''}`}
          >
            InnoTechXperience
          </Link>
        </nav>
        {/* Actions */}
        <div className={styles.actions}>
          {/* Theme Toggle */}
          <button 
            onClick={toggleTheme} 
            className={styles.themeToggle} 
            aria-label="Toggle Theme"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          {/* Cart */}
          <div className="relative" ref={cartRef}>
            <button 
              onClick={() => setShowCart(!showCart)} 
              className={styles.cartButton}
              aria-label="Shopping Cart"
            >
              <ShoppingCart size={22} />
              {cart.length > 0 && <span className={styles.cartCount}>{cart.length}</span>}
            </button>
            {showCart && (
              <div className={styles.cartDropdown}>
                <h4 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '8px' }}>Shopping Cart</h4>
                {cart.length === 0 ? (
                  <div className={styles.cartDropdownEmpty}>Your cart is empty.</div>
                ) : (
                  <>
                    <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {cart.map((item) => (
                        <div key={item.id} className={styles.cartItem}>
                          <img 
                            src={item.thumbnail} 
                            alt={item.title} 
                            className={styles.cartItemThumbnail} 
                          />
                          <div className={styles.cartItemDetails}>
                            <div className={styles.cartItemTitle}>{item.title}</div>
                            <div className={styles.cartItemPrice}>₹{item.price}</div>
                          </div>
                          <button 
                            onClick={() => removeFromCart(item.id)} 
                            className={styles.removeCartItem}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className={styles.cartTotal}>
                      <span>Total:</span>
                      <span className="text-gradient">₹{totalCartPrice}</span>
                    </div>
                    <Link 
                      href={`/checkout?courseId=${cart[0]?.id}`}
                      onClick={() => setShowCart(false)} 
                      className="btn-primary" 
                      style={{ padding: '10px 14px', fontSize: '14px', textAlign: 'center' }}
                    >
                      Checkout
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
          {/* User auth */}
          {session ? (
            <div className={styles.userMenuContainer} ref={userMenuRef}>
              <div 
                className={styles.avatar} 
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                {getInitials(session.user.name)}
              </div>
              {showUserMenu && (
                <div className={styles.userDropdown}>
                  <div className={styles.userDropdownInfo}>
                    <div className={styles.userDropdownName}>{session.user.name}</div>
                    <span className={`${styles.roleBadge} ${
                      session.user.role === 'ADMIN' ? styles.roleAdmin : 
                      session.user.role === 'INSTRUCTOR' ? styles.roleInstructor : 
                      styles.roleStudent
                    }`}>
                      {session.user.role}
                    </span>
                  </div>
                  <Link 
                    href="/classroom" 
                    onClick={() => setShowUserMenu(false)}
                    className={`${styles.userDropdownLink} ${isActive('/classroom') ? styles.activeDropdownLink : ''}`}
                  >
                    <BookOpen size={16} />
                    My Learning
                  </Link>
                  {session.user.role === 'ADMIN' && (
                    <Link 
                      href="/admin" 
                      onClick={() => setShowUserMenu(false)}
                      className={`${styles.userDropdownLink} ${isActive('/admin') ? styles.activeDropdownLink : ''}`}
                    >
                      <LayoutDashboard size={16} />
                      Admin Dashboard
                    </Link>
                  )}
                  {(session.user.role === 'INSTRUCTOR' || session.user.role === 'ADMIN') && (
                    <Link 
                      href="/instructor" 
                      onClick={() => setShowUserMenu(false)}
                      className={`${styles.userDropdownLink} ${isActive('/instructor') ? styles.activeDropdownLink : ''}`}
                    >
                      <LayoutDashboard size={16} />
                      Instructor Panel
                    </Link>
                  )}
                  <Link 
                    href="/innotechxperience/my-submissions" 
                    onClick={() => setShowUserMenu(false)}
                    className={`${styles.userDropdownLink} ${isActive('/innotechxperience/my-submissions') ? styles.activeDropdownLink : ''}`}
                  >
                    <Award size={16} />
                    My Submissions
                  </Link>
                  <div 
                    onClick={() => {
                      setShowUserMenu(false);
                      signOut({ callbackUrl: '/' });
                    }} 
                    className={`${styles.userDropdownLink} ${styles.signOutBtn}`}
                  >
                    <LogOut size={16} />
                    Sign Out
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Link 
                href="/auth/signin" 
                className="btn-secondary" 
                style={{ padding: '8px 16px', fontSize: '14px' }}
              >
                Log In
              </Link>
              <Link 
                href="/auth/signup" 
                className="btn-primary" 
                style={{ padding: '8px 16px', fontSize: '14px' }}
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
