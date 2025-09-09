import React from 'react';

const getInitials = (name: string = ''): string => {
    const names = name.trim().split(' ');
    let initials = names[0].substring(0, 1).toUpperCase();
    if (names.length > 1) {
        initials += names[names.length - 1].substring(0, 1).toUpperCase();
    }
    return initials;
};

const generateColor = (name: string = ''): { backgroundColor: string; textColor: string } => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
        hash = hash & hash;
    }
    const hue = hash % 360;
    return {
        backgroundColor: `hsl(${hue}, 70%, 85%)`,
        textColor: `hsl(${hue}, 60%, 30%)`,
    };
};

interface AvatarProps { name?: string | null; }

const Avatar: React.FC<AvatarProps> = ({ name }) => {
    if (!name) {
        return (
            <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center" title="Sin asignar">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            </div>
        );
    }
    const initials = getInitials(name);
    const { backgroundColor, textColor } = generateColor(name);
    return (
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor, color: textColor }} title={name}>
            {initials}
        </div>
    );
};

export default Avatar;