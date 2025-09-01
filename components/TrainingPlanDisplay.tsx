import React, { useState } from 'react';
import { TrainingPlan, WeeklySchedule, DailySession, GlossaryTerm } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { TrainingZonesTable } from './TrainingZonesTable';


const getMethodStyling = (method: string) => {
    if (!method) return { container: 'bg-cyan-900/50 border-cyan-500/50', text: 'text-cyan-400' };
    const lowerMethod = method.toLowerCase();
    
    if (lowerMethod.includes('rest') || lowerMethod.includes('descanso')) {
        return { container: 'bg-gray-700 text-gray-400', text: 'text-gray-300' };
    }
    if (lowerMethod.includes('cruzado')) {
        return { container: 'bg-green-900/50 border-green-500/50', text: 'text-green-400' };
    }
    if (['interval', 'vam', 'uan', 'fraccionado', 'intensivo', 'supra', 'modelado'].some(keyword => lowerMethod.includes(keyword))) {
        return { container: 'bg-red-900/50 border-red-500/50', text: 'text-red-400' };
    }
     if (lowerMethod.includes('back-to-back')) {
        return { container: 'bg-purple-900/50 border-purple-500/50', text: 'text-purple-400' };
    }
    if (['long', 'largo', 'tempo', 'variable', 'trail'].some(keyword => lowerMethod.includes(keyword))) {
        return { container: 'bg-yellow-900/50 border-yellow-500/50', text: 'text-yellow-400' };
    }
    // Default for low intensity / base like 'Continuo Extensivo'
    return { container: 'bg-cyan-900/50 border-cyan-500/50', text: 'text-cyan-400' };
}


const SessionCard: React.FC<{ session: DailySession }> = ({ session }) => {
    if (!session || !session.day) {
        return null; // Defensive check
    }

    const baseClasses = `p-3 rounded-lg flex flex-col h-full border session-card-print`;
    const lowerMethod = session.method.toLowerCase();
    const styling = getMethodStyling(session.method);

    if (lowerMethod.includes('descanso') || lowerMethod.includes('rest')) {
        const isOptional = lowerMethod.includes('opcional');
        return (
            <div className={`${baseClasses} justify-center items-center text-center ${styling.container}`}>
                <h4 className="font-bold">{session.day}</h4>
                <p className="text-2xl mt-2">😴</p>
                <p className="font-semibold mt-1 capitalize">{session.method}</p>
                {isOptional && session.details && (
                    <p className="text-xs text-gray-300 mt-2 p-2 bg-gray-900/50 rounded-md">
                        {session.details}
                    </p>
                )}
            </div>
        );
    }

    return (
        <div className={`${baseClasses} ${styling.container}`}>
            <h4 className="font-bold text-white">{session.day}</h4>
            <p className={`text-sm font-semibold ${styling.text}`}>{session.method}</p>
            <p className="text-xs text-gray-300 mt-2">{session.duration}</p>
            <p className="text-xs text-gray-200 mt-1 flex-grow">{session.details}</p>
            <p className="text-xs font-mono bg-gray-900/50 p-1 rounded mt-2 text-gray-400">{session.targetZone}</p>
             {session.trailElevation && <p className="text-xs text-yellow-400 mt-1">{session.trailElevation}</p>}
        </div>
    );
};


const WeeklyScheduleView: React.FC<{ schedule: WeeklySchedule }> = ({ schedule }) => {
  const sessions = schedule?.sessions || [];
  
  return (
    <Card className="w-full mb-6 border border-gray-700 card-print weekly-schedule-card">
        <div className="flex justify-between items-start mb-4">
            <div>
                <h3 className="text-2xl font-bold text-cyan-400">Semana {schedule.week}</h3>
                <span className="text-sm font-semibold uppercase tracking-wider text-gray-400 bg-gray-700 px-2 py-1 rounded">{schedule.phase}</span>
            </div>
            <div className="text-right">
                <p className="font-semibold text-gray-200">Foco:</p>
                <p className="text-sm text-gray-300 max-w-xs">{schedule.focus}</p>
            </div>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-2 weekly-grid">
        {sessions.map((session, index) => (
          session && session.day ? <SessionCard key={`${schedule.week}-${index}-${session.day}`} session={session} /> : null
        ))}
      </div>
      <p className="mt-4 text-sm text-gray-400 bg-gray-900/50 p-3 rounded-md"><strong className="text-gray-200">Resumen Semanal:</strong> {schedule.summary}</p>
    </Card>
  );
};

