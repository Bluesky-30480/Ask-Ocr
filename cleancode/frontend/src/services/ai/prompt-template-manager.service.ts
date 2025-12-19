/**
 * Prompt Template Manager Service
 * Allows users to create, edit, and manage custom prompt templates
 */

import type { EnhancedPromptTemplate } from './enhanced-prompt.service';

export interface CustomPromptTemplate extends EnhancedPromptTemplate {
  id: string;
  isCustom: boolean;
  createdAt: string;
  updatedAt: string;
  author?: string;
  tags?: string[];
  isPublic?: boolean; // For sharing templates
  usageCount?: number;
  rating?: number; // User rating 1-5
}

export interface TemplateCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  templates: string[]; // Template IDs
}

export interface TemplateLibrary {
  categories: TemplateCategory[];
  templates: Map<string, CustomPromptTemplate>;
  userFavorites: string[]; // Template IDs
}

export class PromptTemplateManager {
  private readonly STORAGE_KEY = 'prompt_templates';
  private readonly CATEGORIES_KEY = 'template_categories';
  private readonly FAVORITES_KEY = 'template_favorites';

  private templates = new Map<string, CustomPromptTemplate>();
  private categories: TemplateCategory[] = [];
  private userFavorites: string[] = [];

  constructor() {
    this.loadFromStorage();
    this.initializeDefaultCategories();
  }

  /**
   * Initialize default template categories
   */
  private initializeDefaultCategories(): void {
    if (this.categories.length === 0) {
      this.categories = [
        {
          id: 'general',
          name: 'General Purpose',
          description: 'Templates for common OCR tasks',
          icon: '📄',
          templates: ['ocr_summarize', 'ocr_qa', 'ai_assistant'],
        },
        {
          id: 'technical',
          name: 'Technical & Code',
          description: 'Templates for technical documents and code',
          icon: '💻',
          templates: ['ocr_technical'],
        },
        {
          id: 'academic',
          name: 'Academic & Research',
          description: 'Templates for academic papers and research',
          icon: '🎓',
          templates: ['ocr_academic'],
        },
        {
          id: 'business',
          name: 'Business & Finance',
          description: 'Templates for business documents',
          icon: '💼',
          templates: ['ocr_business'],
        },
        {
          id: 'math',
          name: 'Mathematics',
          description: 'Templates for mathematical content',
          icon: '🔢',
          templates: ['ocr_math'],
        },
        {
          id: 'custom',
          name: 'My Templates',
          description: 'Your custom templates',
          icon: '⭐',
          templates: [],
        },
      ];
      this.saveCategoriesToStorage();
    }
  }

  /**
   * Create a new custom template
   */
  createTemplate(template: Omit<CustomPromptTemplate, 'id' | 'isCustom' | 'createdAt' | 'updatedAt'>): string {
    const id = this.generateTemplateId();
    const now = new Date().toISOString();

    const customTemplate: CustomPromptTemplate = {
      ...template,
      id,
      isCustom: true,
      createdAt: now,
      updatedAt: now,
      usageCount: 0,
      rating: 0,
    };

    this.templates.set(id, customTemplate);
    
    // Add to custom category
    const customCategory = this.categories.find(c => c.id === 'custom');
    if (customCategory && !customCategory.templates.includes(id)) {
      customCategory.templates.push(id);
    }

    this.saveToStorage();
    return id;
  }

  /**
   * Update an existing template
   */
  updateTemplate(id: string, updates: Partial<CustomPromptTemplate>): boolean {
    const template = this.templates.get(id);
    if (!template || !template.isCustom) {
      return false; // Can only update custom templates
    }

    const updatedTemplate: CustomPromptTemplate = {
      ...template,
      ...updates,
      id, // Preserve ID
      isCustom: true, // Preserve custom flag
      createdAt: template.createdAt, // Preserve creation date
      updatedAt: new Date().toISOString(),
    };

    this.templates.set(id, updatedTemplate);
    this.saveToStorage();
    return true;
  }

