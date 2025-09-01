
import React, { useState } from 'react';
import { UserInput } from '../types';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { WEEKDAYS, CROSS_TRAINING_OPTIONS } from '../constants';

interface UserInputFormProps {
  onSubmit: (data: UserInput) => void;
  isLoading: boolean;
}

const initialFormData: UserInput = {
  raceName: 'Mi Carrera de Trail',
  distance: 25,
  elevation: 1200,
  weeksToRace: 16,
  estimatedTime: '3h15m',
  trainingDaysPerWeek: 4,
  longRunDays: ['Sábado'],
  normalDayDuration: 60,
  longRunDayDuration: 120,
  vamPace: '3:45',
  maxHeartRate: 190,
  uanPace: '4:10',
  uanHeartRate: 175,
  injuryHistory: '',
  crossTraining: ['Bicicleta Estática', 'Entrenamiento de Fuerza'],
  raceProfileImage: undefined,
};


export const UserInputForm: React.FC<UserInputFormProps> = ({ onSubmit, isLoading }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<UserInput>(initialFormData);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          raceProfileImage: reader.result as string,
        }));
      };
      reader.readAsDataURL(file);
    }
  };
  
  const removeImage = () => {
    setFormData(prev => ({ ...prev, raceProfileImage: undefined }));
  };

  const handleMultiSelect = (item: string, field: 'longRunDays' | 'crossTraining') => {
    const currentValues = formData[field];
    const newValues = currentValues.includes(item)
      ? currentValues.filter(v => v !== item)
      : [...currentValues, item];
    setFormData(prev => ({ ...prev, [field]: newValues }));
  };

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };
  
  const renderStep = () => {
    switch(step) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-cyan-400">Objetivo de la Carrera</h3>
            <p className="text-gray-400">Cuéntanos sobre tu evento objetivo.</p>
            <Input label="Nombre de la Carrera" name="raceName" value={formData.raceName} onChange={handleChange} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Distancia (km)" name="distance" type="number" value={formData.distance} onChange={handleChange} />
              <Input label="Desnivel Positivo (m)" name="elevation" type="number" value={formData.elevation} onChange={handleChange} />
            </div>
            <Input label="Tiempo Estimado para Completarla" name="estimatedTime" value={formData.estimatedTime} onChange={handleChange} helperText="Ej: 5h30m, 12h00m" />
            
            <div className="space-y-2 pt-4 border-t border-gray-700">
                <label className="block text-sm font-medium text-gray-300">
                    Añadir Perfil de Carrera (Opcional)
                </label>
                <p className="text-xs text-gray-400">
                    Sube una imagen del perfil de la carrera para adaptar el plan a las subidas y bajadas específicas.
                </p>
                
                {formData.raceProfileImage ? (
                    <div className="mt-2 text-center">
                        <img src={formData.raceProfileImage} alt="Vista previa del perfil" className="max-h-40 mx-auto rounded-lg shadow-md" />
                        <Button variant="secondary" onClick={removeImage} className="mt-2 text-xs">
                            Quitar Imagen
                        </Button>
                    </div>
                ) : (
                    <div className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-600 border-dashed rounded-md">
                        <div className="space-y-1 text-center">
                            <svg className="mx-auto h-12 w-12 text-gray-500" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <div className="flex text-sm text-gray-400">
                                <label htmlFor="file-upload" className="relative cursor-pointer bg-gray-700 rounded-md font-medium text-cyan-400 hover:text-cyan-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-gray-800 focus-within:ring-cyan-500 px-1">
                                    <span>Sube un archivo</span>
                                    <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*" onChange={handleFileChange} />
                                </label>
                                <p className="pl-1">o arrástralo aquí</p>
                            </div>
                            <p className="text-xs text-gray-500">PNG, JPG, GIF hasta 10MB</p>
                        </div>
                    </div>
                )}
            </div>

          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-cyan-400">Tu Disponibilidad</h3>
            <p className="text-gray-400">¿Cuánto tiempo puedes dedicar a entrenar?</p>
            <div className="grid grid-cols-2 gap-4">
                 <Input label="Semanas hasta la Carrera" name="weeksToRace" type="number" value={formData.weeksToRace} onChange={handleChange} />
                 <Input label="Días de Entrenamiento por Semana" name="trainingDaysPerWeek" type="number" value={formData.trainingDaysPerWeek} onChange={handleChange} />
            </div>
             <div className="grid grid-cols-2 gap-4">
                <Input label="Duración Día Normal (min)" name="normalDayDuration" type="number" value={formData.normalDayDuration} onChange={handleChange} />
                <Input label="Duración Día Largo (min)" name="longRunDayDuration" type="number" value={formData.longRunDayDuration} onChange={handleChange} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">¿Qué días puedes hacer la tirada larga?</label>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                {WEEKDAYS.map(day => (
                  <Button key={day} variant={formData.longRunDays.includes(day) ? 'primary' : 'secondary'} onClick={() => handleMultiSelect(day, 'longRunDays')}>
                    {day}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-cyan-400">Tu Nivel de Condición Física</h3>
            <p className="text-gray-400">
              Para un cálculo preciso de las zonas, necesitamos datos de dos tests clave.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-800/70 p-3 rounded-lg border border-gray-700">
                <h4 className="font-semibold text-white">Test VAM (Velocidad Aeróbica Máxima)</h4>
                <p className="text-sm text-gray-400 mt-2">
                  <strong>Test:</strong> 5 minutos a máxima intensidad sostenible.
                </p>
                <ul className="text-sm text-gray-400 mt-1 list-disc list-inside space-y-1">
                  <li>Anota tu <strong>ritmo medio</strong> (Ritmo VAM).</li>
                  <li>Anota tu <strong>pulso máximo</strong> (FC Máxima).</li>
                </ul>
              </div>

              <div className="bg-gray-800/70 p-3 rounded-lg border border-gray-700">
                <h4 className="font-semibold text-white">Test UAN/VT2 (Umbral Anaeróbico)</h4>
                <p className="text-sm text-gray-400 mt-2">
                  <strong>Test:</strong> 20-30 min a ritmo fuerte o 10k a tope.
                </p>
                <ul className="text-sm text-gray-400 mt-1 list-disc list-inside space-y-1">
                  <li>Anota tu <strong>ritmo medio</strong> (Ritmo UAN).</li>
                  <li>Anota tu <strong>pulso medio</strong> (FC Media UAN).</li>
                </ul>
              </div>
            </div>

            <p className="text-center text-gray-400 text-sm pt-2">Introduce los datos de tus tests a continuación:</p>
            
            <div className="space-y-4 pt-4 border-t border-gray-600">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Ritmo VAM (min/km)" name="vamPace" value={formData.vamPace} onChange={handleChange} helperText="Formato: m:ss, ej: 3:45" />
                <Input label="Frecuencia Cardíaca Máxima (ppm)" name="maxHeartRate" type="number" value={formData.maxHeartRate} onChange={handleChange} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Ritmo UAN/VT2 (ritmo 10k, min/km)" name="uanPace" value={formData.uanPace} onChange={handleChange} helperText="Formato: m:ss, ej: 4:10" />
                <Input label="FC Media UAN/VT2 (ppm)" name="uanHeartRate" type="number" value={formData.uanHeartRate} onChange={handleChange} />
              </div>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-cyan-400">Información Adicional</h3>
            <p className="text-gray-400">Cualquier otro detalle a considerar.</p>
            <Input label="Historial de Lesiones (opcional)" name="injuryHistory" value={formData.injuryHistory} onChange={handleChange} placeholder="ej: esguince de tobillo previo" />
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Material de Entrenamiento Cruzado Disponible</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CROSS_TRAINING_OPTIONS.map(opt => (
                  <Button key={opt} variant={formData.crossTraining.includes(opt) ? 'primary' : 'secondary'} onClick={() => handleMultiSelect(opt, 'crossTraining')}>
                    {opt}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit}>
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-400">Paso {step} de 4</span>
            <div className="w-full mx-4 bg-gray-700 rounded-full h-2.5">
              <div className="bg-cyan-600 h-2.5 rounded-full" style={{ width: `${(step / 4) * 100}%` }}></div>
            </div>
          </div>
          <div className="p-4 bg-gray-900/50 rounded-lg min-h-[300px]">
            {renderStep()}
          </div>
        </div>

        <div className="flex justify-between items-center mt-8">
          <Button variant="secondary" onClick={prevStep} disabled={step === 1 || isLoading}>
            Atrás
          </Button>
          {step < 4 ? (
            <Button onClick={nextStep} disabled={isLoading}>
              Siguiente
            </Button>
          ) : (
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Generando...' : 'Generar Plan'}
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
};