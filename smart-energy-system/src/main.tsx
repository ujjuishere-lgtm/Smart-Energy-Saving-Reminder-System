import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity, AlertCircle, ArrowRight, Bell, BookOpen, Check, CheckCircle2,
  CircleHelp, Clock3, Cloud, Download, Droplets, Edit3, ExternalLink, FileText,
  Gauge, Goal as GoalIcon, Home, Info, Leaf, Lightbulb, Menu, Moon, Plus, RotateCcw,
  Save, Settings2, ShieldCheck, Sun, Trash2, TrendingDown, Upload, X, Zap,
} from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import type { AppData, Category, EnergyRecord, Reminder, Recurrence } from './types';
import {
  calculateFlatBill, calculateGoalProgress, calculateSlabBill, createDemoData, createId,
  getRecommendations, loadAppData, monthRecords, nextOccurrence, safeJsonExport, saveAppData,
  sumKwh, validateEnergyRecord, validateReminder, weekRecords,
} from './logic';
import { cloudConfigured, supabase } from './supabase';
import './styles.css';

const STUDENTS = [
  { name: 'Ujjawal Priyadarshi', uid: '12629952', section: 'RK4P26HBA10' },
  { name: 'Harsh Raj', uid: '12629955', section: 'RK4P26HBA13' },
  { name: 'Vivek Raj', uid: '12630001', section: 'RK4P26HBA33' },
];
const CATEGORIES: Category[] = ['Lighting', 'Cooling', 'Appliances', 'Standby power', 'Laundry', 'Other'];
const RECURRENCES: Recurrence[] = ['None', 'Daily', 'Weekly', 'Monthly'];
const money = (n: number) => n.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
const num = (n: number, digits = 1) => n.toLocaleString('en-IN', { maximumFractionDigits: digits, minimumFractionDigits: 0 });
const todayString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const thisMonth = () => todayString().slice(0, 7);
const displayDate = (value: string) => {
  const date = new Date(value.includes('T') ? value : `${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('en-IN', value.includes('T') ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' });
};

type Page = 'overview' | 'consumption' | 'bill' | 'reminders' | 'insights' | 'learn' | 'about' | 'settings';
type Toast = { message: string; kind?: 'success' | 'error' };

function App() {
  const [data, setData] = useState<AppData>(() => loadAppData());
  const [page, setPage] = useState<Page>('overview');
  const [dark, setDark] = useState(() => localStorage.getItem('energy-theme') === 'dark');
  const [toast, setToast] = useState<Toast | null>(null);
  const [isMobileNavOpen, setMobileNavOpen] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [exportImportError, setExportImportError] = useState('');
  const [range, setRange] = useState<'7' | '30' | 'all'>('7');
  const [recordFilter, setRecordFilter] = useState<'all' | 'user' | 'demo'>('all');
  const [recordFormOpen, setRecordFormOpen] = useState(false);
  const [editRecordId, setEditRecordId] = useState<string | null>(null);
  const [recordDate, setRecordDate] = useState(todayString());
  const [recordKwh, setRecordKwh] = useState('');
  const [recordCategory, setRecordCategory] = useState<Category>('Other');
  const [recordNote, setRecordNote] = useState('');
  const [recordError, setRecordError] = useState('');
  const [billUnits, setBillUnits] = useState('128');
  const [billRate, setBillRate] = useState('8.5');
  const [fixedCharges, setFixedCharges] = useState('0');
  const [additionalCharges, setAdditionalCharges] = useState('0');
  const [billMode, setBillMode] = useState<'flat' | 'slab'>('flat');
  const [slab1, setSlab1] = useState('100');
  const [slabRate1, setSlabRate1] = useState('3.5');
  const [slab2, setSlab2] = useState('200');
  const [slabRate2, setSlabRate2] = useState('5.5');
  const [slabRate3, setSlabRate3] = useState('7.5');
  const [billError, setBillError] = useState('');
  const [reminderModal, setReminderModal] = useState(false);
  const [editReminderId, setEditReminderId] = useState<string | null>(null);
  const [reminderTitle, setReminderTitle] = useState('');
  const [reminderDateTime, setReminderDateTime] = useState(`${todayString()}T18:00`);
  const [reminderCategory, setReminderCategory] = useState<Category>('Lighting');
  const [reminderRecurrence, setReminderRecurrence] = useState<Recurrence>('None');
  const [reminderError, setReminderError] = useState('');
  const [reminderFilter, setReminderFilter] = useState<'upcoming' | 'completed' | 'all'>('upcoming');
  const [goalBaseline, setGoalBaseline] = useState('420');
  const [goalReduction, setGoalReduction] = useState('10');
  const [goalMonth, setGoalMonth] = useState(() => loadAppData().goal.baselineMonth);
  const [settingsRate, setSettingsRate] = useState(() => String(loadAppData().settings.rate));
  const [settingsFixed, setSettingsFixed] = useState(() => String(loadAppData().settings.fixedCharges));
  const [settingsExtra, setSettingsExtra] = useState(() => String(loadAppData().settings.extraCharges));
  const [carbonFactor, setCarbonFactor] = useState(() => String(loadAppData().settings.carbonKgPerKwh));
  const [carbonSource, setCarbonSource] = useState(() => loadAppData().settings.carbonFactorSource);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => typeof Notification !== 'undefined' && Notification.permission === 'granted');

  useEffect(() => { try { saveAppData(data); } catch { notify('Could not save to browser storage. Export a backup before continuing.', 'error'); } }, [data]);
  useEffect(() => { document.documentElement.dataset.theme = dark ? 'dark' : 'light'; localStorage.setItem('energy-theme', dark ? 'dark' : 'light'); }, [dark]);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(null), 3000); return () => window.clearTimeout(timer); }, [toast]);
  useEffect(() => {
    const listener = (event: KeyboardEvent) => { if (event.key === 'Escape') { setReminderModal(false); setMobileNavOpen(false); setResetConfirm(false); } };
    window.addEventListener('keydown', listener); return () => window.removeEventListener('keydown', listener);
  }, []);
  useEffect(() => {
    if (!notificationsEnabled || typeof Notification === 'undefined') return;
    const checkDueReminders = () => {
      const now = Date.now();
      const lastShown = Number(sessionStorage.getItem('energy-last-notified-at') || '0');
      if (now - lastShown < 60_000) return;
      const due = data.reminders.find((r) => !r.completed && new Date(r.dueAt).getTime() <= now && new Date(r.dueAt).getTime() > now - 60_000);
      if (!due) return;
      try {
        new Notification('Smart Energy reminder', { body: due.title, tag: due.id });
        sessionStorage.setItem('energy-last-notified-at', String(now));
      } catch { /* Browser notifications are best-effort while the app is open. */ }
    };
    checkDueReminders();
    const timer = window.setInterval(checkDueReminders, 30_000);
    return () => window.clearInterval(timer);
  }, [notificationsEnabled, data.reminders]);

  function notify(message: string, kind: Toast['kind'] = 'success') { setToast({ message, kind }); }
  function updateData<K extends keyof AppData>(key: K, value: AppData[K]) { setData((old) => ({ ...old, [key]: value })); }
  function navigate(next: Page) { setPage(next); setMobileNavOpen(false); window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }

  const currentMonthRecords = useMemo(() => monthRecords(data.records, thisMonth()), [data.records]);
  const currentWeekRecords = useMemo(() => weekRecords(data.records), [data.records]);
  const thisMonthKwh = sumKwh(currentMonthRecords);
  const thisWeekKwh = sumKwh(currentWeekRecords);
  const hasActualData = data.records.some((r) => r.source === 'user');
  const billResult = useMemo(() => {
    try {
      if (billMode === 'flat') return calculateFlatBill(Number(billUnits), Number(billRate), Number(fixedCharges), Number(additionalCharges));
      return calculateSlabBill(Number(billUnits), [
        { upTo: Number(slab1), rate: Number(slabRate1) },
        { upTo: Number(slab2), rate: Number(slabRate2) },
        { upTo: null, rate: Number(slabRate3) },
      ], Number(fixedCharges), Number(additionalCharges));
    } catch { return null; }
  }, [billMode, billUnits, billRate, fixedCharges, additionalCharges, slab1, slab2, slabRate1, slabRate2, slabRate3]);
  const goalProgress = calculateGoalProgress(data.goal.baselineKwh, data.goal.reductionPercent, thisMonthKwh);
  const monthlyEstimate = (() => { try { return calculateFlatBill(thisMonthKwh, data.settings.rate, data.settings.fixedCharges, data.settings.extraCharges); } catch { return 0; } })();
  const recommendations = getRecommendations(data.records.filter((r) => r.source === 'user'));
  const chartRecords = useMemo(() => {
    const dateLimit = new Date(); dateLimit.setDate(dateLimit.getDate() - (range === '7' ? 6 : 29));
    const cutoff = `${dateLimit.getFullYear()}-${String(dateLimit.getMonth() + 1).padStart(2, '0')}-${String(dateLimit.getDate()).padStart(2, '0')}`;
    return data.records.filter((r) => (range === 'all' || r.date >= cutoff) && (recordFilter === 'all' || r.source === recordFilter));
  }, [data.records, range, recordFilter]);
  const chartData = useMemo(() => {
    const byDate = new Map<string, { date: string; kwh: number; source: string }>();
    chartRecords.forEach((record) => {
      const existing = byDate.get(record.date) ?? { date: record.date, kwh: 0, source: record.source };
      existing.kwh += record.kwh;
      if (record.source === 'user') existing.source = 'user';
      byDate.set(record.date, existing);
    });
    return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)).map((item) => ({ ...item, label: new Date(`${item.date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), kwh: Number(item.kwh.toFixed(2)) }));
  }, [chartRecords]);

  function openNewRecord() { setEditRecordId(null); setRecordDate(todayString()); setRecordKwh(''); setRecordCategory('Other'); setRecordNote(''); setRecordError(''); setRecordFormOpen(true); }
  function openEditRecord(record: EnergyRecord) { setEditRecordId(record.id); setRecordDate(record.date); setRecordKwh(String(record.kwh)); setRecordCategory(record.category); setRecordNote(record.note); setRecordError(''); setRecordFormOpen(true); }
  function submitRecord(event: React.FormEvent) {
    event.preventDefault(); const kwh = Number(recordKwh); const error = validateEnergyRecord(recordDate, kwh);
    if (error) { setRecordError(error); return; }
    const record: EnergyRecord = { id: editRecordId ?? createId(), date: recordDate, kwh, category: recordCategory, note: recordNote.trim(), source: 'user' };
    setData((old) => ({ ...old, records: editRecordId ? old.records.map((r) => r.id === editRecordId ? record : r) : [...old.records, record] }));
    setRecordFormOpen(false); notify(editRecordId ? 'Reading updated.' : 'Reading added. Charts and summaries recalculated.');
  }
  function deleteRecord(id: string) { if (!window.confirm('Delete this consumption record? This cannot be undone.')) return; updateData('records', data.records.filter((r) => r.id !== id)); notify('Reading deleted.'); }
  function useDemoReadings() {
    const demos = createDemoData().records;
    const currentUser = data.records.filter((r) => r.source === 'user');
    const demoIds = new Set(demos.map((r) => r.id));
    const retainedDemos = data.records.filter((r) => r.source === 'demo' && !demoIds.has(r.id));
    updateData('records', [...retainedDemos, ...demos, ...currentUser]); notify('Illustrative readings added; they are labelled as demo data.');
  }

  function addOrEditReminder(event: React.FormEvent) {
    event.preventDefault(); const error = validateReminder(reminderTitle, reminderDateTime);
    if (error) { setReminderError(error); return; }
    const old = editReminderId ? data.reminders.find((r) => r.id === editReminderId) : undefined;
    const reminder: Reminder = { id: editReminderId ?? createId(), title: reminderTitle.trim(), category: reminderCategory, dueAt: reminderDateTime, recurrence: reminderRecurrence, completed: old?.completed ?? false, createdAt: old?.createdAt ?? new Date().toISOString() };
    updateData('reminders', editReminderId ? data.reminders.map((r) => r.id === editReminderId ? reminder : r) : [...data.reminders, reminder]);
    setReminderModal(false); notify(editReminderId ? 'Reminder updated.' : 'Reminder saved to this browser.');
  }
  function openReminder(reminder?: Reminder) {
    setEditReminderId(reminder?.id ?? null); setReminderTitle(reminder?.title ?? ''); setReminderCategory(reminder?.category ?? 'Lighting'); setReminderDateTime(reminder?.dueAt ?? `${todayString()}T18:00`); setReminderRecurrence(reminder?.recurrence ?? 'None'); setReminderError(''); setReminderModal(true);
  }
  function toggleReminder(reminder: Reminder) {
    if (!reminder.completed && reminder.recurrence !== 'None') {
      const next = nextOccurrence(reminder);
      if (next) {
        updateData('reminders', data.reminders.map((r) => r.id === reminder.id ? { ...r, completed: true } : r).concat([{ ...reminder, id: createId(), dueAt: next, completed: false, createdAt: new Date().toISOString() }]));
        notify('Completed. Your next recurring reminder has been scheduled in-app.'); return;
      }
    }
    updateData('reminders', data.reminders.map((r) => r.id === reminder.id ? { ...r, completed: !r.completed } : r));
  }
  function deleteReminder(id: string) { if (!window.confirm('Delete this reminder?')) return; updateData('reminders', data.reminders.filter((r) => r.id !== id)); notify('Reminder deleted.'); }
  async function enableNotifications() {
    if (typeof Notification === 'undefined') { notify('This browser does not support web notifications.', 'error'); return; }
    try { const permission = await Notification.requestPermission(); setNotificationsEnabled(permission === 'granted'); notify(permission === 'granted' ? 'Permission granted. Notifications are only checked while this app is open.' : 'Notification permission was not granted.', permission === 'granted' ? 'success' : 'error'); }
    catch { notify('Unable to request notification permission in this browser.', 'error'); }
  }
  function calculateBillNow() {
    if ([billUnits, billMode === 'flat' ? billRate : slabRate1, fixedCharges, additionalCharges].some((v) => v.trim() === '')) { setBillError('Complete each bill field before calculating.'); return; }
    if (billResult === null) { setBillError('Check values and slab thresholds. Rates and charges cannot be negative.'); return; }
    setBillError(''); notify('Estimated bill recalculated.');
  }
  function saveGoal(event: React.FormEvent) {
    event.preventDefault(); const baseline = Number(goalBaseline); const reduction = Number(goalReduction);
    if (!Number.isFinite(baseline) || baseline <= 0 || !Number.isFinite(reduction) || reduction < 0 || reduction > 100 || !goalMonth) { notify('Enter a baseline above zero and a reduction target between 0% and 100%.', 'error'); return; }
    updateData('goal', { baselineKwh: baseline, reductionPercent: reduction, baselineMonth: goalMonth }); notify('Energy-saving goal updated.');
  }
  function saveSettings(event: React.FormEvent) {
    event.preventDefault(); const values = [settingsRate, settingsFixed, settingsExtra, carbonFactor].map(Number);
    if (values.some((v) => !Number.isFinite(v) || v < 0)) { notify('Rates, charges and emissions factors must be valid non-negative numbers.', 'error'); return; }
    if (Number(carbonFactor) > 0 && !carbonSource.trim()) { notify('Add a source for the emissions factor or leave the factor at 0.', 'error'); return; }
    updateData('settings', { ...data.settings, rate: values[0], fixedCharges: values[1], extraCharges: values[2], carbonKgPerKwh: values[3], carbonFactorSource: carbonSource.trim() }); setBillRate(String(values[0])); setFixedCharges(String(values[1])); setAdditionalCharges(String(values[2])); notify('Preferences saved.');
  }
  function resetData() { updateData('records', []); updateData('reminders', []); setResetConfirm(false); notify('Local readings and reminders cleared. Your preferences and goal remain.'); }
  function exportData() {
    const blob = new Blob([safeJsonExport(data)], { type: 'application/json' }); const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = `smart-energy-backup-${todayString()}.json`; link.click(); URL.revokeObjectURL(url); notify('Backup downloaded.');
  }
  function importData(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return; setExportImportError('');
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as { data?: AppData };
        const candidate = parsed.data;
        if (!candidate || !Array.isArray(candidate.records) || !Array.isArray(candidate.reminders) || !candidate.goal || !candidate.settings) throw new Error('The file is not a valid Smart Energy backup.');
        if (candidate.records.some((r) => !r.id || validateEnergyRecord(r.date, Number(r.kwh)) || !['user', 'demo'].includes(r.source) || !CATEGORIES.includes(r.category))) throw new Error('The backup contains an invalid consumption record.');
        if (candidate.reminders.some((r) => !r.id || validateReminder(r.title, r.dueAt) || !CATEGORIES.includes(r.category) || !RECURRENCES.includes(r.recurrence) || typeof r.completed !== 'boolean')) throw new Error('The backup contains an invalid reminder.');
        if (!Number.isFinite(candidate.goal.baselineKwh) || candidate.goal.baselineKwh <= 0 || !Number.isFinite(candidate.goal.reductionPercent) || candidate.goal.reductionPercent < 0 || candidate.goal.reductionPercent > 100) throw new Error('The backup contains invalid goal settings.');
        if (![candidate.settings.rate, candidate.settings.fixedCharges, candidate.settings.extraCharges, candidate.settings.carbonKgPerKwh].every((v) => Number.isFinite(v) && v >= 0)) throw new Error('The backup contains invalid calculation settings.');
        setData({ ...candidate, settings: { ...data.settings, ...candidate.settings } }); notify('Backup restored.');
      } catch (error) { setExportImportError(error instanceof Error ? error.message : 'Could not import this file.'); }
    };
    reader.readAsText(file); event.target.value = '';
  }

  const navItems: { id: Page; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <Home size={18} /> },
    { id: 'consumption', label: 'Consumption tracker', icon: <Activity size={18} /> },
    { id: 'bill', label: 'Bill calculator', icon: <Gauge size={18} /> },
    { id: 'reminders', label: 'Smart reminders', icon: <Bell size={18} /> },
    { id: 'insights', label: 'Goals & insights', icon: <TrendingDown size={18} /> },
    { id: 'learn', label: 'Learning centre', icon: <BookOpen size={18} /> },
    { id: 'about', label: 'Project information', icon: <FileText size={18} /> },
    { id: 'settings', label: 'Settings & data', icon: <Settings2 size={18} /> },
  ];

  const pageTitle: Record<Page, string> = {
    overview: 'Your energy at a glance', consumption: 'Electricity consumption', bill: 'Electricity bill calculator', reminders: 'Smart reminders', insights: 'Goals & sustainability', learn: 'Learning centre', about: 'Project information', settings: 'Settings & data',
  };
  const upcoming = data.reminders.filter((r) => !r.completed).sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  const visibleReminders = data.reminders.filter((r) => reminderFilter === 'all' || (reminderFilter === 'completed' ? r.completed : !r.completed)).sort((a, b) => a.dueAt.localeCompare(b.dueAt));

  return <div className="app-shell">
    <aside className={`sidebar ${isMobileNavOpen ? 'sidebar-open' : ''}`}>
      <div className="brand-row"><div className="brand-mark"><Zap size={23} fill="currentColor" /></div><div><strong>evergreen</strong><small>SMART ENERGY</small></div><button className="mobile-close icon-button" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation"><X size={18} /></button></div>
      <div className="side-caption">YOUR HOUSEHOLD</div>
      <nav className="side-nav" aria-label="Main navigation">
        {navItems.map((item) => <button key={item.id} className={`nav-item ${page === item.id ? 'active' : ''}`} onClick={() => navigate(item.id)} aria-current={page === item.id ? 'page' : undefined}>{item.icon}<span>{item.label}</span>{page === item.id && <span className="nav-dot" />}</button>)}
      </nav>
      <div className="sidebar-bottom"><div className="leaf-illustration"><Leaf size={23} /><span>Use less.<br />Live lighter.</span></div><p>Small everyday choices can make energy use more visible — and more intentional.</p><span className="version-label">CHE110-CA1 · DEMO BUILD</span></div>
    </aside>
    {isMobileNavOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}
    <main className="main-area">
      <header className="topbar"><div className="topbar-left"><button className="icon-button mobile-menu" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation"><Menu size={21} /></button><div className="breadcrumb">SMART ENERGY <span>/</span> {pageTitle[page].toUpperCase()}</div><h1>{pageTitle[page]}</h1></div><div className="topbar-actions"><div className="date-chip"><span className="online-dot" /> {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</div><button className="icon-button" onClick={() => setDark((v) => !v)} aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'} title="Toggle theme">{dark ? <Sun size={18} /> : <Moon size={18} />}</button><div className="avatar" aria-label="Demo user">ES</div></div></header>
      <div className="page-content">
        {!cloudConfigured && <div className="storage-banner"><Info size={17} /><span><strong>Local demo mode.</strong> Your readings and reminders are saved in this browser, not synced to a cloud account.</span><button onClick={() => navigate('settings')}>Data settings <ArrowRight size={14} /></button></div>}
        {page === 'overview' && <>
          <section className="welcome-panel"><div className="welcome-copy"><span className="eyebrow"><Leaf size={14} /> SMARTER ENERGY HABITS</span><h2>Make every unit<br /><em>count.</em></h2><p>A clearer picture of your household energy starts with small, consistent observations.</p><div className="welcome-actions"><button className="button button-primary" onClick={() => { navigate('consumption'); openNewRecord(); }}><Plus size={17} /> Add a reading</button><button className="button button-quiet" onClick={() => navigate('reminders')}>Manage reminders <ArrowRight size={16} /></button></div><div className="welcome-footnote"><ShieldCheck size={14} /> No meter connection · Readings are manual</div></div><div className="welcome-art" aria-hidden="true"><div className="sun-shape" /><div className="art-sprig sprig-one">✳</div><div className="house-shape"><div className="house-roof" /><div className="house-body"><div className="house-window" /><div className="house-door" /></div></div><div className="art-leaf leaf-a">⌁</div><div className="art-leaf leaf-b">⌁</div><div className="art-caption">A lighter footprint<br /><strong>starts at home.</strong></div></div></section>
          <div className="section-row"><div><span className="section-kicker">THE SNAPSHOT</span><h2>Current picture</h2></div><span className="date-range-label">{new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</span></div>
          <section className="metric-grid">
            <MetricCard icon={<Zap size={18} />} label="Usage this week" value={`${num(thisWeekKwh)} kWh`} detail={hasActualData ? 'Includes your recorded readings' : 'No personal readings yet'} tone="green" badge={data.records.some((r) => r.source === 'demo') && !hasActualData ? 'DEMO INCLUDED' : undefined} />
            <MetricCard icon={<Gauge size={18} />} label="Estimated monthly bill" value={money(monthlyEstimate)} detail="Using your configured flat rate" tone="cream" />
            <MetricCard icon={<GoalIcon size={18} />} label="Goal progress" value={goalProgress.progressPercent === null ? 'Set a baseline' : `${Math.round(goalProgress.progressPercent)}%`} detail={goalProgress.remainingKwh === null ? 'Baseline must be above zero' : `${num(goalProgress.remainingKwh)} kWh above target`} tone="sage" />
            <MetricCard icon={<Bell size={18} />} label="Open reminders" value={String(upcoming.length)} detail={`${data.reminders.filter((r) => r.completed).length} completed`} tone="lilac" />
          </section>
          <div className="content-grid dashboard-grid">
            <section className="surface chart-panel"><PanelHeading title="Consumption trend" subtitle="Daily electricity readings" action={<button className="text-button" onClick={() => navigate('consumption')}>View tracker <ArrowRight size={14} /></button>} /><div className="chart-meta"><strong>{num(thisWeekKwh)} <span>kWh this week</span></strong><span className="legend-dot"><i /> Manual & demo readings</span></div><EnergyChart data={chartData.slice(-7)} /></section>
            <section className="surface reminder-preview"><PanelHeading title="Coming up" subtitle="A few habits to keep in sight" action={<button className="icon-text-button" onClick={() => openReminder()}><Plus size={16} /> Add</button>} />{upcoming.slice(0, 4).length ? upcoming.slice(0, 4).map((reminder) => <ReminderMini key={reminder.id} reminder={reminder} onToggle={() => toggleReminder(reminder)} />) : <EmptyState icon={<CheckCircle2 size={23} />} title="All clear" body="Add a gentle reminder to build a routine." action={<button className="button button-outline" onClick={() => openReminder()}>Create reminder</button>} />}</section>
          </div>
          <div className="content-grid lower-grid"><section className="surface recommendations-panel"><PanelHeading title="A smarter next step" subtitle="Practical actions based on your manual readings" action={<button className="text-button" onClick={() => navigate('insights')}>All insights <ArrowRight size={14} /></button>} />{recommendations.slice(0, 2).map((rec) => <Recommendation key={rec.title} rec={rec} compact />)}</section><section className="goal-card"><div className="goal-icon"><TrendingDown size={20} /></div><span className="section-kicker">YOUR MONTHLY INTENTION</span><h3>Reduce usage by {data.goal.reductionPercent}%</h3><p>Against a baseline of {num(data.goal.baselineKwh)} kWh for {data.goal.baselineMonth}.</p><div className="progress-track"><span style={{ width: `${goalProgress.progressPercent ?? 0}%` }} /></div><div className="progress-labels"><span>{goalProgress.progressPercent === null ? 'Needs baseline' : `${Math.round(goalProgress.progressPercent)}% of target`} </span><button onClick={() => navigate('insights')}>Adjust goal</button></div></section></div>
          <DemoNotice />
        </>}

        {page === 'consumption' && <>
          <PageIntro eyebrow="MEASURE FIRST" title="Your electricity log" body="Add dated kWh entries and see your charts and summaries recalculate immediately. No smart meter is connected." action={<button className="button button-primary" onClick={openNewRecord}><Plus size={17} /> Add reading</button>} />
          <div className="metric-grid metric-grid-three"><MetricCard icon={<Zap size={18} />} label="This month" value={`${num(thisMonthKwh)} kWh`} detail={`${currentMonthRecords.length} entries`} tone="green" /><MetricCard icon={<Activity size={18} />} label="Last 7 days" value={`${num(thisWeekKwh)} kWh`} detail={`${currentWeekRecords.length} dated readings`} tone="cream" /><MetricCard icon={<Gauge size={18} />} label="Average per entry" value={`${num(data.records.length ? sumKwh(data.records) / data.records.length : 0)} kWh`} detail="Not a daily average" tone="sage" /></div>
          <section className="surface section-space"><PanelHeading title="Usage over time" subtitle="Select a window and data source" action={<div className="control-pair"><select aria-label="Chart date range" value={range} onChange={(e) => setRange(e.target.value as typeof range)}><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="all">All dates</option></select><select aria-label="Chart data source" value={recordFilter} onChange={(e) => setRecordFilter(e.target.value as typeof recordFilter)}><option value="all">All readings</option><option value="user">My readings only</option><option value="demo">Demo only</option></select></div>} /><div className="large-chart"><EnergyChart data={chartData} /></div><p className="helper-line"><Info size={14} /> Entries on the same date are combined. Demo readings and user-entered readings are differentiated in the record list below.</p></section>
          <section className="surface section-space"><PanelHeading title="Recorded readings" subtitle={`${data.records.length} total records`} action={<button className="text-button" onClick={useDemoReadings}><RotateCcw size={14} /> Add demo set</button>} />{data.records.length === 0 ? <EmptyState icon={<Activity size={24} />} title="Start with a real reading" body="Record the kWh and date shown on your meter, bill, or trusted tracking source." action={<button className="button button-primary" onClick={openNewRecord}><Plus size={16} /> Add first reading</button>} /> : <div className="table-wrap"><table><thead><tr><th scope="col">Date</th><th scope="col">Consumption</th><th scope="col">Category</th><th scope="col">Source</th><th scope="col">Notes</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead><tbody>{[...data.records].sort((a, b) => b.date.localeCompare(a.date)).map((record) => <tr key={record.id}><td>{displayDate(record.date)}</td><td><strong>{num(record.kwh, 2)} kWh</strong></td><td>{record.category}</td><td><span className={`data-tag ${record.source}`}>{record.source === 'user' ? 'Your entry' : 'Demo sample'}</span></td><td className="note-cell">{record.note || '—'}</td><td><div className="row-actions">{record.source === 'user' && <><button className="icon-button compact" aria-label={`Edit reading from ${record.date}`} onClick={() => openEditRecord(record)}><Edit3 size={15} /></button><button className="icon-button compact danger" aria-label={`Delete reading from ${record.date}`} onClick={() => deleteRecord(record.id)}><Trash2 size={15} /></button></>}</div></td></tr>)}</tbody></table></div>}</section>
          {recordFormOpen && <Modal title={editRecordId ? 'Edit consumption reading' : 'Add consumption reading'} onClose={() => setRecordFormOpen(false)}><form className="form-stack" onSubmit={submitRecord}><Field label="Reading date" id="record-date"><input id="record-date" type="date" value={recordDate} max={todayString()} onChange={(e) => setRecordDate(e.target.value)} required /></Field><Field label="Electricity consumed (kWh)" id="record-kwh" hint="Use the interval consumption you can substantiate, not a fabricated meter value."><input id="record-kwh" type="number" min="0.01" max="100000" step="0.01" value={recordKwh} onChange={(e) => setRecordKwh(e.target.value)} placeholder="e.g. 4.75" required /></Field><Field label="Category" id="record-category"><select id="record-category" value={recordCategory} onChange={(e) => setRecordCategory(e.target.value as Category)}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field><Field label="Notes (optional)" id="record-note"><textarea id="record-note" rows={2} maxLength={240} value={recordNote} onChange={(e) => setRecordNote(e.target.value)} placeholder="Bill period, source, context…" /></Field>{recordError && <InlineError>{recordError}</InlineError>}<ModalActions onCancel={() => setRecordFormOpen(false)} submit={editRecordId ? 'Save changes' : 'Save reading'} /></form></Modal>}
        </>}

        {page === 'bill' && <>
          <PageIntro eyebrow="TRANSPARENT ESTIMATE" title="Know what shapes your bill" body="Estimate charges from a consumption figure and rates you choose. This is not an official tariff calculator." />
          <div className="calculator-layout"><section className="surface calculator-form"><PanelHeading title="Bill inputs" subtitle="Use the rates from your own electricity tariff." /><form className="form-stack" onSubmit={(e) => { e.preventDefault(); calculateBillNow(); }}><Field label="Calculation method" id="bill-mode"><select id="bill-mode" value={billMode} onChange={(e) => { setBillMode(e.target.value as 'flat' | 'slab'); setBillError(''); }}><option value="flat">Flat rate</option><option value="slab">Configurable slab bands</option></select></Field><div className="two-field-row"><Field label="Consumption (kWh)" id="bill-units"><input id="bill-units" type="number" min="0" step="0.01" value={billUnits} onChange={(e) => setBillUnits(e.target.value)} required /></Field>{billMode === 'flat' && <Field label="Rate per kWh (₹)" id="bill-rate"><input id="bill-rate" type="number" min="0" step="0.01" value={billRate} onChange={(e) => setBillRate(e.target.value)} required /></Field>}</div>{billMode === 'slab' && <><div className="slab-heading">Energy rates by band <span>Entirely configurable · example inputs</span></div><div className="slab-row"><span>First band · 0–</span><input aria-label="First slab upper limit in kWh" type="number" min="0.01" step="0.01" value={slab1} onChange={(e) => setSlab1(e.target.value)} /><span>kWh at ₹</span><input aria-label="First slab rate" type="number" min="0" step="0.01" value={slabRate1} onChange={(e) => setSlabRate1(e.target.value)} /></div><div className="slab-row"><span>Second · up to</span><input aria-label="Second slab upper limit in kWh" type="number" min="0.01" step="0.01" value={slab2} onChange={(e) => setSlab2(e.target.value)} /><span>kWh at ₹</span><input aria-label="Second slab rate" type="number" min="0" step="0.01" value={slabRate2} onChange={(e) => setSlabRate2(e.target.value)} /></div><div className="slab-row"><span>Remaining units at ₹</span><input aria-label="Final slab rate" type="number" min="0" step="0.01" value={slabRate3} onChange={(e) => setSlabRate3(e.target.value)} /><span>/ kWh</span></div></>}<div className="two-field-row"><Field label="Fixed charges (₹)" id="bill-fixed"><input id="bill-fixed" type="number" min="0" step="0.01" value={fixedCharges} onChange={(e) => setFixedCharges(e.target.value)} /></Field><Field label="Tax / extra charges (₹)" id="bill-extra"><input id="bill-extra" type="number" min="0" step="0.01" value={additionalCharges} onChange={(e) => setAdditionalCharges(e.target.value)} /></Field></div>{billError && <InlineError>{billError}</InlineError>}<button className="button button-primary button-full" type="submit"><Gauge size={17} /> Calculate estimate</button></form></section><section className="surface bill-result-panel"><div className="bill-result-header"><div className="bill-result-icon"><Zap size={22} /></div><span className="data-tag demo">ESTIMATE ONLY</span></div><span className="section-kicker">ESTIMATED TOTAL</span><h2>{billResult === null ? '—' : money(billResult)}</h2><p>Calculated from the inputs on the left.</p><div className="breakdown"><div><span>Consumption</span><strong>{Number(billUnits) >= 0 && billUnits !== '' ? `${num(Number(billUnits), 2)} kWh` : '—'}</strong></div><div><span>Energy charge</span><strong>{billResult === null ? '—' : money(Math.max(0, billResult - (Number(fixedCharges) || 0) - (Number(additionalCharges) || 0)))}</strong></div><div><span>Fixed charges</span><strong>{money(Number(fixedCharges) || 0)}</strong></div><div><span>Taxes / additional</span><strong>{money(Number(additionalCharges) || 0)}</strong></div><div className="breakdown-total"><span>Total estimate</span><strong>{billResult === null ? 'Check inputs' : money(billResult)}</strong></div></div><div className="callout callout-amber"><AlertCircle size={17} /><span>Your actual bill may include subsidies, duties, minimum charges, fuel adjustments, meter fees or other tariff rules. Use your utility's published tariff.</span></div></section></div>
        </>}

        {page === 'reminders' && <>
          <PageIntro eyebrow="BUILD THE HABIT" title="A reminder, at the right moment" body="Create and manage in-app reminders, including recurrence. Reminders stay in this browser; scheduled background delivery is not guaranteed." action={<button className="button button-primary" onClick={() => openReminder()}><Plus size={17} /> New reminder</button>} />
          <section className="reminder-callout"><div className="reminder-callout-icon"><Bell size={20} /></div><div><strong>Want browser notifications?</strong><p>Grant permission while this page is open. This prototype checks due reminders only during active use; it does not guarantee notifications after closing the browser.</p></div><button className="button button-outline" onClick={enableNotifications}>{notificationsEnabled ? <Check size={15} /> : <Bell size={15} />}{notificationsEnabled ? 'Permission granted' : 'Enable permission'}</button></section>
          <div className="reminder-filters"><div className="segmented" role="group" aria-label="Filter reminders">{([{ id: 'upcoming', label: 'Open' }, { id: 'completed', label: 'Completed' }, { id: 'all', label: 'All reminders' }] as const).map((option) => <button key={option.id} className={reminderFilter === option.id ? 'selected' : ''} onClick={() => setReminderFilter(option.id)}>{option.label}<span>{data.reminders.filter((r) => option.id === 'all' || (option.id === 'completed' ? r.completed : !r.completed)).length}</span></button>)}</div><span className="muted-note">Saved locally · {data.reminders.length} total</span></div>
          <section className="surface reminders-table-panel">{visibleReminders.length ? <div className="reminders-list-full">{visibleReminders.map((reminder) => <ReminderRow key={reminder.id} reminder={reminder} onToggle={() => toggleReminder(reminder)} onEdit={() => openReminder(reminder)} onDelete={() => deleteReminder(reminder.id)} />)}</div> : <EmptyState icon={<Bell size={24} />} title={reminderFilter === 'completed' ? 'Nothing completed yet' : 'No reminders here'} body="Create a reminder that fits your household routine." action={<button className="button button-primary" onClick={() => openReminder()}><Plus size={16} /> Add reminder</button>} />}</section>
          {reminderModal && <Modal title={editReminderId ? 'Edit reminder' : 'Create reminder'} onClose={() => setReminderModal(false)}><form className="form-stack" onSubmit={addOrEditReminder}><Field label="What would you like to remember?" id="rem-title"><input id="rem-title" type="text" maxLength={90} value={reminderTitle} onChange={(e) => setReminderTitle(e.target.value)} placeholder="Switch off unused lights" autoFocus required /></Field><Field label="Activity or appliance" id="rem-category"><select id="rem-category" value={reminderCategory} onChange={(e) => setReminderCategory(e.target.value as Category)}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field><Field label="Date and time" id="rem-date"><input id="rem-date" type="datetime-local" value={reminderDateTime} onChange={(e) => setReminderDateTime(e.target.value)} required /></Field><Field label="Repeat" id="rem-recurrence"><select id="rem-recurrence" value={reminderRecurrence} onChange={(e) => setReminderRecurrence(e.target.value as Recurrence)}>{RECURRENCES.map((r) => <option key={r}>{r}</option>)}</select></Field>{reminderError && <InlineError>{reminderError}</InlineError>}<ModalActions onCancel={() => setReminderModal(false)} submit={editReminderId ? 'Save reminder' : 'Create reminder'} /></form></Modal>}
        </>}

        {page === 'insights' && <>
          <PageIntro eyebrow="A GOAL YOU CAN MEASURE" title="Make progress visible" body="Compare a real monthly total against a declared baseline. Results are indicative when your entries do not cover the full month." />
          <div className="content-grid insights-layout"><section className="surface goal-form-panel"><PanelHeading title="Your reduction goal" subtitle="Set your baseline and intended reduction." /><form className="form-stack" onSubmit={saveGoal}><Field label="Baseline month" id="goal-month" hint="Choose the month your baseline consumption represents."><input id="goal-month" type="month" value={goalMonth} onChange={(e) => setGoalMonth(e.target.value)} required /></Field><Field label="Baseline consumption (kWh)" id="goal-baseline"><input id="goal-baseline" type="number" min="0.01" step="0.01" value={goalBaseline} onChange={(e) => setGoalBaseline(e.target.value)} required /></Field><Field label="Target reduction (%)" id="goal-reduction"><input id="goal-reduction" type="number" min="0" max="100" step="1" value={goalReduction} onChange={(e) => setGoalReduction(e.target.value)} required /></Field><button className="button button-primary button-full" type="submit"><Save size={16} /> Save goal</button></form></section><section className="surface goal-summary-panel"><span className="section-kicker">TARGET BREAKDOWN</span><h2>{goalProgress.targetKwh === null ? '—' : `${num(goalProgress.targetKwh)} kWh`}</h2><p>Target usage after a {data.goal.reductionPercent}% reduction from baseline.</p><div className="goal-progress-ring"><div><strong>{goalProgress.progressPercent === null ? '—' : `${Math.round(goalProgress.progressPercent)}%`}</strong><span>of target progress</span></div><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="49" /><circle className="progress-ring-fill" cx="60" cy="60" r="49" strokeDasharray={`${2 * Math.PI * 49}`} strokeDashoffset={`${2 * Math.PI * 49 * (1 - (goalProgress.progressPercent ?? 0) / 100)}`} /></svg></div><div className="breakdown"><div><span>Baseline</span><strong>{num(data.goal.baselineKwh)} kWh</strong></div><div><span>Current calendar month</span><strong>{num(thisMonthKwh)} kWh</strong></div><div><span>Current vs baseline</span><strong>{goalProgress.reductionPercentActual === null ? '—' : `${num(goalProgress.reductionPercentActual)}%`}</strong></div><div><span>Distance above target</span><strong>{goalProgress.remainingKwh === null ? '—' : `${num(goalProgress.remainingKwh)} kWh`}</strong></div></div><p className="helper-line"><Info size={14} /> Progress is capped at 100% and never means savings are verified; current-month entries may be incomplete.</p></section></div>
          <div className="content-grid insights-secondary"><section className="surface"><PanelHeading title="Recommendations" subtitle="Rule-based suggestions, no invented savings claims." />{recommendations.map((rec) => <Recommendation key={rec.title} rec={rec} />)}</section><section className="surface"><PanelHeading title="Carbon estimate" subtitle="Optional calculation from your configured factor." />{data.settings.carbonKgPerKwh > 0 && data.settings.carbonFactorSource ? <><div className="carbon-figure"><Leaf size={21} /><strong>{num(thisMonthKwh * data.settings.carbonKgPerKwh, 2)} kg CO₂e</strong></div><p className="body-copy">Calculated as {num(thisMonthKwh)} kWh × {num(data.settings.carbonKgPerKwh, 5)} kg CO₂e/kWh. Factor source entered by user: <a href={data.settings.carbonFactorSource} target="_blank" rel="noreferrer">open source <ExternalLink size={12} /></a></p></> : <EmptyState icon={<Leaf size={24} />} title="No emissions factor configured" body="An emissions number is intentionally omitted until you enter a factor and a source you can substantiate." action={<button className="button button-outline" onClick={() => navigate('settings')}>Configure factor</button>} />}<p className="helper-line">This is an estimate, not a measured environmental outcome. Demo records are illustrative.</p></section></div>
        </>}

        {page === 'learn' && <>
          <PageIntro eyebrow="THE EVERYDAY FIELD GUIDE" title="Learn the small things that add up" body="Practical energy habits, with a simple way to measure what changes for your household." />
          <div className="learning-grid">{[
            { title: 'Lighting', icon: <Lightbulb size={21} />, label: 'A brighter idea', body: 'Use daylight where comfortable and switch off lights in unoccupied rooms. LED lamps generally use less electricity than incandescent lamps for similar light output.', action: 'Compare lighting readings over similar days.' },
            { title: 'Cooling & ventilation', icon: <Sun size={21} />, label: 'Cool with intention', body: 'Set cooling to a comfortable, reasonable set-point, clean filters as the manufacturer recommends, and reduce direct sun gain where practical.', action: 'Compare cooling-category kWh before and after.' },
            { title: 'Household appliances', icon: <Zap size={21} />, label: 'Match the task', body: 'Use eco modes when appropriate, follow appliance care guidance, and avoid running a partly filled machine when a full load is suitable and safe.', action: 'Record appliance use by week or cycle.' },
            { title: 'Standby power', icon: <Activity size={21} />, label: 'Notice idle loads', body: 'Some electronics consume power in standby. Check the device manual and unplug or switch off equipment when safe; avoid interrupting devices that need continuous power.', action: 'Review idle devices room by room.' },
            { title: 'Electricity bills', icon: <FileText size={21} />, label: 'Read the fine print', body: 'Check the billed period, units in kWh, meter readings, slab rate, fixed charges, taxes and adjustments before comparing bills.', action: 'Compare like-for-like bill periods.' },
            { title: 'Daily habits', icon: <Droplets size={21} />, label: 'Make it repeatable', body: 'Choose a small routine that fits your home: lights-off checks, a weekly reading, or a reminder to review an appliance setting.', action: 'Use the reminder page and track completion.' },
          ].map((item) => <article className="surface learn-card" key={item.title}><div className="learn-icon">{item.icon}</div><span className="section-kicker">{item.label}</span><h3>{item.title}</h3><p>{item.body}</p><div className="learn-measure"><CheckCircle2 size={16} /><span>{item.action}</span></div><button className="text-button" onClick={() => item.title === 'Electricity bills' ? navigate('bill') : item.title === 'Daily habits' ? navigate('reminders') : navigate('consumption')}>Put into practice <ArrowRight size={14} /></button></article>)}</div>
          <section className="surface quiz-panel"><div className="quiz-heading"><div className="learn-icon"><CircleHelp size={21} /></div><div><span className="section-kicker">QUICK KNOWLEDGE CHECK</span><h2>Energy habits quiz</h2><p>Three questions. Immediate explanations. No external scoring.</p></div></div>{[{ id: 1, q: 'Which unit is commonly used to measure household electrical energy?', choices: ['kW (power only)', 'kWh (energy)', 'Volt-hour (pressure)'], correct: 'kWh (energy)', explain: 'A kilowatt-hour is a unit of energy; a kilowatt is a unit of power.' }, { id: 2, q: 'What is the best way to estimate whether a habit change helped?', choices: ['Assume it saved 30%', 'Compare similar periods and note other changes', 'Use a random online number'], correct: 'Compare similar periods and note other changes', explain: 'Comparable measurements give you evidence while acknowledging weather, occupancy and other differences.' }, { id: 3, q: 'Should you unplug every device to reduce standby use?', choices: ['Yes, even safety-critical equipment', 'Only if safe and suitable for that device', 'No device ever uses standby power'], correct: 'Only if safe and suitable for that device', explain: 'Follow the manufacturer’s instructions and do not interrupt equipment that needs a continuous connection.' }].map((question) => <div className="quiz-question" key={question.id}><h3>{question.id}. {question.q}</h3>{question.choices.map((choice) => <label key={choice} className={`quiz-option ${quizSubmitted && choice === question.correct ? 'correct' : ''}`}><input type="radio" name={`quiz-${question.id}`} value={choice} checked={quizAnswers[question.id] === choice} onChange={() => { setQuizAnswers((old) => ({ ...old, [question.id]: choice })); setQuizSubmitted(false); }} />{choice}</label>)}{quizSubmitted && <p className="quiz-explanation"><Info size={14} /> {question.explain}</p>}</div>)}<div className="quiz-footer"><button className="button button-primary" onClick={() => setQuizSubmitted(true)}>Check answers</button>{quizSubmitted && <strong>{[quizAnswers[1] === 'kWh (energy)', quizAnswers[2] === 'Compare similar periods and note other changes', quizAnswers[3] === 'Only if safe and suitable for that device'].filter(Boolean).length} / 3 correct</strong>}</div></section>
        </>}

        {page === 'about' && <>
          <section className="about-hero"><div className="about-symbol"><Zap size={30} /></div><span className="section-kicker">CHE110-CA1 · ASSIGNMENT PROJECT</span><h2>Smart Energy Saving<br /><em>Reminder System</em></h2><p>A household energy-awareness tool designed to help people record electricity usage, estimate bills, set measurable goals and build more considered habits.</p></section>
          <section className="surface about-copy"><PanelHeading title="Project overview" subtitle="Purpose and intended benefits" /><p>The application brings simple energy tracking and habit-building tools together. Users can manually record consumption, explore trends, configure bill estimates, manage reminders and compare a period’s usage with a chosen baseline.</p><p>Its intended environmental benefit is to make electricity use more visible and support informed decisions. It does not connect to a live meter, verify savings, or guarantee a reduction in consumption.</p><div className="feature-pills"><span><Activity size={15} /> Usage tracking</span><span><Gauge size={15} /> Bill estimates</span><span><Bell size={15} /> Reminder routines</span><span><TrendingDown size={15} /> Goal progress</span><span><BookOpen size={15} /> Energy guidance</span></div></section>
          <div className="section-row"><div><span className="section-kicker">ACADEMIC CREDITS</span><h2>Submitted by</h2></div><span className="data-tag">As listed in assignment brief</span></div><div className="student-grid">{STUDENTS.map((student, i) => <article className="surface student-card" key={student.uid}><div className="student-avatar">{student.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</div><span className="student-index">STUDENT 0{i + 1}</span><h3>{student.name}</h3><div className="student-meta"><span>UID</span><strong>{student.uid}</strong></div><div className="student-meta"><span>Section / Roll No.</span><strong>{student.section}</strong></div></article>)}</div><div className="callout callout-blue"><Info size={18} /><span>Student names, UID numbers, section/roll numbers and course are transcribed from the supplied CHE110-CA1 assignment topics document. No faculty name, approval or submission date has been added.</span></div>
        </>}

        {page === 'settings' && <>
          <PageIntro eyebrow="YOUR CONFIGURATION" title="Settings & data control" body="Set bill assumptions, configure an optional emissions factor, and keep control of local records and backups." />
          <section className="surface settings-section"><PanelHeading title="Estimation assumptions" subtitle="These values affect bill and optional carbon estimates." /><form className="settings-grid" onSubmit={saveSettings}><Field label="Flat electricity rate (₹ / kWh)" id="settings-rate"><input id="settings-rate" type="number" min="0" step="0.01" value={settingsRate} onChange={(e) => setSettingsRate(e.target.value)} required /></Field><Field label="Fixed bill charges (₹)" id="settings-fixed"><input id="settings-fixed" type="number" min="0" step="0.01" value={settingsFixed} onChange={(e) => setSettingsFixed(e.target.value)} required /></Field><Field label="Additional charges (₹)" id="settings-extra"><input id="settings-extra" type="number" min="0" step="0.01" value={settingsExtra} onChange={(e) => setSettingsExtra(e.target.value)} required /></Field><Field label="CO₂e factor (kg per kWh)" id="settings-carbon" hint="Leave at 0 to hide the carbon calculation. This is not prefilled with a claimed Indian grid factor."><input id="settings-carbon" type="number" min="0" step="0.00001" value={carbonFactor} onChange={(e) => setCarbonFactor(e.target.value)} /></Field><div className="field-span-two"><Field label="Source URL for emissions factor" id="settings-carbon-source" hint="Required when the factor is greater than 0. Prefer a source with region and publication date."><input id="settings-carbon-source" type="url" value={carbonSource} onChange={(e) => setCarbonSource(e.target.value)} placeholder="https://…" /></Field></div><div className="field-span-two"><button className="button button-primary" type="submit"><Save size={16} /> Save preferences</button></div></form></section>
          <section className="surface settings-section"><PanelHeading title="Back up or restore your work" subtitle="Export includes your readings, reminders, goal and assumptions." /><div className="data-actions"><button className="button button-outline" onClick={exportData}><Download size={17} /> Export backup (JSON)</button><label className="button button-outline file-label"><Upload size={17} /> Import backup<input type="file" accept="application/json,.json" onChange={importData} /></label></div>{exportImportError && <InlineError>{exportImportError}</InlineError>}<div className="callout callout-blue"><ShieldCheck size={17} /><span>Backup files may contain notes you entered. Store them privately. This project does not send your data to a server in local demo mode.</span></div></section>
          <section className="surface settings-section"><PanelHeading title="Cloud sync status" subtitle="Supabase is optional and not required for the local demonstration." /><div className="cloud-status"><div className={`cloud-status-icon ${cloudConfigured ? 'configured' : ''}`}>{cloudConfigured ? <Cloud size={20} /> : <Info size={20} />}</div><div><strong>{cloudConfigured ? 'Supabase credentials detected' : 'Local browser storage active'}</strong><p>{cloudConfigured ? 'Credentials are configured. This build does not enable cloud sync until a secured schema and authenticated client workflow are configured.' : 'No Supabase URL and publishable key were provided in this environment. Cross-device sync is not active.'}</p></div></div><ol className="setup-list"><li>Create a Supabase project in your own account.</li><li>Run the SQL migration shipped under <code>supabase/migrations</code>.</li><li>Copy the project URL and publishable key to a local <code>.env</code> file using <code>.env.example</code>.</li><li>Enable authenticated accounts before storing personal household records in the cloud.</li></ol></section>
          <section className="surface settings-section danger-zone"><PanelHeading title="Clear local data" subtitle="Remove readings and reminders from this browser." /><p>This action deletes consumption records and all reminders. Your goal and bill assumptions remain. Export a backup first if you need a copy.</p>{!resetConfirm ? <button className="button button-danger" onClick={() => setResetConfirm(true)}><Trash2 size={16} /> Clear readings and reminders</button> : <div className="confirm-row"><strong>Delete all local readings and reminders?</strong><button className="button button-danger" onClick={resetData}>Yes, clear data</button><button className="button button-outline" onClick={() => setResetConfirm(false)}>Cancel</button></div>}</section>
        </>}
        <footer className="app-footer"><div><div className="footer-brand"><Zap size={16} /> Smart Energy Saving Reminder System</div><span>CHE110-CA1 · Academic project demonstration</span></div><div className="footer-right"><span>Built for clearer everyday choices.</span><button onClick={() => navigate('about')}>Project credits <ArrowRight size={14} /></button></div></footer>
      </div>
    </main>
    {toast && <div className={`toast ${toast.kind === 'error' ? 'toast-error' : ''}`} role="status" aria-live="polite">{toast.kind === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}{toast.message}<button aria-label="Dismiss message" onClick={() => setToast(null)}><X size={16} /></button></div>}
  </div>;
}

function MetricCard({ icon, label, value, detail, tone, badge }: { icon: React.ReactNode; label: string; value: string; detail: string; tone: string; badge?: string }) {
  return <article className={`metric-card metric-${tone}`}><div className="metric-card-top"><div className="metric-icon">{icon}</div>{badge && <span className="data-tag demo">{badge}</span>}</div><span className="metric-label">{label}</span><strong className="metric-value">{value}</strong><span className="metric-detail">{detail}</span></article>;
}
function PanelHeading({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) { return <div className="panel-heading"><div><h3>{title}</h3>{subtitle && <p>{subtitle}</p>}</div>{action}</div>; }
function PageIntro({ eyebrow, title, body, action }: { eyebrow: string; title: string; body: string; action?: React.ReactNode }) { return <section className="page-intro"><div><span className="section-kicker">{eyebrow}</span><h2>{title}</h2><p>{body}</p></div>{action}</section>; }
function Field({ label, id, hint, children }: { label: string; id: string; hint?: string; children: React.ReactNode }) { return <div className="form-field"><label htmlFor={id}>{label}</label>{children}{hint && <small>{hint}</small>}</div>; }
function InlineError({ children }: { children: React.ReactNode }) { return <div className="inline-error" role="alert"><AlertCircle size={16} />{children}</div>; }
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) { return <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-header"><h2 id="modal-title">{title}</h2><button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={19} /></button></div>{children}</section></div>; }
function ModalActions({ onCancel, submit }: { onCancel: () => void; submit: string }) { return <div className="modal-actions"><button type="button" className="button button-outline" onClick={onCancel}>Cancel</button><button type="submit" className="button button-primary">{submit}</button></div>; }
function EmptyState({ icon, title, body, action }: { icon: React.ReactNode; title: string; body: string; action?: React.ReactNode }) { return <div className="empty-state"><div className="empty-icon">{icon}</div><h3>{title}</h3><p>{body}</p>{action}</div>; }
function DemoNotice() { return <div className="demo-notice"><Info size={16} /><p><strong>Data honesty, by design.</strong> Example values are labelled as demo data. Readings you add are kept separate, and the application has no real electricity-meter integration.</p></div>; }
function EnergyChart({ data }: { data: { label: string; date: string; kwh: number; source: string }[] }) {
  if (!data.length) return <div className="chart-empty"><Activity size={23} /><strong>No readings in this period</strong><span>Add a consumption reading to create a trend.</span></div>;
  return <div className="rechart-wrap"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 2 }}><CartesianGrid strokeDasharray="3 4" vertical={false} stroke="var(--chart-grid)" /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} minTickGap={14} /><YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} tickFormatter={(value: number) => `${value}`} /><Tooltip cursor={{ fill: 'var(--chart-hover)' }} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, fontSize: 12, color: 'var(--text)' }} formatter={(value) => [`${num(Number(value), 2)} kWh`, 'Consumption']} labelFormatter={(label, payload) => payload?.[0]?.payload?.date ? displayDate(String(payload[0].payload.date)) : String(label)} /><Bar dataKey="kwh" name="Consumption" radius={[5, 5, 1, 1]} maxBarSize={36}>{data.map((entry) => <Cell key={entry.date} fill={entry.source === 'demo' ? 'var(--chart-demo)' : 'var(--chart-primary)'} />)}</Bar></BarChart></ResponsiveContainer></div>;
}
function ReminderMini({ reminder, onToggle }: { reminder: Reminder; onToggle: () => void }) { return <div className={`mini-reminder ${reminder.completed ? 'done' : ''}`}><button className="check-control" aria-label={reminder.completed ? `Mark ${reminder.title} incomplete` : `Complete ${reminder.title}`} aria-pressed={reminder.completed} onClick={onToggle}>{reminder.completed && <Check size={13} />}</button><div className="mini-reminder-copy"><strong>{reminder.title}</strong><span><Clock3 size={12} /> {displayDate(reminder.dueAt)}</span></div><span className="recurrence-tag">{reminder.recurrence === 'None' ? reminder.category : reminder.recurrence}</span></div>; }
function ReminderRow({ reminder, onToggle, onEdit, onDelete }: { reminder: Reminder; onToggle: () => void; onEdit: () => void; onDelete: () => void }) {
  const overdue = !reminder.completed && new Date(reminder.dueAt).getTime() < Date.now();
  return <article className={`reminder-row ${reminder.completed ? 'reminder-completed' : ''}`}><button className="check-control" aria-label={reminder.completed ? `Mark ${reminder.title} incomplete` : `Complete ${reminder.title}`} aria-pressed={reminder.completed} onClick={onToggle}>{reminder.completed && <Check size={13} />}</button><div className="reminder-row-copy"><h3>{reminder.title}</h3><p><span>{reminder.category}</span><span>·</span><span>{displayDate(reminder.dueAt)}</span></p></div><div className="reminder-row-tags">{overdue && <span className="status-tag overdue">Overdue</span>}<span className="status-tag">{reminder.completed ? 'Completed' : reminder.recurrence === 'None' ? 'One-off' : `Repeats ${reminder.recurrence.toLowerCase()}`}</span></div><div className="row-actions"><button className="icon-button compact" aria-label={`Edit ${reminder.title}`} onClick={onEdit}><Edit3 size={15} /></button><button className="icon-button compact danger" aria-label={`Delete ${reminder.title}`} onClick={onDelete}><Trash2 size={15} /></button></div></article>;
}
function Recommendation({ rec, compact = false }: { rec: { title: string; why: string; when: string; measure: string; category: string }; compact?: boolean }) { return <article className={`recommendation ${compact ? 'recommendation-compact' : ''}`}><div className="recommendation-icon"><Lightbulb size={17} /></div><div className="recommendation-body"><div className="recommendation-top"><h3>{rec.title}</h3><span className="data-tag">{rec.category}</span></div><p>{rec.why}</p><div className="recommendation-details"><span><Clock3 size={13} /><strong>When:</strong> {rec.when}</span><span><Activity size={13} /><strong>Measure:</strong> {rec.measure}</span></div></div></article>; }

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
