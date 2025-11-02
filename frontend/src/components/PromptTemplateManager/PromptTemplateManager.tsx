import React, { useState, useEffect } from 'react';
import { promptTemplateManager, type CustomPromptTemplate, type TemplateCategory } from '../../services/ai/prompt-template-manager.service';
import './PromptTemplateManager.css';

interface PromptTemplateManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate?: (templateId: string) => void;
}

type ViewMode = 'browse' | 'create' | 'edit' | 'import';

const PromptTemplateManager: React.FC<PromptTemplateManagerProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('browse');
  const [selectedCategory, setSelectedCategory] = useState<string>('general');
  const [templates, setTemplates] = useState<CustomPromptTemplate[]>([]);
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTemplate, setEditingTemplate] = useState<CustomPromptTemplate | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // Form state for creating/editing templates
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    systemPrompt: '',
    userPromptTemplate: '',
    domain: 'general' as 'general' | 'technical' | 'academic' | 'business' | 'math',
    requiresContext: false,
    multiTurnSupport: false,
    memoryDepth: 5,
    maxTokens: 500,
    temperature: 0.5,
    tags: [] as string[],
  });

  const extractVariablesFromTemplate = (template: string): string[] => {
    const matches = template.match(/\{\{(\w+)\}\}/g);
    if (!matches) return [];
    return matches.map(match => match.replace(/[{}]/g, ''));
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  useEffect(() => {
    loadTemplates();
  }, [selectedCategory, searchQuery, showFavoritesOnly]);

  const loadData = () => {
    setCategories(promptTemplateManager.getCategories());
    loadTemplates();
  };

  const loadTemplates = () => {
    let templateList: CustomPromptTemplate[];

    if (showFavoritesOnly) {
      templateList = promptTemplateManager.getFavoriteTemplates();
    } else if (searchQuery) {
      templateList = promptTemplateManager.searchTemplates(searchQuery);
    } else {
      templateList = promptTemplateManager.getTemplatesByCategory(selectedCategory);
    }

    setTemplates(templateList);
  };

  const handleCreateTemplate = () => {
    try {
      const templateData = {
        ...formData,
        type: 'custom' as const,
        variables: extractVariablesFromTemplate(formData.userPromptTemplate),
      };
      promptTemplateManager.createTemplate(templateData);
      setViewMode('browse');
      setSelectedCategory('custom');
      resetForm();
      loadData();
    } catch (err) {
      console.error('Failed to create template:', err);
    }
  };

  const handleUpdateTemplate = () => {
    if (!editingTemplate) return;

    try {
      const templateData = {
        ...formData,
        type: 'custom' as const,
        variables: extractVariablesFromTemplate(formData.userPromptTemplate),
      };
      promptTemplateManager.updateTemplate(editingTemplate.id, templateData);
      setViewMode('browse');
      setEditingTemplate(null);
      resetForm();
      loadData();
    } catch (err) {
      console.error('Failed to update template:', err);
    }
  };

  const handleDeleteTemplate = (templateId: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      promptTemplateManager.deleteTemplate(templateId);
      loadData();
    }
  };

  const handleDuplicateTemplate = (templateId: string) => {
    const newId = promptTemplateManager.duplicateTemplate(templateId);
    if (newId) {
      setSelectedCategory('custom');
      loadData();
    }
  };

  const handleToggleFavorite = (templateId: string) => {
    promptTemplateManager.toggleFavorite(templateId);
    loadData();
  };

  const handleEditTemplate = (template: CustomPromptTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description,
      systemPrompt: template.systemPrompt,
      userPromptTemplate: template.userPromptTemplate,
      domain: (template.domain === 'code' ? 'technical' : template.domain) || 'general',
      requiresContext: template.requiresContext,
      multiTurnSupport: template.multiTurnSupport,
      memoryDepth: template.memoryDepth || 5,
      maxTokens: template.maxTokens || 500,
      temperature: template.temperature || 0.5,
      tags: template.tags || [],
    });
    setViewMode('edit');
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      systemPrompt: '',
      userPromptTemplate: '',
      domain: 'general',
      requiresContext: false,
      multiTurnSupport: false,
      memoryDepth: 5,
      maxTokens: 500,
      temperature: 0.5,
      tags: [],
    });
  };

  const handleExportTemplates = () => {
    const customTemplates = promptTemplateManager.getCustomTemplates();
    const exportData = promptTemplateManager.exportTemplates(customTemplates.map(t => t.id));
    
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prompt-templates-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportTemplates = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const result = promptTemplateManager.importTemplates(content);
      
      if (result.success) {
        alert(`Successfully imported ${result.imported} templates!`);
        loadData();
      } else {
        alert(`Import failed: ${result.errors.join(', ')}`);
      }
    };
    reader.readAsText(file);
  };

  if (!isOpen) return null;

  return (
    <div className="template-manager-overlay" onClick={onClose}>
      <div className="template-manager-container" onClick={(e) => e.stopPropagation()}>
        <div className="template-manager-header">
          <h2>Prompt Template Library</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="template-manager-content">
          {/* Sidebar */}
          <div className="template-sidebar">
            <div className="sidebar-section">
              <h3>Views</h3>
              <button 
                className={`sidebar-btn ${viewMode === 'browse' ? 'active' : ''}`}
                onClick={() => setViewMode('browse')}
              >
                📚 Browse Templates
              </button>
              <button 
                className={`sidebar-btn ${viewMode === 'create' ? 'active' : ''}`}
                onClick={() => { setViewMode('create'); resetForm(); }}
              >
                ➕ Create New
              </button>
            </div>

            <div className="sidebar-section">
              <h3>Categories</h3>
              {categories.map(category => (
                <button
                  key={category.id}
                  className={`sidebar-btn ${selectedCategory === category.id ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(category.id)}
                >
                  {category.icon} {category.name}
                </button>
              ))}
            </div>

            <div className="sidebar-section">
              <h3>Actions</h3>
              <button className="sidebar-btn" onClick={handleExportTemplates}>
                📤 Export Templates
              </button>
              <label className="sidebar-btn file-input-label">
                📥 Import Templates
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportTemplates}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          </div>

          {/* Main Content */}
          <div className="template-main-content">
            {viewMode === 'browse' && (
              <div className="browse-view">
                <div className="browse-header">
                  <div className="search-controls">
                    <input
                      type="text"
                      placeholder="Search templates..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="search-input"
                    />
                    <label className="favorites-toggle">
                      <input
                        type="checkbox"
                        checked={showFavoritesOnly}
                        onChange={(e) => setShowFavoritesOnly(e.target.checked)}
                      />
                      ⭐ Favorites only
                    </label>
                  </div>
                </div>

                <div className="templates-grid">
                  {templates.map(template => (
                    <div key={template.id} className="template-card">
                      <div className="template-card-header">
                        <h4>{template.name}</h4>
                        <div className="template-actions">
                          <button
                            className={`favorite-btn ${promptTemplateManager.isFavorite(template.id) ? 'active' : ''}`}
                            onClick={() => handleToggleFavorite(template.id)}
                          >
                            ⭐
                          </button>
                          {onSelectTemplate && (
                            <button
                              className="select-btn"
                              onClick={() => onSelectTemplate(template.id)}
                            >
                              Use
                            </button>
                          )}
                        </div>
                      </div>
                      
                      <p className="template-description">{template.description}</p>
                      
                      <div className="template-meta">
                        <span className="template-domain">{template.domain}</span>
                        {template.isCustom && <span className="custom-badge">Custom</span>}
                        {template.usageCount && (
                          <span className="usage-count">Used {template.usageCount} times</span>
                        )}
                      </div>

                      <div className="template-card-actions">
                        {template.isCustom && (
                          <>
                            <button onClick={() => handleEditTemplate(template)}>
                              ✏️ Edit
                            </button>
                            <button onClick={() => handleDeleteTemplate(template.id)}>
                              🗑️ Delete
                            </button>
                          </>
                        )}
                        <button onClick={() => handleDuplicateTemplate(template.id)}>
                          📋 Duplicate
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(viewMode === 'create' || viewMode === 'edit') && (
              <div className="form-view">
                <h3>{viewMode === 'create' ? 'Create New Template' : 'Edit Template'}</h3>
                
                <div className="form-grid">
                  <div className="form-group">
                    <label>Template Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter template name"
                    />
                  </div>

                  <div className="form-group">
                    <label>Description</label>
                    <input
                      type="text"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Brief description of what this template does"
                    />
                  </div>

                  <div className="form-group">
                    <label>Domain</label>
                    <select
                      value={formData.domain}
                      onChange={(e) => setFormData({ ...formData, domain: e.target.value as any })}
                    >
                      <option value="general">General</option>
                      <option value="technical">Technical</option>
                      <option value="academic">Academic</option>
                      <option value="business">Business</option>
                      <option value="math">Mathematics</option>
                    </select>
                  </div>

                  <div className="form-group full-width">
                    <label>System Prompt</label>
                    <textarea
                      value={formData.systemPrompt}
                      onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                      placeholder="System instructions for the AI..."
                      rows={6}
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>User Prompt Template</label>
                    <textarea
                      value={formData.userPromptTemplate}
                      onChange={(e) => setFormData({ ...formData, userPromptTemplate: e.target.value })}
                      placeholder="Template with variables like {{ocrText}}, {{userQuery}}..."
                      rows={4}
                    />
                    <small>Available variables: {'{'}{'{'} ocrText {'}'}{'}'},  {'{'}{'{'} userQuery {'}'}{'}'},  {'{'}{'{'} conversationHistory {'}'}{'}'}  </small>
                  </div>

                  <div className="form-group">
                    <label>Max Tokens</label>
                    <input
                      type="number"
                      value={formData.maxTokens}
                      onChange={(e) => setFormData({ ...formData, maxTokens: parseInt(e.target.value) })}
                      min="50"
                      max="2000"
                    />
                  </div>

                  <div className="form-group">
                    <label>Temperature</label>
                    <input
                      type="number"
                      value={formData.temperature}
                      onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                      min="0"
                      max="1"
                      step="0.1"
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={formData.requiresContext}
                        onChange={(e) => setFormData({ ...formData, requiresContext: e.target.checked })}
                      />
                      Requires Context
                    </label>
                  </div>

                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={formData.multiTurnSupport}
                        onChange={(e) => setFormData({ ...formData, multiTurnSupport: e.target.checked })}
                      />
                      Multi-turn Support
                    </label>
                  </div>

                  {formData.multiTurnSupport && (
                    <div className="form-group">
                      <label>Memory Depth</label>
                      <input
                        type="number"
                        value={formData.memoryDepth}
                        onChange={(e) => setFormData({ ...formData, memoryDepth: parseInt(e.target.value) })}
                        min="1"
                        max="20"
                      />
                    </div>
                  )}
                </div>

                <div className="form-actions">
                  <button 
                    className="btn-primary"
                    onClick={viewMode === 'create' ? handleCreateTemplate : handleUpdateTemplate}
                  >
                    {viewMode === 'create' ? 'Create Template' : 'Update Template'}
                  </button>
                  <button 
                    className="btn-secondary"
                    onClick={() => { setViewMode('browse'); resetForm(); }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromptTemplateManager;