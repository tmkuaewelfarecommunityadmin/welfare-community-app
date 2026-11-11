import React, { useState } from 'react';
import { OrganizationInfo, PresetEmblemIcon } from '../types';
import { 
  ShieldCheck, 
  HeartHandshake, 
  Landmark, 
  Globe2, 
  Trees
} from 'lucide-react';

interface Props {
  orgInfo: OrganizationInfo;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
}

export const OrgLogo: React.FC<Props> = ({
  orgInfo,
  size = 'md',
  className = '',
  onClick
}) => {
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    sm: 'w-8 h-8 text-sm rounded-lg',
    md: 'w-9 h-9 sm:w-10 sm:h-10 text-base sm:text-lg rounded-xl',
    lg: 'w-12 h-12 text-xl rounded-2xl',
    xl: 'w-16 h-16 text-2xl rounded-2xl'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8'
  };

  const renderPresetIcon = (preset: PresetEmblemIcon) => {
    switch (preset) {
      case 'shield':
        return <ShieldCheck className={iconSizes[size]} />;
      case 'tree':
        return <Trees className={iconSizes[size]} />;
      case 'handshake':
        return <HeartHandshake className={iconSizes[size]} />;
      case 'building':
        return <Landmark className={iconSizes[size]} />;
      case 'globe':
        return <Globe2 className={iconSizes[size]} />;
      case 'rupee':
      default:
        return <span className="font-serif font-black leading-none">₹</span>;
    }
  };

  const hasCustomImage = orgInfo.logoType === 'custom_image' && orgInfo.logoDataUrl && !imageError;

  return (
    <div
      onClick={onClick}
      className={`relative flex items-center justify-center shrink-0 overflow-hidden shadow-2xs border border-black/10 select-none ${
        sizeClasses[size]
      } ${onClick ? 'cursor-pointer hover:opacity-90 active:scale-95 transition' : ''} ${className}`}
      style={{
        backgroundColor: hasCustomImage ? '#ffffff' : (orgInfo.logoBgColor || '#15803d'),
        color: '#ffffff'
      }}
      title={orgInfo.name}
    >
      {hasCustomImage ? (
        <img
          src={orgInfo.logoDataUrl}
          alt={orgInfo.name}
          className="w-full h-full object-cover rounded-inherit"
          onError={() => setImageError(true)}
        />
      ) : (
        renderPresetIcon(orgInfo.presetIcon || 'rupee')
      )}
    </div>
  );
};
