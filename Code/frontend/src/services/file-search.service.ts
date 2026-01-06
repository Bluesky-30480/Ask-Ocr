import { invoke } from '@tauri-apps/api/tauri';

export interface SearchResult {
    path: string;
    name: string;
    size: number;
    modified: number;
    is_dir: boolean;
    snippet?: string;
}

export interface FileSearchOptions {
    query: string;
    path?: string;
    max_results: number;
    file_types?: string[];
}

export interface FileMetadata {
    mime_type: string;
    width?: number;
    height?: number;
    line_count?: number;
    word_count?: number;
    created?: number;
    accessed?: number;
}

class FileSearchService {
    async searchFiles(options: FileSearchOptions): Promise<SearchResult[]> {
        try {
            return await invoke('search_files', { options });
        } catch (error) {
            console.error('Error searching files:', error);
            throw error;
        }
    }

    async readFileContent(path: string): Promise<string> {
        try {
            return await invoke('read_file_content', { path });
        } catch (error) {
            console.error('Error reading file:', error);
            throw error;
        }
    }

    async getFileMetadata(path: string): Promise<FileMetadata> {
        try {
            return await invoke('get_file_metadata', { path });
        } catch (error) {
            console.error('Error getting file metadata:', error);
            throw error;
        }
    }

    formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    formatDate(timestamp: number): string {
        // Rust sends unix timestamp in seconds usually, but let's verify if it's ms or s.
        // Standard fs metadata is usually seconds or nanoseconds. 
        // Assuming seconds for now based on typical Rust SystemTime to unix timestamp conversion.
        // If the backend sends ms, this will need adjustment.
        return new Date(timestamp * 1000).toLocaleDateString() + ' ' + new Date(timestamp * 1000).toLocaleTimeString();
    }
}

export const fileSearchService = new FileSearchService();
