import React, { useState, useEffect } from 'react';
import TeacherGradesPage from '../grades/TeacherGradesPage';
import AnnouncementFeed from '../../components/announcements/AnnouncementFeed';
import announcementService from '../../services/announcementService';
import { BookOpen, Megaphone } from 'lucide-react';

export const TeacherDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'grades' | 'announcements'>('grades');
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const fetchUnread = async () => {
    try {
      const count = await announcementService.getUnreadCount();
      setUnreadCount(count);
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    fetchUnread();
  }, []);

  return (
    <div className="space-y-6 font-ethiopic">
      {/* Top Navigation Tabs */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('grades')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'grades'
                ? 'bg-brand-700 text-white shadow-md shadow-brand-700/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>የኮርስ ውጤት መሙያ እና አስተዳደር</span>
          </button>

          <button
            onClick={() => setActiveTab('announcements')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'announcements'
                ? 'bg-brand-700 text-white shadow-md shadow-brand-700/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Megaphone className="w-4 h-4" />
            <span>ማስታወቂያዎች</span>
            {unreadCount > 0 && (
              <span className="bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">
                {unreadCount} አዲስ
              </span>
            )}
          </button>
        </div>

        {unreadCount > 0 && activeTab === 'grades' && (
          <button
            onClick={() => setActiveTab('announcements')}
            className="flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg border border-amber-200 transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            <span>{unreadCount} ያልተነበቡ ማስታወቂያዎች አሉዎት</span>
            <span>&rarr;</span>
          </button>
        )}
      </div>

      {activeTab === 'grades' ? (
        <TeacherGradesPage />
      ) : (
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-brand-600" />
              <span>የመምህራን ማስታወቂያዎች እና መመሪያዎች</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              ከትምህርት ክፍሉ ለአስተማሪዎች የተላለፉ የውጤት ማስረከቢያ ቀነ ገደቦች፣ የአካዳሚክ መመሪያዎች እና ማስታወቂያዎችን ይመልከቱ።
            </p>
          </div>
          <AnnouncementFeed onReadStatusChange={fetchUnread} />
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;
