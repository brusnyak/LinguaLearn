// Smart Import Service - Supports any format with AI-powered parsing and data cleanup
import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import type { Word } from '../types';
import { smartImportWords } from './openrouter';

export interface ImportResult {
    success: boolean;
    words: Word[];
    errors: string[];
    warnings: string[];
    imported: number;
    skipped: number;
    detectedFormat?: string;
    aiPowered?: boolean;
    cleanupStats?: CleanupStats;
}

export interface CleanupStats {
    duplicatesRemoved: number;
    emptyEntriesRemoved: number;
    trimmedEntries: number;
    normalizedEntries: number;
}

export interface ImportOptions {
    aiFallback?: boolean;
    cleanup?: boolean;
    skipDuplicates?: boolean;
    detectLanguage?: boolean;
}

const DEFAULT_OPTIONS: ImportOptions = {
    aiFallback: true,
    cleanup: true,
    skipDuplicates: true,
    detectLanguage: false,
};

// Known dictionary export formats
const SUPPORTED_FORMATS = {
    csv: 'CSV (Comma Separated)',
    tsv: 'TSV (Tab Separated)',
    xlsx: 'Excel (XLSX)',
    xls: 'Excel (XLS)',
    json: 'JSON',
    txt: 'Plain Text',
    text: 'Plain Text',
    xml: 'XML',
    html: 'HTML',
    htm: 'HTML',
    markdown: 'Markdown',
    md: 'Markdown',
    anki: 'Anki Export',
    quizlet: 'Quizlet Export',
};

/**
 * Main entry point - import from any file format
 */
export async function smartImportFromFile(
    file: File,
    options: ImportOptions = DEFAULT_OPTIONS
): Promise<ImportResult> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    
    try {
        // Read file content
        const content = await readFileContent(file);
        
        // Detect format if not obvious
        const detectedFormat = detectFormat(file.name, content);
        
        // Parse based on format
        let result: ImportResult;
        
        switch (detectedFormat) {
            case 'xlsx':
            case 'xls':
                result = await importFromExcel(file);
                break;
            case 'csv':
            case 'tsv':
                result = importFromCSV(content, detectedFormat);
                break;
            case 'json':
                result = importFromJSON(content);
                break;
            case 'xml':
                result = importFromXML(content);
                break;
            case 'html':
            case 'htm':
                result = importFromHTML(content);
                break;
            case 'markdown':
            case 'md':
                result = importFromMarkdown(content);
                break;
            case 'txt':
            case 'text':
            default:
                result = importFromText(content);
                break;
        }
        
        result.detectedFormat = detectedFormat;
        
        // Apply data cleanup
        if (opts.cleanup && result.words.length > 0) {
            const cleanupResult = cleanupWords(result.words, opts);
            result.words = cleanupResult.words;
            result.cleanupStats = cleanupResult.stats;
            result.imported = cleanupResult.words.length;
            result.skipped += cleanupResult.removed;
        }
        
        // AI fallback if parsing failed or found few words
        if (opts.aiFallback && (!result.success || result.imported < 2)) {
            const aiResult = await attemptAIParse(content, file.name, detectedFormat);
            if (aiResult.words.length > result.words.length) {
                result = aiResult;
                result.detectedFormat = detectedFormat + ' (AI-enhanced)';
            }
        }
        
        return result;
    } catch (error: any) {
        return {
            success: false,
            words: [],
            errors: [`Import failed: ${error.message}`],
            warnings: [],
            imported: 0,
            skipped: 0,
        };
    }
}

/**
 * Read file content as text or ArrayBuffer
 */
async function readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}

/**
 * Detect file format from content and filename
 */
function detectFormat(filename: string, content: string): string {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    
    // Check by extension first
    if (['xlsx', 'xls', 'csv', 'tsv', 'json', 'xml', 'html', 'htm', 'md', 'markdown', 'txt', 'text'].includes(ext)) {
        return ext;
    }
    
    // Detect by content
    const trimmed = content.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'json';
    if (trimmed.startsWith('<?xml') || trimmed.startsWith('<')) return 'xml';
    if (trimmed.startsWith('<!DOCTYPE') || trimmed.includes('<html')) return 'html';
    if (content.includes('|') && content.split('\n').some(line => line.includes('|'))) return 'markdown';
    if (content.includes('\t')) return 'tsv';
    
    return 'txt';
}

