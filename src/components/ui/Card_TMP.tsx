import React from "react";

export const Card: React.FC<{ title?: string; children?: React.ReactNode }> = ({
  title,
  children,
}) => {
  return (
    <div className="bg-white/10 backdrop-blur border border-white/20 rounded-xl p-4 shadow-lg text-white">
      {title && <h3 className="text-lg font-semibold mb-3">{title}</h3>}
      {children}
    </div>
  );
};