  /**
   * Delete a custom template
   */
  deleteTemplate(id: string): boolean {
    const template = this.templates.get(id);
    if (!template || !template.isCustom) {
      return false; // Can only delete custom templates
    }

    this.templates.delete(id);

    // Remove from categories
    this.categories.forEach(category => {
      const index = category.templates.indexOf(id);
      if (index > -1) {
        category.templates.splice(index, 1);
      }
    });

    // Remove from favorites
    const favIndex = this.userFavorites.indexOf(id);
    if (favIndex > -1) {
      this.userFavorites.splice(favIndex, 1);
    }

    this.saveToStorage();
    return true;
  }

  /**
   * Duplicate a template (create copy)
   */
  duplicateTemplate(id: string, newName?: string): string | null {
    const template = this.templates.get(id);
    if (!template) return null;

    const duplicatedTemplate = {
      ...template,
      name: newName || `${template.name} (Copy)`,
      author: 'User', // Mark as user-created
    };

    // Remove fields that should be regenerated
    delete (duplicatedTemplate as any).id;
    delete (duplicatedTemplate as any).createdAt;
    delete (duplicatedTemplate as any).updatedAt;
    delete (duplicatedTemplate as any).usageCount;
    delete (duplicatedTemplate as any).rating;

    return this.createTemplate(duplicatedTemplate);
  }

  /**
   * Get template by ID
   */
  getTemplate(id: string): CustomPromptTemplate | undefined {
    return this.templates.get(id);
  }

  /**
   * Get all templates
   */
  getAllTemplates(): CustomPromptTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get templates by category
   */
  getTemplatesByCategory(categoryId: string): CustomPromptTemplate[] {
    const category = this.categories.find(c => c.id === categoryId);
    if (!category) return [];

    return category.templates
      .map(id => this.templates.get(id))
      .filter((t): t is CustomPromptTemplate => t !== undefined);
  }

  /**
   * Get user's custom templates
   */
  getCustomTemplates(): CustomPromptTemplate[] {
    return this.getAllTemplates().filter(t => t.isCustom);
  }

  /**
   * Get favorite templates
   */
  getFavoriteTemplates(): CustomPromptTemplate[] {
    return this.userFavorites
      .map(id => this.templates.get(id))
      .filter((t): t is CustomPromptTemplate => t !== undefined);
  }

  /**
   * Add/remove template from favorites
   */
  toggleFavorite(id: string): boolean {
    const index = this.userFavorites.indexOf(id);
    if (index > -1) {
      this.userFavorites.splice(index, 1);
    } else {
      this.userFavorites.push(id);
    }
    this.saveFavoritesToStorage();
    return index === -1; // Return true if added, false if removed
  }

  /**
   * Check if template is favorite
   */
  isFavorite(id: string): boolean {
    return this.userFavorites.includes(id);
  }

  /**
   * Search templates
   */
  searchTemplates(query: string): CustomPromptTemplate[] {
    const searchTerm = query.toLowerCase();
    return this.getAllTemplates().filter(template => 
      template.name.toLowerCase().includes(searchTerm) ||
      template.description.toLowerCase().includes(searchTerm) ||
      template.domain?.toLowerCase().includes(searchTerm) ||
      template.tags?.some(tag => tag.toLowerCase().includes(searchTerm))
    );
  }

  /**
   * Get templates by domain
   */
  getTemplatesByDomain(domain: string): CustomPromptTemplate[] {
    return this.getAllTemplates().filter(t => t.domain === domain);
  }

  /**
   * Rate a template
   */
  rateTemplate(id: string, rating: number): boolean {
    if (rating < 1 || rating > 5) return false;
    
    const template = this.templates.get(id);
    if (!template) return false;

    template.rating = rating;
    this.saveToStorage();
    return true;
  }

  /**
   * Increment usage count
   */
  incrementUsage(id: string): void {
    const template = this.templates.get(id);
    if (template) {
      template.usageCount = (template.usageCount || 0) + 1;
      this.saveToStorage();
    }
  }

  /**
   * Get categories
   */
  getCategories(): TemplateCategory[] {
    return [...this.categories];
  }

  /**
   * Create custom category
   */
  createCategory(category: Omit<TemplateCategory, 'id' | 'templates'>): string {
    const id = this.generateCategoryId();
    const newCategory: TemplateCategory = {
      ...category,
      id,
      templates: [],
    };

    this.categories.push(newCategory);
    this.saveCategoriesToStorage();
    return id;
  }

