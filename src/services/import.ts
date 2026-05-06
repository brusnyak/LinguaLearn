// Import service for words from CSV and Excel files
import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import type { Word } from '../types';
import { smartImportWords } from './openrouter';

export interface ImportResult {
    success: boolean;
    words: Word[];
    errors: string[];
    imported: number;
    skipped: number;
    detectedFormat?: string;
    aiPowered?: boolean;
}

// Expected column names (flexible matching)
const TERM_COLUMNS = ['term', 'word', 'english', 'en', 'source'];
const TRANSLATION_COLUMNS = ['translation', 'word_uk', 'ukrainian', 'uk', 'target', 'native'];
const CATEGORY_COLUMNS = ['category', 'type', 'group'];
const ASSOCIATION_COLUMNS = ['association', 'hint', 'mnemonic', 'note', 'notes'];

/**
 * Find column by flexible name matching
 */
function findColumn(headers: string[], possibleNames: string[]): string | null {
    const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
    for (const name of possibleNames) {
        const index = normalizedHeaders.indexOf(name.toLowerCase());
        if (index !== -1) {
            return headers[index];
        }
    }
    for (const header of headers) {
        const h = header.toLowerCase().trim();
        for (const name of possibleNames) {
            if (h.includes(name.toLowerCase()) || name.toLowerCase().includes(h)) {
                return header;
            }
        }
    }
    return null;
}

/**
 * Parse a value as string
 */
function parseStringValue(value: any): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number') return String(value);
    return String(value);
}

/**
 * Parse a single CSV line handling quoted fields
 */
function parseCSVLine(line: string): string[] {
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
            } else if (char === ',') {
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

/**
 * Import words from CSV string
 */
export function importFromCSV(csvContent: string): ImportResult {
    const result: ImportResult = {
        success: false,
        words: [],
        errors: [],
        imported: 0,
        skipped: 0,
    };

    try {
        const lines = csvContent.split(/\r?\n/).filter(line => line.trim());
        if (lines.length < 2) {
            result.errors.push('CSV file must have a header row and at least one data row');
            return result;
        }

        const headers = parseCSVLine(lines[0]);
        const termCol = findColumn(headers, TERM_COLUMNS);
        const translationCol = findColumn(headers, TRANSLATION_COLUMNS);
        const categoryCol = findColumn(headers, CATEGORY_COLUMNS);
        const associationCol = findColumn(headers, ASSOCIATION_COLUMNS);

        // If standard columns not found, try to parse as synonym pairs
        if (!termCol || !translationCol) {
            // Check if we have 4+ columns (potential synonym pairs format)
            const nonEmptyHeaders = headers
                .map((h, i) => ({ header: h, index: i }))
                .filter(item => item.header && item.header.trim() !== '');
            
            if (nonEmptyHeaders.length >= 4) {
                // Assume pairs: (col1, col2), (col3, col4), etc.
                return parseCSVSynonymPairs(lines);
            }
            
            if (!termCol) {
                result.errors.push('Could not find term/word column. Expected: term, word, english, en');
            }
            if (!translationCol) {
                result.errors.push('Could not find translation column. Expected: translation, word_uk, ukrainian, uk, target');
            }
            return result;
        }

        const termIndex = headers.indexOf(termCol);
        const translationIndex = headers.indexOf(translationCol);
        const categoryIndex = categoryCol ? headers.indexOf(categoryCol) : -1;
        const associationIndex = associationCol ? headers.indexOf(associationCol) : -1;

        for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i]);
            const term = parseStringValue(values[termIndex]);
            const translation = parseStringValue(values[translationIndex]);

            if (!term || !translation) {
                result.skipped++;
                continue;
            }

            const word: Word = {
                id: uuidv4(),
                term,
                translation,
                category: categoryCol && categoryIndex >= 0 ? parseStringValue(values[categoryIndex]) : 'Other',
                type: 'word',
                masteryLevel: 0,
                lastReviewed: 0,
                timesCorrect: 0,
                isMastered: false,
                association: associationCol && associationIndex >= 0 ? parseStringValue(values[associationIndex]) : '',
                createdAt: Date.now(),
            };

            result.words.push(word);
            result.imported++;
        }

        result.success = result.imported > 0;
    } catch (error: any) {
        result.errors.push('Failed to parse CSV: ' + error.message);
    }

    return result;
}

/**
 * Parse CSV with synonym pairs format (4+ columns, pairs of synonyms)
 */
function parseCSVSynonymPairs(lines: string[]): ImportResult {
    const result: ImportResult = {
        success: false,
        words: [],
        errors: [],
        imported: 0,
        skipped: 0,
    };

    const headers = parseCSVLine(lines[0]);
    
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        
        // Process pairs: (0,1), (2,3), (4,5), etc.
        for (let j = 0; j < headers.length - 1; j += 2) {
            const term = parseStringValue(values[j]);
            const translation = parseStringValue(values[j + 1]);

            if (!term || !translation) {
                result.skipped++;
                continue;
            }

            const word: Word = {
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
            };

            result.words.push(word);
            result.imported++;
        }
    }

    result.success = result.imported > 0;
    if (!result.success) {
        result.errors.push('No valid word pairs found in the file');
    }
    return result;
}

