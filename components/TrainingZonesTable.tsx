
import React from 'react';
import { TrainingZone } from '../types';
import { Card } from './ui/Card';

interface TrainingZonesTableProps {
  zones: TrainingZone[];
}

export const TrainingZonesTable: React.FC<TrainingZonesTableProps> = ({ zones }) => {
  if (!zones || zones.length === 0) {
    return null;
  }

  return (
    <Card className="mb-8 border border-gray-700 card-print">
      <h3 className="text-2xl font-bold text-white mb-4">Tus Zonas de Entrenamiento</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-300">
          <thead className="text-xs text-cyan-400 uppercase bg-gray-900/50">
            <tr>
              <th scope="col" className="px-4 py-3 rounded-l-lg">Zona</th>
              <th scope="col" className="px-4 py-3">Nombre</th>
              <th scope="col" className="px-4 py-3">% VAM</th>
              <th scope="col" className="px-4 py-3">Ritmo</th>
              <th scope="col" className="px-4 py-3">FC (%/ppm)</th>
              <th scope="col" className="px-4 py-3 rounded-r-lg">RPE</th>
            </tr>
          </thead>
          <tbody>
            {zones.map((zone) => (
              <tr key={zone.zone} className="border-b border-gray-700 hover:bg-gray-800/50">
                <th scope="row" className="px-4 py-3 font-bold text-white whitespace-nowrap">{zone.zone}</th>
                <td className="px-4 py-3">{zone.name}</td>
                <td className="px-4 py-3 font-mono">{zone.vamRange || 'N/A'}</td>
                <td className="px-4 py-3 font-mono">{zone.paceRange}</td>
                <td className="px-4 py-3 font-mono">{zone.fcRange}</td>
                <td className="px-4 py-3 font-mono">{zone.rpe}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};