import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
}

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  className = "",
  children,
  ...props
}) => {
  const base =
    "px-4 py-2 rounded-lg font-semibold transition focus:outline-none focus:ring-2 focus:ring-cyan-400/60 disabled:opacity-60 disabled:cursor-not-allowed";
  const styles = {
    primary: "bg-cyan-500/90 hover:bg-cyan-400/90 text-white",
    secondary:
      "bg-white/10 hover:bg-white/15 border border-white/20 text-white",
    ghost: "hover:bg-white/10 text-white/70",
  };
  return (
    <button className={`${base} ${styles[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};
