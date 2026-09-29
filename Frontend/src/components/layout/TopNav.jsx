// src/components/layout/TopNav.jsx
import { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';

const TopNav = () => {
  const { 
    currentRole, setCurrentRole, ROLES, 
    activeClient, visibleClients, canSeePractice, switchScope,
    currentUser, setCurrentUser, USERS 
  } = useAppContext();
  
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const switcherRef = useRef(null);
  const userMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (switcherRef.current && !switcherRef.current.contains(event.target)) {
        setIsSwitcherOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredClients = visibleClients.filter(c => 
    !searchQuery || 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const showPracticeInSearch = canSeePractice && (!searchQuery || 'practice'.includes(searchQuery.toLowerCase()));

  return (
    <header className="flex items-center gap-3 px-3.5 h-14 bg-[#101827] text-white shrink-0 z-50 relative">
      <div className="flex items-center gap-2.5 font-semibold text-[13px] whitespace-nowrap shrink-0">
        <span className="w-[26px] h-[26px] rounded-md bg-[#5a3fb5] grid place-items-center text-[11px] font-bold tracking-[.5px]">IR</span>
        <span>Practice Console<br/><span className="text-[#9fb0c9] font-normal text-[11px]">Multi-client invoicing</span></span>
      </div>

      {/* Client Switcher */}
      <div className="relative shrink-0" ref={switcherRef}>
        <button 
          onClick={() => {
            setIsSwitcherOpen(!isSwitcherOpen);
            if (!isSwitcherOpen) setSearchQuery('');
          }}
          aria-expanded={isSwitcherOpen}
          className="flex items-center gap-[9px] h-9 px-[10px] pl-[11px] border border-[#2c3a52] bg-[#1b2537] rounded-md text-[13px] hover:bg-[#22304a] hover:border-[#3b4d6b] cursor-pointer max-w-[290px]"
        >
          {activeClient ? (
            <span className="w-5 h-5 rounded-[5px] bg-[#3a4a66] grid place-items-center text-[10px] font-bold shrink-0">{activeClient.code.slice(0,2)}</span>
          ) : (
            <span className="w-5 h-5 rounded-[5px] bg-[#5a3fb5] grid place-items-center text-[10px] font-bold shrink-0">PR</span>
          )}
          <span className="flex flex-col items-start leading-[1.15] min-w-0">
            <span className="text-[9.5px] uppercase tracking-[.07em] text-[#9fb0c9] font-bold">
              {activeClient ? 'Client workspace' : 'Workspace'}
            </span>
            <span className="font-semibold text-[12.5px] whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]">
              {activeClient ? activeClient.name : 'Practice'}
            </span>
          </span>
          <span className="ml-auto opacity-70 text-[9px]">▼</span>
        </button>

        {isSwitcherOpen && (
          <div className="absolute top-[calc(100%+7px)] left-0 w-[340px] bg-white text-[#151a21] border border-[#d7dbe2] rounded-[10px] shadow-[0_10px_30px_rgba(16,24,40,.16)] z-[70] overflow-hidden">
            <div className="p-[9px] border-b border-[#d7dbe2]">
              <label className="sr-only" htmlFor="csSearch">Search client organizations</label>
              <input 
                id="csSearch"
                type="search" 
                placeholder="Search clients by name or code…" 
                autoComplete="off"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 border border-[#b9c0cb] rounded-md px-2.5 text-[13px] outline-none focus:border-[#0b5cad]" 
              />
            </div>
            
            <div className="max-h-[340px] overflow-y-auto p-1.5" role="listbox">
              {showPracticeInSearch && (
                <>
                  <div className="text-[10px] uppercase tracking-[.08em] text-[#7b8494] font-bold px-[9px] pt-2 pb-1">Practice</div>
                  <button 
                    onClick={() => { switchScope({ type: 'practice' }); setIsSwitcherOpen(false); }}
                    aria-current={!activeClient}
                    className={`w-full flex items-center gap-[9px] p-[7px_9px] rounded-md text-left text-[13px] cursor-pointer hover:bg-[#eef0f3] ${!activeClient ? 'bg-[#e7f0fa] text-[#0b4f96] font-semibold' : 'text-[#151a21]'}`}
                  >
                    <span className={`w-6 h-6 rounded-md grid place-items-center text-[9.5px] font-bold shrink-0 ${!activeClient ? 'bg-[#cfe1f6] text-[#0b4f96]' : 'bg-[#efeafc] text-[#5a3fb5]'}`}>PR</span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-semibold text-[12.5px] whitespace-nowrap overflow-hidden text-ellipsis">Practice — all clients</span>
                      <span className="block text-[11px] text-[#7b8494]">Practice-level dashboards, cross-client list, onboarding</span>
                    </span>
                  </button>
                </>
              )}

              <div className="text-[10px] uppercase tracking-[.08em] text-[#7b8494] font-bold px-[9px] pt-2 pb-1">
                Client organizations ({filteredClients.length})
              </div>
              
              {filteredClients.length === 0 ? (
                <div className="p-[20px_12px] text-center text-[#5a6472]">
                  <h3 className="font-semibold text-[14px] text-[#151a21] mb-[5px]">No clients assigned</h3>
                  <p className="text-[12px]">Your role is not assigned to any client organization yet. Contact a practice administrator.</p>
                </div>
              ) : (
                filteredClients.map(c => {
                  const isActive = activeClient?.id === c.id;
                  return (
                    <button 
                      key={c.id}
                      onClick={() => { switchScope({ type: 'client', id: c.id }); setIsSwitcherOpen(false); }}
                      aria-current={isActive}
                      className={`w-full flex items-center gap-[9px] p-[7px_9px] rounded-md text-left text-[13px] cursor-pointer hover:bg-[#eef0f3] ${isActive ? 'bg-[#e7f0fa] text-[#0b4f96] font-semibold' : 'text-[#151a21]'}`}
                    >
                      <span className={`w-6 h-6 rounded-md grid place-items-center text-[9.5px] font-bold shrink-0 ${isActive ? 'bg-[#cfe1f6] text-[#0b4f96]' : 'bg-[#eef0f3] text-[#5a6472]'}`}>
                        {c.code.slice(0,2)}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block font-semibold text-[12.5px] whitespace-nowrap overflow-hidden text-ellipsis">{c.name}</span>
                        <span className="block text-[11px] text-[#7b8494]">{c.code} · {c.industry} · {c.erp || 'ERP'}</span>
                      </span>
                      <span className="text-[11px] font-bold text-[#5a6472] bg-[#eef0f3] rounded-[20px] px-[7px] py-[1px]">{c.docs}</span>
                    </button>
                  );
                })
              )}
            </div>
            
            <div className="border-t border-[#d7dbe2] p-[8px_10px] text-[11.5px] text-[#5a6472] bg-[#fafbfc]">
              Switching clients re-scopes every screen to that client. No state carries over.
            </div>
          </div>
        )}
      </div>

      {/* Global Search */}
      <div className="flex-1 max-w-[420px] relative ml-1.5" role="search">
        <svg className="absolute left-[10px] top-[9px] opacity-60" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
          <circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>
        </svg>
        <label className="sr-only" htmlFor="globalSearch">Global search</label>
        <input 
          id="globalSearch" 
          type="search" 
          placeholder="Search within the active scope…" 
          autoComplete="off"
          className="w-full h-[34px] rounded-md border border-[#2c3a52] bg-[#1b2537] text-white px-3 pl-8 text-[13px] placeholder-[#8899b3] outline-none focus:outline focus:outline-2 focus:outline-[#0b5cad] focus:outline-offset-2"
        />
      </div>

      <div className="ml-auto flex items-center gap-2.5">
        <div className="flex items-center gap-1.5 text-xs text-[#9fb0c9]">
          <label htmlFor="roleSelect">Role</label>
          <select 
            id="roleSelect"
            value={currentRole} 
            onChange={(e) => setCurrentRole(e.target.value)}
            className="bg-[#1b2537] text-white border border-[#2c3a52] rounded-md h-[30px] px-2 text-xs outline-none focus:outline focus:outline-2 focus:outline-[#0b5cad] focus:outline-offset-2"
          >
            {Object.entries(ROLES).map(([key, r]) => (
              <option key={key} value={key}>{r.label}</option>
            ))}
          </select>
        </div>

        {/* User Dropdown Profile */}
        <div className="relative ml-2" ref={userMenuRef}>
          <button 
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="w-7 h-7 rounded-full bg-[#3a4a66] grid place-items-center text-[11px] font-semibold text-white cursor-pointer hover:bg-[#4b5d80] transition-colors focus:outline-none focus:ring-2 focus:ring-[#0b5cad] focus:ring-offset-2 focus:ring-offset-[#101827]"
            aria-expanded={isUserMenuOpen}
            aria-haspopup="true"
            title={USERS[currentUser]?.name}
          >
            {USERS[currentUser]?.initials}
          </button>

          {isUserMenuOpen && (
            <div className="absolute top-[calc(100%+10px)] right-0 w-48 bg-white border border-[#d7dbe2] rounded-md shadow-[0_10px_30px_rgba(16,24,40,.16)] z-[70] py-1 overflow-hidden">
              <div className="px-3 py-2 border-b border-[#d7dbe2] mb-1 bg-[#fafbfc]">
                <p className="text-[12px] font-semibold text-[#151a21] truncate">{USERS[currentUser]?.name}</p>
                <p className="text-[10px] text-[#5a6472]">Switch user profile</p>
              </div>
              {Object.entries(USERS).map(([key, u]) => (
                <button
                  key={key}
                  onClick={() => {
                    setCurrentUser(key);
                    setIsUserMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-[13px] hover:bg-[#eef0f3] flex items-center justify-between transition-colors ${currentUser === key ? 'text-[#0b4f96] font-medium bg-[#e7f0fa]' : 'text-[#151a21]'}`}
                >
                  <span>{u.name}</span>
                  {currentUser === key && <span className="text-[12px]">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopNav;