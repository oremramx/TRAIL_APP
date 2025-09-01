
import React, { useState } from 'react';
import { CoachInput } from '../types';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { WEEKDAYS } from '../constants';

interface CoachInputFormProps {
  onSubmit: (data: CoachInput) => void;
  isLoading: boolean;
}

const initialFormData: CoachInput = {
  raceType: 'Media',
  runnerLevel: 'Intermedio',
  weeksToRace: 16,
  trainingDaysPerWeek: 4,
  longRunDays: ['Sábado'],
  normalDayDuration: 60,
  longRunDayDuration: 120,
  distance: 25,
  elevation: 1200,
  raceProfileImage: undefined,
};

export const CoachInputForm: React.FC<CoachInputFormProps> = ({ onSubmit, isLoading }) => {
  const [formData, setFormData] = useState<CoachInput>(initialFormData);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    // Check if the target is an input element and if its type is 'number'
    const isNumberInput = e.target instanceof HTMLInputElement && type === 'number';
    
    setFormData(prev => ({
      ...prev,
      [name]: isNumberInput ? parseFloat(value) || 0 : value,
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
  
  const handleMultiSelect = (item: string) => {
    const currentValues = formData.longRunDays;
    const newValues = currentValues.includes(item)
      ? currentValues.filter(v => v !== item)
      : [...currentValues, item];
    setFormData(prev => ({ ...prev, longRunDays: newValues }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          <h3 className="text-xl font-semibold text-cyan-400">Parámetros del Plan Genérico</h3>
          <p className="text-gray-400">Define los parámetros para crear una plantilla de entrenamiento para un arquetipo de corredor.</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="raceType" className="block text-sm font-medium text-gray-300 mb-1">Tipo de Prueba</label>
              <select
                id="raceType"
                name="raceType"
                value={formData.raceType}
                onChange={handleChange}
                className="w-full bg-gray-700 border border-gray-600 text-gray-100 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm px-3 py-2"
              >
                <option value="Vertical">Vertical</option>
                <option value="Muy Corta">Muy Corta (2-5k)</option>
                <option value="Corta">Corta (5-15k)</option>
                <option value="Media">Media (16-25k)</option>
                <option value="Larga">Larga (26-42k)</option>
                <option value="Ultra">Ultra (>42k)</option>
              </select>
            </div>
             <div>
              <label htmlFor="runnerLevel" className="block text-sm font-medium text-gray-300 mb-1">Nivel del Corredor</label>
              <select
                id="runnerLevel"
                name="runnerLevel"
                value={formData.runnerLevel}
                onChange={handleChange}
                className="w-full bg-gray-700 border border-gray-600 text-gray-100 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm px-3 py-2"
              >
                <option value="Principiante">Principiante</option>
                <option value="Intermedio">Intermedio</option>
                <option value="Avanzado">Avanzado</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Distancia (km, opcional)" name="distance" type="number" value={formData.distance || ''} onChange={handleChange} />
            <Input label="Desnivel (m, opcional)" name="elevation" type="number" value={formData.elevation || ''} onChange={handleChange} />
          </div>

           <div className="space-y-2 pt-4 border-t border-gray-700">
                <label className="block text-sm font-medium text-gray-300">
                    Añadir Perfil de Carrera (Opcional)
                </label>
                <p className="text-xs text-gray-400">
                    Sube una imagen del perfil para adaptar la plantilla a las subidas y bajadas específicas.
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
                                <label htmlFor="file-upload-coach" className="relative cursor-pointer bg-gray-700 rounded-md font-medium text-cyan-400 hover:text-cyan-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-gray-800 focus-within:ring-cyan-500 px-1">
                                    <span>Sube un archivo</span>
                                    <input id="file-upload-coach" name="file-upload-coach" type="file" className="sr-only" accept="image/*" onChange={handleFileChange} />
                                </label>
                                <p className="pl-1">o arrástralo aquí</p>
                            </div>
                            <p className="text-xs text-gray-500">PNG, JPG, GIF hasta 10MB</p>
                        </div>
                    </div>
                )}
            </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Semanas hasta la Carrera" name="weeksToRace" type="number" value={formData.weeksToRace} onChange={handleChange} />
            <Input label="Días de Entrenamiento por Semana" name="trainingDaysPerWeek" type="number" value={formData.trainingDaysPerWeek} onChange={handleChange} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Duración Día Normal (min)" name="normalDayDuration" type="number" value={formData.normalDayDuration} onChange={handleChange} />
            <Input label="Duración Día Largo (min)" name="longRunDayDuration" type="number" value={formData.longRunDayDuration} onChange={handleChange} />
          </div>

          <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">¿Qué días puede hacer la tirada larga?</label>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                {WEEKDAYS.map(day => (
                  <Button key={day} variant={formData.longRunDays.includes(day) ? 'primary' : 'secondary'} onClick={() => handleMultiSelect(day)}>
                    {day}
                  </Button>
                ))}
              </div>
            </div>

        </div>
        <div className="flex justify-end items-center mt-8">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Generando Plantilla...' : 'Generar Plantilla'}
            </Button>
        </div>
      </form>
    </Card>
  );
};
