import React, { useState, useEffect, createContext, useContext } from 'react';
import { Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  BarChart3, 
  Settings, 
  Menu, 
  X,
  LogOut,
  TrendingUp,
  ShieldAlert,
  Users,
  User as UserIcon,
  Crown,
  ShieldCheck,
  Database,
  HardDrive
} from 'lucide-react';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Sales from './pages/Sales';
import Reports from './pages/Reports';
import Auth from './pages/Auth';
import AdminDashboard from './pages/AdminDashboard';
import AdminSettings from './pages/AdminSettings';
import UserSettings from './pages/UserSettings';
import DataCenter from './pages/DataCenter';
import { Product, Sale, User, UserRole, SubscriptionLevel } from './types';

// Auth Context
interface AuthContextType {
  user: User | null;
  login: (email: string, pass: string) => boolean;
  signup: (name: string, email: string, pass: string, role?: UserRole, sub?: SubscriptionLevel) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem('biz_current_user');
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  const login = (email: string, pass: string) => {
    const users = JSON.parse(localStorage.getItem('biz_users') || '[]');
    const index = users.findIndex((u: any) => u.email === email && u.password === pass);
    
    if (index !== -1) {
      users[index].lastActive = Date.now();
      localStorage.setItem('biz_users', JSON.stringify(users));

      const found = users[index];
      const userData: User = { 
        id: found.id, 
        name: found.name, 
        email: found.email, 
        role: found.role, 
        subscription: found.subscription,
        lastActive: found.lastActive
      };
      setUser(userData);
      localStorage.setItem('biz_current_user', JSON.stringify(userData));
      return true;
    }
    return false;
  };

