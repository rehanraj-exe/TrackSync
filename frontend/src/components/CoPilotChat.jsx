import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Bot, User, RefreshCw } from 'lucide-react';

export default function CoPilotChat() {
  const [messages, setMessages] = useState([
    { id: 1, role: 'assistant', content: 'Hello! I am your AI Block Planning Co-Pilot. I can help you analyze the schedule, calculate train delays, or adjust maintenance priorities.' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = { id: Date.now(), role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await fetch('/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMsg.content }),
      });
      
      const data = await response.json();
      
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: data.response }]);
    } catch (error) {
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: "Error connecting to AI backend. Please ensure the FastAPI server is running." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      
      {/* Header */}
      <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)' }}>
        <div style={{ background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-purple-light))', padding: '0.4rem', borderRadius: '8px', boxShadow: '0 0 10px rgba(121,40,202,0.4)' }}>
          <Sparkles size={16} color="white" />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '0.875rem', color: 'white' }}>AI Co-Pilot</h3>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--accent-purple-light)' }}>Ready to assist</p>
        </div>
      </div>

      {/* Messages Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', background: 'transparent' }}>
        {messages.map((msg) => (
          <div key={msg.id} style={{ display: 'flex', gap: '0.75rem', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
            
            <div style={{ 
              width: '32px', height: '32px', borderRadius: '50%', flexShrinks: 0,
              background: msg.role === 'user' ? 'linear-gradient(135deg, var(--accent-purple), var(--accent-purple-light))' : 'rgba(255,255,255,0.1)',
              border: msg.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: msg.role === 'user' ? '0 0 10px rgba(121,40,202,0.5)' : 'none'
            }}>
              {msg.role === 'user' ? <User size={16} color="white" /> : <Bot size={16} color="white" />}
            </div>
            
            <div style={{ 
              background: msg.role === 'user' ? 'linear-gradient(135deg, rgba(121,40,202,0.9), rgba(255,0,128,0.9))' : 'rgba(255,255,255,0.05)',
              border: msg.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.1)',
              padding: '0.75rem 1rem',
              borderRadius: '12px',
              borderTopRightRadius: msg.role === 'user' ? '2px' : '12px',
              borderTopLeftRadius: msg.role === 'user' ? '12px' : '2px',
              fontSize: '0.875rem',
              lineHeight: 1.5,
              maxWidth: '85%',
              color: 'white',
              boxShadow: msg.role === 'user' ? '0 5px 15px rgba(121,40,202,0.3)' : 'none'
            }}>
              {msg.content}
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <RefreshCw size={14} color="var(--accent-purple-light)" className="animate-spin" />
            </div>
            <div style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
              Analyzing schedule...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)' }}>
        <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.5rem' }}>
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about the schedule..." 
            style={{ 
              flex: 1, 
              padding: '0.8rem 1rem', 
              borderRadius: '9999px', 
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.03)',
              color: 'white',
              fontFamily: 'inherit',
              fontSize: '0.875rem',
              outline: 'none',
              transition: 'border-color 0.3s, box-shadow 0.3s'
            }}
            onFocus={e => { e.target.style.borderColor = 'var(--accent-purple)'; e.target.style.boxShadow = '0 0 10px rgba(121,40,202,0.3)'; }}
            onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
          />
          <button 
            type="submit" 
            disabled={!input.trim() || isTyping}
            style={{ 
              background: input.trim() && !isTyping ? 'linear-gradient(135deg, var(--accent-purple), var(--accent-purple-light))' : 'rgba(255,255,255,0.1)', 
              color: input.trim() && !isTyping ? 'white' : 'rgba(255,255,255,0.3)', 
              border: 'none', 
              borderRadius: '50%', 
              width: '42px',
              height: '42px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              cursor: input.trim() && !isTyping ? 'pointer' : 'default',
              transition: 'all 0.3s',
              boxShadow: input.trim() && !isTyping ? '0 0 15px rgba(121,40,202,0.5)' : 'none'
            }}
          >
            <Send size={16} />
          </button>
        </form>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
          {['Are there unscheduled tasks?', 'What are the train delays?', 'Any resource conflicts?'].map(suggestion => (
            <button 
              key={suggestion}
              type="button"
              onClick={() => setInput(suggestion)}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                padding: '0.35rem 0.75rem',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s'
              }}
              onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'white'; }}
              onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
      
      <style>{`
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
