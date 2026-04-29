'use client';

import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { Cloud, LogOut, ChevronLeft, ChevronRight, CloudOff, AlertCircle } from 'lucide-react';
import { useMoods, MoodEntry } from '@/hooks/use-moods';
import { cn } from '@/lib/utils';
import { auth, googleProvider, isConfigured } from '@/lib/firebase';
import { signInWithPopup, signOut } from 'firebase/auth';

const EMOJIS = [
  { id: 'amazing', emoji: '😄', label: 'Increíble', color: 'text-primary', bg: 'bg-primary/20', border: 'border-primary', shadow: 'shadow-primary/20' },
  { id: 'good', emoji: '😊', label: 'Bien', color: 'text-secondary', bg: 'bg-secondary/20', border: 'border-secondary', shadow: 'shadow-secondary/20' },
  { id: 'normal', emoji: '😐', label: 'Regular', color: 'text-on-surface', bg: 'bg-surface-container-highest', border: 'border-outline-variant', shadow: 'shadow-none' },
  { id: 'bad', emoji: '😞', label: 'Mal', color: 'text-orange-400', bg: 'bg-orange-400/20', border: 'border-orange-400', shadow: 'shadow-orange-400/20' },
  { id: 'horrible', emoji: '😢', label: 'Horrible', color: 'text-tertiary', bg: 'bg-tertiary/20', border: 'border-tertiary', shadow: 'shadow-tertiary/20' },
];

const ENERGIES = ['Baja', 'Media', 'Alta'];