const GlossaryDisplay: React.FC<{ terms: GlossaryTerm[] }> = ({ terms }) => (
    <Card className="mb-8 border border-gray-700 card-print">
      <h3 className="text-2xl font-bold text-white mb-4">Glosario de Términos</h3>
      <dl className="space-y-4">
        {terms.map(term => (
          <div key={term.term} className="bg-gray-900/50 p-3 rounded-lg">
            <dt className="text-md font-semibold text-cyan-400">{term.term}</dt>
            <dd className="mt-1 text-sm text-gray-300">{term.definition}</dd>
          </div>
        ))}
      </dl>
    </Card>
);

const formatPlanForClipboard = (plan: TrainingPlan): string => {
    let text = `PLAN DE ENTRENAMIENTO DE TRAIL RUNNING\n`;
    text += `========================================\n\n`;
    text += `RESUMEN: ${plan.planSummary}\n\n`;

    text += `PERFIL DEL CORREDOR\n`;
    text += `-------------------\n`;
    text += `Nivel: ${plan.runnerProfile.level}\n`;
    text += `Tipo de Carrera: ${plan.runnerProfile.raceType}\n`;
    text += `Necesidad Fisiológica: ${plan.runnerProfile.needs || 'N/A'}\n\n`;

    text += `ZONAS DE ENTRENAMIENTO\n`;
    text += `----------------------\n`;
    plan.trainingZones.forEach(z => {
        text += `- ${z.zone} (${z.name}): Ritmo ${z.paceRange} | FC ${z.fcRange} | RPE ${z.rpe}\n`;
    });
    text += `\n`;

    text += `PLAN SEMANAL\n`;
    text += `============\n\n`;

    plan.weeklySchedules.forEach(w => {
        text += `--- SEMANA ${w.week} (${w.phase}) ---\n`;
        text += `Foco: ${w.focus}\n\n`;
        w.sessions.forEach(s => {
            text += `  • ${s.day}: ${s.method} (${s.duration})\n`;
            text += `    Detalles: ${s.details}\n`;
            text += `    Zona Objetivo: ${s.targetZone}\n`;
            if (s.trailElevation) {
                text += `    Desnivel: ${s.trailElevation}\n`;
            }
            text += `\n`;
        });
        text += `Resumen Semanal: ${w.summary}\n`;
        text += `-------------------------------------------------------\n\n`;
    });

    if (plan.glossary && plan.glossary.length > 0) {
        text += `GLOSARIO\n`;
        text += `========\n`;
        plan.glossary.forEach(g => {
            text += `- ${g.term}: ${g.definition}\n`;
        });
        text += `\n`;
    }
    
    text += `Este plan es solo para fines informativos. Consulta a un profesional antes de empezar.`;
    
    return text;
};

