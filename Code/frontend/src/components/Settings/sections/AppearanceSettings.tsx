/**
 * Appearance Settings Section
 */

import React, { useState, useEffect } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';

type Theme = 'light' | 'dark' | 'auto';
type Density = 'compact' | 'regular' | 'spacious';

export const AppearanceSettings: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [accentColor, setAccentColor] = useState('#007aff');
  const [fontSize, setFontSize] = useState(14);
  const [density, setDensity] = useState<Density>('regular');
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [transparency, setTransparency] = useState(0.95);

  useEffect(() => {
    // Load saved appearance settings
    const savedAccentColor = localStorage.getItem('appearance_accent_color');
    const savedFontSize = localStorage.getItem('appearance_font_size');
    const savedDensity = localStorage.getItem('appearance_density') as Density;
    const savedAnimations = localStorage.getItem('appearance_animations');
    const savedTransparency = localStorage.getItem('appearance_transparency');

    if (savedAccentColor) setAccentColor(savedAccentColor);
    if (savedFontSize) setFontSize(parseInt(savedFontSize));
    if (savedDensity) setDensity(savedDensity);
    if (savedAnimations !== null) setAnimationsEnabled(savedAnimations === 'true');
    if (savedTransparency) setTransparency(parseFloat(savedTransparency));
  }, []);

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
  };

  const handleAccentColorChange = (color: string) => {
    setAccentColor(color);
    localStorage.setItem('appearance_accent_color', color);
    document.documentElement.style.setProperty('--accent-bg', color);
  };

  const handleFontSizeChange = (size: number) => {
    setFontSize(size);
    localStorage.setItem('appearance_font_size', size.toString());
    document.documentElement.style.setProperty('--base-font-size', `${size}px`);
  };

  const handleDensityChange = (newDensity: Density) => {
    setDensity(newDensity);
    localStorage.setItem('appearance_density', newDensity);
    // Apply density-specific styles
    document.documentElement.setAttribute('data-density', newDensity);
  };

  const handleAnimationsToggle = (enabled: boolean) => {
    setAnimationsEnabled(enabled);
    localStorage.setItem('appearance_animations', enabled.toString());
    
    if (!enabled) {
      document.documentElement.style.setProperty('--transition-duration', '0s');
    } else {
      document.documentElement.style.removeProperty('--transition-duration');
    }
  };

  const handleTransparencyChange = (value: number) => {
    setTransparency(value);
    localStorage.setItem('appearance_transparency', value.toString());
    document.documentElement.style.setProperty('--window-opacity', value.toString());
  };

  const accentColors = [
    { name: 'Blue', value: '#007aff' },
    { name: 'Purple', value: '#af52de' },
    { name: 'Pink', value: '#ff2d55' },
    { name: 'Red', value: '#ff3b30' },
    { name: 'Orange', value: '#ff9500' },
    { name: 'Yellow', value: '#ffcc00' },
    { name: 'Green', value: '#34c759' },
    { name: 'Teal', value: '#5ac8fa' },
  ];

  return (
    <div className="settings-section">
      <div className="settings-section-header">
        <h2 className="settings-section-title">Appearance</h2>
        <p className="settings-section-description">
          Customize the look and feel of Ask_Ocr
        </p>
      </div>

      {/* Theme */}
      <div className="settings-group">
        <h3 className="settings-group-title">Theme</h3>
        
        <div className="settings-item">
          <div className="settings-item-label">
            <div className="settings-item-title">Appearance</div>
            <div className="settings-item-description">Choose between light, dark, or automatic</div>
          </div>
          <div className="settings-item-control">
            <div className="theme-selector">
              <button
                className={`theme-option ${theme === 'light' ? 'active' : ''}`}
                onClick={() => handleThemeChange('light')}
              >
                <div className="theme-preview light">
                  <div className="theme-preview-bg"></div>
                  <div className="theme-preview-content"></div>
                </div>
                <span>Light</span>
              </button>
              <button
                className={`theme-option ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => handleThemeChange('dark')}
              >
                <div className="theme-preview dark">
                  <div className="theme-preview-bg"></div>
                  <div className="theme-preview-content"></div>
                </div>
                <span>Dark</span>
              </button>
              <button
                className={`theme-option ${theme === 'auto' ? 'active' : ''}`}
                onClick={() => handleThemeChange('auto')}
              >
                <div className="theme-preview auto">
                  <div className="theme-preview-bg light-half"></div>
                  <div className="theme-preview-bg dark-half"></div>
                  <div className="theme-preview-content"></div>
                </div>
                <span>Auto</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Accent Color */}
      <div className="settings-group">
        <h3 className="settings-group-title">Accent Color</h3>
        
        <div className="settings-item">
          <div className="settings-item-label">
            <div className="settings-item-title">Accent Color</div>
            <div className="settings-item-description">Choose your preferred accent color</div>
          </div>
          <div className="settings-item-control">
            <div className="color-palette">
              {accentColors.map((color) => (
                <button
                  key={color.value}
                  className={`color-swatch ${accentColor === color.value ? 'active' : ''}`}
                  style={{ backgroundColor: color.value }}
                  onClick={() => handleAccentColorChange(color.value)}
                  title={color.name}
                >
                  {accentColor === color.value && <span className="color-check">✓</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Typography */}
      <div className="settings-group">
        <h3 className="settings-group-title">Typography</h3>
        
        <div className="settings-item">
          <div className="settings-item-label">
            <div className="settings-item-title">Font Size</div>
            <div className="settings-item-description">Adjust the base font size ({fontSize}px)</div>
          </div>
          <div className="settings-item-control">
            <input
              type="range"
              className="slider-control"
              min="12"
              max="18"
              step="1"
              value={fontSize}
              onChange={(e) => handleFontSizeChange(parseInt(e.target.value))}
            />
          </div>
        </div>
      </div>

      {/* Layout */}
      <div className="settings-group">
        <h3 className="settings-group-title">Layout</h3>
        
        <div className="settings-item">
          <div className="settings-item-label">
            <div className="settings-item-title">UI Density</div>
            <div className="settings-item-description">Adjust the spacing and size of UI elements</div>
          </div>
          <div className="settings-item-control">
            <select
              className="select-control"
              value={density}
              onChange={(e) => handleDensityChange(e.target.value as Density)}
            >
              <option value="compact">Compact</option>
              <option value="regular">Regular</option>
              <option value="spacious">Spacious</option>
            </select>
          </div>
        </div>

        <div className="settings-item">
          <div className="settings-item-label">
            <div className="settings-item-title">Window Transparency</div>
            <div className="settings-item-description">Adjust window opacity ({Math.round(transparency * 100)}%)</div>
          </div>
          <div className="settings-item-control">
            <input
              type="range"
              className="slider-control"
              min="0.7"
              max="1.0"
              step="0.05"
              value={transparency}
              onChange={(e) => handleTransparencyChange(parseFloat(e.target.value))}
            />
          </div>
        </div>
      </div>

      {/* Animations */}
      <div className="settings-group">
        <h3 className="settings-group-title">Animations</h3>
        
        <div className="settings-item">
          <div className="settings-item-label">
            <div className="settings-item-title">Enable Animations</div>
            <div className="settings-item-description">Show smooth transitions and animations</div>
          </div>
          <div className="settings-item-control">
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={animationsEnabled}
                onChange={(e) => handleAnimationsToggle(e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
