import React, { useState, useCallback } from 'react';
import { UserInputForm } from './components/UserInputForm';
import { CoachInputForm } from './components/CoachInputForm';
import { TrainingPlanDisplay } from './components/TrainingPlanDisplay';
import { Loader } from './components/Loader';
import { generateTrainingPlan } from './services/geminiService';
import { UserInput, TrainingPlan, CoachInput } from './types';
import { Card } from './components/ui/Card';
import { Button } from './components/ui/Button';

const App: React.FC = () => {
  const [trainingPlan, setTrainingPlan] = useState<TrainingPlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'runner' | 'coach'>('runner');

  const handleFormSubmit = useCallback(async (data: UserInput | CoachInput) => {
    setIsLoading(true);
    setError(null);
    setTrainingPlan(null);
    try {
      const plan = await generateTrainingPlan(data);
      setTrainingPlan(plan);
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError("Ocurrió un error desconocido. Por favor, inténtalo de nuevo.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans p-4 sm:p-6 lg:p-8">
      <header className="text-center mb-8">
        <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
          Generador de Planes de Trail Running con IA
        </h1>
        <p className="mt-2 text-lg text-gray-400 max-w-3xl mx-auto">
          {mode === 'runner'
            ? 'Introduce tus datos para recibir un plan de entrenamiento personalizado y basado en la ciencia.'
            : 'Genera plantillas de entrenamiento genéricas para diferentes arquetipos de corredores.'
          }
        </p>
      </header>
      
      <main className="flex flex-col items-center">
        {!isLoading && !trainingPlan && (
           <div className="w-full max-w-2xl mx-auto">
             <div className="flex justify-center space-x-2 mb-6 no-print">
                 <Button 
                     onClick={() => setMode('runner')}
                     variant={mode === 'runner' ? 'primary' : 'secondary'}
                     className="w-full"
                 >
                     Para Corredores (Personalizado)
                 </Button>
                 <Button 
                     onClick={() => setMode('coach')}
                     variant={mode === 'coach' ? 'primary' : 'secondary'}
                      className="w-full"
                 >
                     Para Entrenadores (Genérico)
                 </Button>
             </div>
             {mode === 'runner' ? (
               <UserInputForm onSubmit={handleFormSubmit} isLoading={isLoading} />
             ) : (
               <CoachInputForm onSubmit={handleFormSubmit} isLoading={isLoading} />
             )}
           </div>
        )}
        
        {isLoading && (
            <Loader text="Nuestro entrenador de IA está analizando tu perfil, calculando tus zonas y construyendo tu calendario semanal personalizado. Esto puede tardar un momento..." />
        )}
        
        {error && (
          <Card className="w-full max-w-2xl mx-auto border border-red-500/50">
            <h3 className="text-xl font-semibold text-red-400">Error en la Generación</h3>
            <p className="text-gray-300 mt-2">{error}</p>
            <Button onClick={() => setError(null)} className="mt-4">
              Intentar de Nuevo
            </Button>
          </Card>
        )}
        
        <div className="printable-area w-full">
          <TrainingPlanDisplay plan={trainingPlan} />
        </div>

      </main>

       <footer className="text-center mt-12 py-4 border-t border-gray-800">
          <p className="text-sm text-gray-500">
            Desarrollado con la API de Gemini. El plan es solo para fines informativos. Consulta a un médico antes de comenzar cualquier nuevo programa de entrenamiento.
          </p>
      </footer>
    </div>
  );
};

export default App;