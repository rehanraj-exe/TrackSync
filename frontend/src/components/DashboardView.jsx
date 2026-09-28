import React, { useState } from 'react';
import { Clock, ShieldCheck, ChevronDown, Calendar, Search, ArrowUpRight, ArrowDownRight, Paperclip, MoreVertical, Plus } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, BarChart, Bar } from 'recharts';

export default function DashboardView({ data, predictions, trafficLevel, setTrafficLevel, manualDelayPenalty = 0, onInjectTask, onViewOnMap }) {
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [isApproving, setIsApproving] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState(null); // null, 'success', 'error'
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCorridor, setFilterCorridor] = useState('All');
  const [filterDept, setFilterDept] = useState('All');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskInput, setTaskInput] = useState('');

  if (!data) return null;

  const metrics = {
    uptime: 1 - (data.downtime_hours / (7 * 24)) || 0.94, // Mock calculation for display if real data absent
    delay: (data.total_delay_minutes || 12.5) + manualDelayPenalty,
    tasks: data.total_tasks || 45,
    coordination: Math.max(0.1, (data.block_utilization || 0.82) - (manualDelayPenalty * 0.01)),
    alerts: data.deadline_alerts || 0
  };

  let lineChartData = [
    { name: 'Mon', val: 0 }, { name: 'Tue', val: 0 }, { name: 'Wed', val: 0 }, 
    { name: 'Thu', val: 0 }, { name: 'Fri', val: 0 }, { name: 'Sat', val: 0 }, { name: 'Sun', val: 0 }
  ];

  let barChartData = [
    { name: 'Eng', val: 0 }, { name: 'S&T', val: 0 }, { name: 'TRD', val: 0 }
  ];

  if (data && data.recommendations !== undefined) {
    data.recommendations.forEach(r => {
      const day = new Date(r.start).toLocaleDateString('en-US', {weekday: 'short'});
      const dayIndex = lineChartData.findIndex(d => d.name === day);
      if (dayIndex !== -1) {
        lineChartData[dayIndex].val += r.train_delay_minutes || 0;
      }
      r.departments.forEach(dept => {
        const dName = dept.includes('Eng') ? 'Eng' : dept.includes('Signal') ? 'S&T' : 'TRD';
        const dIndex = barChartData.findIndex(d => d.name === dName);
        if (dIndex !== -1) {
          barChartData[dIndex].val += r.task_ids.length;
        }
      });
    });
  } else {
     lineChartData = [
      { name: 'Mon', val: 24 }, { name: 'Tue', val: 18 }, { name: 'Wed', val: 28 }, 
      { name: 'Thu', val: 22 }, { name: 'Fri', val: 30 }, { name: 'Sat', val: 35 }, { name: 'Sun', val: 40 }
    ];

    barChartData = [
      { name: 'A', val: 20 }, { name: 'B', val: 35 }, { name: 'C', val: 25 }, 
      { name: 'D', val: 45 }, { name: 'E', val: 30 }, { name: 'F', val: 50 }, { name: 'G', val: 40 }
    ];
  }

  const recommendedBlocks = data.recommendations ? data.recommendations.map(r => {
    // Format start time
    const date = new Date(r.start);
    const timeStr = `${date.toLocaleDateString('en-US', {weekday: 'short'})} ${date.getHours()}:00`;
    return {
      id: r.block_id,
      time: timeStr,
      tasks: r.task_ids.length,
      type: r.departments.join(', '),
      delay: r.train_delay_minutes,
      status: r.priority_class,
      confidence: Math.round(r.utilization * 100),
      section: r.section,
      window: `${date.getHours()}:00 - ${new Date(r.end).getHours()}:00`
    };
  }) : [
    { id: 'BLK-1001', time: 'In 2 days', tasks: 4, type: 'Maintenance', delay: 15, status: 'Draft', confidence: 94, section: 'A-B', window: '02:00 - 06:00' },
  ];

  const filteredBlocks = recommendedBlocks.filter(b => {
    const matchesSearch = b.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCorridor = filterCorridor === 'All' || b.section.includes(filterCorridor);
    const matchesDept = filterDept === 'All' || b.type.includes(filterDept);
    return matchesSearch && matchesCorridor && matchesDept;
  });

  const activeBlockData = selectedBlock ? filteredBlocks.find(b => b.id === selectedBlock) : filteredBlocks[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      
      {/* 4 Top Metric Cards (Light Theme) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
        
        {/* Card 1 */}
        <div className="metric-card">
          <div>
            <div className="metric-header">
              <span className="metric-title">Asset Uptime</span>
              <AlertCircleIcon className="metric-icon-small" size={16} color="var(--danger)" />
            </div>
            <div className="metric-value">{(metrics.uptime * 100).toFixed(1)}%</div>
            <div className="metric-trend up">
              <ArrowUpRight size={14} /> 2.1% <span>from last month</span>
            </div>
          </div>
          <div style={{ height: '60px', marginTop: '1rem', background: 'var(--bg-app)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>[Illustration]</span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="metric-card">
          <div>
            <div className="metric-header">
              <span className="metric-title">Multi-Dept Sync</span>
              <Calendar className="metric-icon-small" size={16} />
            </div>
            <div className="metric-value">{(metrics.coordination * 100).toFixed(1)}%</div>
            <div className="metric-trend up" style={{ color: 'var(--accent-purple)' }}>
              <ArrowUpRight size={14} /> 8.2% <span>from last month</span>
            </div>
          </div>
          <div style={{ height: '60px', marginTop: '1rem' }}>
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData}>
                  <Bar dataKey="val" fill="var(--accent-purple-light)" radius={[2, 2, 0, 0]} barSize={8} />
                </BarChart>
              </ResponsiveContainer>
          </div>
        </div>

        {/* Card 3 */}
        <div className="metric-card">
          <div>
            <div className="metric-header">
              <span className="metric-title">Avg Train Delay</span>
              <Clock className="metric-icon-small" size={16} />
            </div>
            <div className="metric-value" style={{ color: manualDelayPenalty > 0 ? 'var(--danger)' : 'inherit', transition: 'color 0.3s' }}>
              {metrics.delay.toFixed(1)}m
            </div>
            {manualDelayPenalty > 0 ? (
              <div className="metric-trend down" style={{ color: 'var(--danger)' }}>
                <ArrowUpRight size={14} /> +{manualDelayPenalty}m <span>from conflicts</span>
              </div>
            ) : (
              <div className="metric-trend down">
                <ArrowDownRight size={14} /> 4.5m <span>from last month</span>
              </div>
            )}
          </div>
          <div style={{ height: '60px', marginTop: '1rem' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={lineChartData}>
                <Area type="monotone" dataKey="val" stroke="var(--accent-purple)" fill="none" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 4 */}
        <div className="metric-card">
          <div>
            <div className="metric-header">
              <span className="metric-title">Safety Gate</span>
              <ShieldCheck className="metric-icon-small" size={16} color="var(--success)" />
            </div>
            <div className="metric-value">Clear</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>All critical tasks scheduled</div>
          </div>
          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
            <div style={{ flex: 1, background: 'var(--bg-app)', padding: '0.75rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Eng</span>
              <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>24 tasks</span>
            </div>
            <div style={{ flex: 1, background: 'var(--accent-purple)', padding: '0.75rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'white' }}>
              <span style={{ fontSize: '0.65rem', opacity: 0.8 }}>S&T</span>
              <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>12 tasks</span>
            </div>
          </div>
        </div>

      </div>

      {/* ML Predictive Insights Widget */}
      {predictions && predictions.length > 0 && (
        <div className="glass-card hover-lift" style={{ background: 'linear-gradient(to right, rgba(255, 0, 85, 0.15), rgba(20, 22, 34, 0.6))', border: '1px solid rgba(255, 0, 85, 0.3)', padding: '1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-50px', left: '-50px', width: '100px', height: '100px', background: 'var(--danger)', filter: 'blur(50px)', opacity: 0.5 }}></div>
          <div style={{ background: 'linear-gradient(135deg, #ff0055, #ff0080)', color: 'white', borderRadius: '50%', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(255,0,85,0.5)', zIndex: 1 }}>
            <AlertCircleIcon size={24} color="white" />
          </div>
          <div style={{ flex: 1, zIndex: 1 }}>
            <h3 style={{ margin: 0, fontSize: '1.125rem', color: '#ff4d88', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ff4d88', display: 'inline-block', boxShadow: '0 0 10px #ff4d88' }}></span>
              ML Predictive Insights
            </h3>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              The AI model has flagged <strong style={{ color: 'white' }}>{predictions.length} assets</strong> at high risk of failure in the next 30 days based on traffic and history. 
              Highest risk: <span style={{ color: 'white', fontWeight: 600 }}>{predictions[0].asset_id} ({predictions[0].type})</span> at {predictions[0].risk_probability}% probability.
            </p>
          </div>
          <button 
            className="btn-primary" 
            style={{ background: 'linear-gradient(135deg, #ff0055, #ff0080)', boxShadow: '0 0 15px rgba(255,0,85,0.4)', zIndex: 1, cursor: 'pointer' }}
            onClick={() => onInjectTask && onInjectTask(predictions[0]?.asset_id)}
          >
            Schedule Preventive Block
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="filter-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.875rem', marginRight: '1rem' }}>
          Active filters <span style={{ background: 'var(--text-main)', color: 'white', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem' }}>2</span>
        </div>
        <div 
          className="filter-pill hover-lift" 
          style={{ cursor: 'pointer', background: trafficLevel === 'HIGH' ? 'var(--danger)' : 'rgba(255,255,255,0.1)', color: 'white', border: trafficLevel === 'HIGH' ? 'none' : '1px solid rgba(255,255,255,0.2)' }}
          onClick={() => setTrafficLevel && setTrafficLevel(prev => prev === 'NORMAL' ? 'HIGH' : 'NORMAL')}
        >
          Traffic: {trafficLevel} <ChevronDown size={14} />
        </div>
        <div className="filter-pill hover-lift" style={{ cursor: 'pointer', position: 'relative' }}>
          <select value={filterCorridor} onChange={e => setFilterCorridor(e.target.value)} style={{ opacity: 0, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'pointer' }}>
            <option value="All">All Corridors</option>
            <option value="A-B">Corridor A-B</option>
            <option value="C-D">Corridor C-D</option>
          </select>
          {filterCorridor === 'All' ? 'All Corridors' : filterCorridor} <ChevronDown size={14} />
        </div>
        <div className="filter-pill hover-lift" style={{ cursor: 'pointer', position: 'relative' }}>
          <select value={filterDept} onChange={e => setFilterDept(e.target.value)} style={{ opacity: 0, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'pointer' }}>
            <option value="All">All Departments</option>
            <option value="Eng">Engineering</option>
            <option value="Signal">Signalling</option>
            <option value="TRD">TRD</option>
          </select>
          {filterDept === 'All' ? 'All Departments' : filterDept} <ChevronDown size={14} />
        </div>
        <div className="filter-pill" style={{ marginLeft: 'auto' }}>{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} <Calendar size={14} /></div>
        <div className="filter-pill">{new Date(Date.now() + 30 * 86400000).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} <Calendar size={14} /></div>
        <div className="filter-search">
          <input type="text" placeholder="Enter block ID #" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          <Search size={14} color="var(--text-muted)" />
        </div>
      </div>

      {/* Bottom Section (Dark & Purple Dual Theme) */}
      <div className="dark-container">
        
        {/* Left Side: Dark List */}
        <div className="dark-list">
          <div className="list-header">
            <span>Recommended Blocks</span>
            <div className="list-tabs">
              <button className="list-tab">All</button>
              <button className="list-tab">Draft <span style={{ opacity: 0.5 }}>3</span></button>
              <button className="list-tab active">AI Pick <span style={{ background: 'white', color: 'var(--accent-purple)', borderRadius: '50%', padding: '0 4px', marginLeft: '4px' }}>5</span></button>
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto', flex: 1 }}>
            {filteredBlocks.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', padding: '1rem', textAlign: 'center' }}>No blocks match criteria</div>
            ) : (
              filteredBlocks.map(block => (
                <div 
                  key={block.id} 
                  className={`list-item ${selectedBlock === block.id ? 'active' : ''}`}
                  onClick={() => setSelectedBlock(block.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold', color: 'white' }}>
                      {block.type.charAt(0)}
                    </div>
                    <div>
                      <div className="list-item-main"># {block.id}</div>
                      <div className="list-item-sub">{block.time}</div>
                    </div>
                  </div>
                  <div className="list-item-status">{block.status}</div>
                  <div className="list-item-value">{block.tasks} Tasks</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Purple Detail Panel */}
        <div className="details-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.875rem', opacity: 0.8, marginBottom: '0.25rem' }}>Block details</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <h2 style={{ fontSize: '2rem', margin: 0, fontWeight: 700 }}># {activeBlockData?.id}</h2>
                <span style={{ background: 'rgba(255,255,255,0.2)', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem' }}>{activeBlockData?.status}</span>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '4rem' }}>
              <div>
                <div style={{ fontSize: '0.875rem', opacity: 0.8, marginBottom: '0.25rem' }}>Corridor</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem', fontWeight: 600 }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid var(--accent-purple)' }}></div>
                  </div>
                  {activeBlockData?.section || 'N/A'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', opacity: 0.8, marginBottom: '0.25rem' }}>AI Confidence</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.125rem', fontWeight: 600 }}>
                  <img src="https://ui-avatars.com/api/?name=AI&background=ffffff&color=5c50e6" style={{ width: '28px', height: '28px', borderRadius: '50%' }} alt="AI" />
                  {activeBlockData?.confidence || 0}%
                </div>
              </div>
            </div>
          </div>

          {/* Metric Cards inside details panel */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: '3rem', flex: 1 }}>
            
            <div className="detail-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>{activeBlockData?.tasks}</span>
                  <ArrowUpRight size={18} opacity={0.5} />
                </div>
                <div style={{ fontSize: '0.875rem', opacity: 0.8, marginTop: '1.5rem' }}>Tasks Bundled</div>
              </div>
            </div>

            <div className="detail-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>{activeBlockData?.delay}m</span>
                  <ArrowUpRight size={18} opacity={0.5} />
                </div>
                <div style={{ fontSize: '0.875rem', opacity: 0.8, marginTop: '1.5rem' }}>Est. Train Delay</div>
              </div>
            </div>

            <div className="detail-card hover-lift" onClick={() => setShowTaskModal(true)} style={{ border: '1px dashed rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.02)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Plus size={28} color="var(--accent-purple-light)" />
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.75rem', fontWeight: 500 }}>Add Manual Task</div>
            </div>

          </div>

          {/* Footer of details panel */}
          <div style={{ marginTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '3rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Time Window</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{activeBlockData?.window || 'N/A'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Departments</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{activeBlockData?.type}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Coordination Score</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{activeBlockData?.confidence || 0}%</div>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <button style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', cursor: 'pointer' }}>
                <Paperclip size={18} />
              </button>
              <button style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', cursor: 'pointer' }}>
                <Calendar size={18} />
              </button>
              <button 
                className="btn-primary" 
                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white' }}
                onClick={() => onViewOnMap && onViewOnMap(activeBlockData?.section)}
              >
                View on Map
              </button>
              <button 
                className="btn-primary" 
                disabled={isApproving || approvalStatus === 'success' || !activeBlockData}
                style={{ 
                  background: approvalStatus === 'success' ? 'var(--success)' : 'linear-gradient(135deg, var(--accent-purple), var(--accent-purple-light))',
                  transition: 'all 0.3s'
                }}
                onClick={async () => {
                  if (!activeBlockData) return;
                  setIsApproving(true);
                  setApprovalStatus(null);
                  try {
                    // First create a plan record, then submit, then approve
                    await fetch(`/plans/${activeBlockData.id}/submit?user=operator`, { method: 'POST' }).catch(() => {});
                    const response = await fetch(`/plans/${activeBlockData.id}/approve?user=operator`, { method: 'POST' });
                    if (response.ok) {
                      setApprovalStatus('success');
                      setTimeout(() => setApprovalStatus(null), 4000);
                    } else {
                      const errData = await response.json().catch(() => ({}));
                      console.error('Approval failed:', errData);
                      setApprovalStatus('error');
                      setTimeout(() => setApprovalStatus(null), 4000);
                    }
                  } catch (e) {
                    console.error('Approval error:', e);
                    setApprovalStatus('error');
                    setTimeout(() => setApprovalStatus(null), 4000);
                  } finally {
                    setIsApproving(false);
                  }
                }}
              >
                {isApproving ? 'Approving...' : approvalStatus === 'success' ? '✓ Approved!' : approvalStatus === 'error' ? '✗ Failed' : 'Approve Plan'}
              </button>
            </div>
          </div>

        </div>

      </div>

      {showTaskModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)' }}>
          <div className="glass-panel" style={{ width: '400px', padding: '2rem', borderRadius: '12px', background: 'rgba(20,22,34,0.95)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: 'white', fontSize: '1.25rem' }}>Add Manual Task</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'block' }}>Task Description</label>
                <input type="text" value={taskInput} onChange={e => setTaskInput(e.target.value)} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.75rem', borderRadius: '6px', color: 'white', outline: 'none' }} placeholder="e.g. Track repair section C..." />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button onClick={() => setShowTaskModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>Cancel</button>
                <button onClick={() => {
                  if (taskInput && onInjectTask) onInjectTask('Track'); // Mock injecting track task
                  setShowTaskModal(false);
                  setTaskInput('');
                }} className="btn-primary" style={{ background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-purple-light))' }}>Save Task</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Quick fallback icon if lucide import is missing one
function AlertCircleIcon(props) {
  return <svg xmlns="http://www.w3.org/2000/svg" width={props.size} height={props.size} viewBox="0 0 24 24" fill="none" stroke={props.color || "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>;
}
