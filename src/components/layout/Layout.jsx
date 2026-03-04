import Navbar from './Navbar';
import Sidebar from './Sidebar';

export default function Layout({ activePage, setActivePage, children }) {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar activePage={activePage} setActivePage={setActivePage} />
        <main className="flex-1 overflow-y-auto bg-slate-100 p-5">
          {children}
        </main>
      </div>
    </div>
  );
}
