import React, { useState, useEffect } from 'react';
import announcementService from '../../services/announcementService';
import { RecipientAnnouncementItem } from '../../types/announcement.types';
import { 
  Megaphone, 
  AlertTriangle, 
  Calendar, 
  User, 
  CheckCircle2, 
  X, 
  Clock, 
  ChevronRight,
  RefreshCw,
  Bell
} from 'lucide-react';
import { toEthiopianDateString } from '../../utils/ethiopianCalendar';

interface Props {
  className?: string;
  maxDisplay?: number;
  onReadStatusChange?: () => void;
}

export const AnnouncementFeed: React.FC<Props> = ({ className = '', maxDisplay, onReadStatusChange }) => {
  const [announcements, setAnnouncements] = useState<RecipientAnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<RecipientAnnouncementItem | null>(null);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await announcementService.getMyAnnouncements();
      setAnnouncements(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'ማስታወቂያዎችን መጫን አልተቻለም።');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleOpenAnnouncement = async (item: RecipientAnnouncementItem) => {
    setSelectedAnnouncement(item);
    if (!item.isRead) {
      try {
        await announcementService.markAsRead(item.announcementId);
        setAnnouncements((prev) =>
          prev.map((a) =>
            a.announcementId === item.announcementId
              ? { ...a, isRead: true, readAt: new Date().toISOString() }
              : a
          )
        );
        onReadStatusChange?.();
      } catch (err) {
        console.error('Failed to mark announcement as read:', err);
      }
    }
  };

  const unreadCount = announcements.filter((a) => !a.isRead).length;
  const displayedItems = maxDisplay ? announcements.slice(0, maxDisplay) : announcements;

  return (
    <div className={`space-y-4 font-ethiopic ${className}`}>
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-700">
            <Megaphone className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-charcoal-900 flex items-center gap-2">
              <span>ማስታወቂያዎችና መልእክቶች</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-warmOrange-500 text-white shadow-sm">
                  {unreadCount} አዲስ
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-500">ከተቋሙ የተላኩ ወቅታዊ መልእክቶች እና ማስታወቂያዎች</p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchAnnouncements}
          disabled={loading}
          className="text-xs text-slate-500 hover:text-brand-600 flex items-center gap-1 transition cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-brand-600' : ''}`} />
          <span className="hidden sm:inline">አድስ</span>
        </button>
      </div>

      {/* Content */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-xs text-slate-400">ማስታወቂያዎች እየተጫኑ ነው...</div>
      ) : announcements.length === 0 ? (
        <div className="py-8 px-4 text-center rounded-2xl bg-white border border-slate-200 space-y-2">
          <Bell className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-xs font-bold text-slate-600">በአሁኑ ሰዓት ምንም አዲስ ማስታወቂያ የለም</p>
          <p className="text-[11px] text-slate-400">አዳዲስ ማስታወቂያዎች ሲለጠፉ እዚህ ጋር ይታያሉ።</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedItems.map((item) => {
            const isImportant = item.priority === 'IMPORTANT';
            const publishDate = item.publishAt ? toEthiopianDateString(new Date(item.publishAt)) : '';

            return (
              <div
                key={item.announcementId}
                onClick={() => handleOpenAnnouncement(item)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer hover:shadow-md ${
                  !item.isRead
                    ? isImportant
                      ? 'bg-gradient-to-r from-warmOrange-50/60 to-white border-warmOrange-500/60 shadow-sm'
                      : 'bg-gradient-to-r from-brand-50/80 to-white border-brand-500/50 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isImportant && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-warmOrange-500 text-white shadow-xs">
                          <AlertTriangle className="w-3 h-3" /> አስፈላጊ / አስቸኳይ
                        </span>
                      )}
                      {!item.isRead && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-600 text-white shadow-xs">
                          አዲስ
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {publishDate}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 leading-snug">
                      {item.title}
                    </h4>

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {item.content}
                    </p>

                    <div className="pt-1 flex items-center gap-2 text-[11px] text-brand-700 font-bold">
                      <span>ሙሉውን አንብብ</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Dialog Modal */}
      {selectedAnnouncement && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 font-ethiopic">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className={`p-5 text-white flex items-center justify-between ${
              selectedAnnouncement.priority === 'IMPORTANT'
                ? 'bg-gradient-to-r from-amber-600 to-warmOrange-600'
                : 'bg-gradient-to-r from-brand-900 via-brand-800 to-slate-900'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0">
                  {selectedAnnouncement.priority === 'IMPORTANT' ? (
                    <AlertTriangle className="w-5 h-5" />
                  ) : (
                    <Megaphone className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <span className="text-[10px] font-bold tracking-wider uppercase opacity-90 block">
                    {selectedAnnouncement.priority === 'IMPORTANT' ? 'አስፈላጊ ማስታወቂያ' : 'ይፋዊ ማስታወቂያ'}
                  </span>
                  <span className="text-xs text-white/80">ሐይመተ አብርሃም ሰንበት ትምህርት ቤት</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedAnnouncement(null)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="border-b border-slate-100 pb-3 space-y-1">
                <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                  {selectedAnnouncement.title}
                </h3>
                <div className="flex items-center gap-3 text-xs text-slate-500 pt-1 flex-wrap">
                  <span className="flex items-center gap-1 font-mono">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {selectedAnnouncement.publishAt ? toEthiopianDateString(new Date(selectedAnnouncement.publishAt)) : ''}
                  </span>
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    አስተዳዳሪ፦ {selectedAnnouncement.author}
                  </span>
                </div>
              </div>

              {/* Message Content */}
              <div className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                {selectedAnnouncement.content}
              </div>

              {/* Status footer inside modal */}
              <div className="pt-2 flex items-center justify-between text-xs border-t border-slate-100">
                <span className="text-emerald-700 font-bold flex items-center gap-1.5 text-[11px]">
                  <CheckCircle2 className="w-4 h-4" /> እንደተነበበ ተመዝግቧል
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedAnnouncement(null)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  ዝጋ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnnouncementFeed;