  const signup = (name: string, email: string, pass: string, role: UserRole = 'user', subscription: SubscriptionLevel = 'free') => {
    const users = JSON.parse(localStorage.getItem('biz_users') || '[]');
    if (users.find((u: any) => u.email === email)) return false;
    
    const newUser = { 
      id: Date.now().toString(), 
      name, 
      email, 
      password: pass, 
      role, 
      subscription,
      lastActive: Date.now()
    };
    users.push(newUser);
    localStorage.setItem('biz_users', JSON.stringify(users));
    
    const userData: User = { 
      id: newUser.id, 
      name, 
      email, 
      role, 
      subscription,
      lastActive: newUser.lastActive
    };
    setUser(userData);
    localStorage.setItem('biz_current_user', JSON.stringify(userData));
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('biz_current_user');
    navigate('/');
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Business Context
interface BusinessContextType {
  products: Product[];
  sales: Sale[];
  addProduct: (p: Omit<Product, 'id' | 'owner_id'>) => void;
  updateProduct: (p: Product) => void;
  deleteProduct: (id: string) => void;
  recordSale: (productId: string, quantity: number) => void;
  reloadBusinessData: () => void;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);
export const useBusiness = () => {
  const context = useContext(BusinessContext);
  if (!context) throw new Error("useBusiness must be used within a BusinessProvider");
  return context;
};

const BusinessProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const { user } = useAuth();

  const reloadBusinessData = () => {
    if (!user || user.role === 'admin') return;
    const prefix = "owner_" + user.id + "_";
    const storedProducts = localStorage.getItem(prefix + "products");
    const storedSales = localStorage.getItem(prefix + "sales");
    setProducts(storedProducts ? JSON.parse(storedProducts) : []);
    setSales(storedSales ? JSON.parse(storedSales) : []);
  };

  useEffect(() => {
    reloadBusinessData();
  }, [user]);

  const persist = (updatedProducts: Product[], updatedSales: Sale[]) => {
    if (!user || user.role === 'admin') return;
    const prefix = "owner_" + user.id + "_";
    localStorage.setItem(prefix + "products", JSON.stringify(updatedProducts));
    localStorage.setItem(prefix + "sales", JSON.stringify(updatedSales));
  };

  const addProduct = (p: any) => {
    if (!user) return;
    const newProduct = { ...p, id: Date.now().toString(), owner_id: user.id };
    const updated = [...products, newProduct];
    setProducts(updated);
    persist(updated, sales);
  };

  const updateProduct = (p: Product) => {
    if (!user || p.owner_id !== user.id) return;
    const updated = products.map(item => item.id === p.id ? p : item);
    setProducts(updated);
    persist(updated, sales);
  };

  const deleteProduct = (id: string) => {
    if (!user) return;
    const updated = products.filter(item => item.id !== id);
    setProducts(updated);
    persist(updated, sales);
  };

  const recordSale = (productId: string, quantity: number) => {
    if (!user) return;
    const product = products.find(p => p.id === productId);
    if (!product || product.stockQuantity < quantity) return;

    const newSale: Sale = {
      id: Date.now().toString(),
      owner_id: user.id,
      productId,
      productName: product.name,
      quantity,
      unitPrice: product.sellingPrice,
      unitCost: product.costPrice,
      totalPrice: product.sellingPrice * quantity,
      totalProfit: (product.sellingPrice - product.costPrice) * quantity,
      timestamp: Date.now(),
    };

    const updatedSales = [newSale, ...sales];
    const updatedProducts = products.map(p => 
      p.id === productId ? { ...p, stockQuantity: p.stockQuantity - quantity } : p
    );

    setSales(updatedSales);
    setProducts(updatedProducts);
    persist(updatedProducts, updatedSales);
  };

  return (
    <BusinessContext.Provider value={{ products, sales, addProduct, updateProduct, deleteProduct, recordSale, reloadBusinessData }}>
      {children}
    </BusinessContext.Provider>
  );
};

const ProtectedRoute: React.FC<{ children: React.ReactNode; roles?: UserRole[] }> = ({ children, roles }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  return <>{children}</>;
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();

  const navItems = user?.role === 'admin' 
    ? [
        { name: 'Admin Hub', icon: ShieldAlert, path: '/admin' },
        { name: 'System Settings', icon: Settings, path: '/admin/settings' }
      ]
    : [
        { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
        { name: 'Products', icon: Package, path: '/products' },
        { name: 'Sales', icon: ShoppingCart, path: '/sales' },
        { name: 'Reports', icon: BarChart3, path: '/reports' },
        { name: 'Data Center', icon: HardDrive, path: '/data' },
        { name: 'Settings', icon: Settings, path: '/settings' },
      ];

  const isPublicPage = ['/', '/login', '/signup'].includes(location.pathname);
  if (isPublicPage) return <>{children}</>;

  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out md:translate-x-0 md:static ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-full flex flex-col">
          <div className="p-6 flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
              <TrendingUp size={24} />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">BizFlow Pro</span>
          </div>
          <nav className="flex-1 px-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  location.pathname === item.path 
                  ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <item.icon size={20} />
                {item.name}
              </Link>
            ))}
          </nav>
          <div className="p-4 border-t border-slate-200 space-y-2">
            {user?.subscription === 'free' && user.role === 'user' && (
              <div className="bg-amber-50 p-3 rounded-xl mb-4 border border-amber-100">
                <p className="text-[10px] font-bold text-amber-600 uppercase mb-1">Free Tier</p>
                <p className="text-xs text-amber-700 mb-2">Upgrade for AI insights.</p>
                <button className="w-full py-1.5 bg-amber-500 text-white text-[10px] font-bold rounded-lg hover:bg-amber-600 transition-all">Go Pro</button>
              </div>
            )}
             <button onClick={logout} className="flex items-center gap-3 w-full px-4 py-3 text-rose-600 hover:bg-rose-50 rounded-xl transition-all font-medium">
              <LogOut size={20} />
              Sign Out
            </button>
          </div>
        </div>
      </aside>
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 md:px-8 shrink-0">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="md:hidden p-2 hover:bg-slate-100 rounded-lg">
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="flex items-center justify-end gap-2">
                {user?.subscription === 'pro' && <Crown size={14} className="text-amber-500" />}
                <p className="text-sm font-bold text-slate-900">{user?.name}</p>
              </div>
              <div className={`mt-0.5 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-sm ${
                user?.role === 'admin' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'
              }`}>
                {user?.role === 'admin' ? 'Admin Portal' : 'User Portal'}
              </div>
            </div>
            <div className={`w-10 h-10 rounded-full border flex items-center justify-center font-bold shadow-sm ${
              user?.role === 'admin' ? 'bg-rose-100 border-rose-200 text-rose-600' : 'bg-indigo-100 border-indigo-200 text-indigo-600'
            }`}>
              {user?.name ? user.name[0] : '?'}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {children}
        </main>
      </div>
      {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/50 z-40 md:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <BusinessProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Auth mode="login" />} />
            <Route path="/signup" element={<Auth mode="signup" />} />
            <Route path="/dashboard" element={<ProtectedRoute roles={['user']}><Dashboard /></ProtectedRoute>} />
            <Route path="/products" element={<ProtectedRoute roles={['user']}><Products /></ProtectedRoute>} />
            <Route path="/sales" element={<ProtectedRoute roles={['user']}><Sales /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute roles={['user']}><Reports /></ProtectedRoute>} />
            <Route path="/data" element={<ProtectedRoute roles={['user']}><DataCenter /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute roles={['user']}><UserSettings /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/settings" element={<ProtectedRoute roles={['admin']}><AdminSettings /></ProtectedRoute>} />
          </Routes>
        </Layout>
      </BusinessProvider>
    </AuthProvider>
  );
}