export const TrainingPlanDisplay: React.FC<{ plan: TrainingPlan | null }> = ({ plan }) => {
  const [showFullPlan, setShowFullPlan] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const handlePrint = () => {
    window.print();
  };
  
  const handleCopyToClipboard = () => {
    if (!plan) return;
    const planText = formatPlanForClipboard(plan);
    navigator.clipboard.writeText(planText).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000); // Reset after 2 seconds
    });
  };
  
  if (!plan) return null;

  // Defensive checks for arrays
  const weeklySchedules = Array.isArray(plan.weeklySchedules) ? plan.weeklySchedules : [];
  const trainingZones = Array.isArray(plan.trainingZones) ? plan.trainingZones : [];
  const glossary = Array.isArray(plan.glossary) ? plan.glossary : [];
  
  return (
    <div className="w-full max-w-7xl mx-auto mt-8">
      <div className="flex flex-col sm:flex-row justify-end items-center mb-4 gap-2 no-print">
        <Button onClick={handleCopyToClipboard} variant="secondary">
           {isCopied ? (
            <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                ¡Copiado!
            </>
           ) : (
             <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM5 11a1 1 0 100 2h4a1 1 0 100-2H5z" />
                  <path fillRule="evenodd" d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm2-1a1 1 0 00-1 1v10a1 1 0 001 1h12a1 1 0 001-1V5a1 1 0 00-1-1H4z" clipRule="evenodd" />
                </svg>
                Copiar Texto
             </>
           )}
        </Button>
        <Button onClick={handlePrint} variant="secondary">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path d="M5 4v3H4a2 2 0 00-2 2v6a2 2 0 002 2h1v-4a1 1 0 011-1h8a1 1 0 011 1v4h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm3 0h6v3H8V4z" />
            <path d="M3 15a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z" />
          </svg>
          Imprimir o Guardar PDF
        </Button>
      </div>
      
      <Card className="mb-8 bg-gradient-to-r from-gray-800 to-gray-900 border border-cyan-500/30 card-print">
        <h2 className="text-3xl font-bold text-white mb-4">Tu Plan de Entrenamiento Personalizado</h2>
        <p className="text-gray-300 mb-6">{plan.planSummary}</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 text-center">
            <div className="bg-gray-700 p-3 rounded-lg">
                <p className="text-sm text-gray-400">Nivel de Corredor</p>
                <p className="font-bold text-lg text-cyan-400">{plan.runnerProfile?.level}</p>
            </div>
            <div className="bg-gray-700 p-3 rounded-lg">
                <p className="text-sm text-gray-400">Necesidad Fisiológica</p>
                <p className="font-bold text-lg text-cyan-400">{plan.runnerProfile?.needs || 'N/A'}</p>
            </div>
             <div className="bg-gray-700 p-3 rounded-lg">
                <p className="text-sm text-gray-400">Tipo de Carrera</p>
                <p className="font-bold text-lg text-cyan-400">{plan.runnerProfile?.raceType}</p>
            </div>
        </div>

        <h3 className="text-xl font-bold text-white mb-3">Análisis de la Carrera</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 text-center">
             <div className="bg-gray-700 p-3 rounded-lg">
                <p className="text-sm text-gray-400">Ratio Desnivel (m/km)</p>
                <p className="font-bold text-lg text-cyan-400">{plan.controlMetrics?.elevationRatio || 'N/A'}</p>
            </div>
             <div className="bg-gray-700 p-3 rounded-lg">
                <p className="text-sm text-gray-400">Ratio Desnivel (m/hora)</p>
                <p className="font-bold text-lg text-cyan-400">{plan.controlMetrics?.elevationRatioPerHour || 'N/A'}</p>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="bg-gray-900/50 p-4 rounded-lg">
                <h4 className="font-semibold text-white mb-2">Tareas Complementarias</h4>
                <p className="text-gray-400"><strong className="text-gray-300">Fuerza:</strong> {plan.complementaryTasks?.strength}</p>
                <p className="text-gray-400"><strong className="text-gray-300">Movilidad:</strong> {plan.complementaryTasks?.mobility}</p>
            </div>
            <div className="bg-gray-900/50 p-4 rounded-lg">
                <h4 className="font-semibold text-white mb-2">Adaptaciones del Plan</h4>
                 <p className="text-gray-400">{plan.raceProfileAdaptations}</p>
                 <p className="text-gray-400 mt-2"><strong className="text-gray-300">Progresión de Volumen:</strong> {plan.controlMetrics?.weeklyVolume}</p>
            </div>
        </div>
      </Card>

      {glossary.length > 0 && <GlossaryDisplay terms={glossary} />}

      <TrainingZonesTable zones={trainingZones} />

      <div className="printable-area">
        {weeklySchedules.map((week, index) => {
          if (!week || !week.week) return null;
          // Only the first 4 weeks are visible on screen unless the user clicks the "show more" button.
          // The 'hidden-on-screen' class handles hiding the rest for the screen view,
          // but they will be visible on print thanks to the @media print CSS rule.
          const isVisibleOnScreen = showFullPlan || index < 4;
          return (
             <div key={week.week} className={!isVisibleOnScreen ? 'hidden-on-screen' : ''}>
              <WeeklyScheduleView schedule={week} />
            </div>
          )
        })}
      </div>

      {!showFullPlan && weeklySchedules.length > 4 && (
        <div className="text-center mt-6 no-print">
            <Button onClick={() => setShowFullPlan(true)}>
                Mostrar Plan Completo de {weeklySchedules.length} Semanas
            </Button>
        </div>
      )}
    </div>
  );
};