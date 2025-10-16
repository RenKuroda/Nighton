import React from 'react';
import AdminLogin from './AdminLogin';
import AdminDashboard from './AdminDashboard';

const AdminApp: React.FC = () => {
  const [authed, setAuthed] = React.useState<boolean>(() => {
    try { return localStorage.getItem('nighton_admin_authed') === '1'; } catch { return false; }
  });

  return authed ? (
    <AdminDashboard onLogout={() => setAuthed(false)} />
  ) : (
    <AdminLogin onSuccess={() => setAuthed(true)} />
  );
};

export default AdminApp;


