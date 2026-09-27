import React, { useState, useEffect } from 'react';
import { TrainFront, Settings, Bell, LayoutDashboard, CalendarDays } from 'lucide-react';
import './index.css';

// Components
import DashboardView from './components/DashboardView';
import GanttScheduler from './components/GanttScheduler';
import CoPilotChat from './components/CoPilotChat';
import MapView from './components/MapView';
import OperationsView from './components/OperationsView';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [planData, setPlanData] = useState(null);
  const [trafficLevel, setTrafficLevel] = useState('NORMAL');
  const [predictions, setPredictions] = useState(null);
  const [tasksData, setTasksData] = useState([]);
  const [manualDelayPenalty, setManualDelayPenalty] = useState(0);

  // Quick Co-Pilot state
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);

  // Notifications & Global Actions
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [mapFocus, setMapFocus] = useState(null);

  const addNotification = (title, message, type = 'info') => {
    setNotifications(prev => [{ id: Date.now(), title, message, type }, ...prev].slice(0, 5));
  };

  const handleInjectTask = (assetId) => {
    setTasksData(prev => [{
      task_id: `M-REQ-${Date.now().toString().slice(-4)}`,
      location: 'Section A-B',
      department: 'Engineering',
      asset_type: assetId || 'Track',
      priority_class: 'CRITICAL',
      priority_score: 9.8
    }, ...prev]);
    setActiveTab('operations');
    addNotification('Task Injected', `Emergency block requested for ${assetId || 'Asset'}.`, 'info');
  };

  useEffect(() => {
    // Fetch data from FastAPI backend
    const fetchData = async () => {
      try {
        const response = await fetch(`/plans/weekly?traffic_level=${trafficLevel}`);
        if (response.ok) {
          const data = await response.json();
          setPlanData(data);
        } else {
          setPlanData({ utilization: 0.85, delay: 12.5, blocks: 12, uptime: 0.94 });
        }

        // Fetch ML Predictions
        try {
            const predResponse = await fetch('/predictions');
            if (predResponse.ok) {
              const predData = await predResponse.json();
              setPredictions(predData.high_risk_assets);
              if (predData.high_risk_assets && predData.high_risk_assets.length > 0) {
                addNotification('AI Prediction Alert', `${predData.high_risk_assets.length} assets flagged for failure risk.`, 'error');
              }
            }
        } catch (e) {
            console.error("ML Predictions not available", e);
        }

        // Fetch tasks queue
        try {
            const tasksResponse = await fetch('/tasks');
            if (tasksResponse.ok) {
                const tasks = await tasksResponse.json();
                setTasksData(tasks);
            }
        } catch (e) {
            console.error("Tasks API not available", e);
        }
      } catch (err) {
        setPlanData({ utilization: 0.85, delay: 12.5, blocks: 12, uptime: 0.94 });
      }
    };
    fetchData();
  }, [trafficLevel]);

  return (
    <div className="app-wrapper">
      
      {/* Top Navigation */}
      <header className="top-nav">
        
        {/* Brand */}
        <div className="brand">
          <div className="brand-icon">
            <TrainFront size={28} />
          </div>
          <div className="brand-text">
            <h1>BlockPlanner</h1>
            <p>Smart Operations, Better Railways</p>
          </div>
        </div>
        
        {/* Nav Pill Container */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>AI</div>
          <div className="nav-pill-container">
            <button 
              className={`nav-pill ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              Overview
            </button>
            <button 
              className={`nav-pill ${activeTab === 'schedule' ? 'active' : ''}`}
              onClick={() => setActiveTab('schedule')}
            >
              Scheduler
            </button>
            <button 
              className={`nav-pill ${activeTab === 'risk' ? 'active' : ''}`}
              onClick={() => setActiveTab('risk')}
            >
              Risk Map
            </button>
            <button 
              className={`nav-pill ${activeTab === 'operations' ? 'active' : ''}`}
              onClick={() => setActiveTab('operations')}
            >
              Operations
            </button>
          </div>
        </div>

        {/* Actions / Profile */}
        <div className="nav-actions" style={{ position: 'relative' }}>
          <button className="icon-btn"><Settings size={18} /></button>
          <button className="icon-btn" onClick={() => setShowNotifications(!showNotifications)} style={{ position: 'relative' }}>
            <Bell size={18} />
            {notifications.length > 0 && <span style={{ position: 'absolute', top: 0, right: 0, width: '8px', height: '8px', background: 'var(--danger)', borderRadius: '50%', boxShadow: '0 0 5px var(--danger)' }}></span>}
          </button>
          
          {showNotifications && (
            <div className="glass-panel" style={{ position: 'absolute', top: '3rem', right: '1rem', width: '320px', zIndex: 100, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', boxShadow: '0 10px 40px rgba(0,0,0,0.5)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Notifications
                {notifications.length > 0 && <button onClick={() => setNotifications([])} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '0.7rem', cursor: 'pointer' }}>Clear All</button>}
              </div>
              {notifications.length === 0 ? (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No new alerts.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
                  {notifications.map((n) => (
                    <div key={n.id} style={{ fontSize: '0.75rem', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', borderLeft: `3px solid ${n.type === 'error' ? 'var(--danger)' : 'var(--accent-purple-light)'}` }}>
                      <div style={{ color: 'white', fontWeight: 600, marginBottom: '0.25rem' }}>{n.title}</div>
                      <div style={{ color: 'var(--text-muted)' }}>{n.message}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="profile-pic">
            <img src="https://ui-avatars.com/api/?name=DRM&background=cbd5e1&color=1e293b" alt="User Profile" style={{ width: '100%', height: '100%' }} />
          </div>
        </div>
        
      </header>

      {/* Main Content Area */}
      <main>
        {activeTab === 'dashboard' && <DashboardView data={planData} predictions={predictions} trafficLevel={trafficLevel} setTrafficLevel={setTrafficLevel} manualDelayPenalty={manualDelayPenalty} onInjectTask={handleInjectTask} onViewOnMap={(section) => { setMapFocus(section); setActiveTab('risk'); }} />}
        {activeTab === 'schedule' && <GanttScheduler data={planData} tasksData={tasksData} setManualDelayPenalty={setManualDelayPenalty} addNotification={addNotification} />}
        {activeTab === 'risk' && <MapView data={planData} mapFocus={mapFocus} />}
        {activeTab === 'operations' && <OperationsView data={planData} tasksData={tasksData} />}
      </main>

      {/* Floating Action Button for CoPilot */}
      <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 50 }}>
        {isCopilotOpen ? (
          <div className="glass-panel" style={{ width: '380px', height: '550px', borderRadius: '24px', overflow: 'hidden', display: 'flex', flexDirection: 'column', animation: 'slideIn 0.3s ease-out' }}>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)' }}>
               <span style={{ fontWeight: 600, color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-purple-light)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                 AI CoPilot
               </span>
               <button onClick={() => setIsCopilotOpen(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', cursor: 'pointer', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>✕</button>
            </div>
            <div style={{ flex: 1, background: 'rgba(0,0,0,0.4)', overflow: 'hidden' }}>
              <CoPilotChat />
            </div>
          </div>
        ) : (
          <button 
            onClick={() => setIsCopilotOpen(true)}
            className="hover-lift"
            style={{ 
              background: 'linear-gradient(135deg, var(--accent-purple) 0%, var(--accent-purple-light) 100%)', 
              color: 'white', 
              border: 'none', 
              borderRadius: '50%', 
              width: '64px', 
              height: '64px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              cursor: 'pointer',
              boxShadow: 'var(--shadow-glow)',
              transition: 'all 0.3s'
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          </button>
        )}
      </div>

    </div>
  );
}

export default App;
