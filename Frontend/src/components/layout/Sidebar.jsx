import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';

const SHORTCUTS = [
  ['J', 'Next document'], 
  ['K', 'Previous document'], 
  ['S', 'Save draft'],
  ['A', 'Approve'], 
  ['F', 'Flag for exception'], 
  ['+ / −', 'Zoom in / out'],
  ['R', 'Rotate document'], 
  ['?', 'Show this key map'], 
  ['Esc', 'Close dialog']
];

const Sidebar = () => {
  const { activeClient, visibleClients, canSeePractice, switchScope } = useAppContext();
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const navigate = useNavigate();
  const inClient = !!activeClient;

  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsShortcutsOpen(false);
    };
    if (isShortcutsOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isShortcutsOpen]);

  // Helper classes for NavLinks based on practice or client scoping
  const clientLinkClass = ({ isActive }) => 
    `flex items-center gap-[9px] w-full text-left p-[8px_10px] rounded-md text-[13px] cursor-pointer ${isActive ? 'bg-[#e7f0fa] text-[#0b4f96] font-semibold' : 'text-[#151a21] hover:bg-[#eef0f3]'}`;
  
  const practiceLinkClass = ({ isActive }) => 
    `flex items-center gap-[9px] w-full text-left p-[8px_10px] rounded-md text-[13px] cursor-pointer ${isActive ? 'bg-[#efeafc] text-[#4a2fa0] font-semibold' : 'text-[#151a21] hover:bg-[#eef0f3]'}`;

  return (
    <>
      <nav className="w-[236px] bg-white border-r border-[#d7dbe2] overflow-y-auto p-3 shrink-0 relative z-10">
        
        {/* Client Header */}
        {inClient && (
          <div className="bg-[#e7f0fa] border border-[#b6d2ee] p-[9px_10px] mb-2 rounded-md">
            <strong className="block text-[12.5px] text-[#0b4f96]">{activeClient.name}</strong>
            <span className="text-[11px] text-[#5a6472]">{activeClient.code} · client workspace</span>
          </div>
        )}

        {/* Practice Group (Always visible if user has practice rights) */}
        {canSeePractice && (
          <div className="mb-3.5">
            <div className="text-[10.5px] uppercase tracking-[.08em] text-[#7b8494] px-2.5 py-1.5 font-bold">Practice</div>
            <NavLink to="/practice-dashboard" className={practiceLinkClass}>
              <span className="w-4 text-center text-[13px] opacity-85" aria-hidden="true">◆</span>
              Practice Dashboard
            </NavLink>
            <NavLink to="/crossclient" className={practiceLinkClass}>
              <span className="w-4 text-center text-[13px] opacity-85" aria-hidden="true">⇄</span>
              Cross-Client Documents
            </NavLink>
            <NavLink to="/onboarding" className={practiceLinkClass}>
              <span className="w-4 text-center text-[13px] opacity-85" aria-hidden="true">＋</span>
              Client Onboarding
            </NavLink>
          </div>
        )}

        {/* Client-specific views OR Practice-level views depending on scope */}
        {inClient ? (
          <>
            <div className="mb-3.5">
              <div className="text-[10.5px] uppercase tracking-[.08em] text-[#7b8494] px-2.5 py-1.5 font-bold">{activeClient.name}</div>
              <NavLink to="/client-dashboard" className={clientLinkClass}>
                <span className="w-4 text-center text-[13px] opacity-85" aria-hidden="true">▦</span>
                Client Dashboard
              </NavLink>
              <NavLink to="/incoming" className={clientLinkClass}>
                <span className="w-4 text-center text-[13px] opacity-85" aria-hidden="true">▤</span>
                Incoming Documents
                <span className="ml-auto text-[11px] font-semibold bg-[#eef0f3] text-[#5a6472] rounded-[20px] px-[7px] py-[1px]">{activeClient.docs || 248}</span>
              </NavLink>
            </div>

            <div className="mb-3.5">
              <div className="text-[10.5px] uppercase tracking-[.08em] text-[#7b8494] px-2.5 py-1.5 font-bold">Queue</div>
              <NavLink to="/pending" className={clientLinkClass}>
                {({ isActive }) => (
                  <>
                    <span className="w-4 text-center text-[13px] opacity-85" aria-hidden="true">◧</span>
                    Pending Review
                    <span className={`ml-auto text-[11px] font-semibold rounded-[20px] px-[7px] py-[1px] ${isActive ? 'bg-[#cfe1f6] text-[#0b4f96]' : 'bg-[#eef0f3] text-[#5a6472]'}`}>
                      42
                    </span>
                  </>
                )}
              </NavLink>
              <NavLink to="/correction" className={clientLinkClass}>
                {({ isActive }) => (
                  <>
                    <span className="w-4 text-center text-[13px] opacity-85" aria-hidden="true">✎</span>
                    Correction
                    <span className={`ml-auto text-[11px] font-semibold rounded-[20px] px-[7px] py-[1px] ${isActive ? 'bg-[#cfe1f6] text-[#0b4f96]' : 'bg-[#eef0f3] text-[#5a6472]'}`}>
                      17
                    </span>
                  </>
                )}
              </NavLink>
              <NavLink to="/flagged" className={clientLinkClass}>
                {({ isActive }) => (
                  <>
                    <span className="w-4 text-center text-[13px] opacity-85" aria-hidden="true">⚑</span>
                    Flagged
                    <span className={`ml-auto text-[11px] font-semibold rounded-[20px] px-[7px] py-[1px] ${isActive ? 'bg-[#cfe1f6] text-[#0b4f96]' : 'bg-[#eef0f3] text-[#5a6472]'}`}>
                      9
                    </span>
                  </>
                )}
              </NavLink>
            </div>

            <div className="mb-3.5">
              <div className="text-[10.5px] uppercase tracking-[.08em] text-[#7b8494] px-2.5 py-1.5 font-bold">Reference</div>
              <NavLink to="/viewdocs" className={clientLinkClass}>
                <span className="w-4 text-center text-[13px] opacity-85" aria-hidden="true">▥</span>
                View Documents
              </NavLink>
              <NavLink to="/settings" className={clientLinkClass}>
                <span className="w-4 text-center text-[13px] opacity-85" aria-hidden="true">⚙</span>
                Client Settings
              </NavLink>
              <NavLink to="/reporting" className={clientLinkClass}>
                <span className="w-4 text-center text-[13px] opacity-85" aria-hidden="true">◫</span>
                Reporting
              </NavLink>
            </div>
          </>
        ) : (
          <>
            <div className="mb-3.5">
              <div className="text-[10.5px] uppercase tracking-[.08em] text-[#7b8494] px-2.5 py-1.5 font-bold">Practice</div>
              <NavLink to="/settings" className={clientLinkClass}>
                <span className="w-4 text-center text-[13px] opacity-85" aria-hidden="true">⚙</span>
                Practice Settings
              </NavLink>
              <NavLink to="/reporting" className={clientLinkClass}>
                <span className="w-4 text-center text-[13px] opacity-85" aria-hidden="true">◫</span>
                Reporting
              </NavLink>
            </div>

            <div className="mb-3.5">
              <div className="text-[10.5px] uppercase tracking-[.08em] text-[#7b8494] px-2.5 py-1.5 font-bold">Jump to a client</div>
              {visibleClients.map(cl => (
                <button 
                  key={cl.id}
                  onClick={() => {
                    switchScope({ type: 'client', id: cl.id });
                    navigate('/client-dashboard');
                  }}
                  className="flex items-center gap-[9px] w-full text-left p-[8px_10px] rounded-md text-[13px] cursor-pointer text-[#151a21] hover:bg-[#eef0f3]"
                >
                  <span className="w-4 text-center text-[13px] opacity-85" aria-hidden="true">›</span>
                  {cl.name}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Help Group */}
        <div className="mb-3.5">
          <div className="text-[10.5px] uppercase tracking-[.08em] text-[#7b8494] px-2.5 py-1.5 font-bold">Help</div>
          <button 
            onClick={() => setIsShortcutsOpen(true)}
            className="w-full flex items-center gap-[9px] p-[8px_10px] rounded-md text-[13px] text-left hover:bg-[#eef0f3] text-[#151a21] cursor-pointer"
          >
            <span className="w-4 text-center text-[13px] opacity-85" aria-hidden="true">⌨</span>
            Keyboard shortcuts
          </button>
        </div>
      </nav>

      {/* Keyboard Shortcuts Modal */}
      {isShortcutsOpen && (
        <div 
          className="fixed inset-0 bg-[#1018288c] backdrop-blur-sm grid place-items-center z-[100] p-5"
          onClick={() => setIsShortcutsOpen(false)}
        >
          <div 
            className="bg-white rounded-[10px] shadow-[0_10px_30px_rgba(16,24,40,.16)] w-[min(560px,100%)] max-h-[88vh] overflow-auto flex flex-col"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="scTitle"
          >
            <div className="pt-[15px] px-[18px] pb-0 flex-none">
              <h2 id="scTitle" className="text-[16px] font-semibold m-0 text-[#151a21]">Keyboard shortcuts</h2>
            </div>
            
            <div className="p-[12px_18px] text-[13px] text-[#5a6472] flex-1">
              <p className="m-0 mb-2">
                Active on Pending Review, Correction and Flagged. Ignored while focus is inside a text field; none conflict with standard browser or screen-reader keys.
              </p>
              
              <table className="w-full border-collapse mt-2.5 text-left">
                <thead>
                  <tr>
                    <th scope="col" className="text-[11px] uppercase tracking-[.05em] text-[#5a6472] font-bold bg-[#fafbfc] px-3 py-[9px] border-b border-[#d7dbe2]">Key</th>
                    <th scope="col" className="text-[11px] uppercase tracking-[.05em] text-[#5a6472] font-bold bg-[#fafbfc] px-3 py-[9px] border-b border-[#d7dbe2]">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {SHORTCUTS.map(([key, action], idx) => (
                    <tr key={idx} className="hover:bg-[#f8fafc]">
                      <td className="px-3 py-[9px] border-b border-[#d7dbe2] align-middle">
                        <kbd className="font-mono text-[11px] bg-[#eef0f3] border border-[#b9c0cb] border-b-[2px] rounded inline-block px-[5px] py-[1px] text-[#151a21]">
                          {key}
                        </kbd>
                      </td>
                      <td className="px-3 py-[9px] border-b border-[#d7dbe2] align-middle text-[#151a21]">
                        {action}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-[9px] justify-end p-[12px_18px_16px] border-t border-[#d7dbe2] mt-2 flex-wrap flex-none">
              <button 
                onClick={() => setIsShortcutsOpen(false)}
                className="inline-flex items-center gap-[6px] justify-center h-[32px] px-[12px] rounded-[6px] border border-[#0b5cad] bg-[#0b5cad] text-white text-[13px] font-medium cursor-pointer whitespace-nowrap hover:bg-[#0a4f95]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;