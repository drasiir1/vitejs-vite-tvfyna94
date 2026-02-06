import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Play, Square, Activity, Calendar, Trophy, History, ArrowLeft, RefreshCw, Video, ExternalLink, HelpCircle, X } from 'lucide-react';

// --- Types & Constants ---

type Exercise = {
  id: string;
  name: string;
  duration: number; // default timer duration in seconds
  target: string; // e.g. "Max. Zeit" or "20 Sek."
  description: string;
  voiceCues: string[];
  videoUrl: string;
};

type Phase = {
  id: number;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  exercises: Exercise[];
  description: string;
};

type LogEntry = {
  id: number;
  timestamp: number;
  exerciseName: string;
  duration: number;
  phaseId: number;
};

// --- DATA: CALISTHENICS PLAN ---

const PHASES: Phase[] = [
  {
    id: 1,
    name: "Phase 1: Basics & Fundament",
    startDate: "2026-01-05",
    endDate: "2026-04-06",
    description: "Fokus auf Körperspannung und Gelenkvorbereitung.",
    exercises: [
      {
        id: 'p1_hollow_hang',
        name: '1. Hollow Body Hangs',
        duration: 60,
        target: 'Max. Zeit halten',
        description: 'An Stange hängen, Schultern aktiv runterziehen, Bauch fest. Wie eine Banane.',
        voiceCues: ['Schultern weg von den Ohren', 'Bauch fest anspannen', 'Beine zusammenpressen'],
        videoUrl: 'https://youtu.be/J2JHDavNZB4?t=5'
      },
      {
        id: 'p1_frog_stand',
        name: '2. Frog Stand',
        duration: 20,
        target: 'Ziel: 20 Sek.',
        description: 'Hände zum Boden, Knie auf Ellbogen ablegen, Gewicht vorlagern.',
        voiceCues: ['Gewicht nach vorne verlagern', 'Balance halten', 'Blick leicht nach vorne'],
        videoUrl: 'https://youtu.be/J2JHDavNZB4?t=46'
      },
      {
        id: 'p1_hollow_hold',
        name: '3. Hollow Body Holds',
        duration: 45,
        target: 'Ziel: 45 Sek.',
        description: 'Rückenlage, unteren Rücken fest in Boden pressen, Arme/Beine schweben.',
        voiceCues: ['Unterer Rücken bleibt am Boden', 'Atmen nicht vergessen', 'Spannung halten'],
        videoUrl: 'https://youtu.be/J2JHDavNZB4?t=126'
      },
      {
        id: 'p1_planche_lean',
        name: '4. Pseudo Planche Lean',
        duration: 60,
        target: 'Max. Zeit',
        description: 'Liegestütz-Position, Arme gestreckt, weit nach vorne lehnen.',
        voiceCues: ['Arme komplett gestreckt lassen', 'Lehn dich weiter vor', 'Po nicht zu hoch'],
        videoUrl: 'https://youtu.be/J2JHDavNZB4?t=168'
      }
    ]
  },
  {
    id: 2,
    name: "Phase 2: Kraft & Statik",
    startDate: "2026-04-06",
    endDate: "2026-07-06",
    description: "Aufbau von Grundkraft mit komplexeren Hebeln.",
    exercises: [
      {
        id: 'p2_pppu',
        name: '1. Pseudo Planche Push-up',
        duration: 60,
        target: '8-12 Wh.',
        description: 'Weit nach vorne lehnen, dann Liegestütz (Ellbogen eng).',
        voiceCues: ['Ellbogen eng am Körper', 'Vorne bleiben beim Drücken', 'Volle Bewegung'],
        videoUrl: 'https://youtu.be/J2JHDavNZB4?t=219'
      },
      {
        id: 'p2_tuck_fl',
        name: '2. Tuck Front Lever',
        duration: 30,
        target: 'Max. Zeit',
        description: 'An Stange hängen, Knie zur Brust, waagerecht nach hinten lehnen.',
        voiceCues: ['Arme gestreckt lassen', 'Rücken gerade machen', 'Knie zur Brust ziehen'],
        videoUrl: 'https://youtu.be/J2JHDavNZB4?t=250'
      },
      {
         id: 'p2_pistol',
         name: '5. Pistol Squat',
         duration: 60,
         target: '5-8 Wh. pro Bein',
         description: 'Einbeinige Kniebeuge.',
         voiceCues: ['Ferse bleibt am Boden', 'Knie stabil halten'],
         videoUrl: 'https://youtu.be/J2JHDavNZB4?t=387'
      }
    ]
  }
];