/**
 * Import from Excel files
 */
async function importFromExcel(file: File): Promise<ImportResult> {
    const result: ImportResult = {
        success: false,
        words: [],
        errors: [],
        warnings: [],
        imported: 0,
        skipped: 0,
    };
    
    try {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        if (jsonData.length < 2) {
            result.errors.push('Excel file must have a header row and at least one data row');
            return result;
        }
        
        const headers = jsonData[0].map(h => String(h || '').trim().toLowerCase());
        const termCol = findColumnIndex(headers, ['term', 'word', 'english', 'en', 'source', 'front', 'question']);
        const translationCol = findColumnIndex(headers, ['translation', 'ukrainian', 'uk', 'target', 'native', 'back', 'answer', 'definition']);
        const categoryCol = findColumnIndex(headers, ['category', 'type', 'group', 'tag', 'tags']);
        const associationCol = findColumnIndex(headers, ['association', 'hint', 'mnemonic', 'note', 'notes', 'description']);
        
        if (termCol === -1 || translationCol === -1) {
            // Try to use first two columns
            if (headers.length >= 2) {
                return parseExcelColumns(jsonData, 0, 1, -1, -1);
            }
            result.errors.push('Could not detect term and translation columns');
            return result;
        }
        
        return parseExcelColumns(jsonData, termCol, translationCol, categoryCol, associationCol);
    } catch (error: any) {
        result.errors.push(`Excel import failed: ${error.message}`);
        return result;
    }
}

function parseExcelColumns(data: any[][], termCol: number, transCol: number, catCol: number, assocCol: number): ImportResult {
    const result: ImportResult = {
        success: false,
        words: [],
        errors: [],
        warnings: [],
        imported: 0,
        skipped: 0,
    };
    
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length === 0) continue;
        
        const term = String(row[termCol] || '').trim();
        const translation = String(row[transCol] || '').trim();
        
        if (!term || !translation) {
            result.skipped++;
            continue;
        }
        
        result.words.push({
            id: uuidv4(),
            term,
            translation,
            category: catCol >= 0 ? String(row[catCol] || 'Other').trim() : 'Other',
            type: 'word',
            masteryLevel: 0,
            lastReviewed: 0,
            timesCorrect: 0,
            isMastered: false,
            association: assocCol >= 0 ? String(row[assocCol] || '').trim() : '',
            createdAt: Date.now(),
        });
        result.imported++;
    }
    
    result.success = result.imported > 0;
    return result;
}

/**
 * Import from CSV/TSV
 */
function importFromCSV(content: string, format: string = 'csv'): ImportResult {
    const separator = format === 'tsv' ? '\t' : ',';
    const lines = content.split(/\r?\n/).filter(line => line.trim());
    
    if (lines.length < 2) {
        return {
            success: false,
            words: [],
            errors: ['File must have a header row and at least one data row'],
            warnings: [],
            imported: 0,
            skipped: 0,
        };
    }
    
    const headers = parseCSVLine(lines[0], separator).map(h => h.toLowerCase().trim());
    const termCol = findColumnIndex(headers, ['term', 'word', 'english', 'en', 'source', 'front', 'question']);
    const translationCol = findColumnIndex(headers, ['translation', 'ukrainian', 'uk', 'target', 'native', 'back', 'answer', 'definition']);
    const categoryCol = findColumnIndex(headers, ['category', 'type', 'group', 'tag', 'tags']);
    const associationCol = findColumnIndex(headers, ['association', 'hint', 'mnemonic', 'note', 'notes', 'description']);
    
    const result: ImportResult = {
        success: false,
        words: [],
        errors: [],
        warnings: [],
        imported: 0,
        skipped: 0,
    };
    
    if (termCol === -1 || translationCol === -1) {
        // Try first two columns
        if (headers.length >= 2) {
            return parseCSVLines(lines, 0, 1, -1, -1, separator);
        }
        result.errors.push('Could not detect term and translation columns');
        return result;
    }
    
    return parseCSVLines(lines, termCol, translationCol, categoryCol, associationCol, separator);
}

function parseCSVLines(lines: string[], termCol: number, transCol: number, catCol: number, assocCol: number, separator: string): ImportResult {
    const result: ImportResult = {
        success: false,
        words: [],
        errors: [],
        warnings: [],
        imported: 0,
        skipped: 0,
    };
    
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i], separator);
        const term = (values[termCol] || '').trim();
        const translation = (values[transCol] || '').trim();
        
        if (!term || !translation) {
            result.skipped++;
            continue;
        }
        
        result.words.push({
            id: uuidv4(),
            term,
            translation,
            category: catCol >= 0 ? (values[catCol] || 'Other').trim() : 'Other',
            type: 'word',
            masteryLevel: 0,
            lastReviewed: 0,
            timesCorrect: 0,
            isMastered: false,
            association: assocCol >= 0 ? (values[assocCol] || '').trim() : '',
            createdAt: Date.now(),
        });
        result.imported++;
    }
    
    result.success = result.imported > 0;
    return result;
}

/**
 * Import from JSON
 */
function importFromJSON(content: string): ImportResult {
    const result: ImportResult = {
        success: false,
        words: [],
        errors: [],
        warnings: [],
        imported: 0,
        skipped: 0,
    };
    
    try {
        const data = JSON.parse(content);
        const items = Array.isArray(data) ? data : data.words || data.items || data.data || [data];
        
        for (const item of items) {
            const term = item.term || item.word || item.english || item.front || item.question || '';
            const translation = item.translation || item.ukrainian || item.definition || item.back || item.answer || '';
            
            if (!term || !translation) {
                result.skipped++;
                continue;
            }
            
            result.words.push({
                id: uuidv4(),
                term: String(term).trim(),
                translation: String(translation).trim(),
                category: item.category || item.type || item.group || 'Other',
                type: 'word',
                masteryLevel: 0,
                lastReviewed: 0,
                timesCorrect: 0,
                isMastered: false,
                association: item.association || item.hint || item.note || '',
                createdAt: Date.now(),
            });
            result.imported++;
        }
        
        result.success = result.imported > 0;
    } catch (error: any) {
        result.errors.push(`JSON parse error: ${error.message}`);
    }
    
    return result;
}

/**
 * Import from XML
 */
function importFromXML(content: string): ImportResult {
    const result: ImportResult = {
        success: false,
        words: [],
        errors: [],
        warnings: [],
        imported: 0,
        skipped: 0,
    };
    
    try {
        // Simple XML parsing - extract text content between tags
        const wordPairs = extractXMLWordPairs(content);
        
        if (wordPairs.length === 0) {
            result.errors.push('No word pairs found in XML');
            return result;
        }
        
        for (const pair of wordPairs) {
            if (!pair.term || !pair.translation) {
                result.skipped++;
                continue;
            }
            
            result.words.push({
                id: uuidv4(),
                term: pair.term.trim(),
                translation: pair.translation.trim(),
                category: pair.category || 'Other',
                type: 'word',
                masteryLevel: 0,
                lastReviewed: 0,
                timesCorrect: 0,
                isMastered: false,
                association: pair.association || '',
                createdAt: Date.now(),
            });
            result.imported++;
        }
        
        result.success = result.imported > 0;
    } catch (error: any) {
        result.errors.push(`XML parse error: ${error.message}`);
    }
    
    return result;
}

/**
 * Import from HTML
 */
function importFromHTML(content: string): ImportResult {
    // Strip HTML tags and treat as text
    const text = content
        .replace(/<script[^>]*>.*?<\/script>/gs, '')
        .replace(/<style[^>]*>.*?<\/style>/gs, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    
    return importFromText(text);
}

/**
 * Import from Markdown
 */
function importFromMarkdown(content: string): ImportResult {
    // Parse markdown tables and lists
    const lines = content.split('\n');
    const words: Array<{term: string, translation: string}> = [];
    
    // Look for tables (| separated)
    for (const line of lines) {
        if (line.includes('|') && !line.match(/^\s*\|[-:\s|]+\|\s*$/)) {
            const cells = line.split('|').map(c => c.trim()).filter(c => c);
            if (cells.length >= 2) {
                words.push({ term: cells[0], translation: cells[1] });
            }
        }
    }
    
    // Look for list items with separators
    if (words.length === 0) {
        return importFromText(content);
    }
    
    const result: ImportResult = {
        success: false,
        words: [],
        errors: [],
        warnings: [],
        imported: 0,
        skipped: 0,
    };
    
    for (const pair of words) {
        result.words.push({
            id: uuidv4(),
            term: pair.term,
            translation: pair.translation,
            category: 'Other',
            type: 'word',
            masteryLevel: 0,
            lastReviewed: 0,
            timesCorrect: 0,
            isMastered: false,
            association: '',
            createdAt: Date.now(),
        });
        result.imported++;
    }
    
    result.success = result.imported > 0;
    return result;
}

/**
 * Import from plain text
 */
function importFromText(content: string): ImportResult {
    const result: ImportResult = {
        success: false,
        words: [],
        errors: [],
        warnings: [],
        imported: 0,
        skipped: 0,
    };
    
    const lines = content.split(/\r?\n/).filter(line => line.trim() && !line.trim().startsWith('#') && !line.trim().startsWith('//'));
    
    for (const line of lines) {
        const trimmed = line.trim();
        let term = '', translation = '';
        
        // Try different separators
        const separators = ['=', '::', ' - ', ':', '\t', '|', '->', '→'];
        
        for (const sep of separators) {
            if (trimmed.includes(sep)) {
                const parts = trimmed.split(sep);
                term = parts[0].trim();
                translation = parts.slice(1).join(sep).trim();
                break;
            }
        }
        
        if (!term || !translation) {
            result.skipped++;
            continue;
        }
        
        // Validate it's not a sentence
        if (term.split(/\s+/).length > 4 || translation.split(/\s+/).length > 4) {
            result.warnings.push(`Skipped possible sentence: ${term.substring(0, 30)}...`);
            result.skipped++;
            continue;
        }
        
        result.words.push({
            id: uuidv4(),
            term,
            translation,
            category: 'Other',
            type: 'word',
            masteryLevel: 0,
            lastReviewed: 0,
            timesCorrect: 0,
            isMastered: false,
            association: '',
            createdAt: Date.now(),
        });
        result.imported++;
    }
    
    result.success = result.imported > 0;
    return result;
}

/**
 * Data cleanup pipeline
 */
function cleanupWords(words: Word[], options: ImportOptions): { words: Word[], stats: CleanupStats, removed: number } {
    const stats: CleanupStats = {
        duplicatesRemoved: 0,
        emptyEntriesRemoved: 0,
        trimmedEntries: 0,
        normalizedEntries: 0,
    };
    
    let cleaned = [...words];
    
    // Remove empty entries
    const beforeEmpty = cleaned.length;
    cleaned = cleaned.filter(w => w.term && w.translation);
    stats.emptyEntriesRemoved = beforeEmpty - cleaned.length;
    
    // Trim all entries
    cleaned = cleaned.map(w => ({
        ...w,
        term: w.term.trim(),
        translation: w.translation.trim(),
        category: w.category.trim(),
        association: w.association?.trim() || '',
    }));
    stats.trimmedEntries = cleaned.length;
    
    // Remove duplicates
    if (options.skipDuplicates) {
        const seen = new Set<string>();
        const beforeDup = cleaned.length;
        cleaned = cleaned.filter(w => {
            const key = `${w.term.toLowerCase()}:${w.translation.toLowerCase()}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
        stats.duplicatesRemoved = beforeDup - cleaned.length;
    }
    
    // Normalize case (capitalize first letter of term)
    cleaned = cleaned.map(w => ({
        ...w,
        term: w.term.charAt(0).toUpperCase() + w.term.slice(1).toLowerCase(),
    }));
    stats.normalizedEntries = cleaned.length;
    
    return { words: cleaned, stats, removed: words.length - cleaned.length };
}

/**
 * Helper: Find column index by possible names
 */
function findColumnIndex(headers: string[], possibleNames: string[]): number {
    for (const name of possibleNames) {
        const index = headers.indexOf(name.toLowerCase());
        if (index !== -1) return index;
    }
    // Partial match
    for (const name of possibleNames) {
        const index = headers.findIndex(h => h.includes(name.toLowerCase()) || name.toLowerCase().includes(h));
        if (index !== -1) return index;
    }
    return -1;
}

/**
 * Helper: Parse CSV/TSV line
 */
function parseCSVLine(line: string, separator: string = ','): string[] {
    if (separator === ',') {
        // Handle quoted CSV
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (inQuotes) {
                if (char === '"' && line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else if (char === '"') {
                    inQuotes = false;
                } else {
                    current += char;
                }
            } else {
                if (char === '"') {
                    inQuotes = true;
                } else if (char === separator) {
                    result.push(current);
                    current = '';
                } else {
                    current += char;
                }
            }
        }
        result.push(current);
        return result;
    }
    
    return line.split(separator).map(s => s.trim());
}

/**
 * Extract word pairs from XML
 */
function extractXMLWordPairs(content: string): Array<{term: string, translation: string, category?: string, association?: string}> {
    const pairs: Array<{term: string, translation: string, category?: string, association?: string}> = [];
    
    // Match common XML patterns
    const wordRegex = /<word[^>]*>([\s\S]*?)<\/word>|<entry[^>]*>([\s\S]*?)<\/entry>|<item[^>]*>([\s\S]*?)<\/item>/g;
    let match;
    
    while ((match = wordRegex.exec(content)) !== null) {
        const inner = match[1] || match[2] || match[3] || '';
        const term = extractXMLTag(inner, 'term') || extractXMLTag(inner, 'word') || extractXMLTag(inner, 'english') || extractXMLTag(inner, 'front');
        const translation = extractXMLTag(inner, 'translation') || extractXMLTag(inner, 'ukrainian') || extractXMLTag(inner, 'definition') || extractXMLTag(inner, 'back');
        
        if (term && translation) {
            pairs.push({
                term: cleanXMLText(term),
                translation: cleanXMLText(translation),
                category: extractXMLTag(inner, 'category'),
                association: extractXMLTag(inner, 'association'),
            });
        }
    }
    
    return pairs;
}

function extractXMLTag(content: string, tag: string): string {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
    const match = content.match(regex);
    return match ? match[1] : '';
}

function cleanXMLText(text: string): string {
    return text.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').replace(/<[^>]+>/g, '').trim();
}

/**
 * AI-powered parsing fallback
 */
async function attemptAIParse(content: string, filename: string, format: string): Promise<ImportResult> {
    try {
        // Map format to the types expected by smartImportWords
        const fileTypeMap: Record<string, 'csv' | 'excel' | 'text'> = {
            'csv': 'csv',
            'tsv': 'csv',
            'xlsx': 'excel',
            'xls': 'excel',
            'json': 'text',
            'xml': 'text',
            'html': 'text',
            'htm': 'text',
            'md': 'text',
            'markdown': 'text',
            'txt': 'text',
            'text': 'text',
        };
        const fileType: 'csv' | 'excel' | 'text' = fileTypeMap[format] || 'text';
        
        const aiResult = await smartImportWords(content, filename, fileType);
        
        const result: ImportResult = {
            success: false,
            words: [],
            errors: aiResult.errors || [],
            warnings: [],
            imported: 0,
            skipped: 0,
            aiPowered: true,
        };
        
        for (const item of aiResult.words || []) {
            if (!item.term || !item.translation) {
                result.skipped++;
                continue;
            }
            
            result.words.push({
                id: uuidv4(),
                term: item.term,
                translation: item.translation,
                category: item.category || 'Other',
                type: 'word',
                masteryLevel: 0,
                lastReviewed: 0,
                timesCorrect: 0,
                isMastered: false,
                association: '',
                createdAt: Date.now(),
            });
            result.imported++;
        }
        
        result.success = result.imported > 0;
        return result;
    } catch (error: any) {
        return {
            success: false,
            words: [],
            errors: [`AI parsing failed: ${error.message}`],
            warnings: [],
            imported: 0,
            skipped: 0,
        };
    }
}

/**
 * Create sample templates for different formats
 */
export function createTemplate(format: string): string {
    switch (format) {
        case 'csv':
            return 'term,translation,category,association\nHello,Привіт,Greetings,Think of heavily - says hi\nGoodbye,До побачення,Farewells,';
        case 'json':
            return JSON.stringify([
                { term: 'Hello', translation: 'Привіт', category: 'Greetings' },
                { term: 'Goodbye', translation: 'До побачення', category: 'Farewells' }
            ], null, 2);
        case 'txt':
            return 'Hello=Привіт\nGoodbye=До побачення\nThank you=Дякую';
        default:
            return 'term,translation,category\nHello,Привіт,Greetings';
    }
}

export { SUPPORTED_FORMATS };
