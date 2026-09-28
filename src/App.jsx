import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { BrowserRouter, Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  Check,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  FolderKanban,
  LayoutGrid,
  LogOut,
  MoonStar,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  SunMedium,
  Trash2,
  X,
} from "lucide-react";
import "./App.css";
import { authService } from "./auth";
import { useTheme } from "./theme";

const STORAGE_KEY = "daymark-tasks-v1";
const currentDate = new Date();
const today = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(currentDate.getDate()).padStart(2, "0")}`;

const starterTasks = [
  { id: "task-1", title: "Review Q3 product roadmap", project: "Studio", priority: "high", due: today, done: false },
  { id: "task-2", title: "Send the updated proposal to Maya", project: "Client work", priority: "medium", due: today, done: false },
  { id: "task-3", title: "Book a table for Friday", project: "Personal", priority: "low", due: today, done: true },
  { id: "task-4", title: "Read the research notes", project: "Studio", priority: "low", due: "", done: false },
];

const filters = ["All tasks", "Today", "Upcoming", "Completed"];
const projectMeta = { Studio: "studio", "Client work": "work", Personal: "personal" };
const AuthContext = createContext(null);

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

function AppRoutes() {
  const [user, setUser] = useState(() => authService.getCurrentUser());

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      <Routes>
        <Route path="/" element={<ProtectedRoute><TaskApp /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
        <Route path="/signup" element={<PublicOnlyRoute><SignupPage /></PublicOnlyRoute>} />
        <Route path="/forgot-password" element={<PublicOnlyRoute><ForgotPasswordPage /></PublicOnlyRoute>} />
        <Route path="/pricing" element={<PublicLayout><PricingPage /></PublicLayout>} />
        <Route path="/terms" element={<PublicLayout><TermsPage /></PublicLayout>} />
        <Route path="/privacy" element={<PublicLayout><PrivacyPage /></PublicLayout>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthContext.Provider>
  );
}

function ProtectedRoute({ children }) {
  const { user } = useContext(AuthContext);
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}

function PublicOnlyRoute({ children }) {
  const { user } = useContext(AuthContext);

  if (user) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function TaskApp() {
  const { user, setUser } = useContext(AuthContext);
  const [tasks, setTasks] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : starterTasks;
    } catch {
      return starterTasks;
    }
  });
  const [filter, setFilter] = useState("Today");
  const [query, setQuery] = useState("");
  const [title, setTitle] = useState("");
  const [project, setProject] = useState("Studio");
  const [priority, setPriority] = useState("medium");
  const [due, setDue] = useState(today);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [toast, setToast] = useState(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const titleRef = useRef(null);
  const searchRef = useRef(null);
  const [theme, setTheme] = useTheme();

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    function handleShortcuts(event) {
      const target = event.target;
      const targetTag = target && target.tagName;
      const isTyping = targetTag === "INPUT" || targetTag === "TEXTAREA" || targetTag === "SELECT";

      if (event.key === "Escape") {
        setAdding(false);
        setEditingId(null);
        setMenuOpenId(null);
        setShowShortcuts(false);
        return;
      }

      if (event.key === "?") {
        if (!isTyping) {
          event.preventDefault();
          setShowShortcuts((current) => !current);
        }
        return;
      }

      if (isTyping) return;

      if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        setAdding(true);
        requestAnimationFrame(() => titleRef.current?.focus());
      }

      if (event.key === "/") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }

    window.addEventListener("keydown", handleShortcuts);
    return () => window.removeEventListener("keydown", handleShortcuts);
  }, []);

  const visibleTasks = useMemo(
    () =>
      tasks
        .filter((task) => {
          if (filter === "Today") return task.due === today && !task.done;
          if (filter === "Upcoming") return task.due > today && !task.done;
          if (filter === "Completed") return task.done;
          return true;
        })
        .filter((task) => `${task.title} ${task.project}`.toLowerCase().includes(query.trim().toLowerCase()))
        .sort((a, b) => {
          const order = ["high", "medium", "low"];
          const doneDiff = Number(a.done) - Number(b.done);
          if (doneDiff !== 0) return doneDiff;
          return order.indexOf(a.priority) - order.indexOf(b.priority);
        }),
    [tasks, filter, query],
  );

  const todayTasks = tasks.filter((task) => task.due === today);
  const completedToday = todayTasks.filter((task) => task.done).length;
  const openToday = todayTasks.length - completedToday;
  const progress = todayTasks.length ? Math.round((completedToday / todayTasks.length) * 100) : 0;
  const openTaskCount = tasks.filter((task) => !task.done).length;
  const completedTaskCount = tasks.filter((task) => task.done).length;

  function addTask(event) {
    event.preventDefault();
    if (!title.trim()) return;

    setTasks((current) => [{
      id: crypto.randomUUID(),
      title: title.trim(),
      project,
      priority,
      due,
      done: false,
    }, ...current]);

    setTitle("");
    setProject("Studio");
    setPriority("medium");
    setDue(today);
    setAdding(false);
  }

  function toggleTask(taskId) {
    const task = tasks.find((entry) => entry.id === taskId);
    if (!task) return;
    const nextValue = !task.done;

    setTasks((current) => current.map((item) => (item.id === taskId ? { ...item, done: nextValue } : item)));
    setToast({
      message: nextValue ? "Task completed" : "Task reopened",
      action: "Undo",
      onAction: () => setTasks((current) => current.map((item) => (item.id === taskId ? { ...item, done: !nextValue } : item))),
    });
  }

  function saveEdit(taskId) {
    if (!editTitle.trim()) return;
    setTasks((current) => current.map((task) => (task.id === taskId ? { ...task, title: editTitle.trim() } : task)));
    setEditingId(null);
    setEditTitle("");
  }

  function deleteTask(taskId) {
    setTasks((current) => current.filter((task) => task.id !== taskId));
    setMenuOpenId(null);
    setEditingId(null);
  }

  function handleLogout() {
    authService.logout();
    setUser(null);
  }

  function formatDateValue(dateValue) {
    if (!dateValue) return "No due date";
    if (dateValue === today) return "Today";
    return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(`${dateValue}T12:00:00`));
  }

  const dateLabel = new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(new Date());

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <Link to="/" className="brand" aria-label="Daymark home">
          <span className="brand-mark">d<span>.</span></span>
          <span>daymark</span>
        </Link>

        <div className="sidebar-label">Workspace</div>
        <nav className="sidebar-nav" aria-label="Task filters">
          {filters.map((item) => (
            <button
              key={item}
              type="button"
              className={`nav-item ${filter === item ? "active" : ""}`}
              onClick={() => setFilter(item)}
            >
              <span className="nav-icon">
                {item === "All tasks" ? <LayoutGrid size={16} /> : item === "Today" ? <CheckCircle2 size={16} /> : item === "Upcoming" ? <CalendarIcon /> : <FolderKanban size={16} />}
              </span>
              <span>{item}</span>
              <span className="nav-count">
                {item === "Today" ? openToday : item === "Completed" ? completedTaskCount : item === "All tasks" ? openTaskCount : tasks.filter((task) => task.due > today && !task.done).length}
              </span>
            </button>
          ))}
        </nav>

        <div className="sidebar-divider" />

        <div className="sidebar-label">Your spaces</div>
        <div className="space-list">
          {Object.keys(projectMeta).map((space) => (
            <button key={space} type="button" className="space-item" onClick={() => { setFilter("All tasks"); setQuery(space); }}>
              <span className={`space-dot ${projectMeta[space] || "studio"}`} />
              <span>{space}</span>
            </button>
          ))}
        </div>

        <div className="sidebar-footer">
          <div className="well-card">
            <div className="well-header">Free plan</div>
            <strong>3 of 50 tasks used</strong>
            <p>Upgrade to unlock automation and deeper planning.</p>
            <div className="well-row"><span>Usage</span><span>6%</span></div>
            <div className="progress-bar"><span style={{ width: "6%" }} /></div>
            <button type="button" className="primary-button full-width">Upgrade</button>
          </div>

          <div className="user-card">
            <div className="avatar">{user?.name?.slice(0, 2).toUpperCase() || "JD"}</div>
            <div className="user-meta">
              <strong>{user?.name || "Jordan Davis"}</strong>
              <span>Personal workspace</span>
              <span className="plan-badge">{user?.plan || "Pro"}</span>
            </div>
            <button type="button" className="menu-button" aria-label="Account menu" onClick={() => setMenuOpenId((current) => (current ? null : "account"))}>
              <ChevronDown size={16} />
            </button>

            {menuOpenId === "account" && (
              <div className="user-menu-popover">
                <Link to="/settings" className="menu-link" onClick={() => setMenuOpenId(null)}><Settings size={15} /> Settings</Link>
                <button type="button" className="menu-link" onClick={() => setMenuOpenId(null)}><CreditCard size={15} /> Billing</button>
                <button type="button" className="menu-link" onClick={() => setMenuOpenId(null)}><Bell size={15} /> Notifications</button>
                <Link to="/terms" className="menu-link" onClick={() => setMenuOpenId(null)}><ShieldCheck size={15} /> Terms</Link>
                <button type="button" className="menu-link" onClick={handleLogout}><LogOut size={15} /> Log out</button>
              </div>
            )}
          </div>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div className="crumb">My workspace <span>/</span> <strong>{filter}</strong></div>
          <div className="topbar-actions">
            <span className="tag-pill"><span className="tag-dot" /> {openToday} tasks due</span>
            <ThemeToggle theme={theme} setTheme={setTheme} />
          </div>
        </header>

        <div className="content-wrap">
          <section className="page-header">
            <div>
              <div className="eyebrow">{dateLabel.toUpperCase()}</div>
              <h1>{filter === "Today" ? "Today" : filter === "All tasks" ? "Your tasks" : filter === "Upcoming" ? "Upcoming" : "Completed"}</h1>
            </div>
            <div className="date-block" aria-label="Current date">
              <span className="date-number">{new Date().getDate()}</span>
              <span className="date-month">{new Intl.DateTimeFormat("en", { month: "short" }).format(new Date())}</span>
            </div>
          </section>

          <section className="progress-panel">
            <div className="progress-icon"><Check size={18} /></div>
            <div className="progress-copy">
              <strong>{progress}% complete</strong>
              <span>{completedToday} of {todayTasks.length || 0} tasks done</span>
            </div>
            <div className="meter" role="progressbar" aria-valuenow={progress} aria-valuemin="0" aria-valuemax="100">
              <span style={{ width: `${progress}%` }} />
            </div>
            <div className="progress-value">{progress}%</div>
          </section>

          <section className="task-panel">
            <div className="task-toolbar">
              <div className="task-toolbar-title">
                <h2>{filter}</h2>
                <span className="count-pill">{visibleTasks.length}</span>
              </div>
              <div className="toolbar-actions">
                <label className="search-field">
                  <Search size={16} />
                  <input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tasks" />
                  <span className="key-cap">/</span>
                </label>
                <button type="button" className="primary-button add-button" onClick={() => { setAdding(true); requestAnimationFrame(() => titleRef.current?.focus()); }}>
                  <Plus size={16} /> Add task <span className="key-cap">N</span>
                </button>
              </div>
            </div>

            {adding && (
              <form className="task-composer" onSubmit={addTask}>
                <div className="composer-row">
                  <span className="quick-check" />
                  <input ref={titleRef} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What needs to get done?" aria-label="New task title" autoFocus />
                </div>
                <div className="composer-fields">
                  <select value={project} onChange={(event) => setProject(event.target.value)} aria-label="Project">
                    <option value="Studio">Studio</option>
                    <option value="Client work">Client work</option>
                    <option value="Personal">Personal</option>
                  </select>
                  <select value={priority} onChange={(event) => setPriority(event.target.value)} aria-label="Priority">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                  <input type="date" value={due} onChange={(event) => setDue(event.target.value)} aria-label="Due date" />
                  <div className="composer-actions">
                    <button type="button" className="ghost-button" onClick={() => setAdding(false)}>Cancel</button>
                    <button type="submit" className="primary-button">Create task</button>
                  </div>
                </div>
              </form>
            )}

            {visibleTasks.length > 0 ? (
              <div className="task-list" aria-live="polite">
                {visibleTasks.map((task) => (
                  <article key={task.id} className={`task-row ${task.done ? "done" : ""}`}>
                    <button type="button" className={`task-check ${task.done ? "checked" : ""}`} onClick={() => toggleTask(task.id)} aria-label={task.done ? `Mark ${task.title} incomplete` : `Mark ${task.title} complete`}>
                      {task.done ? <Check size={14} /> : null}
                    </button>

                    <div className="task-main">
                      <div className="task-copy">
                        {editingId === task.id ? (
                          <form onSubmit={(event) => { event.preventDefault(); saveEdit(task.id); }} className="inline-edit-form">
                            <input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} aria-label="Edit task title" autoFocus />
                            <button type="submit" className="primary-button">Save</button>
                          </form>
                        ) : (
                          <button type="button" className="task-title-button" onDoubleClick={() => { setEditingId(task.id); setEditTitle(task.title); }}>
                            {task.title}
                          </button>
                        )}

                        <div className="task-meta">
                          <span className="meta-chip"><span className={`space-dot ${projectMeta[task.project] || "studio"}`} /> {task.project}</span>
                          {task.due && <span className="meta-chip"><code>{formatDateValue(task.due)}</code></span>}
                          <span className={`meta-chip priority-${task.priority}`}>{task.priority}</span>
                        </div>
                      </div>
                    </div>

                    <div className="task-actions">
                      <button type="button" className="icon-button" aria-label={`Edit ${task.title}`} onClick={() => { setEditingId(task.id); setEditTitle(task.title); }}>
                        <Pencil size={15} />
                      </button>

                      <div className="row-menu">
                        <button type="button" className="icon-button" aria-label={`More actions for ${task.title}`} onClick={() => setMenuOpenId((current) => (current === task.id ? null : task.id))}>
                          <MoreHorizontal size={15} />
                        </button>
                        {menuOpenId === task.id && (
                          <div className="row-menu-popover">
                            <button type="button" className="menu-option" onClick={() => { setEditingId(task.id); setEditTitle(task.title); setMenuOpenId(null); }}><Pencil size={14} /> Edit</button>
                            <button type="button" className="menu-option" onClick={() => setMenuOpenId(null)}><FolderKanban size={14} /> Move</button>
                            <button type="button" className="menu-option" onClick={() => deleteTask(task.id)}><Trash2 size={14} /> Delete</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state" aria-live="polite">
                <div className="empty-state-icon"><CheckCircle2 size={22} /></div>
                <h3>No tasks for this view</h3>
                <p>Adjust your search or add a fresh task to keep your day moving.</p>
                <button type="button" className="primary-button" onClick={() => setAdding(true)}>Create a task</button>
              </div>
            )}

            <div className="task-footer">
              <div><span className="key-cap">N</span> add task</div>
              <button type="button" onClick={() => setTasks((current) => current.filter((task) => !task.done))}>Clear completed</button>
            </div>
          </section>
        </div>
      </main>

      {toast && (
        <div className="toast" role="status" aria-live="polite">
          <span>{toast.message}</span>
          <button type="button" onClick={() => { toast.onAction(); setToast(null); }}>{toast.action}</button>
        </div>
      )}

      {showShortcuts && (
        <div className="modal-overlay" onClick={() => setShowShortcuts(false)}>
          <div className="modal-window" role="dialog" aria-modal="true" aria-labelledby="shortcut-title" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3 id="shortcut-title">Keyboard shortcuts</h3>
              <button type="button" className="icon-button" aria-label="Close shortcuts" onClick={() => setShowShortcuts(false)}><X size={14} /></button>
            </div>
            <div className="shortcut-grid">
              <div className="shortcut-item"><span className="key-cap">N</span> Add task</div>
              <div className="shortcut-item"><span className="key-cap">/</span> Search</div>
              <div className="shortcut-item"><span className="key-cap">?</span> Shortcuts</div>
              <div className="shortcut-item"><span className="key-cap">Esc</span> Close</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useContext(AuthContext);
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const user = await authService.login(form);
      setUser(user);
      navigate((location.state && location.state.from) || "/");
    } catch (loginError) {
      setError(loginError.message || "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PublicLayout>
      <div className="auth-layout">
        <div className="auth-card">
          <div className="auth-badge"><Sparkles size={14} /> Secure your focus</div>
          <h1>Welcome back</h1>
          <p>Sign in to your Daymark workspace.</p>

          <form className="auth-form" onSubmit={submit}>
            <div className="field-group">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder="you@example.com" />
            </div>

            <div className="field-group">
              <div className="form-row">
                <label htmlFor="password">Password</label>
                <Link to="/forgot-password">Forgot password?</Link>
              </div>
              <input id="password" type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} placeholder="Enter your password" />
            </div>

            <label className="checkbox-row">
              <input type="checkbox" defaultChecked />
              <span>Remember me</span>
            </label>

            {error && <div className="inline-error">{error}</div>}
            <button type="submit" className="primary-button" disabled={loading}>{loading ? "Signing in..." : "Sign in"}</button>
            <button type="button" className="secondary-button">Continue with Google (UI only)</button>
          </form>

          <div className="auth-foot">
            <span>New here?</span>
            <Link to="/signup">Create an account</Link>
          </div>
        </div>

        <div className="auth-sidepanel">
          <div className="auth-badge"><ShieldCheck size={14} /> Product overview</div>
          <h1>Plan deeply, without the noise.</h1>
          <p>Capture tasks, priorities, and progress with clarity.</p>
          <ul className="feature-list-simple">
            <li><CheckCircle2 size={18} /> Team-ready planning for today and next week.</li>
            <li><CheckCircle2 size={18} /> Tracks due dates, priorities, and workspaces.</li>
            <li><CheckCircle2 size={18} /> A calmer interface for focused execution.</li>
          </ul>
        </div>
      </div>
    </PublicLayout>
  );
}

function SignupPage() {
  const navigate = useNavigate();
  const { setUser } = useContext(AuthContext);
  const [form, setForm] = useState({ fullName: "", email: "", password: "", confirmPassword: "" });
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (!agreed) {
      setError("You must accept the terms and privacy policy.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const user = await authService.signup(form);
      setUser(user);
      navigate("/");
    } catch (signupError) {
      setError(signupError.message || "Unable to create account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PublicLayout>
      <div className="auth-layout">
        <div className="auth-card">
          <div className="auth-badge"><Sparkles size={14} /> Start free</div>
          <h1>Create your account</h1>
          <form className="auth-form" onSubmit={submit}>
            <div className="field-group">
              <label htmlFor="fullName">Full name</label>
              <input id="fullName" type="text" value={form.fullName} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} placeholder="Jordan Davis" />
            </div>
            <div className="field-group">
              <label htmlFor="signup-email">Email</label>
              <input id="signup-email" type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder="you@example.com" />
            </div>
            <div className="field-group">
              <label htmlFor="signup-password">Password</label>
              <div className="password-wrap">
                <input id="signup-password" type={showPassword ? "text" : "password"} value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} placeholder="Choose a password" />
                <button type="button" className="show-toggle" onClick={() => setShowPassword((current) => !current)}>{showPassword ? "Hide" : "Show"}</button>
              </div>
            </div>
            <div className="field-group">
              <label htmlFor="confirmPassword">Confirm password</label>
              <div className="password-wrap">
                <input id="confirmPassword" type={showConfirm ? "text" : "password"} value={form.confirmPassword} onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))} placeholder="Confirm password" />
                <button type="button" className="show-toggle" onClick={() => setShowConfirm((current) => !current)}>{showConfirm ? "Hide" : "Show"}</button>
              </div>
            </div>

            <label className="checkbox-row">
              <input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} />
              <span>I agree to the <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy Policy</Link></span>
            </label>

            {error && <div className="inline-error">{error}</div>}
            <button type="submit" className="primary-button" disabled={loading}>{loading ? "Creating account..." : "Create account"}</button>
          </form>

          <div className="auth-foot">
            <span>Already have an account?</span>
            <Link to="/login">Log in</Link>
          </div>
        </div>

        <div className="auth-sidepanel">
          <div className="auth-badge"><FolderKanban size={14} /> Built for momentum</div>
          <h1>Put your priorities in one calm place.</h1>
          <p>Keep personal, studio, and client work separate while moving steadily.</p>
        </div>
      </div>
    </PublicLayout>
  );
}

function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <PublicLayout>
      <div className="auth-layout single-column">
        <div className="auth-card compact">
          <div className="auth-badge"><Sparkles size={14} /> Password recovery</div>
          <h1>Reset your password</h1>
          {!submitted ? (
            <form className="auth-form" onSubmit={(event) => { event.preventDefault(); setSubmitted(true); }}>
              <div className="field-group">
                <label htmlFor="reset-email">Email</label>
                <input id="reset-email" type="email" placeholder="you@example.com" />
              </div>
              <button type="submit" className="primary-button">Send recovery instructions</button>
            </form>
          ) : (
            <div className="empty-state small-empty">
              <div className="empty-state-icon"><CheckCircle2 size={22} /></div>
              <h3>Recovery requested</h3>
              <p>We simulated a password reset request for this UI prototype.</p>
              <Link to="/login" className="primary-button">Return to login</Link>
            </div>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}

function SettingsPage() {
  const [theme, setTheme] = useTheme();

  return (
    <div className="app-shell">
      <aside className="app-sidebar compact-sidebar">
        <Link to="/" className="brand" aria-label="Daymark home"><span className="brand-mark">d<span>.</span></span><span>daymark</span></Link>
        <div className="sidebar-label">Workspace</div>
        <nav className="sidebar-nav">
          <NavLink to="/" className="nav-item"><span className="nav-icon"><LayoutGrid size={16} /></span>Today</NavLink>
          <NavLink to="/settings" className="nav-item active"><span className="nav-icon"><Settings size={16} /></span>Settings</NavLink>
        </nav>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div className="crumb">Settings</div>
          <ThemeToggle theme={theme} setTheme={setTheme} />
        </header>

        <div className="content-wrap settings-wrap">
          <div className="setting-card">
            <h2>Profile</h2>
            <div className="setting-grid">
              <div className="field-group"><label>Name</label><input defaultValue="Jordan Davis" /></div>
              <div className="field-group"><label>Email</label><input defaultValue="jordan@daymark.app" /></div>
            </div>
          </div>

          <div className="setting-card">
            <h2>Appearance</h2>
            <div className="theme-grid">
              <ThemeOption value="light" label="Light" active={theme === "light"} onSelect={setTheme} />
              <ThemeOption value="dark" label="Dark" active={theme === "dark"} onSelect={setTheme} />
              <ThemeOption value="system" label="System" active={theme === "system"} onSelect={setTheme} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function PublicLayout({ children }) {
  const [theme, setTheme] = useTheme();

  return (
    <div className="public-screen">
      <div className="public-shell">
        <header className="public-header">
          <Link to="/" className="brand" aria-label="Daymark home"><span className="brand-mark">d<span>.</span></span><span>daymark</span></Link>
          <div className="public-nav">
            <Link to="/pricing" className="ghost-button">Pricing</Link>
            <Link to="/login" className="ghost-button">Log in</Link>
            <Link to="/signup" className="primary-button">Sign up</Link>
            <ThemeToggle theme={theme} setTheme={setTheme} />
          </div>
        </header>

        {children}

        <footer className="public-footer">
          <span>© {new Date().getFullYear()} Daymark</span>
          <div className="public-links">
            <Link to="/terms">Terms</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/pricing">Pricing</Link>
            <a href="mailto:hello@daymark.app">Contact</a>
          </div>
        </footer>
      </div>
    </div>
  );
}

function TermsPage() {
  return (
    <main className="content-page">
      <h1>Terms of Service</h1>
      <div className="article-layout">
        <aside className="article-nav">
          <a href="#acceptance">Acceptance</a>
          <a href="#eligibility">Eligibility</a>
          <a href="#responsibilities">Responsibilities</a>
          <a href="#billing">Billing</a>
        </aside>
        <article className="article-body">
          <p className="article-meta">Last updated: 2026-09-28</p>
          <p>These legal documents are placeholder drafts and should be reviewed by legal counsel before production launch.</p>
          <h2 id="acceptance">Acceptance of Terms</h2>
          <p>By using Daymark, you agree to these terms and our privacy policy. This is a planning document, not legal advice.</p>
          <h2 id="eligibility">Eligibility</h2>
          <p>You must be at least 18 years old or have parental consent to use the service.</p>
          <h2 id="responsibilities">Account Responsibilities</h2>
          <p>You are responsible for securing your account and keeping your membership credentials private.</p>
          <h2 id="billing">Billing</h2>
          <p>Subscription pricing is intentionally mocked for UI design and will require a real billing provider later.</p>
        </article>
      </div>
    </main>
  );
}

function PrivacyPage() {
  return (
    <main className="content-page">
      <h1>Privacy Policy</h1>
      <div className="article-layout">
        <aside className="article-nav">
          <a href="#data">Data we collect</a>
          <a href="#usage">Usage data</a>
          <a href="#cookie">Cookies</a>
          <a href="#rights">Your rights</a>
        </aside>
        <article className="article-body">
          <p className="article-meta">Last updated: 2026-09-28</p>
          <p>Daymark may collect account information, support messages, and session data needed to offer the service.</p>
          <h2 id="data">Data we collect</h2>
          <p>This includes your name, email, task content, and optional profile settings.</p>
          <h2 id="usage">Usage data</h2>
          <p>We may collect aggregate usage and analytics to maintain reliability and improve the product.</p>
          <h2 id="cookie">Cookies</h2>
          <p>We may use local storage and cookie-like preferences to keep your theme and login state consistent.</p>
          <h2 id="rights">Your rights</h2>
          <p>You can request access, correction, or deletion of your data by contacting support once the app is connected to real services.</p>
        </article>
      </div>
    </main>
  );
}

function PricingPage() {
  const [billing, setBilling] = useState("monthly");

  return (
    <main className="content-page pricing-page">
      <h1>Pricing</h1>
      <div className="billing-toggle">
        <button type="button" className={`ghost-button ${billing === "monthly" ? "active" : ""}`} onClick={() => setBilling("monthly")}>Monthly</button>
        <button type="button" className={`ghost-button ${billing === "yearly" ? "active" : ""}`} onClick={() => setBilling("yearly")}>Yearly</button>
      </div>

      <div className="pricing-grid">
        <div className="plan-card">
          <h2>Free</h2>
          <div className="plan-price">$0 <span>/month</span></div>
          <ul className="feature-list">
            <li><CheckCircle2 size={16} /> Up to 50 tasks</li>
            <li><CheckCircle2 size={16} /> Basic progress tracking</li>
            <li><CheckCircle2 size={16} /> 3 spaces</li>
          </ul>
          <button type="button" className="secondary-button">Current plan</button>
        </div>

        <div className="plan-card featured-plan">
          <h2>Pro</h2>
          <div className="plan-price">{billing === "monthly" ? "$12" : "$9"} <span>/month</span></div>
          <ul className="feature-list">
            <li><CheckCircle2 size={16} /> Unlimited tasks</li>
            <li><CheckCircle2 size={16} /> Advanced automation</li>
            <li><CheckCircle2 size={16} /> Shared workspaces</li>
          </ul>
          <button type="button" className="primary-button">Upgrade</button>
        </div>
      </div>
    </main>
  );
}

function ThemeOption({ value, label, active, onSelect }) {
  return (
    <button type="button" className={`theme-option ${active ? "active" : ""}`} onClick={() => onSelect(value)}>
      <strong>{label}</strong>
      <span>{value === "system" ? "Follow device" : value === "dark" ? "Dark interface" : "Light interface"}</span>
    </button>
  );
}

function ThemeToggle({ theme, setTheme }) {
  return (
    <div className="theme-toggle" aria-label="Theme selector">
      <button type="button" className={`icon-button ${theme === "light" ? "selected" : ""}`} aria-label="Light theme" onClick={() => setTheme("light")}><SunMedium size={14} /></button>
      <button type="button" className={`icon-button ${theme === "dark" ? "selected" : ""}`} aria-label="Dark theme" onClick={() => setTheme("dark")}><MoonStar size={14} /></button>
      <button type="button" className={`icon-button ${theme === "system" ? "selected" : ""}`} aria-label="System theme" onClick={() => setTheme("system")}><span className="theme-symbol">◐</span></button>
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </svg>
  );
}

export default App;