/**
 * Import words from Excel file (ArrayBuffer)
 */
export function importFromExcel(buffer: ArrayBuffer): ImportResult {
    const result: ImportResult = {
        success: false,
        words: [],
        errors: [],
        imported: 0,
        skipped: 0,
    };

    try {
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        if (jsonData.length < 2) {
            result.errors.push('Excel file must have a header row and at least one data row');
            return result;
        }

        // Filter out empty rows and clean headers
        const validRows = jsonData.filter(row => row && row.some(cell => cell !== undefined && cell !== null && cell !== ''));
        
        if (validRows.length < 2) {
            result.errors.push('No valid data rows found in Excel file');
            return result;
        }

        const headers = validRows[0].map(h => h !== undefined && h !== null ? String(h).trim() : '');
        const termCol = findColumn(headers, TERM_COLUMNS);
        const translationCol = findColumn(headers, TRANSLATION_COLUMNS);
        const categoryCol = findColumn(headers, CATEGORY_COLUMNS);
        const associationCol = findColumn(headers, ASSOCIATION_COLUMNS);

        if (!termCol || !translationCol) {
            // If standard columns not found, try to intelligently parse the data
            // Assume first two non-empty columns are term and translation
            const nonEmptyCols = headers
                .map((h, i) => ({ header: h, index: i }))
                .filter(item => item.header && item.header !== '');
            
            if (nonEmptyCols.length >= 2) {
                // Try to parse as synonym pairs (col1=synonym1, col2=synonym2, col3=synonym3, col4=synonym4)
                return parseSynonymPairs(validRows, nonEmptyCols.map(c => c.index));
            }
            
            if (!termCol) {
                result.errors.push('Could not find term/word column. Expected: term, word, english, en');
            }
            if (!translationCol) {
                result.errors.push('Could not find translation column. Expected: translation, word_uk, ukrainian, uk, target');
            }
            return result;
        }

        const termIndex = headers.indexOf(termCol);
        const translationIndex = headers.indexOf(translationCol);
        const categoryIndex = categoryCol ? headers.indexOf(categoryCol) : -1;
        const associationIndex = associationCol ? headers.indexOf(associationCol) : -1;

        for (let i = 1; i < validRows.length; i++) {
            const row = validRows[i];
            if (!row) continue;
            
            const term = parseStringValue(row[termIndex]);
            const translation = parseStringValue(row[translationIndex]);

            if (!term || !translation) {
                result.skipped++;
                continue;
            }

            const word: Word = {
                id: uuidv4(),
                term,
                translation,
                category: categoryIndex >= 0 ? parseStringValue(row[categoryIndex]) : 'Other',
                type: 'word',
                masteryLevel: 0,
                lastReviewed: 0,
                timesCorrect: 0,
                isMastered: false,
                association: associationIndex >= 0 ? parseStringValue(row[associationIndex]) : '',
                createdAt: Date.now(),
            };

            result.words.push(word);
            result.imported++;
        }

        result.success = result.imported > 0;
    } catch (error: any) {
        result.errors.push('Failed to parse Excel: ' + error.message);
    }

    return result;
}

/**
 * Parse synonym pairs from data (e.g., Normal English, Advanced English columns)
 */
function parseSynonymPairs(rows: any[][], colIndexes: number[]): ImportResult {
    const result: ImportResult = {
        success: false,
        words: [],
        errors: [],
        imported: 0,
        skipped: 0,
    };

    // Group columns into pairs (col1,col2), (col3,col4), etc.
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row) continue;

        for (let j = 0; j < colIndexes.length - 1; j += 2) {
            const term = parseStringValue(row[colIndexes[j]]);
            const translation = parseStringValue(row[colIndexes[j + 1]]);

            if (!term || !translation) {
                result.skipped++;
                continue;
            }

            const word: Word = {
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
            };

            result.words.push(word);
            result.imported++;
        }
    }

    result.success = result.imported > 0;
    if (!result.success) {
        result.errors.push('No valid word pairs found in the file');
    }
    return result;
}

/**
 * Import words from plain text file (one word per line, format: term=translation)
 */
export function importFromText(textContent: string): ImportResult {
    const result: ImportResult = {
        success: false,
        words: [],
        errors: [],
        imported: 0,
        skipped: 0,
    };

    try {
        const lines = textContent.split(/\r?\n/).filter(line => line.trim());
        
        if (lines.length === 0) {
            result.errors.push('Text file is empty');
            return result;
        }

        let validPairsFound = 0;

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) {
                continue; // Skip empty lines and comments
            }

            // Support multiple formats: term=translation, term - translation, term : translation
            let term = '';
            let translation = '';
            
            if (trimmed.includes('=')) {
                const parts = trimmed.split('=');
                term = parts[0].trim();
                translation = parts.slice(1).join('=').trim();
            } else if (trimmed.includes('-')) {
                const parts = trimmed.split('-');
                term = parts[0].trim();
                translation = parts.slice(1).join('-').trim();
            } else if (trimmed.includes(':')) {
                const parts = trimmed.split(':');
                term = parts[0].trim();
                translation = parts.slice(1).join(':').trim();
            } else if (trimmed.includes('\t')) {
                const parts = trimmed.split('\t');
                term = parts[0].trim();
                translation = parts.slice(1).join('\t').trim();
            } else {
                // Single word without delimiter - skip, as we can't determine term vs translation
                result.skipped++;
                continue;
            }

            // Validate that both term and translation look like real words (not sentences)
            if (!term || !translation || term.length < 1 || translation.length < 1) {
                result.skipped++;
                continue;
            }

            // Skip lines where term or translation look like sentences (too long or contain spaces)
            // A vocabulary word should typically be 1-3 words, not a full sentence
            if (term.split(/\s+/).length > 4 || translation.split(/\s+/).length > 4) {
                result.skipped++;
                continue;
            }

            const word: Word = {
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
            };

            result.words.push(word);
            result.imported++;
            validPairsFound++;
        }

        result.success = result.imported > 0;
        
        if (validPairsFound === 0 && lines.length > 0) {
            result.errors.push('No valid word pairs found. Use format: term=translation or term-translation or term:translation');
        }
    } catch (error: any) {
        result.errors.push('Failed to parse text file: ' + error.message);
    }

    return result;
}

/**
 * Import from file by extension - with AI fallback
 */
export async function importFromFile(file: File): Promise<ImportResult> {
    const extension = file.name.split('.').pop()?.toLowerCase();

    try {
        // For Excel files
        if (extension === 'xlsx' || extension === 'xls') {
            const buffer = await file.arrayBuffer();
            const excelResult = importFromExcel(buffer);
            if (excelResult.success && excelResult.imported > 0) {
                return excelResult;
            }
            // Excel AI fallback is limited since we can't easily get text from binary
            return excelResult;
        } 
        
        // For CSV and text files, read as text
        const content = await file.text();
        
        if (extension === 'csv') {
            const csvResult = importFromCSV(content);
            if (csvResult.success && csvResult.imported > 0) {
                return csvResult;
            }
            // Try AI fallback for unrecognized formats
            const aiResult = await smartImportWords(content, file.name, 'csv');
            if (aiResult.words.length > 0) {
                return convertToImportResult(aiResult);
            }
            return csvResult;
        } else if (extension === 'txt' || extension === 'text') {
            const txtResult = importFromText(content);
            if (txtResult.success && txtResult.imported > 0) {
                return txtResult;
            }
            // Try AI fallback
            const aiResult = await smartImportWords(content, file.name, 'text');
            if (aiResult.words.length > 0) {
                return convertToImportResult(aiResult);
            }
            return txtResult;
        } else if (extension === 'docx') {
            return {
                success: false,
                words: [],
                errors: ['DOCX files not directly supported. Please save as TXT or CSV format, or copy-paste the content.'],
                imported: 0,
                skipped: 0,
            };
        } else {
            return {
                success: false,
                words: [],
                errors: ['Unsupported file format. Please use CSV, Excel (.xlsx, .xls), or text (.txt) files.'],
                imported: 0,
                skipped: 0,
            };
        }
    } catch (error: any) {
        return {
            success: false,
            words: [],
            errors: [`Import failed: ${error.message}`],
            imported: 0,
            skipped: 0,
        };
    }
}

/**
 * Convert AI import result to ImportResult format
 */
function convertToImportResult(aiResult: { words: Array<{term: string, translation: string, category?: string}>, errors: string[], detectedFormat?: string }): ImportResult {
    const result: ImportResult = {
        success: false,
        words: [],
        errors: [],
        imported: 0,
        skipped: 0,
        detectedFormat: aiResult.detectedFormat,
        aiPowered: true,
    };

    if (aiResult.errors.length > 0) {
        result.errors = aiResult.errors;
        return result;
    }

    for (const item of aiResult.words) {
        if (!item.term || !item.translation) {
            result.skipped++;
            continue;
        }

        const word: Word = {
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
        };

        result.words.push(word);
        result.imported++;
    }

    result.success = result.imported > 0;
    if (!result.success) {
        result.errors.push('No valid words found after AI parsing.');
    }
    return result;
}

/**
 * Create a sample CSV template
 */
export function createCSVTemplate(): string {
    const lines = [
        'term,translation,category,association',
        'Hello,Привіт,Greetings,Think of heavily - says hi',
        'Goodbye,До побачення,Farewells,',
        'Thank you,Дякую,Polite expressions,Similar to dank'
    ];
    return lines.join('\n');
}

/**
 * Create a sample text template
 */
export function createTextTemplate(): string {
    const lines = [
        '# Word list - supported formats:',
        '# hello=привіт',
        '# goodbye - до побачення',
        '# thank you : дякую',
        '',
        'Hello=Привіт',
        'Goodbye-До побачення',
        'Thank you:Дякую',
        'Please=Будь ласка',
        'Yes=Так',
        'No=Ні'
    ];
    return lines.join('\n');
}
