import { Outlet } from 'react-router-dom';
import TopNav from './TopNav';
import Sidebar from './Sidebar';
import { useAppContext } from '../../context/AppContext';

const AppLayout = () => {
  const { activeClient, visibleClients } = useAppContext();

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <TopNav />
      
      {/* Scope Bar */}
      <div className="scope-bar flex items-center gap-2.5 px-4 h-[38px] bg-white border-b border-[#d7dbe2] text-[12.5px] shrink-0">
        {activeClient ? (
          <>
            <span className="scope-bar__tag scope-bar__tag--client">● Client workspace</span>
            <span className="font-semibold">{activeClient.name}</span>
            <span className="text-gray-500">{activeClient.code} · {activeClient.industry}</span>
          </>
        ) : (
          <>
            <span className="scope-bar__tag scope-bar__tag--practice">◆ Practice workspace</span>
            <span className="font-semibold">All clients</span>
            <span className="ml-auto text-gray-500">Clients <strong className="text-black">{visibleClients.length}</strong></span>
          </>
        )}
      </div>

      <div className="app-body flex flex-1 overflow-hidden">
        <Sidebar />
        <main id="main" className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <div className="page flex-1 overflow-auto p-5 pb-10 block">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppLayout;