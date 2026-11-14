"use client";

import React, { useState } from 'react';

import { NotificationBell } from './NotificationBell';
import { LanguageSelector } from './LanguageSelector';
import { useApp } from '@/context/AppContext';

export function Navbar() {
  const { page, setPage, t, currentUser, logout, isAdminAuth } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigateTo = (p: string) => { setPage(p as any); setMobileMenuOpen(false); };

  return (
    <nav className="fixed w-full top-0 z-50 backdrop-blur-md border-b bg-[#0a0a0a]/90 border-white/10">
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-20 md:h-24 flex items-center justify-between">
        
        <div className="flex flex-col cursor-pointer z-50 relative" onClick={() => navigateTo('home')}>
           <span className="text-xl md:text-2xl font-bold tracking-widest text-white">REBO SALON</span>
           <span className="hidden md:block text-xs tracking-[0.2em] text-gray-500 uppercase mt-1">Manggasse 6, Schweinfurt</span>
        </div>

        <div className="hidden lg:flex items-center gap-6 xl:gap-8 justify-end w-full">
          <div className="flex items-center gap-6 xl:gap-8 mr-4">
            {['home', 'services', 'gallery', 'products', 'contact'].map(p => (
              <button key={p} onClick={() => setPage(p as any)} className={`text-xs xl:text-sm tracking-widest uppercase transition-colors ${page === p ? 'text-[#d4af37]' : 'text-gray-400 hover:text-white'}`}>
                {t.nav[p] || p}
              </button>
            ))}
          </div>
          
          <div className="h-6 w-px bg-gray-700 mx-2"></div>

          <NotificationBell />

          {currentUser ? (
            <div className="relative group mx-2">
              <button onClick={() => setPage('profile')} className="w-10 h-10 rounded-full flex items-center justify-center border overflow-hidden transition-all border-[#d4af37] text-[#d4af37] hover:bg-[#d4af37] hover:text-black">
                {currentUser.photoURL ? (
                  <img loading="lazy" decoding="async" src={currentUser.photoURL} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                )}
              </button>
              
              <div className="absolute right-0 mt-2 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="p-4 rounded-sm border shadow-2xl bg-[#111] border-white/10">
                  <p className="font-bold text-sm text-white mb-1 truncate">{currentUser.name}</p>
                  <p className="text-xs mb-4 text-[#d4af37]">{currentUser.haircutCount}/10</p>
                  <button onClick={() => setPage('profile')} className="block w-full text-left text-xs uppercase tracking-widest text-gray-300 hover:text-white mb-3">{t.nav?.profile || 'Profil'}</button>
                  {isAdminAuth && <button onClick={() => setPage('admin')} className="block w-full text-left text-xs uppercase tracking-widest text-blue-400 hover:text-blue-300 mb-3">{t.nav?.admin || 'Admin Panel'}</button>}
                  <button onClick={logout} className="block w-full text-left text-xs uppercase tracking-widest text-red-400 hover:text-red-300">{t.nav?.logout || 'Abmelden'}</button>
                </div>
              </div>
            </div>
          ) : (
            <button onClick={() => setPage('auth')} className="mx-2 w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
            </button>
          )}

          <LanguageSelector />
        </div>

        <div className="flex lg:hidden items-center gap-2 z-50 relative">
          <NotificationBell />
          {!currentUser ? (
             <button onClick={() => setPage('auth')} aria-label="Anmelden" className="p-2 text-gray-400 hover:text-white">
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
             </button>
           ) : (
             <button onClick={() => { setMobileMenuOpen(false); setPage('profile'); }} className="w-8 h-8 rounded-full flex items-center justify-center border overflow-hidden border-[#d4af37] text-[#d4af37]">
               {currentUser.photoURL ? (
                 <img loading="lazy" decoding="async" src={currentUser.photoURL} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                )}
             </button>
           )}
           
           <LanguageSelector />

           <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label={mobileMenuOpen ? "Menü schließen" : "Menü öffnen"} aria-expanded={mobileMenuOpen} className="p-2 text-white focus:outline-none">
             <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               {mobileMenuOpen ? (
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
               ) : (
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
               )}
             </svg>
           </button>
         </div>
      </div>

      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-x-0 top-20 bottom-0 h-[calc(100dvh-5rem)] overflow-y-auto px-6 flex flex-col animate-in slide-in-from-top-2 duration-300 z-40 bg-black border-t border-white/10">
          <div className="pt-8 pb-4 flex flex-col gap-6">
            {['home', 'services', 'gallery', 'products', 'contact'].map(p => (
              <button key={p} onClick={() => navigateTo(p)} className={`block w-full text-left text-xl font-bold tracking-widest uppercase transition-colors ${page === p ? 'text-white' : 'text-gray-400 hover:text-white'}`}>
                {t.nav[p] || p}
              </button>
            ))}
          </div>
          <div className="mt-auto pb-10 pt-4">
            {currentUser ? (
              <div className="border-t border-gray-800 pt-6 flex flex-col gap-4">
                <div onClick={() => navigateTo('profile')} className="cursor-pointer border border-white/10 p-4 rounded-sm">
                  <p className="text-sm font-bold text-white uppercase tracking-widest">{t.profile?.title || 'Profil'}</p>
                  <p className="text-xs mt-1 text-[#d4af37]">{currentUser.haircutCount}/10</p>
                </div>
                <div className="flex gap-4">
                  {isAdminAuth && (
                    <button onClick={() => { navigateTo('admin'); setMobileMenuOpen(false); }} className="flex-1 py-3 text-xs bg-blue-500/10 border border-blue-500/30 text-blue-400 font-bold uppercase rounded-sm">{t.nav?.admin || 'Admin'}</button>
                  )}
                  <button onClick={() => { setMobileMenuOpen(false); setTimeout(() => logout(), 150); }} className="flex-1 py-3 text-xs bg-red-500/10 border border-red-500/30 text-red-400 font-bold uppercase rounded-sm">{t.nav?.logout || 'ABMELDEN'}</button>
                </div>
              </div>
            ) : (
              <div className="border-t border-gray-800 pt-6">
                <button onClick={() => navigateTo('auth')} className="block w-full py-4 text-center font-bold uppercase tracking-widest text-sm rounded-sm bg-white text-black">{t.auth?.loginBtn || 'Einloggen'} / {t.auth?.registerTitle || 'Registrieren'}</button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}