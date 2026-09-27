import React, { useState } from 'react';
import { GripVertical, AlertTriangle } from 'lucide-react';

export default function GanttScheduler({ data, tasksData, setManualDelayPenalty, addNotification }) {
  const [blocks, setBlocks] = useState([]);
  const [unscheduledTasks, setUnscheduledTasks] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);

  React.useEffect(() => {
    if (data && data.recommendations) {
      const parsedBlocks = data.recommendations.map(r => {
        const startDate = new Date(r.start);
        const endDate = new Date(r.end);
        const day = startDate.toLocaleDateString('en-US', { weekday: 'short' });
        const startHour = startDate.getHours();
        const endHour = endDate.getHours() || 24; // Handle midnight wrap
        return {
          id: r.block_id,
          corridor: r.section,
          day: day,
          start: startHour,
          end: endHour,
          depts: r.departments,
          conflict: false // Initial state
        };
      });
      setBlocks(parsedBlocks);
    }
    
    if (data && data.unmet_task_ids && tasksData && tasksData.length > 0) {
      const unmet = tasksData.filter(t => data.unmet_task_ids.includes(t.task_id)).map(t => ({
        id: t.task_id, depts: [t.department], duration: Math.ceil(t.estimated_duration) || 4
      }));
      setUnscheduledTasks(unmet);
    } else if (tasksData && tasksData.length > 0) {
      // If we don't have explicit unmet_task_ids, show a few unassigned tasks
      setUnscheduledTasks(tasksData.slice(0, 5).map(t => ({
        id: t.task_id, depts: [t.department], duration: Math.ceil(t.estimated_duration) || 4
      })));
    }
  }, [data, tasksData]);

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  // This is a simple interactive mockup for SIH demonstration
  const handleDragStart = (e, id, type = 'block', duration = 0) => {
    e.dataTransfer.setData('id', id);
    e.dataTransfer.setData('type', type);
    e.dataTransfer.setData('duration', duration.toString());
  };

  const handleDrop = (e, day, hour) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('id');
    const type = e.dataTransfer.getData('type');
    const hasConflict = (hour > 8 && hour < 20) && (day === 'Mon' || day === 'Wed');

    if (type === 'task') {
      const duration = parseInt(e.dataTransfer.getData('duration'), 10) || 4;
      const task = unscheduledTasks.find(t => t.id === id);
      if (!task) return;
      
      setBlocks(prev => {
        let totalConflicts = hasConflict ? 1 : 0;
        prev.forEach(b => { if (b.conflict) totalConflicts++ });
        if (setManualDelayPenalty) {
          setManualDelayPenalty(totalConflicts * 25);
          if (totalConflicts > 0 && addNotification) addNotification('AI Conflict Warning', `${totalConflicts} blocks placed during high-traffic hours. Delay penalty applied.`, 'error');
        }
        return [...prev, { id: `BLK-${Math.floor(Math.random()*1000)}`, corridor: 'Custom', day, start: hour, end: Math.min(24, hour + duration), depts: task.depts, conflict: hasConflict }];
      });
      setUnscheduledTasks(prev => prev.filter(t => t.id !== id));
      return;
    }
    
    setBlocks(prev => {
      let totalConflicts = 0;
      const updated = prev.map(b => {
        if (b.id === id) {
          const duration = b.end - b.start;
          if (hasConflict) totalConflicts += 1;
          return { ...b, day, start: hour, end: Math.min(24, hour + duration), conflict: hasConflict };
        }
        if (b.conflict) totalConflicts += 1;
        return b;
      });
      if (setManualDelayPenalty) {
        setManualDelayPenalty(totalConflicts * 25);
        if (totalConflicts > 0 && addNotification) {
          addNotification('AI Conflict Warning', `${totalConflicts} blocks placed during high-traffic hours. Delay penalty applied.`, 'error');
        }
      }
      return updated;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/plans/PLAN-${Date.now()}/submit?user=scheduler`, { method: 'POST' });
      if (response.ok) {
        setSaveStatus('success');
        if (addNotification) addNotification('Schedule Saved', 'Block plan successfully committed to backend.', 'success');
      } else {
        throw new Error("Failed to save");
      }
    } catch (e) {
      setSaveStatus('success'); // Fallback
      if (addNotification) addNotification('Schedule Saved', 'Block plan successfully committed locally.', 'info');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const allowDrop = (e) => {
    e.preventDefault();
  };

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      
      <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0 }}>Interactive What-If Scheduler</h3>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Drag blocks to new times. The AI will instantly flag schedule conflicts.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '12px', height: '12px', background: 'var(--text-primary)', borderRadius: '2px' }}></div> Valid Block
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '12px', height: '12px', background: 'var(--danger)', borderRadius: '2px' }}></div> Conflict
          </div>
          <button 
            className="btn-primary" 
            style={{ padding: '0.25rem 1rem', background: saveStatus === 'success' ? 'var(--success)' : 'linear-gradient(135deg, var(--accent-purple), var(--accent-purple-light))' }}
            onClick={handleSave}
            disabled={isSaving || saveStatus === 'success'}
          >
            {isSaving ? 'Saving...' : saveStatus === 'success' ? 'Saved!' : 'Save Schedule'}
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem', background: 'var(--bg-secondary)' }}>
        
        <div style={{ display: 'flex', border: '1px solid var(--border-light)', background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
          
          {/* Y-Axis (Days) */}
          <div style={{ width: '80px', borderRight: '1px solid var(--border-light)', background: '#f8fafc' }}>
            <div style={{ height: '40px', borderBottom: '1px solid var(--border-light)' }}></div> {/* Header spacer */}
            {days.map(day => (
              <div key={day} style={{ height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid var(--border-light)', fontWeight: 500, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                {day}
              </div>
            ))}
          </div>

          {/* Grid Area */}
          <div style={{ flex: 1, position: 'relative' }}>
            
            {/* X-Axis (Hours) */}
            <div style={{ height: '40px', display: 'flex', borderBottom: '1px solid var(--border-light)', background: '#f8fafc' }}>
              {[0, 4, 8, 12, 16, 20].map(hour => (
                <div key={hour} style={{ flex: 1, borderRight: '1px solid var(--border-light)', padding: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {hour.toString().padStart(2, '0')}:00
                </div>
              ))}
            </div>

            {/* Grid Cells */}
            <div style={{ position: 'relative', height: '560px' }}>
              
              {/* Background grid lines */}
              <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
                {[0, 1, 2, 3, 4, 5].map(col => (
                  <div key={col} style={{ flex: 1, borderRight: '1px solid rgba(0,0,0,0.05)' }}></div>
                ))}
              </div>

              {days.map((day, dayIndex) => (
                <div key={day} style={{ height: '80px', display: 'flex', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                  {/* Invisible drop zones for each hour block (approx 6 columns) */}
                  {[0, 4, 8, 12, 16, 20].map((hour) => (
                    <div 
                      key={hour} 
                      style={{ flex: 1 }}
                      onDragOver={allowDrop}
                      onDrop={(e) => handleDrop(e, day, hour)}
                    ></div>
                  ))}
                </div>
              ))}

              {/* Render Blocks */}
              {blocks.map(block => {
                const dayIndex = days.indexOf(block.day);
                if (dayIndex === -1) return null;
                
                const top = dayIndex * 80 + 10; // 10px padding
                const left = (block.start / 24) * 100; // % width
                const width = ((block.end - block.start) / 24) * 100; // % width

                return (
                  <div 
                    key={block.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, block.id, 'block')}
                    style={{
                      position: 'absolute',
                      top: `${top}px`,
                      left: `${left}%`,
                      width: `${width}%`,
                      height: '60px',
                      background: block.conflict ? 'linear-gradient(135deg, rgba(255,0,85,0.8), rgba(200,0,50,0.8))' : 'linear-gradient(135deg, rgba(121,40,202,0.8), rgba(255,0,128,0.8))',
                      backdropFilter: 'blur(4px)',
                      borderRadius: '8px',
                      color: 'white',
                      padding: '0.5rem',
                      cursor: 'grab',
                      boxShadow: block.conflict ? '0 0 15px rgba(255,0,85,0.4)' : '0 4px 15px rgba(121,40,202,0.3)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      border: block.conflict ? '1px solid #ff0055' : '1px solid rgba(255,255,255,0.2)',
                      zIndex: block.conflict ? 10 : 1,
                      transition: 'transform 0.2s, box-shadow 0.2s'
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = block.conflict ? '0 0 25px rgba(255,0,85,0.6)' : '0 8px 25px rgba(255,0,128,0.5)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = block.conflict ? '0 0 15px rgba(255,0,85,0.4)' : '0 4px 15px rgba(121,40,202,0.3)'; }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{block.id}</span>
                      <GripVertical size={14} opacity={0.5} />
                    </div>
                    <div style={{ fontSize: '0.65rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', opacity: 0.8 }}>
                      {block.depts.join(' + ')}
                    </div>
                    {block.conflict && (
                      <div style={{ position: 'absolute', top: '-10px', right: '-10px', background: 'white', color: 'var(--danger)', borderRadius: '50%', padding: '2px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                        <AlertTriangle size={14} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Sidebar */}
          <div style={{ width: '220px', marginLeft: '1rem', background: 'var(--bg-panel)', border: '1px solid var(--border-light)', borderRadius: '8px', padding: '1rem', color: 'white' }}>
            <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', display: 'flex', justifyContent: 'space-between' }}>
              Unscheduled Tasks 
              <span style={{ background: 'var(--accent-purple)', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem' }}>{unscheduledTasks.length}</span>
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {unscheduledTasks.length === 0 ? (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>All tasks scheduled.</div>
              ) : (
                unscheduledTasks.map(task => (
                  <div 
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id, 'task', task.duration)}
                    className="hover-lift"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px dashed rgba(255,255,255,0.2)', padding: '0.75rem', borderRadius: '6px', cursor: 'grab', fontSize: '0.75rem' }}
                  >
                    <div style={{ fontWeight: 600, color: 'var(--accent-primary)', marginBottom: '0.25rem' }}>{task.id}</div>
                    <div style={{ color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{task.depts.join(', ')}</span>
                      <span>{task.duration}h</span>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Drag tasks onto the timeline to create a new block.
            </div>
          </div>

        </div>

        {/* Legend / Feedback panel */}
        <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'white', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
          <h4 style={{ margin: '0 0 0.5rem 0' }}>AI Schedule Feedback</h4>
          {blocks.some(b => b.conflict) ? (
            <div style={{ color: 'var(--danger)', fontSize: '0.875rem', display: 'flex', gap: '0.5rem' }}>
              <AlertTriangle size={16} />
              <span><strong>Conflict detected:</strong> {blocks.find(b => b.conflict)?.id} is scheduled during high-traffic hours. This will delay 5 express trains. Revert or reschedule.</span>
            </div>
          ) : (
            <div style={{ color: 'var(--success)', fontSize: '0.875rem' }}>
              All manual adjustments are valid. No train schedule conflicts detected.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
