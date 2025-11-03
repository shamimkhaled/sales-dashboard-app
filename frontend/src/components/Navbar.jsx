import { Link, useLocation } from 'react-router-dom';
import { FaChartLine, FaPlus, FaEye, FaFileImport } from 'react-icons/fa';

function Navbar() {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Dashboard', icon: FaChartLine },
    { path: '/data-entry', label: 'Data Entry', icon: FaPlus },
    { path: '/view-data', label: 'View Data', icon: FaEye },
    { path: '/import-export', label: 'Import/Export', icon: FaFileImport },
  ];

  return (
    <nav className="navbar-luxury sticky top-0 z-50">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="navbar-brand-luxury flex items-center space-x-3">
            <FaChartLine className="text-2xl" />
            <span>Sales Analytics</span>
          </Link>

          <div className="hidden md:flex items-center space-x-1">
            {navItems.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={`nav-link-luxury flex items-center space-x-2 ${
                  location.pathname === path ? 'text-gold-400' : ''
                }`}
              >
                <Icon className="text-sm" />
                <span>{label}</span>
              </Link>
            ))}
          </div>

          {/* Mobile menu button */}
          <button className="md:hidden text-gold-400 hover:text-gold-300 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        <div className="md:hidden pb-4">
          <div className="flex flex-col space-y-2">
            {navItems.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={`nav-link-luxury flex items-center space-x-3 py-2 px-4 rounded-lg ${
                  location.pathname === path ? 'bg-gold-400/10 text-gold-400' : ''
                }`}
              >
                <Icon className="text-sm" />
                <span>{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;