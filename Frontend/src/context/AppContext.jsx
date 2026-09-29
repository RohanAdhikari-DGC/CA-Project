import { createContext, useContext, useState, useMemo } from 'react';
import { CLIENTS, clientData } from '../data/dashboardData';

const AppContext = createContext();

export const USERS = {
  user1: { id: 'user1', name: 'Mark Cuban', initials: 'MC' },
  user2: { id: 'user2', name: 'Alice Smith', initials: 'AS' },
  user3: { id: 'user3', name: 'John Doe', initials: 'JD' }
};

export const AppProvider = ({ children }) => {
  const [currentRole, setCurrentRole] = useState('accountant');
  const [activeScope, setActiveScope] = useState({ type: 'practice' });
  const [currentUser, setCurrentUser] = useState('user1');

  const ROLES = {
    practice_admin: { label: 'Practice Administrator', practice: true, allClients: true, readOnly: false },
    engagement_manager: { label: 'Engagement Manager', practice: true, allClients: false, readOnly: false },
    accountant: { label: 'Accountant', practice: false, allClients: false, readOnly: false },
    auditor: { label: 'Auditor', practice: true, allClients: false, readOnly: true }
  };

  const role = ROLES[currentRole];
  const canSeePractice = role.practice;
  const isReadOnly = role.readOnly;

  const visibleClients = useMemo(() => {
    return CLIENTS.filter(c => role.allClients ? true : c.assigned);
  }, [role.allClients]);

  const activeClient = activeScope.type === 'client' 
    ? CLIENTS.find(c => c.id === activeScope.id) 
    : null;

  const currentData = activeClient ? clientData(activeClient.id) : null;

  const switchScope = (nextScope) => {
    setActiveScope(nextScope);
  };

  return (
    <AppContext.Provider value={{
      currentRole, setCurrentRole,
      activeScope, activeClient, switchScope,
      visibleClients, canSeePractice, isReadOnly,
      currentData, ROLES,
      currentUser, setCurrentUser, USERS
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);