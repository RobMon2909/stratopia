// client/src/components/ui/StatusCircle.tsx
import React from 'react';
import { CheckCircle2, CircleDotDashed, Circle } from 'lucide-react';

interface StatusCircleProps {
    statusName: string;
    color?: string;
}

const StatusCircle: React.FC<StatusCircleProps> = ({ statusName, color = '#6B7280' }) => {
    const statusLower = statusName.toLowerCase();
    
    // El tamaño y estilo base del icono
    const iconProps = {
        size: 18,
        strokeWidth: 2,
        style: { color: color }
    };

    if (statusLower.includes('finalizado') || statusLower.includes('completado')) {
        return <CheckCircle2 {...iconProps} />;
    }
    if (statusLower.includes('proceso') || statusLower.includes('revisar')) {
        return <CircleDotDashed {...iconProps} />;
    }
    // Por defecto (Pendiente, etc.)
    return <Circle {...iconProps} />;
};

export default StatusCircle;