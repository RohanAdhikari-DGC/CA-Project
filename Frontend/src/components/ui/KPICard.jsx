import React from 'react';

const KPICard = ({ title, value, footer, className = "" }) => {
  return (
    <div className={`bg-white border rounded-xl p-3.5 shadow-sm flex flex-col ${className}`}>
      <div className="text-[11.5px] font-semibold text-gray-500 uppercase tracking-wide">
        {title}
      </div>
      <div className="text-[27px] font-bold mt-1.5 tracking-tight">
        {value}
      </div>
      {footer && (
        <div className="text-xs text-gray-500 mt-auto pt-1.5 flex items-center gap-1.5">
          {footer}
        </div>
      )}
    </div>
  );
};

export default KPICard;