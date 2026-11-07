import React from 'react';
import { BookOpen, GraduationCap, ShieldCheck } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="bg-slate-900 text-white shadow-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="bg-gold-600 p-2 rounded-lg text-white shadow">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white">
                የሰንበት ትምህርት ቤት የተማሪዎች ውጤት አስተዳደር ሥርዓት
              </h1>
              <p className="text-xs text-slate-400 hidden sm:block">
                የተማሪዎች ውጤት ምዝገባ፣ ማጽደቂያ እና ይፋዊ ሰነዶች ማዕከል
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg text-xs">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span className="text-slate-300 font-medium">የተጠበቀ ደህንነት</span>
            </div>
            <div className="hidden md:flex items-center gap-1.5 text-xs text-gold-500 font-semibold bg-gold-500/10 border border-gold-500/30 px-3 py-1.5 rounded-lg">
              <BookOpen className="h-4 w-4" />
              <span>2016 ዓ.ም.</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
