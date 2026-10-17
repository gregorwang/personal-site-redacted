import type { Config } from "tailwindcss";

// 流体间距函数
const fluid = (min: number, max: number) => 
  `clamp(${min}rem, calc(${min}rem + (${max} - ${min}) * ((100vw - 20rem) / (90 - 20))), ${max}rem)`;

export default {
  content: ["./app/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "var(--font-main)",
          "Apple Color Emoji",
          "Segoe UI Emoji",
          "Segoe UI Symbol",
          "Noto Color Emoji",
        ],
        serif: [
          "var(--font-main)",
        ],
      },
      colors: {
        primary: {
          50: '#faf9f5',   // 主背景
          100: '#f5f4ed',  // 次背景
          950: '#141413',  // 主文字
        },
        accent: {
          DEFAULT: '#d97757',  // 陶土橙（展示）
          hover: '#c96442',    // 陶土橙（交互）
        },
        // shadcn/ui compatibility colors
        background: 'oklch(var(--background))',
        foreground: 'oklch(var(--foreground))',
        muted: {
          DEFAULT: 'oklch(var(--muted))',
          foreground: 'oklch(var(--muted-foreground))',
        },
        border: 'oklch(var(--border))',
        ring: 'oklch(var(--ring))',
      },
      spacing: {
        // Component Level (固定值) - 根据 03-spacing.md
        '0.25': '0.25rem',   // 4px - 最小间隙
        '0.5': '0.5rem',     // 8px - 小间距
        '0.75': '0.75rem',   // 12px - 紧凑padding
        '1': '1rem',         // 16px - 基准间距
        '1.5': '1.5rem',     // 24px - 标准padding
        
        // Component Level (流体值)
        '2': fluid(1.75, 2),      // 28-32px - 卡片间距
        '2.5': fluid(2, 2.5),     // 32-40px - 中等间距
        '3': fluid(2.5, 3),       // 40-48px - 大间距
        '4': fluid(3.25, 4),      // 52-64px - 超大间距
        
        // Page Level (页面级间距)
        'section-sm': fluid(4, 6),      // 64-96px
        'section-md': fluid(6, 8),       // 96-128px
        'section-lg': fluid(8, 12.5),   // 128-200px
        'section-xl': fluid(13, 15),    // 208-240px
      },
      borderRadius: {
        // 根据 04-radius.md 圆角系统
        'xs': '0.25rem',     // 4px - 微小元素、标签
        'sm': '0.5rem',      // 8px - 小型交互元素
        'DEFAULT': '0.75rem', // 12px - 标准UI控件（main）
        'lg': '1rem',        // 16px - 中大型容器
        'xl': 'clamp(1rem, 0.857rem + 0.714vw, 1.5rem)',     // 16-24px - 大型容器（响应式）
        '2xl': 'clamp(1rem, 0.714rem + 1.429vw, 2rem)',      // 16-32px - 页面级容器（响应式）
        'full': '9999px',    // 完全圆形
      },
      transitionTimingFunction: {
        'expo-out': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      transitionDuration: {
        '300': '300ms',
        '600': '600ms',
      },
      animation: {
        // 装饰性动画（保留原有）
        'blob': 'blob 7s infinite',
        'spin-slow': 'spin-slow 8s linear infinite',
        'bounce-slow': 'bounce-slow 3s ease-in-out infinite',

        // 标准UI动画（根据 06-animation.md）
        'fade-in': 'fadeIn 600ms cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in-down': 'fadeInDown 600ms cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down': 'slideDown 600ms cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scaleIn 600ms cubic-bezier(0.16, 1, 0.3, 1)',

        // 脉冲和浮动动画
        'pulse': 'pulse 2s infinite',
        'float': 'float 6s ease-in-out infinite',
        'gradient-shift': 'gradientShift 3s ease infinite',
        'shimmer': 'shimmer 2s infinite',

        // 歌词滚动动画
        'scroll-up': 'scrollUp 120s linear infinite',
      },
      keyframes: {
        // 装饰性关键帧（保留原有）
        blob: {
          '0%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
          '100%': { transform: 'translate(0px, 0px) scale(1)' },
        },
        'spin-slow': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        'bounce-slow': {
          '0%, 100%': { 
            transform: 'translateY(0)', 
            'animation-timing-function': 'cubic-bezier(0.8, 0, 1, 1)' 
          },
          '50%': { 
            transform: 'translateY(-25%)', 
            'animation-timing-function': 'cubic-bezier(0, 0, 0.2, 1)' 
          },
        },
        
        // 标准UI关键帧（根据 06-animation.md）
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        scrollUp: {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(-50%)' },
        },
        pulse: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.7', transform: 'scale(1.1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%': { transform: 'translateY(-20px) rotate(180deg)' },
        },
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