export default function Home() {
  const { moods, saveEntry, getEntry, isLoaded, user, isCloud, error, isConfigured: isFirebaseHookConfigured } = useMoods();

  // State
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Form State
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [energy, setEnergy] = useState<string | null>(null);
  const [word, setWord] = useState('');
  const [showConfigWarning, setShowConfigWarning] = useState(false);

  // Load entry when date changes
  useEffect(() => {
    if (!isLoaded) return;

    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const entry = getEntry(dateStr);

    if (entry) {
      setSelectedEmoji(entry.emoji);
      setNote(entry.note);
      setEnergy(entry.energy);
      setWord(entry.word);
    } else {
      setSelectedEmoji(null);
      setNote('');
      setEnergy(null);
      setWord('');
    }
  }, [selectedDate, isLoaded, moods]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  let startDay = getDay(monthStart) - 1;
  if (startDay === -1) startDay = 6;

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const handleLogin = async () => {
    if (!isConfigured || !auth) {
      setShowConfigWarning(true);
      return;
    }
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      console.error(e);
    }
  }

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
    }
  }

  const handleSave = () => {
    if (!selectedEmoji) return;

    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const entry: MoodEntry = {
      date: dateStr,
      emoji: selectedEmoji,
      note,
      energy: energy || '',
      word,
      timestamp: Date.now(),
    };

    saveEntry(entry);
  };

  const getDayColorClass = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const entry = getEntry(dateStr);
    if (!entry) return 'bg-surface-container-low hover:bg-surface-container border-transparent hover:border-outline-variant/20';

    const emojiDef = EMOJIS.find(e => e.id === entry.emoji);
    if (!emojiDef) return 'bg-surface-container-highest';

    return `${emojiDef.bg} border ${emojiDef.border}/30`;
  };

  const getDayTextColorClass = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const entry = getEntry(dateStr);
    if (!entry) return 'text-on-surface-variant/40';

    const emojiDef = EMOJIS.find(e => e.id === entry.emoji);
    if (!emojiDef) return 'text-on-surface';

    return emojiDef.color;
  };

  if (!isLoaded) return null;

  return (
    <div className="min-h-screen bg-background text-on-surface font-body selection:bg-primary-container selection:text-on-primary-container relative overflow-hidden">
      <div className="fixed top-0 right-0 -z-10 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="fixed bottom-0 left-0 -z-10 w-[400px] h-[400px] bg-secondary/5 blur-[100px] rounded-full -translate-x-1/2 translate-y-1/2 pointer-events-none" />

      <header className="fixed top-0 w-full z-40 flex justify-between items-center px-6 py-4 bg-background/80 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-4">
          {user ? (
            <div className="w-10 h-10 rounded-full overflow-hidden border border-outline-variant/30 flex-shrink-0">
              <img
                src={user.photoURL || "https://picsum.photos/seed/user/100/100"}
                alt="Perfil"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center border border-outline-variant/30 flex-shrink-0">
              <span className="text-xl">✨</span>
            </div>
          )}
          <h1 className="text-2xl font-bold font-headline text-white tracking-tight">MyMood</h1>

          <div className="hidden sm:flex items-center gap-2 ml-4 px-3 py-1.5 rounded-full bg-surface-container-low border border-outline-variant/20">
            {isCloud ? (
              <>
                <Cloud className="w-4 h-4 text-primary" />
                <span className="text-xs font-medium text-primary">Guardado en Nube</span>
              </>
            ) : (
              <>
                <CloudOff className="w-4 h-4 text-on-surface-variant" />
                <span className="text-xs font-medium text-on-surface-variant">Modo Local</span>
              </>
            )}
          </div>
        </div>

        {user ? (
          <div className="flex flex-col items-end gap-1">
            <button
              onClick={handleLogout}
              className="text-on-surface-variant hover:text-primary transition-colors p-2 flex items-center gap-2"
            >
              <span className="text-sm hidden sm:inline">{user.displayName}</span>
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        ) : null}
      </header>

      <main className="pt-24 pb-32 px-6 max-w-5xl mx-auto space-y-12 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-16 lg:items-start">

        <div className="space-y-8">
          {error && (
            <div className="bg-error/10 border border-error/20 rounded-2xl p-4 flex items-center gap-3 text-error">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {!user && (
            <div className="space-y-2">
              <button
                onClick={handleLogin}
                className="w-full bg-surface-container-low rounded-full p-4 flex items-center justify-center gap-3 border border-outline-variant/10 hover:bg-surface-container transition-colors relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-secondary/0 via-secondary/5 to-secondary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                <Cloud className="w-5 h-5 text-secondary" />
                <p className="text-on-surface-variant text-sm font-medium">Inicia sesión para respaldar en la nube</p>
              </button>
              {showConfigWarning && (
                <p className="text-xs text-orange-400 text-center px-4">
                  Por favor, añade tus credenciales de Firebase en el archivo .env.local para habilitar la nube.
                </p>
              )}
            </div>
          )}

          <section className="space-y-6">
            <div className="flex justify-between items-end">
              <div className="space-y-1">
                <p className="text-on-surface-variant font-label text-xs uppercase tracking-widest">
                  {format(currentMonth, 'MMMM yyyy', { locale: es })}
                </p>
                <h2 className="text-3xl font-headline font-extrabold flex items-center gap-2">
                  Tu Diario
                </h2>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handlePrevMonth}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container-highest text-on-surface hover:bg-surface-container-high transition-all"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={handleNextMonth}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container-highest text-on-surface hover:bg-surface-container-high transition-all"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-3 sm:gap-4">
              {['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'].map(day => (
                <div key={day} className="text-center text-[10px] font-bold text-on-surface-variant/50 uppercase">
                  {day}
                </div>
              ))}

              {Array.from({ length: startDay }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square"></div>
              ))}

              {daysInMonth.map(date => {
                const isSelected = isSameDay(date, selectedDate);
                const dateStr = format(date, 'yyyy-MM-dd');
                const entry = getEntry(dateStr);
                const emojiDef = entry ? EMOJIS.find(e => e.id === entry.emoji) : null;

                return (
                  <motion.button
                    key={date.toString()}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedDate(date)}
                    className={cn(
                      "aspect-square rounded-full flex flex-col items-center justify-center transition-all relative border",
                      getDayColorClass(date),
                      isSelected ? "ring-2 ring-primary ring-offset-4 ring-offset-background" : ""
                    )}
                  >
                    <span className={cn("text-xs font-bold mb-0.5", getDayTextColorClass(date))}>
                      {format(date, 'd')}
                    </span>
                    {emojiDef && (
                      <span className="text-sm leading-none">{emojiDef.emoji}</span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </section>
        </div>

        <section className="bg-surface-container-low/60 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-8 space-y-10 relative overflow-hidden shadow-2xl shadow-black/50">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-primary/40 blur-sm rounded-full"></div>

          <div className="space-y-2 text-center">
            <h3 className="text-2xl font-headline font-bold text-on-surface">¿Cómo te sientes hoy?</h3>
            <p className="text-on-surface-variant font-label text-sm italic capitalize">
              {format(selectedDate, "d 'de' MMMM, eeee", { locale: es })}
            </p>
          </div>

          <div className="flex justify-between items-center gap-2 overflow-x-auto hide-scrollbar pb-2 px-1">
            {EMOJIS.map((mood) => {
              const isSelected = selectedEmoji === mood.id;
              return (
                <motion.button
                  key={mood.id}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setSelectedEmoji(mood.id)}
                  className="flex flex-col items-center gap-3 min-w-[64px] group"
                >
                  <div className={cn(
                    "w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300",
                    isSelected
                      ? `${mood.bg} border-2 ${mood.border} scale-110 ${mood.shadow} shadow-lg`
                      : "bg-surface-container-highest group-hover:bg-surface-container-high"
                  )}>
                    <span className="text-3xl filter drop-shadow-sm">{mood.emoji}</span>
                  </div>
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-tighter transition-colors",
                    isSelected ? mood.color : "text-on-surface-variant"
                  )}>
                    {mood.label}
                  </span>
                </motion.button>
              );
            })}
          </div>

          <div className="space-y-8">
            <div className="space-y-3">
              <label className="block text-xs font-bold text-on-surface-variant uppercase px-2 font-label tracking-wider">
                ¿Qué ha pasado hoy?
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={150}
                className="w-full bg-surface-container border-none rounded-[2rem] p-5 text-on-surface placeholder:text-on-surface-variant/30 focus:ring-2 focus:ring-primary/50 min-h-[120px] resize-none transition-all outline-none"
                placeholder="Escribe algo breve..."
              />
              <div className="flex justify-end px-4">
                <span className="text-[10px] text-on-surface-variant/40 font-label">{note.length} / 150</span>
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-xs font-bold text-on-surface-variant uppercase px-2 font-label tracking-wider">
                Nivel de Energía
              </label>
              <div className="grid grid-cols-3 gap-3">
                {ENERGIES.map((lvl) => {
                  const isSelected = energy === lvl;
                  return (
                    <button
                      key={lvl}
                      onClick={() => setEnergy(lvl)}
                      className={cn(
                        "py-3 rounded-full text-xs font-bold transition-all border",
                        isSelected
                          ? "bg-primary/10 text-primary border-primary/40"
                          : "bg-surface-container text-on-surface-variant border-transparent hover:border-outline-variant/50"
                      )}
                    >
                      {lvl}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-on-surface-variant uppercase px-2 font-label tracking-wider">
                Una palabra para hoy
              </label>
              <input
                type="text"
                value={word}
                onChange={(e) => setWord(e.target.value)}
                maxLength={30}
                className="w-full bg-surface-container border-none rounded-full px-6 py-4 text-on-surface placeholder:text-on-surface-variant/30 focus:ring-2 focus:ring-primary/50 transition-all outline-none"
                placeholder="Ej: Calma"
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSave}
              disabled={!selectedEmoji}
              className={cn(
                "w-full py-5 rounded-full font-headline font-bold text-lg transition-all shadow-xl flex items-center justify-center gap-2",
                selectedEmoji
                  ? "bg-gradient-to-r from-primary to-primary-container text-on-primary-container shadow-primary/20"
                  : "bg-surface-container-highest text-on-surface-variant cursor-not-allowed"
              )}
            >
              Guardar {isCloud ? "en la Nube" : "en Local"}
              {isCloud && selectedEmoji && <Cloud className="w-5 h-5 opacity-70" />}
            </motion.button>
          </div>
        </section>
      </main>
    </div>
  );
}
