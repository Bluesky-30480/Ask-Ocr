/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  darkMode: 'media', // Use system preference for dark mode
  theme: {
    extend: {
      // Colors from our design tokens
      colors: {
        // Primary colors
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
          DEFAULT: '#2563eb',
        },
        
        // Accent colors
        accent: {
          blue: '#3b82f6',
          purple: '#a855f7',
          pink: '#ec4899',
          red: '#ef4444',
          orange: '#f97316',
          yellow: '#f59e0b',
          green: '#22c55e',
          teal: '#14b8a6',
        },
        
        // Semantic colors
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          DEFAULT: '#22c55e',
        },
        
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          DEFAULT: '#f59e0b',
        },
        
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          DEFAULT: '#ef4444',
        },
        
        info: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          DEFAULT: '#3b82f6',
        },
        
        // Neutral colors
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
          950: '#030712',
        },
        
        // Background colors
        background: {
          primary: '#ffffff',
          secondary: '#f9fafb',
          tertiary: '#f3f4f6',
          quaternary: '#e5e7eb',
        },
        
        // Surface colors
        surface: {
          primary: '#ffffff',
          secondary: '#f9fafb',
          tertiary: '#f3f4f6',
          elevated: '#ffffff',
        },
        
        // Text colors
        text: {
          primary: '#111827',
          secondary: '#4b5563',
          tertiary: '#6b7280',
          quaternary: '#9ca3af',
          disabled: '#d1d5db',
          inverse: '#ffffff',
        },
        
        // Border colors
        border: {
          primary: '#e5e7eb',
          secondary: '#d1d5db',
          tertiary: '#9ca3af',
          focus: '#2563eb',
        },
      },
      
      // Font families from our design tokens
      fontFamily: {
        system: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'],
        mono: ['SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Consolas', 'Courier New', 'monospace'],
        serif: ['New York', 'Times New Roman', 'Georgia', 'serif'],
      },
      
      // Font sizes from our design tokens
      fontSize: {
        'xs': '10px',
        'sm': '12px',
        'base': '14px',
        'md': '16px',
        'lg': '18px',
        'xl': '20px',
        '2xl': '24px',
        '3xl': '28px',
        '4xl': '32px',
        '5xl': '36px',
        '6xl': '48px',
        '7xl': '60px',
        '8xl': '72px',
        '9xl': '96px',
      },
      
      // Line heights from our design tokens
      lineHeight: {
        'none': '1',
        'tight': '1.2',
        'snug': '1.3',
        'normal': '1.4',
        'relaxed': '1.5',
        'loose': '1.6',
        'extra-loose': '1.8',
      },
      
      // Letter spacing from our design tokens
      letterSpacing: {
        'tighter': '-0.05em',
        'tight': '-0.025em',
        'normal': '0',
        'wide': '0.025em',
        'wider': '0.05em',
        'widest': '0.1em',
      },
      
      // Spacing from our design tokens
      spacing: {
        '0': '0',
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '7': '28px',
        '8': '32px',
        '10': '40px',
        '12': '48px',
        '16': '64px',
        '20': '80px',
        '24': '96px',
      },
      
      // Border radius from our design tokens
      borderRadius: {
        'none': '0',
        'xs': '2px',
        'sm': '4px',
        'base': '6px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '20px',
        '3xl': '24px',
        'full': '9999px',
        
        // Component-specific radius
        'button': '8px',
        'input': '8px',
        'card': '12px',
        'modal': '16px',
        'window': '12px',
      },
      
      // Box shadows from our design tokens
      boxShadow: {
        '0': 'none',
        '1': '0 1px 2px rgba(0, 0, 0, 0.05)',
        '2': '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
        '3': '0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.06)',
        '4': '0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)',
        '5': '0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04)',
        '6': '0 25px 50px rgba(0, 0, 0, 0.15)',
        
        // Component shadows
        'button': '0 1px 2px rgba(0, 0, 0, 0.05)',
        'button-hover': '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
        'card': '0 1px 2px rgba(0, 0, 0, 0.05)',
        'card-hover': '0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.06)',
        'dropdown': '0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)',
        'modal': '0 25px 50px rgba(0, 0, 0, 0.15)',
        
        // Focus shadows
        'focus': '0 0 0 3px rgba(59, 130, 246, 0.1)',
        'focus-error': '0 0 0 3px rgba(239, 68, 68, 0.1)',
        'focus-success': '0 0 0 3px rgba(34, 197, 94, 0.1)',
        
        // Colored shadows
        'primary-light': '0 4px 14px rgba(59, 130, 246, 0.15)',
        'success-light': '0 4px 14px rgba(34, 197, 94, 0.15)',
        'warning-light': '0 4px 14px rgba(245, 158, 11, 0.15)',
        'error-light': '0 4px 14px rgba(239, 68, 68, 0.15)',
      },
      
      // Blur values from our design tokens
      blur: {
        'none': '0',
        'sm': '4px',
        'base': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '24px',
        
        // Glass blur effects
        'glass': '16px',
        'backdrop': '20px',
      },
      
      // Opacity values
      opacity: {
        '5': '0.05',
        '10': '0.1',
        '15': '0.15',
        '20': '0.2',
        '25': '0.25',
        '30': '0.3',
        '35': '0.35',
        '40': '0.4',
        '45': '0.45',
        '55': '0.55',
        '65': '0.65',
        '85': '0.85',
        '95': '0.95',
      },
      
      // Animation durations from our design tokens
      transitionDuration: {
        'fast': '0.1s',
        'normal': '0.15s',
        'slow': '0.2s',
        'slower': '0.3s',
      },
      
      // Animation timing functions from our design tokens
      transitionTimingFunction: {
        'apple': 'cubic-bezier(0.25, 0.1, 0.25, 1)',
      },
      
      // Z-index layers from our design tokens
      zIndex: {
        'base': '0',
        'dropdown': '100',
        'sticky': '200',
        'fixed': '300',
        'modal-backdrop': '400',
        'modal': '500',
        'popover': '600',
        'tooltip': '700',
        'toast': '800',
        'max': '9999',
      },
      
      // Component heights from our design tokens
      height: {
        'button-sm': '28px',
        'button': '32px',
        'button-md': '36px',
        'button-lg': '40px',
        'button-xl': '44px',
        'input-sm': '32px',
        'input': '36px',
        'input-md': '40px',
        'input-lg': '44px',
      },
      
      // Icon sizes from our design tokens
      width: {
        'icon-xs': '12px',
        'icon-sm': '16px',
        'icon': '20px',
        'icon-md': '24px',
        'icon-lg': '32px',
        'icon-xl': '40px',
      },
      
      // Backdrop blur
      backdropBlur: {
        'glass': '16px',
        'heavy': '20px',
      },
    },
  },
  plugins: [
    // Custom plugin for our design system utilities
    function({ addUtilities, theme }) {
      const newUtilities = {
        // Glass effect utilities
        '.glass-light': {
          'background-color': 'rgba(255, 255, 255, 0.3)',
          'backdrop-filter': 'blur(8px)',
          '-webkit-backdrop-filter': 'blur(8px)',
          'border': '1px solid rgba(255, 255, 255, 0.2)',
        },
        '.glass-medium': {
          'background-color': 'rgba(255, 255, 255, 0.5)',
          'backdrop-filter': 'blur(12px)',
          '-webkit-backdrop-filter': 'blur(12px)',
          'border': '1px solid rgba(255, 255, 255, 0.3)',
        },
        '.glass-heavy': {
          'background-color': 'rgba(255, 255, 255, 0.7)',
          'backdrop-filter': 'blur(16px)',
          '-webkit-backdrop-filter': 'blur(16px)',
          'border': '1px solid rgba(255, 255, 255, 0.4)',
        },
        
        // Button styles with our design tokens
        '.btn-primary': {
          'background-color': theme('colors.primary.DEFAULT'),
          'color': theme('colors.text.inverse'),
          'border': `1px solid ${theme('colors.primary.DEFAULT')}`,
          'border-radius': theme('borderRadius.button'),
          'height': theme('height.button'),
          'padding': '0 16px',
          'font-weight': theme('fontWeight.medium'),
          'font-size': theme('fontSize.base'),
          'line-height': theme('lineHeight.tight'),
          'transition': 'all 0.15s ease-out',
          'box-shadow': theme('boxShadow.button'),
          
          '&:hover': {
            'background-color': theme('colors.primary.700'),
            'border-color': theme('colors.primary.700'),
            'box-shadow': theme('boxShadow.button-hover'),
          },
          
          '&:active': {
            'background-color': theme('colors.primary.800'),
            'border-color': theme('colors.primary.800'),
            'box-shadow': theme('boxShadow.0'),
          },
          
          '&:focus': {
            'outline': 'none',
            'box-shadow': theme('boxShadow.focus'),
          },
        },
        
        '.btn-secondary': {
          'background-color': 'transparent',
          'color': theme('colors.primary.DEFAULT'),
          'border': `1px solid ${theme('colors.primary.DEFAULT')}`,
          'border-radius': theme('borderRadius.button'),
          'height': theme('height.button'),
          'padding': '0 16px',
          'font-weight': theme('fontWeight.medium'),
          'font-size': theme('fontSize.base'),
          'line-height': theme('lineHeight.tight'),
          'transition': 'all 0.15s ease-out',
          
          '&:hover': {
            'background-color': theme('colors.primary.DEFAULT'),
            'color': theme('colors.text.inverse'),
          },
          
          '&:focus': {
            'outline': 'none',
            'box-shadow': theme('boxShadow.focus'),
          },
        },
        
        // Input styles with our design tokens
        '.input-base': {
          'background-color': theme('colors.surface.primary'),
          'border': `1px solid ${theme('colors.border.primary')}`,
          'border-radius': theme('borderRadius.input'),
          'height': theme('height.input'),
          'padding': '0 12px',
          'font-size': theme('fontSize.base'),
          'line-height': theme('lineHeight.normal'),
          'color': theme('colors.text.primary'),
          'transition': 'all 0.15s ease-out',
          
          '&:focus': {
            'outline': 'none',
            'border-color': theme('colors.border.focus'),
            'box-shadow': theme('boxShadow.focus'),
          },
          
          '&::placeholder': {
            'color': theme('colors.text.tertiary'),
          },
        },
        
        // Card styles with our design tokens
        '.card-base': {
          'background-color': theme('colors.surface.primary'),
          'border': `1px solid ${theme('colors.border.primary')}`,
          'border-radius': theme('borderRadius.card'),
          'padding': theme('spacing.6'),
          'box-shadow': theme('boxShadow.card'),
          'transition': 'all 0.15s ease-out',
          
          '&:hover': {
            'box-shadow': theme('boxShadow.card-hover'),
          },
        },
      };
      
      addUtilities(newUtilities);
    },
  ],
};