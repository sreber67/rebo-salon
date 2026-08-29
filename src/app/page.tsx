"use client";
import React, { useState, useEffect, useRef } from 'react';
import { auth, db, getGoogleProvider, getFacebookProvider } from '../lib/firebase';
import { signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail, verifyBeforeUpdateEmail, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { doc, setDoc, collection, onSnapshot, addDoc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { uploadReferenceImage } from '@/lib/storage';
import { CookieConsentProvider, CookieConsentBanner, useCookieConsent } from '@/components/CookieConsent';
import { DataExportButton, DataExportModal } from '@/components/DataExport';
import { DeleteAccountButton, AccountDeletionModal } from '@/components/AccountDeletion';
import { ProfileView } from '@/components/ProfileView';
import { Navbar } from '@/components/Navbar';
import { getInternalHeaders } from '@/lib/validation';
import { AppProvider, useApp, Appointment, ServiceItem, ProductItem, fallbackTranslations, TimeSlot, UserProfile, WaitlistItem, StylistItem, Guest } from '@/context/AppContext';

const countryCodes = [
  { code: '+49', label: 'Deutschland 🇩🇪' }, { code: '+43', label: 'Österreich 🇦🇹' }, { code: '+41', label: 'Schweiz 🇨🇭' },
  { code: '+1', label: 'USA/Kanada 🇺🇸' }, { code: '+44', label: 'UK 🇬🇧' }, { code: '+33', label: 'Frankreich 🇫🇷' },
  { code: '+39', label: 'Italien 🇮🇹' }, { code: '+34', label: 'Spanien 🇪🇸' }, { code: '+31', label: 'Niederlande 🇳🇱' },
  { code: '+32', label: 'Belgien 🇧🇪' }, { code: '+48', label: 'Polen 🇵🇱' }, { code: '+46', label: 'Schweden 🇸🇪' },
];

const initialSlots: TimeSlot[] = [
  { id: 't1', time: '09:00', isBooked: false }, { id: 't2', time: '10:00', isBooked: false },
  { id: 't3', time: '11:00', isBooked: false }, { id: 't4', time: '13:00', isBooked: false },
  { id: 't5', time: '14:00', isBooked: false }, { id: 't6', time: '15:30', isBooked: false },
]; 

function LanguageSelector() {
  const { lang, changeLanguage, isTranslatingUI, t } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  
  const languages = [
    { code: 'de', name: 'Deutsch' }, { code: 'en', name: 'English' }, { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' }, { code: 'it', name: 'Italiano' }, { code: 'nl', name: 'Nederlands' },
    { code: 'tr', name: 'Türkçe' }, { code: 'pl', name: 'Polski' }, { code: 'ru', name: 'Русский' },
    { code: 'ar', name: 'العربية' }, { code: 'zh', name: '中文' }, { code: 'ja', name: '日本語' }
  ];

  const filteredLangs = languages.filter(l => l.name.toLowerCase().includes(search.toLowerCase()) || l.code.toLowerCase().includes(search.toLowerCase()));
  const currentLangName = languages.find(l => l.code === lang)?.name || lang.toUpperCase();

  return (
    <div className="relative z-50 ml-2">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        disabled={isTranslatingUI}
        className="flex items-center gap-2 px-3 py-1.5 border rounded-full text-xs font-bold transition-colors border-gray-700 text-gray-300 hover:text-white"
      >
        {isTranslatingUI ? (
          <span className="animate-pulse">{t.common?.loading || 'Lädt...'}</span>
        ) : (
          <>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {currentLangName}
          </>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 border rounded-sm shadow-2xl p-2 animate-in fade-in zoom-in-95 bg-[#111] border-white/10">
          <input 
            type="text" 
            placeholder={t.common?.searchLang || "Sprache suchen..."} 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-black border p-2 rounded-sm text-xs text-white outline-none mb-2 border-white/20 focus:border-[#d4af37]"
          />
          <div className="max-h-48 overflow-y-auto pr-1 space-y-1 custom-scrollbar">
            {filteredLangs.map(l => (
              <button 
                key={l.code}
                onClick={() => { changeLanguage(l.code); setIsOpen(false); setSearch(''); }}
                className={`w-full text-left px-2 py-1.5 text-xs rounded-sm transition-colors ${lang === l.code ? 'bg-[#d4af37] text-black font-bold' : 'text-gray-400 hover:bg-white/10 hover:text-white'}`}
              >
                {l.name}
              </button>
            ))}
            {filteredLangs.length === 0 && <p className="text-gray-500 text-[10px] p-2">{t.common?.noResults || "Keine gefunden."}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationBell() {
  const { alerts, currentUser, markAlertRead, clearAlerts, setPage, t } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  
  if (!currentUser) return null;

  const userAlerts = alerts.filter(a => a.userId === currentUser.id).sort((a,b) => b.createdAt - a.createdAt);
  const unreadCount = userAlerts.filter(a => !a.isRead).length;

  const notifTrans = t.notifications || fallbackTranslations.de.notifications;

  return (
    <div className="relative group mx-2">
      <button onClick={() => setIsOpen(!isOpen)} className="relative p-2 rounded-full border transition-colors border-white/10 text-[#d4af37] hover:bg-[#d4af37] hover:text-black">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
        {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border border-black flex items-center justify-center text-white text-[10px] font-bold shadow-lg animate-pulse">{unreadCount}</span>}
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 border rounded-sm shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 bg-[#111] border-white/10">
          <h4 className="text-[10px] uppercase font-bold text-gray-500 mb-2 px-2 tracking-widest">{notifTrans?.title || 'Benachrichtigungen'}</h4>
          <div className="max-h-64 overflow-y-auto custom-scrollbar">
            {userAlerts.length === 0 ? <p className="text-xs text-gray-500 px-2 italic pb-2">{notifTrans?.empty || 'Keine'}</p> : 
              userAlerts.map(a => (
                <div key={a.id} onClick={() => { markAlertRead(a.id); setPage(a.link); setIsOpen(false); }} className={`p-3 border-b border-gray-800 cursor-pointer transition-colors rounded-sm ${!a.isRead ? 'bg-white/5' : 'hover:bg-white/5'}`}>
                  <p className={`text-xs ${!a.isRead ? 'text-white font-bold' : 'text-gray-400'}`}>{a.message}</p>
                  <p className="text-[9px] text-gray-600 mt-1 uppercase tracking-widest">{new Date(a.createdAt).toLocaleString()}</p>
                </div>
              ))
            }
          </div>
          {userAlerts.length > 0 && <button onClick={() => { clearAlerts(); setIsOpen(false); }} className="w-full text-center text-[10px] text-red-400 hover:text-red-300 uppercase tracking-widest mt-2 pt-2 border-t border-gray-800">{notifTrans?.clearAll || 'Alle löschen'}</button>}
        </div>
      )}
    </div>
  );
}

function ToastContainer() {
  const { notifications } = useApp();
  return (
    <div className="fixed top-20 md:top-24 right-4 md:right-6 z-999 flex flex-col gap-2 pointer-events-none">
      {notifications.map(n => (
        <div key={n.id} className={`p-4 rounded shadow-2xl animate-in slide-in-from-right-8 duration-300 pointer-events-auto border-l-4 text-xs md:text-sm ${n.type === 'success' ? 'bg-[#111] border-green-500 text-green-400' : n.type === 'error' ? 'bg-[#111] border-red-500 text-red-400' : 'bg-[#111] border-[#d4af37] text-[#d4af37]'}`}>
          <p className="font-semibold">{n.message}</p>
        </div>
      ))}
    </div>
  );
}

function AuthView() {
  const { t, loginOAuth, loginEmail, registerEmail, resetPassword, addNotification } = useApp();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [name, setName] = useState('');
  const [countryCode, setCountryCode] = useState('+49');
  const [phoneInput, setPhoneInput] = useState('');
  const [inlineAuthError, setInlineAuthError] = useState('');

  const authTrans = t.auth || fallbackTranslations.de.auth;

  const hasLength = pass.length >= 8;
  const hasUpper = /[A-Z]/.test(pass);
  const hasLower = /[a-z]/.test(pass);
  const hasNum = /[0-9]/.test(pass);
  const hasSpec = /[^A-Za-z0-9]/.test(pass);
  const passScore = [hasLength, hasUpper, hasLower, hasNum, hasSpec].filter(Boolean).length;
  const passWidth = `${(passScore / 5) * 100}%`;
  const passColor = passScore <= 2 ? 'bg-red-500' : passScore <= 4 ? 'bg-yellow-500' : 'bg-green-500';
  const passLabel = passScore <= 2 ? (authTrans.weak || 'Schwach') : passScore <= 4 ? (authTrans.medium || 'Mittel') : (authTrans.strong || 'Stark');

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setInlineAuthError('');
    try {
      if (isLogin) {
        await loginEmail(email, pass);
      } else {
        if (!hasLength) { setInlineAuthError("Das Passwort muss mindestens 8 Zeichen lang sein."); return; }
        if (!phoneInput || !name) { setInlineAuthError("Bitte füllen Sie alle Daten aus."); return; }
        const fullPhone = `${countryCode}${phoneInput}`.replace(/\s+/g, '');
        await registerEmail(email, pass, name, fullPhone);
      }
    } catch (err: any) {
      if (isLogin && (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password')) {
         setInlineAuthError("E-Mail ist nicht registriert oder Passwort falsch. Bitte auf 'Registrieren' klicken.");
      } else {
         setInlineAuthError(err.message);
      }
    }
  };

  return (
    <div className="flex min-h-screen pt-20 relative">
      <div className="hidden lg:block lg:w-1/2 relative bg-black/50">
        <img src="https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=1600&q=80" alt="Login Background" className="w-full h-full object-cover grayscale-50 opacity-40" />
      </div>
      <div className="w-full lg:w-1/2 flex items-center justify-center px-4 md:px-8 py-12">
        <div className="w-full max-w-md animate-in fade-in slide-in-from-right-8 duration-1000">
          <div className="mb-10 text-center">
             <h2 className="text-3xl font-bold mb-2 uppercase tracking-tight">{isLogin ? authTrans.loginTitle : authTrans.registerTitle}</h2>
             <p className="text-gray-400 text-sm">{authTrans.loginSub}</p>
          </div>
          <form onSubmit={handleEmailAuth} className="p-6 md:p-8 border rounded-sm shadow-2xl bg-[#111] border-white/10">
            <div className="space-y-4 mb-6">
              {!isLogin && (
                <>
                  <input required type="text" value={name} onChange={e=>setName(e.target.value)} placeholder={t.booking.name} className="w-full border rounded-sm p-4 outline-none text-sm transition-colors bg-black border-white/20 focus:border-[#d4af37]" />
                  <div className="flex gap-2">
                    <select value={countryCode} onChange={(e) => setCountryCode(e.target.value)} className="border rounded-sm p-4 outline-none text-sm transition-colors w-[40%] bg-black border-white/20">
                      {countryCodes.map(c => <option key={c.code} value={c.code}>{c.code} {c.label}</option>)}
                    </select>
                    <input required type="tel" value={phoneInput} onChange={(e)=>setPhoneInput(e.target.value)} placeholder={t.booking.phone} className="w-[60%] border rounded-sm p-4 outline-none text-sm transition-colors bg-black border-white/20 focus:border-[#d4af37]" />
                  </div>
                </>
              )}
              <input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder={authTrans.email} className="w-full border rounded-sm p-4 outline-none text-sm transition-colors bg-black border-white/20 focus:border-[#d4af37]" />
              
              <div>
                <input required type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder={authTrans.pass} className="w-full border rounded-sm p-4 outline-none text-sm transition-colors bg-black border-white/20 focus:border-[#d4af37]" />
                {!isLogin && pass.length > 0 && (
                  <div className="mt-4 p-4 border border-white/5 bg-black/40 rounded-sm">
                    <div className="flex justify-between items-center text-xs mb-2">
                      <span className="text-gray-400">{authTrans.passStrength || 'Passwort-Stärke:'}</span>
                      <span className={`${passColor.replace('bg-', 'text-')} font-bold uppercase tracking-widest`}>{passLabel}</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden mb-3">
                      <div className={`h-full transition-all duration-300 ${passColor}`} style={{ width: passWidth }} />
                    </div>
                    <ul className="text-[10px] text-gray-500 space-y-1.5">
                      <li className={hasLength ? 'text-green-400' : ''}>{hasLength ? '✓' : '○'} {authTrans.ruleLength || 'Mindestens 8 Zeichen'}</li>
                      <li className={hasUpper ? 'text-green-400' : ''}>{hasUpper ? '✓' : '○'} {authTrans.ruleUpper || 'Ein Großbuchstabe'}</li>
                      <li className={hasLower ? 'text-green-400' : ''}>{hasLower ? '✓' : '○'} {authTrans.ruleLower || 'Ein Kleinbuchstabe'}</li>
                      <li className={hasNum ? 'text-green-400' : ''}>{hasNum ? '✓' : '○'} {authTrans.ruleNum || 'Eine Zahl'}</li>
                      <li className={hasSpec ? 'text-green-400' : ''}>{hasSpec ? '✓' : '○'} {authTrans.ruleSpec || 'Ein Sonderzeichen'}</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {inlineAuthError && (
              <div className="mb-6 p-4 rounded-sm border border-red-500/50 bg-red-500/10 text-red-400 text-xs leading-relaxed animate-in fade-in zoom-in-95">
                {inlineAuthError}
              </div>
            )}

            <button type="submit" className="w-full py-4 rounded-sm font-bold uppercase tracking-widest text-xs transition-all bg-[#d4af37] text-black hover:bg-white">
              {isLogin ? authTrans.loginBtn : authTrans.registerTitle}
            </button>

            {isLogin && (
              <button type="button" onClick={() => resetPassword(email)} className="text-xs text-gray-400 hover:text-white mt-4 block w-full text-center transition-colors underline">
                {authTrans.resetPassBtn || "Passwort vergessen?"}
              </button>
            )}

            <div className="mt-8 relative">
               <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-800"></div></div>
               <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest"><span className="px-4 bg-[#111] text-gray-500">{authTrans.social}</span></div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mt-6">
              <button type="button" onClick={() => loginOAuth('Google')} className="flex-1 py-3 border border-gray-700 rounded-sm text-sm font-medium hover:bg-white/5 flex justify-center items-center gap-2"> Google</button>
              <button type="button" onClick={() => loginOAuth('Facebook')} className="flex-1 py-3 border border-gray-700 rounded-sm text-sm font-medium hover:bg-[#1877F2]/10 hover:border-[#1877F2] text-[#1877F2] flex justify-center items-center gap-2"> Facebook</button>
            </div>

            <p className="mt-8 text-center text-xs text-gray-400">
              {isLogin ? authTrans.noAccount : authTrans.haveAccount} 
              <button type="button" onClick={() => { setIsLogin(!isLogin); setInlineAuthError(''); }} className="ml-2 underline hover:text-white text-[#d4af37]">
                {isLogin ? authTrans.register : authTrans.loginBtn}
              </button>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

function ProfileViewLocal() {
  const { t, currentUser, appointments, addNotification, updateUserPassword, updateAppointmentStatus } = useApp();
  const [activeTab, setActiveTab] = useState<'overview' | 'settings'>('overview');
  
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editCountryCode, setEditCountryCode] = useState('+49');
  const [editPhone, setEditPhone] = useState('');

  // Password Update State
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [generatedPassOTP, setGeneratedPassOTP] = useState('');
  const [inputPassOTP, setInputPassOTP] = useState('');
  const [isVerifyingPassOTP, setIsVerifyingPassOTP] = useState(false);

  const primaryColor = 'text-[#d4af37]';
  const bgBorder = 'border-white/10 bg-[#111]';

  const secTrans = t.security || fallbackTranslations.de.security;
  const authTrans = t.auth || fallbackTranslations.de.auth;

  const isEmailProvider = auth.currentUser?.providerData.some(p => p.providerId === 'password');
  const [showForcePasswordModal, setShowForcePasswordModal] = useState(false);

  useEffect(() => {
    if (currentUser && isEmailProvider && currentUser.hasUpdatedPassword !== true) {
      setShowForcePasswordModal(true);
    }
  }, [currentUser, isEmailProvider]);

  useEffect(() => {
    if (currentUser) {
      setEditName(currentUser.name);
      setEditEmail(currentUser.email);
      let pNum = currentUser.phone || "";
      let cCode = "+49";
      for (let c of countryCodes) {
        if (pNum.startsWith(c.code)) { cCode = c.code; pNum = pNum.replace(c.code, "").trim(); break; }
      }
      setEditCountryCode(cCode);
      setEditPhone(pNum);
    }
  }, [currentUser]);

  if (!currentUser) return null;

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editEmail !== currentUser.email && auth.currentUser) {
        await verifyBeforeUpdateEmail(auth.currentUser, editEmail);
        addNotification("Bestätigungs-E-Mail gesendet! Bitte prüfen Sie Ihren Posteingang.", "info");
      }
      const fullPhone = `${editCountryCode}${editPhone}`.replace(/\s+/g, '');
      await updateDoc(doc(db, 'users', currentUser.id), { name: editName, phone: fullPhone });
      addNotification("Profil erfolgreich aktualisiert!", "success");
      setActiveTab('overview');
    } catch (err: any) { addNotification(err.message, "error"); }
  };

  const handleSendPassOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass !== confirmPass) return addNotification("Passwörter stimmen nicht überein.", "error");
    if (newPass.length < 8) return addNotification("Passwort muss mindestens 8 Zeichen lang sein.", "error");
    
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedPassOTP(otp);
    setIsVerifyingPassOTP(true);
    
    try {
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : '';
      await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          email: currentUser.email,
          subject: "Rebo Salon: Passwortänderung Bestätigung",
          message: `Hallo ${currentUser.name},\n\nDein Bestätigungscode zur Passwortänderung lautet: ${otp}\n\nFalls du diese Änderung nicht angefordert hast, ignoriere diese E-Mail.\n\nDein Rebo Salon Team`
        })
      });
      addNotification("Bestätigungscode an E-Mail gesendet!", "info");
    } catch (err) { addNotification("Fehler beim Senden Codes.", "error"); setIsVerifyingPassOTP(false); }
  };

  const handleVerifyPassOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputPassOTP !== generatedPassOTP) return addNotification("Ungültiger Code. Bitte erneut versuchen.", "error");
    try {
      await updateUserPassword(oldPass, newPass);
      setOldPass(''); setNewPass(''); setConfirmPass(''); setInputPassOTP(''); setIsVerifyingPassOTP(false);
      setShowForcePasswordModal(false);
    } catch (err: any) {
      addNotification(err.message, "error");
    }
  };

  const hasLength = newPass.length >= 8;
  const hasUpper = /[A-Z]/.test(newPass);
  const hasLower = /[a-z]/.test(newPass);
  const hasNum = /[0-9]/.test(newPass);
  const hasSpec = /[^A-Za-z0-9]/.test(newPass);
  const passScore = [hasLength, hasUpper, hasLower, hasNum, hasSpec].filter(Boolean).length;
  const passWidth = `${(passScore / 5) * 100}%`;
  const passColor = passScore <= 2 ? 'bg-red-500' : passScore <= 4 ? 'bg-yellow-500' : 'bg-green-500';
  const passLabel = passScore <= 2 ? (authTrans.weak || 'Schwach') : passScore <= 4 ? (authTrans.medium || 'Mittel') : (authTrans.strong || 'Stark');

  const userAppts = appointments.filter((a: any) => a.userId === currentUser.id).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const upcoming = userAppts.filter((a: any) => a.status === 'pending' || a.status === 'proposed');
  const past = userAppts.filter((a: any) => a.status === 'confirmed');

  return (
    <div className="min-h-screen pt-28 md:pt-32 px-4 md:px-6 max-w-4xl mx-auto animate-in fade-in duration-500 pb-20 relative">
      
      {showForcePasswordModal && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="p-8 md:p-10 border rounded-sm shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-300 bg-[#111] border-white/20">
            <h3 className="text-2xl font-bold mb-2 uppercase text-red-400">{secTrans.title}</h3>
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">{secTrans.desc}</p>
            
            {!isVerifyingPassOTP ? (
              <form onSubmit={handleSendPassOTP} className="space-y-4">
                 <div>
                   <label className="block text-xs uppercase text-gray-400 mb-2">{secTrans.currentPass}</label>
                   <input required type="password" value={oldPass} onChange={e=>setOldPass(e.target.value)} className="w-full bg-black border border-white/20 p-4 rounded-sm text-white" />
                 </div>
                 <div>
                   <label className="block text-xs uppercase text-gray-400 mb-2">{secTrans.newPass}</label>
                   <input required type="password" value={newPass} onChange={e=>setNewPass(e.target.value)} className="w-full bg-black border border-white/20 p-4 rounded-sm text-white mb-2" />
                   {newPass.length > 0 && (
                      <div className="mb-4">
                        <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden mb-2"><div className={`h-full transition-all duration-300 ${passColor}`} style={{ width: passWidth }} /></div>
                      </div>
                   )}
                 </div>
                 <div>
                   <label className="block text-xs uppercase text-gray-400 mb-2">{secTrans.confirmPass}</label>
                   <input required type="password" value={confirmPass} onChange={e=>setConfirmPass(e.target.value)} className="w-full bg-black border border-white/20 p-4 rounded-sm text-white" />
                 </div>
                 <button type="submit" disabled={!hasLength} className="w-full py-4 font-bold uppercase text-xs rounded-sm mt-4 disabled:opacity-50 bg-[#d4af37] text-black">{secTrans.sendCode}</button>
              </form>
            ) : (
              <form onSubmit={handleVerifyPassOTP} className="space-y-5">
                <div>
                  <label className="block text-xs uppercase text-gray-400 mb-2">{secTrans.enterCode}</label>
                  <input required type="text" maxLength={6} value={inputPassOTP} onChange={e => setInputPassOTP(e.target.value)} placeholder="------" className="w-full border border-white/20 rounded-sm p-4 outline-none text-2xl tracking-[0.5em] text-center font-mono bg-black text-white" />
                </div>
                <div className="flex gap-4 mt-8">
                  <button type="button" onClick={() => setIsVerifyingPassOTP(false)} className="flex-1 py-4 uppercase text-xs font-bold text-gray-400 border border-gray-700 hover:text-white rounded-sm transition-colors">{secTrans.cancel}</button>
                  <button type="submit" className="flex-1 py-4 uppercase text-xs font-bold text-black rounded-sm transition-colors bg-[#d4af37] hover:bg-white">{secTrans.confirmBtn}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 border-b border-gray-800 pb-4 gap-4">
         <div>
           <h2 className="text-3xl md:text-5xl font-bold mb-2 uppercase tracking-tight">{t.profile.title}</h2>
           <p className="text-gray-400 text-sm md:text-base">{t.profile?.welcome || "Willkommen zurück"}, {currentUser.name}</p>
         </div>
         <div className="flex gap-2 bg-black border border-white/10 p-1 rounded-sm">
            <button onClick={() => setActiveTab('overview')} className={`px-4 py-2 text-xs uppercase font-bold tracking-widest transition-colors ${activeTab === 'overview' ? 'bg-[#d4af37] text-black' : 'text-gray-400 hover:text-white'}`}>{t.profile?.overview || "Übersicht"}</button>
            <button onClick={() => setActiveTab('settings')} className={`px-4 py-2 text-xs uppercase font-bold tracking-widest transition-colors ${activeTab === 'settings' ? 'bg-[#d4af37] text-black' : 'text-gray-400 hover:text-white'}`}>{t.profile?.settings || "Einstellungen"}</button>
         </div>
      </div>

      {activeTab === 'settings' ? (
        <div className={`p-6 md:p-10 border rounded-sm shadow-xl space-y-10 ${bgBorder}`}>
           <form onSubmit={handleUpdateSettings} className="space-y-6">
             <h3 className="text-xl font-bold mb-4">{t.profile?.editProfile || "Profil bearbeiten"}</h3>
             <div>
               <label className="block text-xs uppercase text-gray-400 mb-2">Vollständiger Name</label>
               <input required value={editName} onChange={e=>setEditName(e.target.value)} type="text" className="w-full bg-black border border-white/20 p-4 rounded-sm text-white" />
             </div>
             <div>
               <label className="block text-xs uppercase text-gray-400 mb-2">E-Mail-Adresse (Änderung erfordert Bestätigung)</label>
               <input required value={editEmail} onChange={e=>setEditEmail(e.target.value)} type="email" className="w-full bg-black border border-white/20 p-4 rounded-sm text-white" />
             </div>
             <div>
               <label className="block text-xs uppercase text-gray-400 mb-2">Telefonnummer</label>
               <div className="flex gap-2">
                  <select value={editCountryCode} onChange={e=>setEditCountryCode(e.target.value)} className="w-[30%] bg-black border border-white/20 p-4 rounded-sm text-white">
                    {countryCodes.map(c => <option key={c.code} value={c.code}>{c.code} {c.label}</option>)}
                  </select>
                  <input required value={editPhone} onChange={e=>setEditPhone(e.target.value)} type="tel" className="w-[70%] bg-black border border-white/20 p-4 rounded-sm text-white" />
               </div>
             </div>
             <button type="submit" className="w-full py-4 font-bold uppercase text-xs rounded-sm bg-[#d4af37] text-black">Einstellungen speichern</button>
           </form>

           <div className="border-t border-gray-800 pt-8">
              <h3 className="text-xl font-bold mb-4 text-red-400">{secTrans.secTitle}</h3>
              {!isEmailProvider ? (
                <p className="text-sm text-gray-500 italic">{secTrans.oauthMsg}</p>
              ) : !isVerifyingPassOTP ? (
                <form onSubmit={handleSendPassOTP} className="space-y-4">
                   <div>
                     <label className="block text-xs uppercase text-gray-400 mb-2">{secTrans.currentPass}</label>
                     <input required type="password" value={oldPass} onChange={e=>setOldPass(e.target.value)} className="w-full bg-black border border-white/20 p-4 rounded-sm text-white" />
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                       <label className="block text-xs uppercase text-gray-400 mb-2">{secTrans.newPass}</label>
                       <input required type="password" value={newPass} onChange={e=>setNewPass(e.target.value)} className="w-full bg-black border border-white/20 p-4 rounded-sm text-white mb-2" />
                       {newPass.length > 0 && (
                          <div className="mt-2 p-3 bg-black/40 border border-white/5 rounded-sm">
                            <div className="flex justify-between items-center text-[10px] mb-2 uppercase tracking-widest"><span className="text-gray-500">{authTrans.passStrength || 'Stärke:'}</span><span className={passColor.replace('bg-', 'text-')}>{passLabel}</span></div>
                            <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden mb-2"><div className={`h-full transition-all duration-300 ${passColor}`} style={{ width: passWidth }} /></div>
                            <ul className="text-[9px] text-gray-500 grid grid-cols-2 gap-1">
                              <li className={hasLength ? 'text-green-400' : ''}>{hasLength ? '✓' : '○'} {authTrans.ruleLength || '8+ Zeichen'}</li>
                              <li className={hasUpper ? 'text-green-400' : ''}>{hasUpper ? '✓' : '○'} {authTrans.ruleUpper || 'Großbuchstabe'}</li>
                              <li className={hasLower ? 'text-green-400' : ''}>{hasLower ? '✓' : '○'} {authTrans.ruleLower || 'Kleinbuchstabe'}</li>
                              <li className={hasNum ? 'text-green-400' : ''}>{hasNum ? '✓' : '○'} {authTrans.ruleNum || 'Zahl'}</li>
                              <li className={hasSpec ? 'text-green-400' : ''}>{hasSpec ? '✓' : '○'} {authTrans.ruleSpec || 'Sonderzeichen'}</li>
                            </ul>
                          </div>
                       )}
                     </div>
                     <div>
                       <label className="block text-xs uppercase text-gray-400 mb-2">{secTrans.confirmPass}</label>
                       <input required type="password" value={confirmPass} onChange={e=>setConfirmPass(e.target.value)} className="w-full bg-black border border-white/20 p-4 rounded-sm text-white" />
                     </div>
                   </div>
                   <button type="submit" disabled={!hasLength} className="w-full md:w-auto px-8 py-3 bg-red-600/20 text-red-400 border border-red-600 font-bold uppercase text-xs rounded-sm mt-4 hover:bg-red-600 hover:text-white transition-colors disabled:opacity-50">{secTrans.sendOtpBtn}</button>
                </form>
              ) : (
                <form onSubmit={handleVerifyPassOTP} className="space-y-4 max-w-sm">
                  <div>
                    <label className="block text-xs uppercase text-gray-400 mb-2">{secTrans.enterCode}</label>
                    <input required type="text" maxLength={6} value={inputPassOTP} onChange={e => setInputPassOTP(e.target.value)} placeholder="------" className="w-full border border-white/20 rounded-sm p-4 outline-none text-2xl tracking-[0.5em] text-center font-mono bg-black text-white" />
                  </div>
                  <div className="flex gap-4 mt-4">
                    <button type="button" onClick={() => setIsVerifyingPassOTP(false)} className="flex-1 py-3 uppercase text-xs font-bold text-gray-400 border border-gray-700 hover:text-white rounded-sm transition-colors">{secTrans.cancel}</button>
                    <button type="submit" className="flex-1 py-3 uppercase text-xs font-bold text-black rounded-sm transition-colors bg-[#d4af37] hover:bg-white">{secTrans.confirmBtn}</button>
                  </div>
                </form>
              )}
           </div>
        </div>
      ) : (
        <>
          <div className={`p-6 md:p-8 mb-6 border rounded-sm flex items-center justify-between shadow-xl ${bgBorder}`}>
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">{t.profile?.contactData || "Kontaktdaten"}</p>
              <p className="text-lg font-bold">{currentUser.email}</p>
              <p className="text-gray-300 mt-1">{currentUser.phone || t.profile?.noPhone || "Keine Telefonnummer gespeichert. Bitte in den Einstellungen hinzufügen."}</p>
            </div>
            <button onClick={() => setActiveTab('settings')} className="p-3 border border-white/20 rounded-sm hover:bg-white/5 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
            </button>
          </div>

          <div className={`p-6 md:p-8 mb-10 border rounded-sm shadow-xl ${bgBorder}`}>
            <h3 className="text-lg md:text-xl font-bold mb-2">{t.profile.pointsTitle}</h3>
            <p className="text-xs md:text-sm text-gray-400 mb-6">{t.profile.pointsDesc}</p>
            <div className="w-full h-4 bg-gray-900 rounded-full overflow-hidden border border-gray-800">
              <div className="h-full transition-all duration-1000 bg-[#d4af37]" style={{ width: `${(currentUser.haircutCount / 10) * 100}%` }} />
            </div>
            <p className={`text-right mt-2 text-sm font-bold ${primaryColor}`}>{currentUser.haircutCount} / 10</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg md:text-xl font-bold mb-6">{t.profile.upcomingTitle}</h3>
              <div className="space-y-4">
                {upcoming.map((a: any) => {
                  const sList = Array.isArray(a.services) ? a.services.join(', ') : (a as any).service || 'Leistung';
                  return (
                    <div key={a.id} className={`p-5 border rounded-sm ${bgBorder}`}>
                      <p className="font-bold text-base">{sList}</p>
                      <p className="text-xs text-gray-400 mb-3">{a.date} {t.common?.at || 'um'} {a.time} {t.common?.by || 'bei'} {a.stylist} ({a.totalDurationMins || 60} {t.services?.min || 'Minuten'})</p>
                      
                      {a.status === 'proposed' ? (
                        <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-sm">
                          <p className="text-blue-400 text-xs font-bold mb-2">⚠️ {t.profile?.newProposal || "Neuer Terminvorschlag vom Salon:"}</p>
                          <p className="text-white text-sm mb-3">{a.proposedDate} um {a.proposedTime} Uhr</p>
                          <div className="flex gap-2">
                            <button onClick={() => updateAppointmentStatus(a.id, 'confirmed', true, undefined, a.proposedDate, a.proposedTime)} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 text-xs font-bold uppercase rounded-sm">{t.profile?.acceptTime || "Zeit Akzeptieren"}</button>
                            <button onClick={() => updateAppointmentStatus(a.id, 'cancelled', false)} className="border border-red-500/50 text-red-400 hover:bg-red-500/10 px-3 py-1.5 text-xs font-bold uppercase rounded-sm">{t.profile?.cancel || "Stornieren"}</button>
                          </div>
                        </div>
                      ) : (
                        <span className="text-[10px] uppercase bg-yellow-600/20 text-yellow-400 border border-yellow-600 px-3 py-1 rounded-sm">{t.profile?.pending || "Ausstehend"}</span>
                      )}
                    </div>
                  );
                })}
                {upcoming.length === 0 && <p className="text-gray-500 text-sm">{t.profile.noHistory}</p>}
              </div>
            </div>

            <div>
              <h3 className="text-lg md:text-xl font-bold mb-6">{t.profile.historyTitle}</h3>
              <div className="space-y-4">
                {past.map((a: any) => {
                  const sList = Array.isArray(a.services) ? a.services.join(', ') : (a as any).service || 'Leistung';
                  return (
                    <div key={a.id} className={`p-5 border rounded-sm ${bgBorder}`}>
                      <p className="font-bold text-base">{sList}</p>
                      <p className="text-xs text-gray-400 mb-3">{a.date} {t.common?.by || 'bei'} {a.stylist}</p>
                      <span className="text-[10px] uppercase bg-green-600/20 text-green-400 border border-green-600 px-3 py-1 rounded-sm">{t.profile?.completed || "Abgeschlossen"}</span>
                    </div>
                  );
                })}
                {past.length === 0 && <p className="text-gray-500 text-sm">{t.profile.noHistory}</p>}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function AdminView() {
  const { appointments, updateAppointmentStatus, servicesDB, addService, deleteService, productsDB, addProduct, deleteProduct, updateProductStock, t, usersDB, updateUserNotes, addAdminAppointment, waitlist, notifyWaitlist, removeFromWaitlist, resendConfirmation, stylistsDB, addStylist, deleteStylist, generalSettings, updateGeneralSettings } = useApp();
  const [tab, setTab] = useState<'appointments' | 'calendar' | 'services' | 'products' | 'clients' | 'waitlist' | 'team' | 'settings'>('appointments');
  const [editingNotes, setEditingNotes] = useState<{[key:string]: string}>({});
  const [editingClientNotes, setEditingClientNotes] = useState<{[key:string]: string}>({});
  const [searchClient, setSearchClient] = useState('');
  
  const [rescheduleData, setRescheduleData] = useState<{[key:string]: {date: string, time: string}}>({});
  const [calDate, setCalDate] = useState(new Date().toISOString().split('T')[0]);
  const [calendarStylist, setCalendarStylist] = useState<string>('Alle Stylisten');

  const [serviceNameDe, setServiceNameDe] = useState('');
  const [serviceNameEn, setServiceNameEn] = useState('');
  const [servicePrice, setServicePrice] = useState('');
  const [serviceDuration, setServiceDuration] = useState('');
  const [isTranslatingService, setIsTranslatingService] = useState(false);

  const [productNameDe, setProductNameDe] = useState('');
  const [productNameEn, setProductNameEn] = useState('');
  const [productDescDe, setProductDescDe] = useState('');
  const [productDescEn, setProductDescEn] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productStock, setProductStock] = useState('10');
  const [productImage, setProductImage] = useState<File | null>(null);
  const [isTranslatingProduct, setIsTranslatingProduct] = useState(false);

  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [walkInTime, setWalkInTime] = useState('');
  const [walkInName, setWalkInName] = useState('');
  const [walkInService, setWalkInService] = useState('Walk-In');
  const [walkInDuration, setWalkInDuration] = useState('60');

  const [stylistName, setStylistName] = useState('');
  const [stylistServices, setStylistServices] = useState<string[]>([]);
  const [walkinWaitTimeInput, setWalkinWaitTimeInput] = useState('');
  const [holidayInput, setHolidayInput] = useState('');
  
  const [heroImageInput, setHeroImageInput] = useState('');
  const [aboutImageInput, setAboutImageInput] = useState('');
  const [aboutTitleDeInput, setAboutTitleDeInput] = useState('');
  const [aboutTextDeInput, setAboutTextDeInput] = useState('');
  const [aboutTitleEnInput, setAboutTitleEnInput] = useState('');
  const [aboutTextEnInput, setAboutTextEnInput] = useState('');

  useEffect(() => {
     setWalkinWaitTimeInput(generalSettings?.walkinWaitTime || '');
     setHeroImageInput(generalSettings?.heroImage || '');
     setAboutImageInput(generalSettings?.aboutImage || '');
     setAboutTitleDeInput(generalSettings?.aboutTitleDe || '');
     setAboutTextDeInput(generalSettings?.aboutTextDe || '');
     setAboutTitleEnInput(generalSettings?.aboutTitleEn || '');
     setAboutTextEnInput(generalSettings?.aboutTextEn || '');
  }, [generalSettings]);

  const primaryColor = 'text-[#d4af37]';
  const bgBorder = 'border-white/10 bg-[#111]';

  const pendingAppts = appointments.filter((a: any) => a.status === 'pending').sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const otherAppts = appointments.filter((a: any) => a.status !== 'pending').sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const todayDateStr = new Date().toISOString().split('T')[0];
  const todaysAppts = appointments.filter(a => a.date === todayDateStr && a.status !== 'blocked' && a.status !== 'cancelled');
  const completedToday = todaysAppts.filter(a => a.status === 'confirmed').length;
  const upcomingToday = todaysAppts.filter(a => a.status === 'pending' || a.status === 'proposed').length;
  
  let todayRevenue = 0;
  todaysAppts.filter(a => a.status === 'confirmed').forEach(a => {
     if (!Array.isArray(a.services)) return;
     a.services.forEach(sName => {
        const matchedService = servicesDB.find(s => s.name === sName || sName.includes(s.name.split(' / ')[0]));
        if (matchedService) {
           const priceNum = parseFloat(matchedService.price.replace(/[^0-9,.]/g, '').replace(',', '.'));
           if (!isNaN(priceNum)) todayRevenue += priceNum;
        }
     });
  });

  const shiftDate = (days: number) => {
     const d = new Date(calDate); d.setDate(d.getDate() + days);
     setCalDate(d.toISOString().split('T')[0]);
  };

  const handleTranslateService = async () => {
    if (!serviceNameDe) return;
    setIsTranslatingService(true);
    try {
      const headers = await getInternalHeaders();
      const res = await fetch('/api/translate', { method: 'POST', headers, body: JSON.stringify({ text: serviceNameDe, targetLang: 'en' }) });
      const data = await res.json();
      if (data.translatedText) setServiceNameEn(data.translatedText);
    } catch (e) {} finally { setIsTranslatingService(false); }
  };

  const handleTranslateProduct = async () => {
    if (!productNameDe && !productDescDe) return;
    setIsTranslatingProduct(true);
    try {
      const headers = await getInternalHeaders();
      if (productNameDe) {
        const resName = await fetch('/api/translate', { method: 'POST', headers, body: JSON.stringify({ text: productNameDe, targetLang: 'en' }) });
        const dataName = await resName.json();
        if (dataName.translatedText) setProductNameEn(dataName.translatedText);
      }
      if (productDescDe) {
        const resDesc = await fetch('/api/translate', { method: 'POST', headers, body: JSON.stringify({ text: productDescDe, targetLang: 'en' }) });
        const dataDesc = await resDesc.json();
        if (dataDesc.translatedText) setProductDescEn(dataDesc.translatedText);
      }
    } catch (e) {} finally { setIsTranslatingProduct(false); }
  };

  const handleAddServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = serviceNameEn ? `${serviceNameDe} / ${serviceNameEn}` : serviceNameDe;
    await addService({ name: finalName, price: servicePrice, durationMins: parseInt(serviceDuration) || 60 });
    setServiceNameDe(''); setServiceNameEn(''); setServicePrice(''); setServiceDuration('');
  };

  const handleAddProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = productNameEn ? `${productNameDe} / ${productNameEn}` : productNameDe;
    const finalDesc = productDescEn ? `${productDescDe} / ${productDescEn}` : productDescDe;
    const imageUri = productImage ? URL.createObjectURL(productImage) : 'https://images.unsplash.com/photo-1599305090598-fe179d501227?w=800&q=80';
    await addProduct({ name: finalName, price: productPrice, desc: finalDesc, image: imageUri, stockCount: parseInt(productStock) || 0 });
    setProductNameDe(''); setProductNameEn(''); setProductDescDe(''); setProductDescEn(''); setProductPrice(''); setProductStock('10'); setProductImage(null);
  };

  const handleSaveWalkIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetStylist = calendarStylist === 'Alle Stylisten' || calendarStylist === 'All Stylists' ? 'Egal (Wer frei ist)' : calendarStylist;
    await addAdminAppointment({
      userId: 'walk-in', name: walkInName, phone: 'Walk-In', services: [walkInService], totalDurationMins: parseInt(walkInDuration) || 60,
      stylist: targetStylist, date: calDate, time: walkInTime, status: 'confirmed', sendsms: false, usedReward: false
    } as any);
    setShowWalkInModal(false); setWalkInName(''); setWalkInService('Walk-In'); setWalkInDuration('60');
  };

  const handleAddStylistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stylistName) return;
    await addStylist({ name: stylistName, services: stylistServices });
    setStylistName('');
    setStylistServices([]);
  };

  const handleSaveDesign = () => {
    updateGeneralSettings({
      heroImage: heroImageInput,
      aboutImage: aboutImageInput,
      aboutTitleDe: aboutTitleDeInput,
      aboutTextDe: aboutTextDeInput,
      aboutTitleEn: aboutTitleEnInput,
      aboutTextEn: aboutTextEnInput,
    });
  };

  return (
    <div className="min-h-screen pt-28 md:pt-32 px-4 md:px-6 max-w-6xl mx-auto animate-in fade-in duration-500 pb-20 relative">
      
      {showWalkInModal && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="p-8 md:p-10 border rounded-sm shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-300 bg-[#111] border-white/20">
            <h3 className="text-2xl font-bold mb-6 uppercase text-[#d4af37]">{t.admin?.walkIn?.title || "Walk-In Hinzufügen"}</h3>
            <form onSubmit={handleSaveWalkIn} className="space-y-4">
               <div>
                 <label className="block text-xs uppercase text-gray-400 mb-2">{t.admin?.walkIn?.name || "Kundenname"}</label>
                 <input required type="text" value={walkInName} onChange={e=>setWalkInName(e.target.value)} className="w-full bg-black border border-white/20 p-4 rounded-sm text-white" />
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-xs uppercase text-gray-400 mb-2">{t.admin?.walkIn?.service || "Leistung"}</label>
                   <input required type="text" value={walkInService} onChange={e=>setWalkInService(e.target.value)} className="w-full bg-black border border-white/20 p-4 rounded-sm text-white" />
                 </div>
                 <div>
                   <label className="block text-xs uppercase text-gray-400 mb-2">{t.admin?.walkIn?.duration || "Dauer (Min)"}</label>
                   <input required type="number" value={walkInDuration} onChange={e=>setWalkInDuration(e.target.value)} className="w-full bg-black border border-white/20 p-4 rounded-sm text-white" />
                 </div>
               </div>
               <div className="flex gap-4 mt-8 pt-4">
                  <button type="button" onClick={() => setShowWalkInModal(false)} className="flex-1 py-4 uppercase text-xs font-bold text-gray-400 border border-gray-700 hover:text-white rounded-sm transition-colors">{t.admin?.walkIn?.cancel || "Abbrechen"}</button>
                  <button type="submit" className="flex-1 py-4 uppercase text-xs font-bold text-black rounded-sm transition-colors bg-[#d4af37] hover:bg-white">{t.admin?.walkIn?.saveBtn || "Speichern"}</button>
               </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 border-b border-gray-800 pb-4 gap-4">
        <h2 className={`text-2xl md:text-3xl font-bold uppercase tracking-widest ${primaryColor}`}>{t.admin?.title || 'Admin Control Panel'}</h2>
        <button onClick={() => { setWalkInTime('12:00'); setShowWalkInModal(true); }} className="bg-[#d4af37] text-black px-4 py-2 font-bold uppercase text-xs rounded-sm tracking-widest hover:bg-white transition-colors">{t.admin?.walkIn?.btn || '+ Walk-In'}</button>
      </div>

      <div className="grid grid-cols-3 gap-3 md:gap-4 mb-8">
         <div className="p-4 md:p-5 border border-white/10 rounded-sm bg-black/40">
            <p className="text-[9px] md:text-[10px] text-gray-500 uppercase tracking-widest">{t.admin?.analytics?.revenue || 'Umsatz Heute'}</p>
            <p className={`text-xl md:text-2xl font-bold mt-1 ${primaryColor}`}>{todayRevenue.toFixed(2).replace('.', ',')} €</p>
         </div>
         <div className="p-4 md:p-5 border border-white/10 rounded-sm bg-black/40">
            <p className="text-[9px] md:text-[10px] text-gray-500 uppercase tracking-widest">{t.admin?.analytics?.completed || 'Bestätigt (Heute)'}</p>
            <p className="text-xl md:text-2xl font-bold mt-1 text-white">{completedToday}</p>
         </div>
         <div className="p-4 md:p-5 border border-white/10 rounded-sm bg-black/40">
            <p className="text-[9px] md:text-[10px] text-gray-500 uppercase tracking-widest">{t.admin?.analytics?.upcoming || 'Ausstehend (Heute)'}</p>
            <p className="text-xl md:text-2xl font-bold mt-1 text-white">{upcomingToday}</p>
         </div>
      </div>

      <div className="flex gap-2 md:gap-4 mb-8 overflow-x-auto pb-2 custom-scrollbar">
        {[
          { id: 'appointments', label: t.admin?.tabs?.requests || 'Anfragen' },
          { id: 'calendar', label: t.admin?.tabs?.calendar || 'Kalender' },
          { id: 'clients', label: t.admin?.tabs?.clients || 'Kunden' },
          { id: 'waitlist', label: t.admin?.tabs?.waitlist || 'Warteliste' },
          { id: 'services', label: t.admin?.tabs?.services || 'Leistungen' },
          { id: 'products', label: t.admin?.tabs?.products || 'Produkte' },
          { id: 'team', label: t.admin?.tabs?.team || 'Team' },
          { id: 'settings', label: t.admin?.tabs?.settings || 'Einstellungen' }
        ].map((tb) => (
          <button key={tb.id} onClick={() => setTab(tb.id as any)} className={`px-5 py-3 uppercase tracking-widest text-[10px] md:text-xs font-bold rounded-sm transition-colors whitespace-nowrap ${tab === tb.id ? 'bg-[#d4af37] text-black' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
            {tb.label} {tb.id === 'appointments' && pendingAppts.length > 0 && <span className="ml-2 bg-red-500 text-white px-2 py-0.5 rounded-full">{pendingAppts.length}</span>}
          </button>
        ))}
      </div>

      {tab === 'team' && (
          <div className="grid lg:grid-cols-2 gap-8">
            <div className={`p-6 border rounded-sm ${bgBorder}`}>
              <h3 className="text-lg font-bold mb-4">{t.admin?.team?.title || 'Team & Stylisten'}</h3>
              <form onSubmit={handleAddStylistSubmit} className="space-y-4">
                 <div>
                   <label className="block text-xs uppercase text-gray-400 mb-1">{t.admin?.team?.name || 'Name des Stylisten'}</label>
                   <input required value={stylistName} onChange={e=>setStylistName(e.target.value)} type="text" className="w-full bg-black border border-white/20 p-4 rounded-sm text-white text-sm" />
                 </div>
                 <div>
                   <label className="block text-xs uppercase text-gray-400 mb-3">{t.admin?.team?.services || 'Spezialisierungen (Leistungen)'}</label>
                   <div className="max-h-48 overflow-y-auto pr-2 border border-white/10 p-3 bg-black/50 rounded-sm custom-scrollbar space-y-2">
                     {servicesDB.map((s: ServiceItem) => (
                        <label key={s.id} className="flex items-center gap-3 cursor-pointer">
                           <input type="checkbox" checked={stylistServices.includes(s.name)} onChange={(e) => {
                              if (e.target.checked) setStylistServices([...stylistServices, s.name]);
                              else setStylistServices(stylistServices.filter(n => n !== s.name));
                           }} className="accent-[#d4af37] w-4 h-4" />
                           <span className="text-sm">{s.name}</span>
                        </label>
                     ))}
                   </div>
                 </div>
                 <button type="submit" className="w-full py-4 font-bold uppercase text-sm text-black rounded-sm bg-[#d4af37]">{t.admin?.team?.saveBtn || 'Stylist speichern'}</button>
              </form>
            </div>
            <div className="space-y-3">
               {stylistsDB.map(s => (
                  <div key={s.id} className={`p-5 flex justify-between items-center border rounded-sm ${bgBorder}`}>
                    <div>
                      <p className="font-bold text-lg text-[#d4af37]">{s.name}</p>
                      <p className="text-xs text-gray-400 mt-1">{s.services.length > 0 ? s.services.join(', ') : 'Alle Leistungen'}</p>
                    </div>
                    <button onClick={() => deleteStylist(s.id)} className="text-red-400 text-xs uppercase font-bold hover:underline">{t.admin?.team?.deleteBtn || 'Löschen'}</button>
                  </div>
               ))}
            </div>
          </div>
        )}

        {tab === 'settings' && (
          <div className="grid lg:grid-cols-2 gap-8">
            <div className={`p-6 border rounded-sm ${bgBorder}`}>
              <h3 className="text-lg font-bold mb-4">{t.admin?.settings?.title || 'Allgemeine Einstellungen'}</h3>
              
              <div className="mb-8">
                <label className="block text-xs uppercase text-gray-400 mb-2">{t.admin?.settings?.walkin || 'Live-Wartezeit für Walk-ins'}</label>
                <div className="flex gap-2">
                  <input value={walkinWaitTimeInput} onChange={e=>setWalkinWaitTimeInput(e.target.value)} type="text" placeholder={t.admin?.settings?.walkinPlaceholder || 'z.B. ca. 30 Minuten, Ausgebucht...'} className="flex-1 bg-black border border-white/20 p-3 rounded-sm text-white text-sm" />
                  <button onClick={() => updateGeneralSettings({ walkinWaitTime: walkinWaitTimeInput })} className="px-6 py-3 font-bold uppercase text-xs rounded-sm bg-[#d4af37] text-black hover:bg-white transition-colors">{t.admin?.settings?.saveWalkin || 'Update'}</button>
                </div>
              </div>

              <div>
                 <h4 className="text-md font-bold mb-3 text-red-400">{t.admin?.settings?.holidays || 'Geschlossene Tage (Urlaub / Feiertage)'}</h4>
                 <div className="flex gap-2 mb-4">
                    <input type="date" value={holidayInput} onChange={e=>setHolidayInput(e.target.value)} className="flex-1 bg-black border border-white/20 p-3 rounded-sm text-white text-sm" />
                    <button onClick={() => { 
                       if(holidayInput && !generalSettings.holidays.includes(holidayInput)) {
                          updateGeneralSettings({ holidays: [...generalSettings.holidays, holidayInput] });
                          setHolidayInput('');
                       }
                    }} className="px-6 py-3 font-bold uppercase text-xs rounded-sm bg-white/10 text-white hover:bg-white hover:text-black transition-colors">{t.admin?.settings?.addHoliday || 'Blockieren'}</button>
                 </div>
                 <div className="space-y-2">
                    {generalSettings.holidays.sort().map(h => (
                       <div key={h} className="flex justify-between items-center p-3 bg-black/40 border border-white/10 rounded-sm">
                          <span className="font-bold text-white">{h}</span>
                          <button onClick={() => updateGeneralSettings({ holidays: generalSettings.holidays.filter(day => day !== h) })} className="text-red-400 text-xs font-bold uppercase hover:underline">X</button>
                       </div>
                    ))}
                    {generalSettings.holidays.length === 0 && <p className="text-xs text-gray-500 italic">Keine Feiertage konfiguriert.</p>}
                 </div>
              </div>

              {/* Homepage Design Settings */}
              <div className="border-t border-gray-800 pt-8 mt-8">
                  <h4 className="text-md font-bold mb-4 text-[#d4af37]">{t.admin?.settings?.designTitle || 'Homepage Design & Texte'}</h4>
                  <div className="space-y-4">
                      <div>
                          <label className="block text-xs uppercase text-gray-400 mb-1">{t.admin?.settings?.heroImg || 'Hero Hintergrundbild (URL)'}</label>
                          <input value={heroImageInput} onChange={e=>setHeroImageInput(e.target.value)} type="text" className="w-full bg-black border border-white/20 p-3 rounded-sm text-white text-sm" />
                      </div>
                      <div>
                          <label className="block text-xs uppercase text-gray-400 mb-1">{t.admin?.settings?.aboutImg || 'Profilbild (URL)'}</label>
                          <input value={aboutImageInput} onChange={e=>setAboutImageInput(e.target.value)} type="text" className="w-full bg-black border border-white/20 p-3 rounded-sm text-white text-sm" />
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs uppercase text-gray-400 mb-1">{t.admin?.settings?.aboutTitleDe || 'Titel (Deutsch)'}</label>
                              <input value={aboutTitleDeInput} onChange={e=>setAboutTitleDeInput(e.target.value)} type="text" className="w-full bg-black border border-white/20 p-3 rounded-sm text-white text-sm" />
                          </div>
                          <div>
                              <label className="block text-xs uppercase text-gray-400 mb-1">{t.admin?.settings?.aboutTitleEn || 'Titel (Englisch)'}</label>
                              <input value={aboutTitleEnInput} onChange={e=>setAboutTitleEnInput(e.target.value)} type="text" className="w-full bg-black border border-white/20 p-3 rounded-sm text-white text-sm" />
                          </div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs uppercase text-gray-400 mb-1">{t.admin?.settings?.aboutTextDe || 'Beschreibung (Deutsch - max. 400 Zeichen)'}</label>
                              <textarea maxLength={400} value={aboutTextDeInput} onChange={e=>setAboutTextDeInput(e.target.value)} rows={4} className="w-full bg-black border border-white/20 p-3 rounded-sm text-white text-sm" />
                          </div>
                          <div>
                              <label className="block text-xs uppercase text-gray-400 mb-1">{t.admin?.settings?.aboutTextEn || 'Beschreibung (Englisch - max. 400 Zeichen)'}</label>
                              <textarea maxLength={400} value={aboutTextEnInput} onChange={e=>setAboutTextEnInput(e.target.value)} rows={4} className="w-full bg-black border border-white/20 p-3 rounded-sm text-white text-sm" />
                          </div>
                      </div>
                      <button type="button" onClick={handleSaveDesign} className="w-full px-6 py-4 font-bold uppercase text-xs rounded-sm bg-white/10 text-white hover:bg-white hover:text-black transition-colors">{t.admin?.settings?.saveDesign || 'Design speichern'}</button>
                  </div>
              </div>

            </div>
          </div>
        )}

      {tab === 'waitlist' && (
        <div className={`p-6 border rounded-sm ${bgBorder}`}>
          <h3 className="text-lg font-bold mb-6">{t.admin?.waitlist?.title || 'Warteliste'}</h3>
          <div className="space-y-4">
            {waitlist.length === 0 ? <p className="text-gray-500 text-sm">{t.admin?.waitlist?.empty || 'Warteliste ist leer.'}</p> : 
              waitlist.sort((a,b) => b.createdAt - a.createdAt).map(w => (
                <div key={w.id} className="p-5 border border-white/10 rounded-sm bg-black/40 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <p className="font-bold text-[#d4af37] text-lg">{w.name} <span className="text-sm text-gray-400 font-normal">({w.phone})</span></p>
                    <p className="text-sm text-white mt-1">Wunschdatum: {w.date} • Stylist: {w.stylist}</p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Eingetragen am: {new Date(w.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                    <button onClick={() => notifyWaitlist(w)} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 text-xs font-bold uppercase rounded-sm transition-colors w-full md:w-auto">{t.admin?.waitlist?.notifyBtn || 'Kunde Benachrichtigen'}</button>
                    <button onClick={() => removeFromWaitlist(w.id)} className="border border-red-600 text-red-400 hover:bg-red-600 hover:text-white px-4 py-2 text-xs font-bold uppercase rounded-sm transition-colors w-full md:w-auto">{t.admin?.waitlist?.removeBtn || 'Entfernen'}</button>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      )}

      {tab === 'clients' && (
        <div className={`p-6 border rounded-sm ${bgBorder}`}>
           <div className="mb-6">
             <input type="text" placeholder={t.admin?.clients?.search || 'Kunde nach Name oder Telefon suchen...'} onChange={(e) => setSearchClient(e.target.value)} className="w-full bg-black border border-white/20 p-4 rounded-sm text-white text-sm" />
           </div>
           <div className="space-y-4">
             {usersDB.filter(u => (u.name || '').toLowerCase().includes((searchClient || '').toLowerCase()) || (u.phone || '').includes(searchClient)).map(u => (
                <div key={u.id} className="p-5 border border-white/10 rounded-sm bg-black/40">
                   <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="font-bold text-lg text-[#d4af37]">{u.name}</p>
                        <p className="text-sm text-gray-400">{u.email} • {u.phone || 'Keine Nummer'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase tracking-widest text-gray-500">Treuepunkte</p>
                        <p className="font-bold text-xl">{u.haircutCount}</p>
                      </div>
                   </div>
                   <div className="flex gap-3 mt-4 pt-4 border-t border-white/5">
                     <textarea value={editingClientNotes[`user_${u.id}`] !== undefined ? editingClientNotes[`user_${u.id}`] : (u.stylistNotes || '')} onChange={(e) => setEditingClientNotes({...editingClientNotes, [`user_${u.id}`]: e.target.value})} placeholder={t.admin?.clients?.notes || 'Stylisten-Notizen (z.B. Haarfarbe, Formel...)'} rows={2} className="flex-1 bg-black border border-white/20 p-3 rounded-sm text-sm text-white" />
                     <button onClick={() => updateUserNotes(u.id, editingClientNotes[`user_${u.id}`] !== undefined ? editingClientNotes[`user_${u.id}`] : (u.stylistNotes || ''))} className="px-6 py-3 font-bold uppercase text-xs rounded-sm bg-white/10 hover:bg-[#d4af37] hover:text-black text-white transition-colors">{t.admin?.clients?.saveNotes || 'Speichern'}</button>
                   </div>
                </div>
             ))}
           </div>
        </div>
      )}

      {tab === 'calendar' && (
        <div className={`p-6 border rounded-sm ${bgBorder}`}>
           
           {/* Stylist Tabs inside Calendar */}
           <div className="flex gap-2 mb-6 overflow-x-auto custom-scrollbar">
             {[t.admin?.calendar?.allStylists || 'Alle Stylisten', ...(stylistsDB.length > 0 ? stylistsDB.map(s => s.name) : ['Rebo (Inhaber)', 'Anna', 'Marcus'])].map(opt => (
                <button 
                  key={opt} 
                  onClick={() => setCalendarStylist(opt)} 
                  className={`px-4 py-2 text-xs font-bold uppercase rounded-sm border whitespace-nowrap transition-colors ${calendarStylist === opt ? 'bg-[#d4af37] text-black border-[#d4af37]' : 'border-white/20 text-gray-400 hover:text-white hover:bg-white/5'}`}
                >
                   {opt}
                </button>
             ))}
           </div>

           <div className="flex justify-between items-center mb-8">
              <button onClick={() => shiftDate(-1)} className="px-4 py-2 border border-white/20 hover:bg-white/5 rounded-sm">&larr; {t.admin?.calendar?.back || 'Zurück'}</button>
              <input type="date" value={calDate} onChange={e=>setCalDate(e.target.value)} className="bg-black border border-white/20 p-2 rounded-sm text-center font-bold" />
              <button onClick={() => shiftDate(1)} className="px-4 py-2 border border-white/20 hover:bg-white/5 rounded-sm">{t.admin?.calendar?.next || 'Weiter'} &rarr;</button>
           </div>

           <div className="space-y-4">
             {initialSlots.map((slot: TimeSlot) => {
                const apptsInSlot = appointments.filter((a: any) => {
                   if (a.date !== calDate || a.time !== slot.time || a.status === 'cancelled') return false;
                   if (calendarStylist === 'Alle Stylisten' || calendarStylist === 'All Stylists') return true;
                   return a.stylist === calendarStylist || a.stylist === 'Egal (Wer frei ist)' || a.stylist === 'Any';
                });
                return (
                  <div key={slot.id} className="flex gap-4 p-4 border border-white/10 rounded-sm bg-black/40">
                     <div className="w-20 pt-1">
                        <p className={`font-bold text-lg ${primaryColor}`}>{slot.time}</p>
                     </div>
                     <div className="flex-1 space-y-2">
                        {apptsInSlot.length === 0 ? (
                           <div className="flex justify-between items-center w-full pt-1">
                              <p className="text-gray-600 text-sm italic">{t.admin?.calendar?.freeSlot || 'Freier Slot'}</p>
                              <div className="flex gap-2">
                                <button onClick={() => { setWalkInTime(slot.time); setShowWalkInModal(true); }} className="text-[#d4af37] hover:text-white text-[10px] uppercase border border-[#d4af37]/30 px-2 py-1 rounded-sm transition-colors">{t.admin?.walkIn?.btn || '+ Walk-In'}</button>
                                <button onClick={() => addAdminAppointment({ userId: 'block', name: 'GESPERRT', phone: '-', services: ['Block'], totalDurationMins: 60, stylist: calendarStylist === 'Alle Stylisten' || calendarStylist === 'All Stylists' ? 'Egal (Wer frei ist)' : calendarStylist, date: calDate, time: slot.time, status: 'blocked', sendsms: false, usedReward: false } as any)} className="text-gray-500 hover:text-white text-[10px] uppercase border border-gray-700 px-2 py-1 rounded-sm transition-colors">{t.admin?.calendar?.blockBtn || 'Blockieren'}</button>
                              </div>
                           </div>
                        ) : null}
                        
                        {apptsInSlot.map((a: any) => {
                           if (a.status === 'blocked') {
                             return (
                               <div key={a.id} className="p-4 border border-gray-600/50 bg-gray-800/30 rounded-sm flex justify-between items-center">
                                  <span className="text-gray-400 font-bold uppercase text-xs tracking-widest">Gesperrt / Blocked</span>
                                  <button onClick={() => updateAppointmentStatus(a.id, 'cancelled', false)} className="text-red-400 text-[10px] uppercase hover:underline font-bold tracking-widest">{t.admin?.calendar?.unblockBtn || 'Freigeben'}</button>
                               </div>
                             );
                           }
                           const sList = Array.isArray(a.services) ? a.services.join(', ') : (a as any).service || 'Leistung';
                           return (
                              <div key={a.id} className={`p-4 border rounded-sm ${a.status === 'confirmed' ? 'border-green-500/30 bg-green-500/10' : 'border-yellow-500/30 bg-yellow-500/10'}`}>
                                 <p className="font-bold">
                                   {a.name} <span className="text-xs font-normal text-gray-400 ml-2">({a.phone})</span>
                                   {a.isGroup && <span className="ml-2 text-[10px] uppercase bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-sm">{t.admin?.requests?.groupBadge || "👥 Gruppe"}</span>}
                                 </p>
                                 <p className="text-sm text-gray-300 mt-1">{sList} — {a.totalDurationMins || 60} {t.services?.min || 'Min'}</p>
                                 <span className="text-[10px] uppercase font-bold text-gray-500 mt-2 block">{t.booking?.stylist || 'Stylist'}: {a.stylist} • {t.admin?.requests?.status || 'Status'}: {a.status === 'confirmed' ? (t.profile?.completed || 'Abgeschlossen') : a.status === 'pending' ? (t.profile?.pending || 'Ausstehend') : a.status === 'cancelled' ? (t.profile?.cancel || 'Stornieren') : a.status}</span>
                              </div>
                           );
                        })}
                     </div>
                  </div>
                )
             })}
           </div>
        </div>
      )}

      {tab === 'appointments' && (
        <div className="space-y-12">
          {/* PENDING APPROVALS */}
          <div className="p-4 md:p-6 border rounded-sm border-red-500/30 bg-red-500/5">
            <h3 className="text-lg md:text-xl font-bold mb-6 text-red-400 flex items-center gap-2">
              <svg className="w-5 h-5 animate-pulse" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a8 8 0 100 16 8 8 0 000-16zM9 5h2v6H9V5zm0 8h2v2H9v-2z"/></svg> 
              {t.admin?.requests?.pending || 'Ausstehende Anfragen'} ({pendingAppts.length})
            </h3>
            <div className="space-y-4">
              {pendingAppts.map((a: any) => {
                const sList = Array.isArray(a.services) ? a.services.join(', ') : (a as any).service || 'Leistung';
                return (
                  <div key={a.id} className="bg-black/80 p-5 border border-red-500/20 rounded-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-lg">
                          {a.name} <span className="text-sm font-normal text-gray-400">({a.phone})</span>
                          {a.isGroup && <span className="ml-2 text-[10px] uppercase bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-sm">{t.admin?.requests?.groupBadge || "👥 Gruppe"}</span>}
                        </p>
                        <p className="text-sm text-gray-300 my-1"><span className="text-red-400 font-bold">{a.date} @ {a.time}</span> ({a.totalDurationMins || 60} {t.services?.min || 'Min'})</p>
                        <p className="text-sm text-gray-400">{t.admin?.requests?.services || 'Leistungen:'} {sList}</p>
                        
                        {a.guests && a.guests.length > 0 && (
                          <div className="mt-3 p-3 bg-white/5 border border-white/10 rounded-sm">
                            <p className="text-xs uppercase font-bold text-gray-500 mb-2">Weitere Personen ({a.guests.length})</p>
                            {a.guests.map((g: any, i: number) => (
                              <div key={i} className="text-sm text-gray-300 mb-2 last:mb-0">
                                <span className="font-bold text-white">{g.name}</span> (Alter: {g.age}) {g.phone && `• Tel: ${g.phone}`} <br/>
                                <span className="text-xs text-gray-400">Stylist: {g.stylist} • Service: {g.service}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {a.specialRequests && <p className="text-sm text-yellow-400 mt-2"><strong>Wünsche:</strong> {a.specialRequests}</p>}
                        {a.referenceImage && (
                          <div className="mt-3">
                             <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">{t.admin?.requests?.refImage || 'Referenzbild:'}</p>
                             <img src={a.referenceImage} alt="Ref" className="h-24 rounded-sm border border-white/10" />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <button onClick={() => updateAppointmentStatus(a.id, 'confirmed', a.sendsms)} className="bg-green-600 text-white px-4 py-2 text-xs font-bold uppercase rounded-sm hover:bg-green-500">{t.admin?.requests?.confirmBtn || 'Bestätigen'}</button>
                        <button onClick={() => updateAppointmentStatus(a.id, 'cancelled', false)} className="border border-red-600 text-red-400 px-4 py-2 text-xs font-bold uppercase rounded-sm hover:bg-red-900/30">{t.admin?.requests?.rejectBtn || 'Ablehnen'}</button>
                      </div>
                    </div>
                    {/* Admin Reschedule block for Pending */}
                    <div className="mt-4 pt-4 border-t border-red-500/20">
                      <p className="text-[10px] uppercase text-gray-500 mb-2">{t.admin?.requests?.reschedule || 'Termin verschieben (Neuer Vorschlag)'}</p>
                      <div className="flex gap-2">
                        <input type="date" onChange={(e) => setRescheduleData({...rescheduleData, [a.id]: {...rescheduleData[a.id], date: e.target.value}})} className="bg-black border border-white/20 p-2 text-xs rounded-sm text-white flex-1" />
                        <input type="time" onChange={(e) => setRescheduleData({...rescheduleData, [a.id]: {...rescheduleData[a.id], time: e.target.value}})} className="bg-black border border-white/20 p-2 text-xs rounded-sm text-white flex-1" />
                        <button onClick={() => updateAppointmentStatus(a.id, 'proposed', true, undefined, rescheduleData[a.id]?.date, rescheduleData[a.id]?.time)} className="bg-blue-600 text-white px-3 py-2 text-xs font-bold uppercase rounded-sm hover:bg-blue-500">{t.admin?.requests?.proposeBtn || 'Vorschlagen'}</button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {pendingAppts.length === 0 && <p className="text-gray-500 text-sm py-2">{t.admin?.requests?.noPending || 'Keine neuen Anfragen.'}</p>}
            </div>
          </div>

          {/* ALLE ANDEREN TERMINE */}
          <div className={`p-4 md:p-6 border rounded-sm ${bgBorder}`}>
            <h3 className="text-lg md:text-xl font-bold mb-6">{t.admin?.requests?.confirmed || 'Bestätigt & Historie'}</h3>
            <div className="space-y-4">
              {otherAppts.map((a: any) => {
                const sList = Array.isArray(a.services) ? a.services.join(', ') : (a as any).service || 'Leistung';
                return (
                  <div key={a.id} className="bg-black/50 p-5 border border-white/10 rounded-sm">
                     <div className="flex flex-col md:flex-row justify-between gap-4">
                       <div>
                         <p className="font-bold text-lg">
                           {a.name} <span className="text-sm font-normal text-gray-400">({a.phone})</span>
                           {a.isGroup && <span className="ml-2 text-[10px] uppercase bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-sm">{t.admin?.requests?.groupBadge || "👥 Gruppe"}</span>}
                         </p>
                         <p className="text-sm text-gray-300">{sList} — {a.date} @ {a.time}</p>
                         <p className={`text-xs mt-2 font-bold uppercase ${a.status==='confirmed'?'text-green-400':a.status==='cancelled'?'text-red-400':'text-blue-400'}`}>{t.admin?.requests?.status || 'Status'}: {a.status === 'confirmed' ? (t.profile?.completed || 'Abgeschlossen') : a.status === 'pending' ? (t.profile?.pending || 'Ausstehend') : a.status === 'cancelled' ? (t.profile?.cancel || 'Stornieren') : a.status}</p>
                         
                         {a.guests && a.guests.length > 0 && (
                          <div className="mt-3 p-3 bg-white/5 border border-white/10 rounded-sm">
                            <p className="text-xs uppercase font-bold text-gray-500 mb-2">Weitere Personen ({a.guests.length})</p>
                            {a.guests.map((g: any, i: number) => (
                              <div key={i} className="text-sm text-gray-300 mb-2 last:mb-0">
                                <span className="font-bold text-white">{g.name}</span> (Alter: {g.age}) {g.phone && `• Tel: ${g.phone}`} <br/>
                                <span className="text-xs text-gray-400">Stylist: {g.stylist} • Service: {g.service}</span>
                              </div>
                            ))}
                          </div>
                        )}

                         {a.specialRequests && <p className="text-sm text-yellow-400 mt-2"><strong>Wünsche:</strong> {a.specialRequests}</p>}
                       </div>
                       {a.referenceImage && <img src={a.referenceImage} alt="Ref" className="h-16 w-16 object-cover rounded-sm border border-white/10" />}
                     </div>
                     
                     {a.status === 'confirmed' && (
                      <div className="mt-4 pt-4 border-t border-gray-800 space-y-4">
                        <div className="flex flex-wrap md:flex-nowrap gap-3">
                          <input type="text" value={editingNotes[a.id] !== undefined ? editingNotes[a.id] : (a.notes || '')} onChange={(e) => setEditingNotes({...editingNotes, [a.id]: e.target.value})} placeholder={t.admin?.requests?.notesPlaceholder || 'Interne Notizen (z.B. Skin fade #1...)'} className="w-full md:w-auto flex-1 bg-black border border-white/20 p-3 rounded-sm text-sm text-white" />
                          <button onClick={() => updateAppointmentStatus(a.id, 'confirmed', false, editingNotes[a.id])} className="w-full md:w-auto px-6 py-3 font-bold uppercase text-xs rounded-sm bg-[#d4af37] text-black">{t.admin?.requests?.saveNote || 'Notiz speichern'}</button>
                          
                          <button onClick={() => resendConfirmation(a.id)} className="w-full md:w-auto px-6 py-3 font-bold uppercase text-xs rounded-sm bg-blue-600/20 text-blue-400 border border-blue-600 hover:bg-blue-600 hover:text-white transition-colors">{t.admin?.requests?.resendBtn || 'Bestätigung neu senden'}</button>

                          <button onClick={() => updateAppointmentStatus(a.id, 'cancelled', false)} className="w-full md:w-auto px-6 py-3 font-bold uppercase text-xs rounded-sm bg-red-600/20 text-red-400 border border-red-600 hover:bg-red-600 hover:text-white transition-colors">{t.admin?.requests?.cancelBtn || 'Stornieren'}</button>
                        </div>
                        
                        <div className="flex gap-2 items-center bg-white/5 p-3 rounded-sm border border-white/10">
                          <span className="text-xs uppercase text-gray-400 font-bold">{t.admin?.requests?.move || 'Verschieben:'}</span>
                          <input type="date" onChange={(e) => setRescheduleData({...rescheduleData, [a.id]: {...rescheduleData[a.id], date: e.target.value}})} className="bg-black border border-white/20 p-2 text-xs rounded-sm text-white flex-1" />
                          <input type="time" onChange={(e) => setRescheduleData({...rescheduleData, [a.id]: {...rescheduleData[a.id], time: e.target.value}})} className="bg-black border border-white/20 p-2 text-xs rounded-sm text-white flex-1" />
                          <button onClick={() => updateAppointmentStatus(a.id, 'proposed', true, undefined, rescheduleData[a.id]?.date, rescheduleData[a.id]?.time)} className="bg-blue-600 text-white px-4 py-2 text-xs font-bold uppercase rounded-sm hover:bg-blue-500">{t.admin?.requests?.proposeClientBtn || 'Kunden Vorschlagen'}</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {tab === 'services' && (
        <div className="grid lg:grid-cols-2 gap-8">
          <div className={`p-6 border rounded-sm ${bgBorder}`}>
            <h3 className="text-lg font-bold mb-4">{t.admin?.services?.addTitle || 'Leistung hinzufügen'}</h3>
            <form onSubmit={handleAddServiceSubmit} className="space-y-4">
              <div>
                <label className="block text-xs uppercase text-gray-400 mb-1">{t.admin?.services?.nameDe || 'Name der Leistung (Deutsch)'}</label>
                <input required value={serviceNameDe} onChange={e => setServiceNameDe(e.target.value)} type="text" placeholder="z.B. Herrenschnitt & Bart" className="w-full bg-black border border-white/20 p-4 rounded-sm text-white text-sm" />
              </div>
              <button type="button" onClick={handleTranslateService} disabled={isTranslatingService || !serviceNameDe} className="w-full py-2 bg-blue-500/20 text-blue-400 border border-blue-500/40 text-xs font-bold uppercase tracking-widest rounded-sm hover:bg-blue-500 hover:text-white transition-colors disabled:opacity-50">
                {isTranslatingService ? (t.admin?.services?.translating || "Übersetzen...") : (t.admin?.services?.translateBtn || "✨ KI: Auf Englisch übersetzen")}
              </button>
              <div>
                <label className="block text-xs uppercase text-gray-400 mb-1">{t.admin?.services?.nameEn || 'Name (Englische Vorschau)'}</label>
                <input value={serviceNameEn} onChange={e => setServiceNameEn(e.target.value)} type="text" placeholder="e.g. Men's Cut & Beard" className="w-full bg-black border border-white/20 p-3 rounded-sm outline-none text-sm text-white" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase text-gray-400 mb-1">{t.admin?.services?.price || 'Preis (€)'}</label>
                  <input required value={servicePrice} onChange={e => setServicePrice(e.target.value)} type="text" placeholder="35 €" className="w-full bg-black border border-white/20 p-4 rounded-sm text-white text-sm" />
                </div>
                <div>
                  <label className="block text-xs uppercase text-gray-400 mb-1">{t.admin?.services?.duration || 'Dauer (Min)'}</label>
                  <input required value={serviceDuration} onChange={e => setServiceDuration(e.target.value)} type="number" placeholder="45" className="w-full bg-black border border-white/20 p-4 rounded-sm text-white text-sm" />
                </div>
              </div>
              <button type="submit" className="w-full py-4 font-bold uppercase text-sm text-black rounded-sm bg-[#d4af37]">{t.admin?.services?.saveBtn || 'In Datenbank speichern'}</button>
            </form>
          </div>
          <div className="space-y-3">
            {servicesDB.map((s: ServiceItem) => (
              <div key={s.id} className={`p-5 flex justify-between items-center border rounded-sm ${bgBorder}`}>
                <div>
                  <p className="font-bold">{s.name}</p>
                  <p className="text-xs text-gray-400 mt-1">⏱ {s.durationMins || 60} {t.services?.min || 'Minuten'}</p>
                </div>
                <div className="text-right">
                  <p className={primaryColor}>{s.price}</p>
                  <button onClick={() => deleteService(s.id)} className="text-red-400 text-xs uppercase font-bold mt-2 hover:underline">{t.admin?.services?.deleteBtn || 'Löschen'}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'products' && (
        <div className="grid lg:grid-cols-2 gap-8">
          <div className={`p-6 border rounded-sm ${bgBorder}`}>
            <h3 className="text-lg md:text-xl font-bold mb-4">{t.admin?.products?.addTitle || 'Produkt hinzufügen'}</h3>
            <form onSubmit={handleAddProductSubmit} className="space-y-4">
              <div>
                <label className="block text-xs uppercase text-gray-400 mb-1">{t.admin?.products?.nameDe || 'Produktname (Deutsch)'}</label>
                <input required value={productNameDe} onChange={e => setProductNameDe(e.target.value)} type="text" placeholder="z.B. Haarwachs" className="w-full bg-black border border-white/20 p-3 rounded-sm outline-none text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs uppercase text-gray-400 mb-1">{t.admin?.products?.descDe || 'Beschreibung (Deutsch)'}</label>
                <textarea required value={productDescDe} onChange={e => setProductDescDe(e.target.value)} rows={2} placeholder="z.B. Starker Halt für den ganzen Tag" className="w-full bg-black border border-white/20 p-3 rounded-sm outline-none text-sm text-white" />
              </div>
              <button type="button" onClick={handleTranslateProduct} disabled={isTranslatingProduct || (!productNameDe && !productDescDe)} className="w-full py-2 bg-blue-500/20 text-blue-400 border border-blue-500/40 text-xs font-bold uppercase tracking-widest rounded-sm hover:bg-blue-500 hover:text-white transition-colors disabled:opacity-50">
                {isTranslatingProduct ? (t.admin?.services?.translating || "Übersetzen...") : (t.admin?.services?.translateBtn || "✨ KI: Auf Englisch übersetzen")}
              </button>
              <div>
                <label className="block text-xs uppercase text-gray-400 mb-1">{t.admin?.products?.nameEn || 'Name (Englische Vorschau)'}</label>
                <input value={productNameEn} onChange={e => setProductNameEn(e.target.value)} type="text" placeholder="e.g. Hair Wax" className="w-full bg-black border border-white/20 p-3 rounded-sm outline-none text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs uppercase text-gray-400 mb-1">{t.admin?.products?.descEn || 'Beschreibung (Englische Vorschau)'}</label>
                <textarea value={productDescEn} onChange={e => setProductDescEn(e.target.value)} rows={2} placeholder="e.g. Strong hold for all day" className="w-full bg-black border border-white/20 p-3 rounded-sm outline-none text-sm text-white" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase text-gray-400 mb-1">{t.admin?.products?.price || 'Preis (€)'}</label>
                  <input required value={productPrice} onChange={e => setProductPrice(e.target.value)} type="text" placeholder="19,90 €" className="w-full bg-black border border-white/20 p-3 rounded-sm outline-none text-sm text-white" />
                </div>
                <div>
                  <label className="block text-xs uppercase text-gray-400 mb-1">{t.admin?.products?.initialStock || 'Anfangsbestand'}</label>
                  <input required value={productStock} onChange={e => setProductStock(e.target.value)} type="number" placeholder="10" className="w-full bg-black border border-white/20 p-3 rounded-sm outline-none text-sm text-white" />
                </div>
              </div>
              <div>
                 <label className="block text-xs text-gray-400 mb-1 uppercase">{t.admin?.products?.uploadImg || 'Produktbild hochladen'}</label>
                 <input type="file" accept="image/*" onChange={e => setProductImage(e.target.files?.[0] || null)} className="w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-3 file:rounded-sm file:border-0 file:bg-white/10 file:text-white" />
              </div>
              <button type="submit" className="w-full py-4 font-bold uppercase text-sm text-black rounded-sm bg-[#d4af37]">{t.admin?.products?.saveBtn || 'Produkt speichern'}</button>
            </form>
          </div>
          <div className="space-y-3">
            {productsDB.map((p: ProductItem) => (
              <div key={p.id} className={`p-4 flex justify-between items-center border rounded-sm ${bgBorder}`}>
                <div className="flex items-center gap-4">
                  <img src={p.image} alt={p.name} className="w-12 h-12 object-cover rounded-sm" />
                  <div>
                    <span className="text-sm md:text-base font-bold">{p.name}</span>
                    <p className="text-xs text-gray-400">{p.price}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-2 bg-black border border-white/10 p-1 rounded-sm">
                    <button onClick={() => updateProductStock(p.id, Math.max(0, (p.stockCount || 0) - 1))} className="w-6 h-6 flex items-center justify-center border border-white/10 hover:bg-white/10 rounded-sm">-</button>
                    <span className="text-xs font-bold w-6 text-center">{p.stockCount || 0}</span>
                    <button onClick={() => updateProductStock(p.id, (p.stockCount || 0) + 1)} className="w-6 h-6 flex items-center justify-center border border-white/10 hover:bg-white/10 rounded-sm">+</button>
                  </div>
                  <button onClick={() => deleteProduct(p.id)} className="text-red-400 text-[10px] uppercase tracking-widest font-bold hover:underline">{t.admin?.services?.deleteBtn || 'Löschen'}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// --- PUBLIC BOOKING VIEW ---
function BookingView() {
  const { t, currentUser, addAppointment, servicesDB, getAvailableSlots, addNotification, addToWaitlist, stylistsDB } = useApp();
  const addAppointmentTyped = addAppointment as (appt: Omit<Appointment, 'id'>) => Promise<import('firebase/firestore').DocumentReference | undefined>;
  const [submitted, setSubmitted] = useState(false);
  
  const [bookingName, setBookingName] = useState("");
  const [countryCode, setCountryCode] = useState("+49");
  const [phoneInput, setPhoneInput] = useState("");
  
  const [selectedServices, setSelectedServices] = useState<ServiceItem[]>([]);
  const [bookingDate, setBookingDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [stylist, setStylist] = useState(t.booking?.stylistAny || "Egal (Wer frei ist)");
  const [specialRequests, setSpecialRequests] = useState("");
  const [refImageFile, setRefImageFile] = useState<File | null>(null);
  const [refImagePreview, setRefImagePreview] = useState<string | null>(null);

  // Group Booking State
  const [guests, setGuests] = useState<Guest[]>([]);
  const [preferredTime, setPreferredTime] = useState("");
  
  const totalDuration = selectedServices.reduce((sum, s) => sum + (s.durationMins || 60), 0);
  const openSlots = getAvailableSlots(bookingDate, stylist, totalDuration);

  // Dynamic Stylist Filtering
  const availableStylists = stylistsDB && stylistsDB.length > 0 
      ? [t.booking?.stylistAny || "Egal (Wer frei ist)", ...stylistsDB.filter(s => {
          if (selectedServices.length === 0) return true;
          if (!s.services || s.services.length === 0) return true;
          return selectedServices.every(srv => s.services.includes(srv.name));
        }).map(s => s.name)]
      : t.booking.stylistOptions;

  useEffect(() => {
    if (currentUser) {
      setBookingName(currentUser.name || "");
      if (currentUser.phone) {
        let pNum = currentUser.phone; let cCode = "+49";
        for (let c of countryCodes) { if (pNum.startsWith(c.code)) { cCode = c.code; pNum = pNum.replace(c.code, "").trim(); break; } }
        setCountryCode(cCode); setPhoneInput(pNum);
      }
    }
  }, [currentUser]);

  const handleToggleService = (srv: ServiceItem) => {
    setSelectedSlot(""); 
    if (selectedServices.find(s => s.id === srv.id)) setSelectedServices(selectedServices.filter(s => s.id !== srv.id));
    else setSelectedServices([...selectedServices, srv]);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
    if (!allowedTypes.includes(file.type)) {
      addNotification('Nur JPEG, PNG, WEBP, HEIC/HEIF Dateien erlaubt', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      addNotification('Datei zu groß. Maximum 5MB', 'error');
      return;
    }
    
    setRefImageFile(file);
    const reader = new FileReader();
    reader.onload = (event) => { setRefImagePreview(event.target?.result as string); };
    reader.readAsDataURL(file);
  };

  const clearImageUpload = () => {
    setRefImageFile(null);
    setRefImagePreview(null);
  };

  const addGuest = () => {
    setGuests([...guests, { id: Date.now().toString(), name: '', age: '', phone: '', service: servicesDB[0]?.name || '', stylist: availableStylists[0] }]);
  };

  const removeGuest = (id: string) => {
    setGuests(guests.filter(g => g.id !== id));
  };

  const updateGuest = (id: string, field: keyof Guest, value: string) => {
    setGuests(guests.map(g => g.id === id ? { ...g, [field]: value } : g));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || selectedServices.length === 0) return;
    
    // If it's a normal booking, ensure a slot is selected. If it's a group booking, ensure a preferred time is entered.
    if (guests.length === 0 && !selectedSlot) return;
    if (guests.length > 0 && !preferredTime) {
      addNotification("Bitte Wunschuhrzeit angeben.", "error");
      return;
    }

    const fullPhone = `${countryCode}${phoneInput}`.replace(/\s+/g, '');
    if (fullPhone !== currentUser.phone || bookingName !== currentUser.name) {
      await updateDoc(doc(db, 'users', currentUser.id), { phone: fullPhone, name: bookingName });
    }

    const appointmentRef = await addAppointmentTyped({
      userId: currentUser.id,
      name: bookingName, phone: fullPhone,
      services: selectedServices.map(s => s.name),
      totalDurationMins: totalDuration,
      stylist: stylist,
      date: bookingDate,
      time: guests.length > 0 ? preferredTime : (openSlots.find(s => s.id === selectedSlot)?.time || '00:00'),
      status: 'pending',
      specialRequests: specialRequests,
      sendsms: true, usedReward: false, isEmergency: false,
      referenceImage: '',
      isGroup: guests.length > 0,
      guests: guests.length > 0 ? guests : []
    } as any);

    if (refImageFile && appointmentRef?.id) {
      try {
        const downloadURL = await uploadReferenceImage(currentUser.id, appointmentRef.id, refImageFile);
        await updateDoc(doc(db, 'appointments', appointmentRef.id), { referenceImage: downloadURL });
      } catch (error) {
        console.error('Failed to upload reference image:', error);
        addNotification('Referenzbild konnte nicht hochgeladen werden', 'error');
      }
    }

    clearImageUpload();
    setSpecialRequests("");
    setGuests([]);
    setPreferredTime("");
    setSubmitted(true);
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen pt-20">
      <div className="w-full lg:w-1/2 relative h-[30vh] lg:h-auto min-h-64">
        <div className="absolute inset-0 bg-black/40 z-10" />
        <img src="https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=1600&q=80" alt="Salon" className="w-full h-full object-cover grayscale-30" />
        <div className="absolute inset-0 z-20 flex items-center justify-center p-6 md:p-12">
           <h2 className="text-3xl md:text-5xl font-bold text-center leading-tight max-w-md mx-auto text-white uppercase tracking-tighter">
             &quot;{t.booking.quote}&quot;
           </h2>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center px-4 md:px-8 py-10 overflow-y-auto custom-scrollbar">
        <div className="w-full max-w-xl animate-in fade-in slide-in-from-right-8 duration-1000">
          <div className="mb-8 text-left">
             <h2 className="text-3xl font-bold mb-2 uppercase tracking-tight">{t.booking.title}</h2>
             <p className="text-gray-400 text-sm">{t.booking.subtitle}</p>
          </div>

          {submitted ? (
            <div className="p-8 border rounded-sm text-center border-[#d4af37] bg-[#d4af37]/10 text-[#d4af37]">
              <p className="font-semibold text-lg mb-6">{t.booking.success}</p>
              <button onClick={() => { setSubmitted(false); setSelectedServices([]); }} className="text-xs uppercase font-bold underline">{t.booking?.bookNew || "Neuen Termin anfragen"}</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6 p-6 md:p-8 border rounded-sm shadow-2xl bg-[#111] border-white/10">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs uppercase text-gray-400 mb-2">{t.booking.name}</label>
                  <input required value={bookingName} onChange={e=>setBookingName(e.target.value)} type="text" className="w-full bg-black border border-white/20 p-4 rounded-sm text-white" />
                </div>
                <div>
                  <label className="block text-xs uppercase text-gray-400 mb-2">{t.booking.phone}</label>
                  <div className="flex gap-2">
                    <select value={countryCode} onChange={e=>setCountryCode(e.target.value)} className="w-[35%] bg-black border border-white/20 p-4 rounded-sm text-white">
                      {countryCodes.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                    </select>
                    <input required value={phoneInput} onChange={e=>setPhoneInput(e.target.value)} type="tel" className="w-[65%] bg-black border border-white/20 p-4 rounded-sm text-white" />
                  </div>
                </div>
              </div>

              <div>
                 <label className="block text-xs uppercase text-gray-400 mb-3">{t.booking.service}</label>
                 <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2 border border-white/10 p-3 bg-black/50 rounded-sm custom-scrollbar">
                   {servicesDB.map((s: ServiceItem) => {
                     const isSelected = selectedServices.find(x => x.id === s.id);
                     return (
                        <div key={s.id} onClick={() => handleToggleService(s)} className={`cursor-pointer border p-3 flex justify-between items-center rounded-sm transition-colors ${isSelected ? 'border-[#d4af37] bg-[#d4af37]/10' : 'border-white/10 hover:border-white/30'}`}>
                           <div>
                              <p className={`font-bold text-sm ${isSelected ? 'text-[#d4af37]' : 'text-white'}`}>{s.name}</p>
                              <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest">⏱ {s.durationMins || 60} {t.services?.min || 'Minuten'}</p>
                           </div>
                           <p className="text-sm font-bold">{s.price}</p>
                        </div>
                     )
                   })}
                 </div>
                 {selectedServices.length > 0 && <p className="text-xs text-right mt-2 text-gray-400">{t.booking?.totalDuration || "Gesamtdauer:"} <strong className="text-white">{totalDuration} {t.services?.min || 'Minuten'}</strong></p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs uppercase text-gray-400 mb-2">{t.booking.stylist}</label>
                  <select value={stylist} onChange={e=>{setStylist(e.target.value); setSelectedSlot("");}} className="w-full bg-black border border-white/20 p-4 rounded-sm text-white">
                    {availableStylists.map((opt: string, i: number) => <option key={i} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div>
                    <label className="block text-xs uppercase text-gray-400 mb-2">{t.booking?.refImage || "Referenzbild (Optional)"}</label>
                    {refImagePreview ? (
                      <div className="relative group">
                        <img src={refImagePreview} alt="Preview" className="w-24 h-24 object-cover rounded-sm border border-white/20 mb-2" />
                        <button
                          type="button"
                          onClick={clearImageUpload}
                          className="absolute top-2 right-2 p-1 bg-red-500/80 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="w-full text-xs text-gray-400 file:mr-4 file:py-3 file:px-4 file:rounded-sm file:border-0 file:bg-white/10 file:text-white bg-black border border-white/20 p-1 rounded-sm"
                      />
                    )}
                  </div>
              </div>

              {/* Group Booking Guests Expansion */}
              <div className="pt-4 border-t border-gray-800">
                 {guests.map((g, index) => (
                    <div key={g.id} className="p-4 border border-white/10 bg-black/40 rounded-sm space-y-4 relative mb-4 animate-in fade-in">
                       <button type="button" onClick={() => removeGuest(g.id)} className="absolute top-2 right-2 text-red-500 hover:text-red-400 text-xs font-bold px-2 py-1">✕</button>
                       <p className="text-xs font-bold text-[#d4af37] uppercase tracking-widest">Person {index + 2}</p>
                       
                       <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] uppercase text-gray-500 mb-1">{t.booking?.guestName || "Name"}</label>
                            <input required placeholder="Name" value={g.name} onChange={e => updateGuest(g.id, 'name', e.target.value)} className="w-full bg-black border border-white/20 p-3 rounded-sm text-white text-xs" />
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase text-gray-500 mb-1">{t.booking?.guestAge || "Alter"}</label>
                            <input required type="number" placeholder="Alter" value={g.age} onChange={e => updateGuest(g.id, 'age', e.target.value)} className="w-full bg-black border border-white/20 p-3 rounded-sm text-white text-xs" />
                          </div>
                       </div>

                       {parseInt(g.age) >= 14 && (
                          <div>
                             <label className="block text-[10px] uppercase text-gray-500 mb-1">{t.booking?.guestPhone || "Telefon (für ab 14 J.)"}</label>
                             <input placeholder="Optional" value={g.phone} onChange={e => updateGuest(g.id, 'phone', e.target.value)} className="w-full bg-black border border-white/20 p-3 rounded-sm text-white text-xs" />
                          </div>
                       )}

                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] uppercase text-gray-500 mb-1">{t.booking.service}</label>
                            <select value={g.service} onChange={e => updateGuest(g.id, 'service', e.target.value)} className="w-full bg-black border border-white/20 p-3 rounded-sm text-white text-xs">
                               <option value="" disabled>Service wählen</option>
                               {servicesDB.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase text-gray-500 mb-1">{t.booking.stylist}</label>
                            <select value={g.stylist} onChange={e => updateGuest(g.id, 'stylist', e.target.value)} className="w-full bg-black border border-white/20 p-3 rounded-sm text-white text-xs">
                               {availableStylists.map((opt: string, i: number) => <option key={i} value={opt}>{opt}</option>)}
                            </select>
                          </div>
                       </div>
                    </div>
                 ))}
                 
                 <button type="button" onClick={addGuest} className="text-xs text-[#d4af37] font-bold uppercase hover:text-white transition-colors border border-[#d4af37]/30 border-dashed w-full py-3 rounded-sm bg-[#d4af37]/5">
                   {t.booking?.addGuest || "+ Person / Kind hinzufügen"}
                 </button>
              </div>

              <div>
                <label className="block text-xs uppercase text-gray-400 mb-2">{t.booking?.requestsLabel || "Besondere Wünsche / Notizen (Optional)"}</label>
                <textarea value={specialRequests} onChange={e=>setSpecialRequests(e.target.value)} rows={2} className="w-full bg-black border border-white/20 p-4 rounded-sm text-white" />
              </div>

              <div>
                <label className="block text-xs uppercase text-gray-400 mb-3">{t.booking.date} {guests.length === 0 && `& ${t.booking.time}`} *</label>
                <div className="flex flex-col sm:flex-row gap-4">
                  <input required type="date" value={bookingDate} onChange={e=>{setBookingDate(e.target.value); setSelectedSlot("");}} className="sm:w-[40%] bg-black border border-white/20 p-4 rounded-sm text-white" />
                  
                  {bookingDate ? (
                    <div className="flex flex-col flex-1 gap-4">
                      
                      {guests.length > 0 ? (
                        <div className="p-4 border border-blue-500/30 bg-blue-500/10 rounded-sm animate-in fade-in">
                          <p className="text-sm font-bold text-blue-400 mb-2">👥 Gruppenanfrage</p>
                          <p className="text-xs text-gray-300 mb-4">{t.booking?.groupNotice || "Gruppenbuchungen werden manuell geprüft. Sende uns deine Wunschanfrage!"}</p>
                          <label className="block text-[10px] uppercase text-gray-400 mb-1">{t.booking?.prefTime || "Wunschuhrzeit"}</label>
                          <input required type="time" value={preferredTime} onChange={e => setPreferredTime(e.target.value)} className="w-full bg-black border border-white/20 p-3 rounded-sm text-white" />
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-2">
                          {openSlots.map((slot: TimeSlot) => (
                            <button key={slot.id} type="button" disabled={slot.isBooked} onClick={() => setSelectedSlot(slot.id)}
                              className={`py-3 rounded-sm border text-xs font-bold transition-colors ${slot.isBooked ? 'opacity-20 cursor-not-allowed' : selectedSlot === slot.id ? 'bg-[#d4af37] text-black border-[#d4af37]' : 'border-white/20 text-gray-300 hover:bg-white/5'}`}
                            >
                              {slot.time}
                            </button>
                          ))}
                        </div>
                      )}
                      
                      {guests.length === 0 && (
                        <div className="p-4 border border-white/10 bg-black/40 rounded-sm text-center">
                          <p className="text-xs text-gray-400 mb-2">{t.booking?.waitlistLabel || "Kein passender Termin?"}</p>
                          <button type="button" onClick={async () => {
                            if(!currentUser || !bookingName || !phoneInput) return addNotification("Bitte füllen Sie Name und Telefon aus.", "error");
                            const fullPhone = `${countryCode}${phoneInput}`.replace(/\s+/g, '');
                            await addToWaitlist({ userId: currentUser.id, name: bookingName, phone: fullPhone, date: bookingDate, stylist });
                          }} className="w-full px-4 py-3 border border-[#d4af37] text-[#d4af37] text-xs font-bold uppercase tracking-widest rounded-sm hover:bg-[#d4af37] hover:text-black transition-colors">{t.booking?.joinWaitlistBtn || "Warteliste beitreten"}</button>
                        </div>
                      )}

                    </div>
                  ) : (
                    <div className="flex-1 border border-dashed border-white/10 flex items-center justify-center p-4 rounded-sm"><p className="text-xs text-gray-500">{t.booking?.pickDateFirst || "Wählen Sie zuerst ein Datum."}</p></div>
                  )}
                </div>
              </div>

              <button type="submit" disabled={(guests.length === 0 && !selectedSlot) || selectedServices.length === 0} className="w-full py-4 rounded-sm font-bold uppercase tracking-widest text-sm transition-all mt-6 disabled:opacity-50 bg-[#d4af37] text-black">
                {t.booking.submit}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function ContactView() {
  const { t } = useApp();

  return (
    <div className="flex flex-col lg:flex-row min-h-screen pt-20">
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12 pb-10 lg:py-24 overflow-y-auto">
        <div className="w-full max-w-md animate-in fade-in duration-700">
          <div className="mb-10 md:mb-12">
             <h2 className="text-4xl md:text-5xl font-bold mb-3 uppercase tracking-tight">{t.contact.title}</h2>
             <p className="tracking-[0.3em] uppercase text-xs md:text-sm text-[#d4af37]">{t.contact.subtitle}</p>
          </div>

          <div className="space-y-8 md:space-y-10">
            <div>
              <h3 className="text-xs uppercase text-gray-500 font-bold tracking-widest mb-2">{t.contact.addressLabel}</h3>
              <p className="text-base md:text-lg">{t.contact.address}</p>
            </div>
            <div>
              <h3 className="text-xs uppercase text-gray-500 font-bold tracking-widest mb-2">{t.contact.phoneLabel}</h3>
              <a href="tel:+4917642980985" className="text-lg md:text-xl font-bold hover:underline transition-all text-[#d4af37]">+49 176 42980985</a>
            </div>
            <div>
              <h3 className="text-xs uppercase text-gray-500 font-bold tracking-widest mb-4">{t.contact.hoursLabel}</h3>
              <ul className="space-y-3 text-sm md:text-base">
                {t.contact.hours.map((h: any, i: number) => (
                  <li key={i} className="flex justify-between border-b border-gray-800 pb-3">
                    <span className="text-gray-300">{h.days}</span>
                    <span className="font-medium">{h.time}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="pt-4">
               <h3 className="text-xs uppercase text-gray-500 font-bold tracking-widest mb-4">{t.contact.socialLabel}</h3>
               <div className="flex gap-4">
                 
                 {/* INSTAGRAM */}
                 <a href="https://www.instagram.com/rebo_salon/" target="_blank" rel="noopener noreferrer" className="w-14 h-14 flex items-center justify-center rounded-full border transition-all border-white/20 text-[#d4af37] hover:border-[#d4af37] hover:bg-[#d4af37] hover:text-black">
                   <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" /></svg>
                 </a>

                 {/* TIKTOK */}
                 <a href="https://www.tiktok.com/@rebo.salon" target="_blank" rel="noopener noreferrer" className="w-14 h-14 flex items-center justify-center rounded-full border transition-all border-white/20 text-[#d4af37] hover:border-[#d4af37] hover:bg-[#d4af37] hover:text-black">
                   <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/></svg>
                 </a>

                 {/* FACEBOOK */}
                 <a href="https://www.facebook.com/profile.php?id=61572606551232" target="_blank" rel="noopener noreferrer" className="w-14 h-14 flex items-center justify-center rounded-full border transition-all border-white/20 text-[#d4af37] hover:border-[#d4af37] hover:bg-[#d4af37] hover:text-black">
                   <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"/></svg>
                 </a>

               </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 h-[50vh] min-h-96 lg:min-h-0 lg:h-auto relative bg-gray-900 mt-8 lg:mt-0">
        <iframe 
          src="https://maps.google.com/maps?q=Rebo%20Salon,%20Manggasse%206,%2097421%20Schweinfurt,%20Germany&t=&z=16&ie=UTF8&iwloc=&output=embed" 
          className="absolute inset-0 w-full h-full"
          style={{ border: 0 }} 
          allowFullScreen 
          loading="lazy" 
          referrerPolicy="no-referrer-when-downgrade"
        ></iframe>
      </div>
    </div>
  );
}

// --- MAIN WRAPPER ---
function MainContent() {
  const { page, setPage, t, servicesDB, productsDB, currentUser, generalSettings, lang } = useApp();

  return (
    <div className="relative min-h-screen flex flex-col bg-[#0a0a0a] text-white">
      <ToastContainer />
      
      {/* Top Navbar Actions */}
      <div className="fixed top-0 w-full z-50 p-4 flex justify-between items-center bg-linear-to-b from-black/80 to-transparent pointer-events-none">
         <div className="pointer-events-auto flex items-center">
            <LanguageSelector />
         </div>
         <div className="pointer-events-auto flex items-center">
            {currentUser && <NotificationBell />}
         </div>
      </div>
      
      <Navbar />

      <main className="grow">
        {page === 'admin' && <AdminView />}
        {page === 'auth' && <AuthView />}
        {page === 'profile' && <ProfileViewLocal />}
        {page === 'booking' && <BookingView />}
        {page === 'contact' && <ContactView />}
        
        {page === 'home' && (
          <div className="animate-in fade-in duration-700 pb-20 pt-20">
            <section className="relative min-h-[75vh] md:min-h-[85vh] flex items-center justify-center pt-28 px-4 overflow-hidden">
              <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-[#0a0a0a]/70 z-10" />
                <div className="absolute inset-0 bg-linear-to-t from-[#0a0a0a] via-transparent to-transparent z-10" />
                <img 
                  src={generalSettings?.heroImage || "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=1600&q=80"} 
                  className="w-full h-full object-cover grayscale-30" 
                  alt="Salon Background" 
                />
              </div>
              <div className="relative z-20 text-center max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-1000">
                <span className="text-[#d4af37] text-xs md:text-sm font-bold tracking-[0.3em] uppercase mb-4 block">Est. Schweinfurt</span>
                <h1 className="text-4xl sm:text-6xl md:text-8xl font-extrabold tracking-tighter mb-6 leading-tight uppercase">{t.hero.title}</h1>
                <p className="text-base md:text-2xl text-gray-300 font-light mb-4 max-w-2xl mx-auto">{t.hero.sub}</p>
                <p className="text-[#d4af37] text-xs md:text-sm font-bold tracking-widest uppercase mb-8 max-w-2xl mx-auto">
                  {t.hero.walkin} {generalSettings?.walkinWaitTime || "ca. 30 Minuten"}{t.hero.walkinSuffix}
                </p>
                <button onClick={() => setPage('booking')} className="bg-[#d4af37] text-black px-8 md:px-10 py-3.5 md:py-4 font-bold uppercase tracking-widest text-xs md:text-sm hover:bg-white transition-all shadow-[0_0_30px_rgba(212,175,55,0.2)]">{t.nav.book}</button>
              </div>
            </section>
            
            <section className="px-4 md:px-6 max-w-6xl mx-auto py-16 md:py-24 flex flex-col md:flex-row gap-12 md:gap-20 items-center">
              <div className="flex-1 md:pr-8">
                <h2 className="text-2xl md:text-4xl font-bold uppercase tracking-wider mb-4">
                  {lang === 'de' ? (generalSettings?.aboutTitleDe || t.about.title) : (generalSettings?.aboutTitleEn || t.about.title)}
                </h2>
                <div className="w-12 h-1 bg-[#d4af37] mb-8" />
                
                <p className="text-gray-400 text-sm md:text-base lg:text-lg leading-relaxed font-light line-clamp-none md:line-clamp-[10]">
                  {lang === 'de' ? (generalSettings?.aboutTextDe || t.about.text) : (generalSettings?.aboutTextEn || t.about.text)}
                </p>
              </div>
              
              <div className="w-full md:w-[40%] relative group max-w-sm mx-auto md:mx-0">
                <div className="absolute inset-0 border-2 border-[#d4af37] translate-x-4 translate-y-4 rounded-sm" />
                <img 
                  src={generalSettings?.aboutImage || "image_0200bf.jpg"} 
                  className="relative z-10 w-full h-auto rounded-sm object-cover aspect-[3/4] grayscale-20" 
                  alt="Salon About Image" 
                />
              </div>
            </section>
          </div>
        )}

        {page === 'services' && (
          <div className="animate-in fade-in duration-700 w-full pb-20 pt-20">
            <div className="relative h-[30vh] md:h-[40vh] w-full flex items-center justify-center overflow-hidden mb-12">
              <div className="absolute inset-0 bg-black/60 z-10" />
              <img src="https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=1600&q=80" className="absolute inset-0 w-full h-full object-cover grayscale-30" alt="Services Background" />
              <div className="relative z-20 text-center px-4 animate-in slide-in-from-bottom-8 duration-1000">
                <h2 className="text-3xl md:text-6xl font-bold mb-2 uppercase tracking-tighter">{t.services.title}</h2>
                <p className="tracking-[0.2em] uppercase text-xs md:text-sm text-[#d4af37]">{t.services.subtitle}</p>
              </div>
            </div>
            <div className="max-w-4xl mx-auto px-4 md:px-6 space-y-4">
              {servicesDB.map((item: ServiceItem, idx: number) => (
                <div key={item.id} className="flex items-end justify-between p-4 md:p-6 rounded-sm shadow-lg bg-[#111] border border-white/10">
                  <div>
                     <h3 className="text-lg md:text-xl font-medium">{item.name}</h3>
                     <p className="text-xs text-gray-500 mt-1">⏱ {item.durationMins || 60} {t.services?.min || 'Minuten'}</p>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    {item.oldPrice && <span className="text-xs md:text-sm text-gray-500 line-through">statt {item.oldPrice}</span>}
                    <span className="font-bold text-xl md:text-2xl text-[#d4af37]">{item.price}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {page === 'gallery' && (
          <div className="animate-in fade-in duration-700 w-full pt-28 pb-20 px-4 md:px-6 max-w-7xl mx-auto">
            <div className="text-center mb-12 pb-8">
               <h2 className="text-3xl md:text-5xl font-bold mb-2 uppercase tracking-tight">{t.gallery.title}</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-[75px] md:auto-rows-[150px]">
              {t.gallery.images.map((src: string, idx: number) => {
                let spanClass = "col-span-1 row-span-1";
                let desktopSpan = "md:col-span-1 md:row-span-1";
                if (idx === 0) desktopSpan = "md:col-span-2 md:row-span-2"; 
                if (idx === 1) desktopSpan = "md:col-span-2 md:row-span-1"; 
                
                return (
                  <div key={idx} className={`relative overflow-hidden rounded-sm group animate-in fade-in slide-in-from-bottom-12 duration-700 fill-mode-both ${spanClass} ${desktopSpan}`} style={{ animationDelay: `${idx * 150}ms` }}>
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-500 z-10" />
                    <img src={src} alt={`Gallery Image ${idx + 1}`} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 grayscale-20 group-hover:grayscale-0" />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {page === 'products' && (
          <div className="animate-in fade-in duration-700 max-w-6xl mx-auto pt-28 pb-20 px-4 md:px-6">
            <div className="text-center mb-12 pb-8">
               <h2 className="text-3xl md:text-5xl font-bold mb-2 uppercase tracking-tight">{t.products.title}</h2>
               <p className="tracking-[0.2em] uppercase text-xs md:text-sm text-[#d4af37]">{t.products.subtitle}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
              {productsDB.map((item: ProductItem, idx: number) => (
                <div key={item.id} className="rounded-sm flex flex-col justify-between h-full overflow-hidden shadow-xl animate-in fade-in slide-in-from-bottom-12 duration-700 fill-mode-both bg-[#111] border border-white/10" style={{ animationDelay: `${idx * 150}ms` }}>
                  <div className="w-full aspect-square md:aspect-[4/5] overflow-hidden bg-black/50 relative group">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  </div>
                  <div className="p-6 md:p-8 flex flex-col grow relative">
                    <div className="grow">
                      <h3 className="text-xl mb-2 font-bold">{item.name}</h3>
                      <p className="text-gray-400 text-sm mb-6 leading-relaxed">{item.desc}</p>
                    </div>
                    <div className="text-2xl font-bold text-[#d4af37]">{item.price}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {page !== 'admin' && page !== 'booking' && page !== 'contact' && page !== 'auth' && page !== 'profile' && (
        <footer className="w-full py-6 text-center text-xs tracking-wider border-t border-white/5 text-gray-500">
          <p>
            © {new Date().getFullYear()} Rebo Salon. {t.common?.footer || 'Alle Rechte vorbehalten.'}
            <span onDoubleClick={() => setPage('admin')} className="cursor-default select-none ml-1 opacity-0 hover:opacity-10 transition-opacity">.</span>
          </p>
        </footer>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <CookieConsentProvider>
      <AppProvider>
        <CookieConsentBanner />
        <MainContent />
      </AppProvider>
    </CookieConsentProvider>
  );
}