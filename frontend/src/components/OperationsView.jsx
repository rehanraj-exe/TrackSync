import React, { useState } from 'react';
import { Search, Filter, CheckCircle, Clock, AlertTriangle, ChevronDown, MoreHorizontal, ArrowRight } from 'lucide-react';

export default function OperationsView({ data, tasksData }) {
  const [activeTab, setActiveTab] = useState('blocks');
  const [blockStatuses, setBlockStatuses] = useState({});
  const [activeMenu, setActiveMenu] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  if (!data) return null;

  // Use recommended blocks or default mock
  const blocks = data.recommendations ? data.recommendations.map(r => ({
    id: r.block_id,
    corridor: r.section,
    start: new Date(r.start).toLocaleString(),
    end: new Date(r.end).toLocaleString(),
    departments: r.departments.join(', '),
    tasks: r.task_ids.length,
    status: 'Scheduled',
    priority: r.priority_class
  })) : [];

  const filteredBlocks = blocks.filter(b => b.id.toLowerCase().includes(searchTerm.toLowerCase()) || b.corridor.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredTasks = (tasksData || []).filter(t => t.task_id.toLowerCase().includes(searchTerm.toLowerCase()) || t.department.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "ID,Corridor,Start,End,Status,Tasks\n"
      + blocks.map(b => `${b.id},${b.corridor},${b.start},${b.end},${blockStatuses[b.id] || b.status},${b.tasks}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "schedule_export.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>Operations Control</h2>
          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)' }}>Manage scheduled blocks and tasks across all corridors</p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div className="filter-search" style={{ width: '250px' }}>
            <input type="text" placeholder="Search blocks or tasks..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            <Search size={14} color="var(--text-muted)" />
          </div>
          <button className="btn-secondary hover-lift"><Filter size={16} /> Filter</button>
          <button className="btn-secondary hover-lift" onClick={handleExport}><Download size={16} /> Export</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)', marginBottom: '1.5rem' }}>
        <button 
          onClick={() => setActiveTab('blocks')}
          style={{ 
            background: 'transparent', 
            border: 'none', 
            padding: '0.75rem 1.5rem', 
            cursor: 'pointer',
            borderBottom: activeTab === 'blocks' ? '2px solid var(--accent-purple-light)' : '2px solid transparent',
            color: activeTab === 'blocks' ? 'white' : 'var(--text-muted)',
            fontWeight: activeTab === 'blocks' ? 600 : 400,
            transition: 'all 0.2s'
          }}
        >
          Scheduled Blocks
        </button>
        <button 
          onClick={() => setActiveTab('tasks')}
          style={{ 
            background: 'transparent', 
            border: 'none', 
            padding: '0.75rem 1.5rem', 
            cursor: 'pointer',
            borderBottom: activeTab === 'tasks' ? '2px solid var(--accent-purple-light)' : '2px solid transparent',
            color: activeTab === 'tasks' ? 'white' : 'var(--text-muted)',
            fontWeight: activeTab === 'tasks' ? 600 : 400,
            transition: 'all 0.2s'
          }}
        >
          Task Queue
        </button>
      </div>

      {/* Data Table Container */}
      <div className="glass-panel" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ overflowX: 'auto', flex: 1 }}>
          {activeTab === 'blocks' ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-light)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  <th style={{ padding: '1rem', fontWeight: 500 }}>Block ID</th>
                  <th style={{ padding: '1rem', fontWeight: 500 }}>Corridor</th>
                  <th style={{ padding: '1rem', fontWeight: 500 }}>Time Window</th>
                  <th style={{ padding: '1rem', fontWeight: 500 }}>Departments</th>
                  <th style={{ padding: '1rem', fontWeight: 500 }}>Tasks</th>
                  <th style={{ padding: '1rem', fontWeight: 500 }}>Status</th>
                  <th style={{ padding: '1rem', fontWeight: 500 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBlocks.map((block, i) => {
                  const currentStatus = blockStatuses[block.id] || block.status;
                  return (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-dark)', fontSize: '0.875rem', transition: 'background 0.2s', cursor: 'pointer' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--accent-purple-light)' }}>#{block.id}</td>
                    <td style={{ padding: '1rem', color: 'white' }}>{block.corridor}</td>
                    <td style={{ padding: '1rem', color: 'white' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span>{block.start}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>to {block.end}</span>
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                        {block.departments.split(', ').map(dept => (
                          <span key={dept} style={{ padding: '0.2rem 0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', fontSize: '0.75rem', color: 'white' }}>
                            {dept}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ padding: '1rem', color: 'white' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span style={{ fontWeight: 600 }}>{block.tasks}</span> bundled
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ 
                        padding: '0.25rem 0.75rem', 
                        borderRadius: '999px', 
                        fontSize: '0.75rem', 
                        fontWeight: 600,
                        background: currentStatus === 'Completed' ? 'rgba(16, 185, 129, 0.2)' : currentStatus === 'In Progress' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(0, 223, 216, 0.1)',
                        color: currentStatus === 'Completed' ? 'var(--success)' : currentStatus === 'In Progress' ? '#60a5fa' : 'var(--success)',
                        border: currentStatus === 'Completed' ? '1px solid rgba(16, 185, 129, 0.4)' : currentStatus === 'In Progress' ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid rgba(0, 223, 216, 0.2)',
                        transition: 'all 0.3s'
                      }}>
                        {currentStatus}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', position: 'relative' }}>
                      <button onClick={() => setActiveMenu(activeMenu === block.id ? null : block.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                        <MoreHorizontal size={18} />
                      </button>
                      {activeMenu === block.id && (
                        <div className="glass-panel" style={{ position: 'absolute', right: '3rem', top: '50%', transform: 'translateY(-50%)', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '0.25rem', padding: '0.5rem', background: 'rgba(20,22,34,0.95)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', minWidth: '140px', boxShadow: '0 5px 20px rgba(0,0,0,0.5)' }}>
                          <button className="hover-lift" onClick={() => { setBlockStatuses(prev => ({...prev, [block.id]: 'In Progress'})); setActiveMenu(null); }} style={{ background: 'transparent', border: 'none', color: '#60a5fa', padding: '0.5rem', textAlign: 'left', cursor: 'pointer', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 500 }}>Mark In Progress</button>
                          <button className="hover-lift" onClick={() => { setBlockStatuses(prev => ({...prev, [block.id]: 'Completed'})); setActiveMenu(null); }} style={{ background: 'transparent', border: 'none', color: 'var(--success)', padding: '0.5rem', textAlign: 'left', cursor: 'pointer', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 500 }}>Mark Completed</button>
                        </div>
                      )}
                    </td>
                  </tr>
                )})}
                {filteredBlocks.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No blocks match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-light)', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  <th style={{ padding: '1rem', fontWeight: 500 }}>Task ID</th>
                  <th style={{ padding: '1rem', fontWeight: 500 }}>Corridor</th>
                  <th style={{ padding: '1rem', fontWeight: 500 }}>Department</th>
                  <th style={{ padding: '1rem', fontWeight: 500 }}>Asset</th>
                  <th style={{ padding: '1rem', fontWeight: 500 }}>Priority</th>
                  <th style={{ padding: '1rem', fontWeight: 500 }}>Score</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((task, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-dark)', fontSize: '0.875rem', transition: 'background 0.2s' }}>
                    <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--accent-primary)' }}>{task.task_id}</td>
                    <td style={{ padding: '1rem' }}>{task.location}</td>
                    <td style={{ padding: '1rem' }}>{task.department}</td>
                    <td style={{ padding: '1rem' }}>{task.asset_type}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ 
                        padding: '0.25rem 0.5rem', 
                        borderRadius: '999px', 
                        fontSize: '0.75rem', 
                        fontWeight: 500,
                        background: task.priority_class === 'CRITICAL' ? 'rgba(255, 60, 60, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                        color: task.priority_class === 'CRITICAL' ? 'var(--danger)' : 'var(--success)'
                      }}>
                        {task.priority_class}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>{task.priority_score?.toFixed(1)}</td>
                  </tr>
                ))}
                {(!tasksData || tasksData.length === 0) && (
                  <tr>
                    <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No tasks in the queue.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        
        {/* Pagination mock */}
        <div style={{ padding: '1rem', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
          <div style={{ color: 'var(--text-muted)' }}>Showing {activeTab === 'blocks' ? blocks.length : (tasksData || []).length} results</div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>Previous</button>
            <button className="btn-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