  /**
   * Add template to category
   */
  addTemplateToCategory(templateId: string, categoryId: string): boolean {
    const category = this.categories.find(c => c.id === categoryId);
    if (!category || category.templates.includes(templateId)) {
      return false;
    }

    category.templates.push(templateId);
    this.saveCategoriesToStorage();
    return true;
  }

  /**
   * Export templates
   */
  exportTemplates(templateIds?: string[]): string {
    const templatesToExport = templateIds 
      ? templateIds.map(id => this.templates.get(id)).filter(Boolean)
      : this.getCustomTemplates();

    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      templates: templatesToExport,
      categories: this.categories.filter(c => c.id === 'custom' || 
        c.templates.some(tid => templateIds?.includes(tid))),
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import templates
   */
  importTemplates(jsonData: string): { success: boolean; imported: number; errors: string[] } {
    try {
      const data = JSON.parse(jsonData);
      const errors: string[] = [];
      let imported = 0;

      if (data.templates && Array.isArray(data.templates)) {
        for (const template of data.templates) {
          try {
            // Validate template structure
            if (this.validateTemplate(template)) {
              this.createTemplate(template);
              imported++;
            } else {
              errors.push(`Invalid template: ${template.name || 'Unknown'}`);
            }
          } catch (err) {
            errors.push(`Failed to import template: ${err instanceof Error ? err.message : 'Unknown error'}`);
          }
        }
      }

      return { success: true, imported, errors };
    } catch (err) {
      return { 
        success: false, 
        imported: 0, 
        errors: [`Invalid JSON format: ${err instanceof Error ? err.message : 'Unknown error'}`] 
      };
    }
  }

  /**
   * Validate template structure
   */
  private validateTemplate(template: any): boolean {
    return (
      typeof template.name === 'string' &&
      typeof template.systemPrompt === 'string' &&
      typeof template.userPromptTemplate === 'string' &&
      typeof template.description === 'string' &&
      Array.isArray(template.variables) &&
      typeof template.requiresContext === 'boolean' &&
      typeof template.multiTurnSupport === 'boolean'
    );
  }

  /**
   * Generate unique template ID
   */
  private generateTemplateId(): string {
    return `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique category ID
   */
  private generateCategoryId(): string {
    return `category_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Save templates to localStorage
   */
  private saveToStorage(): void {
    try {
      const templatesArray = Array.from(this.templates.entries());
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(templatesArray));
    } catch (err) {
      console.error('Failed to save templates to storage:', err);
    }
  }

  /**
   * Save categories to localStorage
   */
  private saveCategoriesToStorage(): void {
    try {
      localStorage.setItem(this.CATEGORIES_KEY, JSON.stringify(this.categories));
    } catch (err) {
      console.error('Failed to save categories to storage:', err);
    }
  }

  /**
   * Save favorites to localStorage
   */
  private saveFavoritesToStorage(): void {
    try {
      localStorage.setItem(this.FAVORITES_KEY, JSON.stringify(this.userFavorites));
    } catch (err) {
      console.error('Failed to save favorites to storage:', err);
    }
  }

  /**
   * Load templates from localStorage
   */
  private loadFromStorage(): void {
    try {
      // Load templates
      const templatesData = localStorage.getItem(this.STORAGE_KEY);
      if (templatesData) {
        const templatesArray = JSON.parse(templatesData);
        this.templates = new Map(templatesArray);
      }

      // Load categories
      const categoriesData = localStorage.getItem(this.CATEGORIES_KEY);
      if (categoriesData) {
        this.categories = JSON.parse(categoriesData);
      }

      // Load favorites
      const favoritesData = localStorage.getItem(this.FAVORITES_KEY);
      if (favoritesData) {
        this.userFavorites = JSON.parse(favoritesData);
      }
    } catch (err) {
      console.error('Failed to load templates from storage:', err);
    }
  }

  /**
   * Reset to defaults (clear all custom templates)
   */
  resetToDefaults(): void {
    this.templates.clear();
    this.userFavorites = [];
    this.initializeDefaultCategories();
    this.saveToStorage();
    this.saveCategoriesToStorage();
    this.saveFavoritesToStorage();
  }
}

// Singleton instance
export const promptTemplateManager = new PromptTemplateManager();