// --- Helper Functions ---

const getDaysDifference = (date1: number, date2: number) => {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round(Math.abs((date1 - date2) / oneDay));
};

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
};

const getCurrentPhase = (): Phase => {
  const now = new Date().toISOString().split('T')[0];
  const found = PHASES.find(p => now >= p.startDate && now < p.endDate);
  return found || PHASES[0]; 
};

const getPhaseProgress = (phase: Phase) => {
    const start = new Date(phase.startDate).getTime();
    const end = new Date(phase.endDate).getTime();
    const now = Date.now();
    const totalDuration = end - start;
    const elapsed = now - start;
    
    // Calculate weeks (approx)
    const currentWeek = Math.ceil(elapsed / (7 * 24 * 60 * 60 * 1000));
    const totalWeeks = Math.ceil(totalDuration / (7 * 24 * 60 * 60 * 1000));
    
    return { currentWeek: Math.max(1, currentWeek), totalWeeks: Math.max(1, totalWeeks) };
};

const speak = (text: string) => {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'de-DE';
  utterance.rate = 1.1; 
  utterance.pitch = 1.0;
  window.speechSynthesis.speak(utterance);
};

// --- Components ---

export default function App() {
  // State
  const [currentPhase, setCurrentPhase] = useState<Phase>(PHASES[0]);
  const [hasStarted, setHasStarted] = useState(false);
  const [lastWorkout, setLastWorkout] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [view, setView] = useState<'home' | 'log'>('home');
  const [showHelp, setShowHelp] = useState(false);

  const [isListening, setIsListening] = useState(false);
  const [activeExercise, setActiveExercise] = useState<Exercise | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [coachMessage, setCoachMessage] = useState("Lade Trainingsplan...");
  
  // Refs
  // FIX: Use 'any' to avoid NodeJS namespace issues during build
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<any>(null);

  // --- Initialization ---

  useEffect(() => {
    // Load Data
    const savedLastWorkout = localStorage.getItem('lastWorkout');
    const savedStreak = localStorage.getItem('streak');
    const savedLogs = localStorage.getItem('workoutLogs');
    
    if (savedLastWorkout) setLastWorkout(parseInt(savedLastWorkout));
    if (savedStreak) setStreak(parseInt(savedStreak));
    if (savedLogs) setLogs(JSON.parse(savedLogs));

    // Determine Phase
    const phase = getCurrentPhase();
    setCurrentPhase(phase);

    // Init Speech
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'de-DE';
      
      recognitionRef.current.onend = () => {
        if (recognitionRef.current && !recognitionRef.current.aborted) {
             try { recognitionRef.current.start(); } catch {}
        }
      };
    }

    return () => {
        window.speechSynthesis.cancel(); // Safety cleanup
    };
  }, []);

  // --- Logic Helpers ---

  const getNextExerciseIndex = () => {
    const lastLog = logs[0];
    if (lastLog && lastLog.phaseId === currentPhase.id) {
       const lastIndex = currentPhase.exercises.findIndex(e => e.name === lastLog.exerciseName);
       if (lastIndex >= 0 && lastIndex < currentPhase.exercises.length - 1) {
           return lastIndex + 1;
       }
    }
    return 0; // Default to first if new phase or finished cycle
  };

  const generateBriefingAndSelect = () => {
    const lastLog = logs[0];
    let briefing = "";
    
    // Inactivity Check for Briefing
    if (!activeExercise && !hasStarted && lastLog) { 
         const days = getDaysDifference(Date.now(), lastLog.timestamp);
         if (days > 2) briefing += `Willkommen zurück nach ${days} Tagen. `;
         else if (days === 0) briefing += "Zweite Runde heute. ";
    } else if (!hasStarted) {
         briefing += "Lass uns beginnen. ";
    }

    const nextIndex = getNextExerciseIndex();
    const nextExercise = currentPhase.exercises[nextIndex];

    if (nextIndex === 0 && lastLog && lastLog.phaseId === currentPhase.id) {
         briefing += "Neuer Zirkel-Durchgang. ";
    } else if (lastLog) {
         briefing += "Weiter geht's. ";
    }

    briefing += `Nächste Übung: ${nextExercise.name}. ${nextExercise.target}.`;
    
    setActiveExercise(nextExercise);
    setTimeLeft(nextExercise.duration);
    setIsRunning(false);
    setView('home');
    setCoachMessage(briefing);
    speak(briefing);
  };

  const finishExercise = () => {
    if (!activeExercise) return;
    clearInterval(timerRef.current);
    setIsRunning(false);
    
    const now = Date.now();
    setLastWorkout(now);
    setStreak(s => s + 1);
    
    const newLog = {
      id: now,
      timestamp: now,
      exerciseName: activeExercise.name,
      duration: activeExercise.duration,
      phaseId: currentPhase.id
    };
    const updatedLogs = [newLog, ...logs];
    setLogs(updatedLogs);

    localStorage.setItem('lastWorkout', now.toString());
    localStorage.setItem('streak', (streak + 1).toString());
    localStorage.setItem('workoutLogs', JSON.stringify(updatedLogs));

    setActiveExercise(null); 
    
    setTimeout(() => {
        const msg = "Gespeichert. Sag 'Weiter' für die nächste Übung.";
        setCoachMessage(msg);
        speak(msg);
    }, 500);
  };

  const toggleTimer = () => {
    if (isRunning) {
      clearInterval(timerRef.current);
      setIsRunning(false);
      speak("Pause.");
    } else {
      setIsRunning(true);
      speak("Los.");
    }
  };

  // --- Voice Logic ---

  useEffect(() => {
    if (recognitionRef.current) {
        recognitionRef.current.onresult = (event: any) => {
            const current = event.resultIndex;
            const transcriptText = event.results[current][0].transcript.toLowerCase();
            
            if (transcriptText.includes('start') || transcriptText.includes('los')) {
                if (activeExercise && !isRunning) toggleTimer();
            } else if (transcriptText.includes('stop') || transcriptText.includes('pause') || transcriptText.includes('warte')) {
                if (isRunning) toggleTimer();
            } else if (transcriptText.includes('fertig')) {
                finishExercise(); 
            } else if ((transcriptText.includes('weiter') || transcriptText.includes('nächste')) ) {
                if (activeExercise) finishExercise(); 
                else generateBriefingAndSelect(); 
            } else if (transcriptText.includes('log') || transcriptText.includes('verlauf')) {
                setView('log');
                speak("Hier ist dein Verlauf.");
            } else if (transcriptText.includes('zurück') || transcriptText.includes('home')) {
                setView('home');
                speak("Zurück zum Training.");
            }
        };
    }
  }, [activeExercise, isRunning, view, logs, currentPhase]); 

  const toggleMic = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      recognitionRef.current.aborted = true; 
      setIsListening(false);
    } else {
      try {
          recognitionRef.current.aborted = false;
          recognitionRef.current?.start();
          setIsListening(true);
          speak("Ich höre zu.");
      } catch (e) { console.error(e); }
    }
  };

  const startSession = () => {
    setHasStarted(true);
    generateBriefingAndSelect();
    
    // Auto start mic
    if (recognitionRef.current && !isListening) {
        try {
            recognitionRef.current.aborted = false;
            recognitionRef.current.start();
            setIsListening(true);
        } catch (e) { console.error(e); }
    }
  };

  // --- Timer ---

  useEffect(() => {
    if (isRunning && activeExercise && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          const newVal = prev - 1;
          if (newVal === Math.floor(activeExercise.duration / 2)) {
            const cue = activeExercise.voiceCues[Math.floor(Math.random() * activeExercise.voiceCues.length)];
            speak(cue);
            setCoachMessage(cue);
          }
          if (newVal === 3) speak("3.. 2.. 1..");
          if (newVal === 0) {
            finishExercise();
            speak("Zeit um! Gut gemacht.");
          }
          return newVal;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [isRunning, activeExercise, timeLeft]);

  // --- Render ---

  if (!hasStarted) {
    const progress = getPhaseProgress(currentPhase);
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full text-center space-y-8 animate-in fade-in duration-700">
           <div className="relative inline-block">
             <div className="absolute -inset-1 bg-blue-500 rounded-full blur opacity-75 animate-pulse"></div>
             <Activity size={64} className="relative text-white mx-auto" />
           </div>
           <div>
              <h1 className="text-3xl font-bold tracking-tight mb-2">AI Calisthenics Coach</h1>
              <div className="flex flex-col items-center gap-1">
                 <div className="inline-block bg-blue-900/30 border border-blue-500/30 px-3 py-1 rounded-full text-sm text-blue-300">
                   {currentPhase.name}
                 </div>
                 <span className="text-xs text-slate-500">Woche {progress.currentWeek} von {progress.totalWeeks}</span>
              </div>
           </div>
           <p className="text-slate-400">
             {lastWorkout 
               ? `Letztes Training: vor ${getDaysDifference(Date.now(), lastWorkout)} Tagen`
               : "Dein Start in den Trainingsplan."}
           </p>
           
           <button 
             onClick={startSession}
             className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-xl transition-all shadow-lg hover:shadow-blue-500/20 flex items-center justify-center gap-2 group"
           >
             <Play size={20} className="group-hover:scale-110 transition-transform" />
             Heutiges Training starten
           </button>
        </div>
      </div>
    );
  }

  const nextRecommendedIndex = getNextExerciseIndex();

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-slate-800 p-4 flex justify-between items-center shadow-md border-b border-slate-700 z-10 sticky top-0">
        <div className="flex items-center gap-2">
           {view === 'log' ? (
             <button onClick={() => setView('home')} className="p-1 hover:bg-slate-700 rounded-full transition-colors">
               <ArrowLeft size={24} className="text-blue-400" />
             </button>
           ) : (
             <Activity className="text-blue-400" size={24} />
           )}
           <span className="font-bold text-lg truncate max-w-[150px]">{view === 'log' ? 'Log' : currentPhase.name.split(':')[0]}</span>
        </div>
        <div className="flex items-center gap-3">
             <div className="flex items-center gap-1 text-yellow-400 text-xs bg-yellow-400/10 px-2 py-1 rounded-full border border-yellow-400/20">
                 <Trophy size={14} />
                 <span>{streak}</span>
             </div>
             
             <button onClick={() => setShowHelp(!showHelp)} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-full text-slate-400 transition-colors" title="Sprachbefehle">
                 <HelpCircle size={18} />
             </button>

             <button onClick={() => setView(view === 'home' ? 'log' : 'home')} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-full text-slate-400 transition-colors">
               <History size={18} />
             </button>
             
             <button 
             onClick={toggleMic}
             className={`p-2 rounded-full transition-colors ${isListening ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-slate-700 text-slate-400'}`}
             >
             {isListening ? <Mic size={18} /> : <MicOff size={18} />}
             </button>
        </div>
      </header>

      {/* Voice Commands Cheat Sheet */}
      {showHelp && (
          <div className="bg-slate-800 border-b border-slate-700 p-4 text-sm animate-in slide-in-from-top-2">
              <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-slate-300">Sprachbefehle:</span>
                  <button onClick={() => setShowHelp(false)}><X size={16} /></button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-slate-400">
                  <div className="flex items-center gap-2"><span className="w-2 h-2 bg-blue-500 rounded-full"></span> "Start" / "Los"</div>
                  <div className="flex items-center gap-2"><span className="w-2 h-2 bg-red-500 rounded-full"></span> "Stopp" / "Pause"</div>
                  <div className="flex items-center gap-2"><span className="w-2 h-2 bg-green-500 rounded-full"></span> "Weiter" / "Fertig"</div>
                  <div className="flex items-center gap-2"><span className="w-2 h-2 bg-yellow-500 rounded-full"></span> "Verlauf" / "Zurück"</div>
              </div>
          </div>
      )}

      {/* Main Content */}
      <main className="flex-1 p-6 flex flex-col gap-6 max-w-2xl mx-auto w-full">
        
        {view === 'home' && (
          <>
            {/* AI Feedback Area */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 relative">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                <h2 className="text-slate-400 text-xs uppercase tracking-wider mb-2 font-semibold">Coach Feedback</h2>
                <p className="text-lg font-medium text-white min-h-[3rem] leading-relaxed">
                    "{coachMessage}"
                </p>
                {!activeExercise && (
                    <button 
                        onClick={generateBriefingAndSelect} 
                        className="mt-4 text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold animate-pulse"
                    >
                        <RefreshCw size={14} /> Nächste Übung vorschlagen
                    </button>
                )}
            </div>

            {/* Active Exercise */}
            {activeExercise ? (
                <div className="flex-1 flex flex-col items-center justify-center space-y-6 py-4 animate-in fade-in duration-500">
                    <div className="text-center space-y-2">
                        <h3 className="text-2xl font-bold text-white">{activeExercise.name}</h3>
                        <div className="flex items-center justify-center gap-2 text-slate-400 text-sm">
                            <span className="bg-slate-800 px-2 py-1 rounded border border-slate-700">{activeExercise.target}</span>
                            <a 
                                href={activeExercise.videoUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-blue-400 hover:underline"
                            >
                                <Video size={14} /> Video
                            </a>
                        </div>
                        <p className="text-slate-400 text-sm max-w-xs mx-auto">{activeExercise.description}</p>
                    </div>

                    {/* Timer Circle */}
                    <div className="relative w-56 h-56 flex items-center justify-center">
                        <svg className="absolute w-full h-full transform -rotate-90">
                            <circle cx="112" cy="112" r="100" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-800" />
                            <circle cx="112" cy="112" r="100" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={2 * Math.PI * 100} strokeDashoffset={2 * Math.PI * 100 * (1 - timeLeft / activeExercise.duration)} className="text-blue-500 transition-all duration-1000 ease-linear" />
                        </svg>
                        <div className="text-5xl font-mono font-bold tracking-tighter">
                            {formatTime(timeLeft)}<span className="text-lg text-slate-500 ml-1">s</span>
                        </div>
                    </div>

                    <div className="flex gap-3 w-full max-w-xs">
                        <button 
                            onClick={toggleTimer}
                            className={`flex-1 py-3 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-colors ${isRunning ? 'bg-slate-700 hover:bg-slate-600' : 'bg-blue-600 hover:bg-blue-500'}`}
                        >
                            {isRunning ? <><Square size={18} fill="currentColor" /> Pause</> : <><Play size={18} fill="currentColor" /> Start</>}
                        </button>
                        <button onClick={finishExercise} className="px-4 bg-slate-800 text-green-400 border border-slate-700 rounded-xl hover:bg-slate-750 font-semibold">
                            Fertig
                        </button>
                    </div>
                </div>
            ) : (
                <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
                    <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <Calendar size={14} />
                        Plan: {currentPhase.name}
                    </h3>
                    <div className="grid gap-2">
                        {currentPhase.exercises.map((ex, index) => {
                            const isRecommended = index === nextRecommendedIndex;
                            return (
                                <div 
                                  key={ex.id} 
                                  className={`w-full text-left p-3 bg-slate-800 border rounded-lg flex justify-between items-center group transition-all
                                    ${isRecommended ? 'border-blue-500/50 shadow-lg shadow-blue-500/10' : 'border-slate-700 hover:border-slate-600'}`}
                                >
                                    <div>
                                        <div className={`font-medium ${isRecommended ? 'text-blue-300' : 'text-slate-200'}`}>
                                            {ex.name}
                                            {isRecommended && <span className="ml-2 text-[10px] uppercase bg-blue-500 text-white px-1.5 py-0.5 rounded font-bold">Next</span>}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-0.5">{ex.target}</div>
                                    </div>
                                    <div className="flex gap-2">
                                         <a href={ex.videoUrl} target="_blank" rel="noreferrer" className="p-2 bg-slate-900 rounded-md text-slate-400 hover:text-blue-400 transition-colors">
                                            <ExternalLink size={16} />
                                         </a>
                                         <button onClick={() => { setActiveExercise(ex); setTimeLeft(ex.duration); setView('home'); }} className="p-2 bg-slate-700 rounded-md text-white hover:bg-blue-600 transition-colors">
                                            <Play size={16} fill="currentColor" />
                                         </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
          </>
        )}

        {view === 'log' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-8 duration-300">
             {logs.length === 0 ? (
               <div className="text-center text-slate-500 py-12">
                 <History size={48} className="mx-auto mb-4 opacity-20" />
                 <p>Keine Einträge.</p>
               </div>
             ) : (
               <div className="grid gap-2">
                 {logs.map((log) => (
                   <div key={log.id} className="bg-slate-800 border border-slate-700 p-3 rounded-lg flex justify-between items-center">
                     <div>
                       <h4 className="font-medium text-slate-200 text-sm">{log.exerciseName}</h4>
                       <p className="text-xs text-slate-500">{formatDate(log.timestamp)}</p>
                     </div>
                     <span className="text-blue-400 font-mono text-sm bg-blue-900/20 px-2 py-1 rounded">{log.duration}s</span>
                   </div>
                 ))}
               </div>
             )}
          </div>
        )}
      </main>
    </div>
  );
}
