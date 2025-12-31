// ============================================
// Projekt L - Contact Import Parsers
// ============================================

import type { RelationshipType, RelationshipCategory, ContactInfo } from '../types/contacts';

// ============================================
// Import Types
// ============================================

export interface ImportContact {
  // Parsed data
  firstName: string;
  lastName?: string;
  nickname?: string;

  // Contact info
  email?: string;
  phone?: string;
  address?: string;

  // Dates
  birthday?: string; // YYYY-MM-DD format

  // Suggested values
  suggestedType: RelationshipType;
  suggestedCategory: RelationshipCategory;

  // Raw data for reference
  rawData?: Record<string, string>;

  // UI state
  selected: boolean;
  importError?: string;
}

export interface ImportResult {
  contacts: ImportContact[];
  errors: string[];
  warnings: string[];
}

export interface BulkImportResult {
  imported: number;
  skipped: number;
  errors: { contact: string; error: string }[];
}

// ============================================
// Google Contacts CSV Parser
// ============================================

/**
 * Parse Google Contacts CSV export
 * Expected columns: Name, Given Name, Family Name, Birthday, E-mail 1 - Value, Phone 1 - Value
 */
export function parseGoogleCSV(content: string): ImportResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const contacts: ImportContact[] = [];

  try {
    const lines = parseCSVLines(content);
    if (lines.length < 2) {
      return { contacts: [], errors: ['CSV ist leer oder hat keine Daten'], warnings: [] };
    }

    const headers = lines[0].map(h => h.toLowerCase().trim());

    // Find column indices
    const nameIdx = findColumnIndex(headers, ['name', 'full name']);
    const givenNameIdx = findColumnIndex(headers, ['given name', 'first name', 'vorname']);
    const familyNameIdx = findColumnIndex(headers, ['family name', 'last name', 'nachname']);
    const birthdayIdx = findColumnIndex(headers, ['birthday', 'geburtstag']);
    const emailIdx = findColumnIndex(headers, ['e-mail 1 - value', 'email', 'e-mail']);
    const phoneIdx = findColumnIndex(headers, ['phone 1 - value', 'phone', 'telefon']);
    const addressIdx = findColumnIndex(headers, ['address 1 - formatted', 'address', 'adresse']);
    const groupIdx = findColumnIndex(headers, ['group membership', 'groups', 'gruppen']);

    // Process each row
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i];
      if (row.length === 0 || row.every(cell => !cell.trim())) continue;

      try {
        // Get name
        let firstName = givenNameIdx >= 0 ? row[givenNameIdx]?.trim() : '';
        let lastName = familyNameIdx >= 0 ? row[familyNameIdx]?.trim() : '';

        // If no given/family name, try to split full name
        if (!firstName && nameIdx >= 0) {
          const fullName = row[nameIdx]?.trim() || '';
          const parts = fullName.split(' ');
          firstName = parts[0] || '';
          lastName = parts.slice(1).join(' ');
        }

        if (!firstName) {
          warnings.push(`Zeile ${i + 1}: Kein Name gefunden, übersprungen`);
          continue;
        }

        // Parse birthday
        let birthday: string | undefined;
        if (birthdayIdx >= 0 && row[birthdayIdx]) {
          birthday = parseDate(row[birthdayIdx]);
        }

        // Get group/category hint
        const group = groupIdx >= 0 ? row[groupIdx]?.toLowerCase() || '' : '';
        const { type, category } = guessRelationshipFromGroup(group);

        contacts.push({
          firstName,
          lastName: lastName || undefined,
          email: emailIdx >= 0 ? row[emailIdx]?.trim() || undefined : undefined,
          phone: phoneIdx >= 0 ? row[phoneIdx]?.trim() || undefined : undefined,
          address: addressIdx >= 0 ? row[addressIdx]?.trim() || undefined : undefined,
          birthday,
          suggestedType: type,
          suggestedCategory: category,
          selected: true,
          rawData: Object.fromEntries(headers.map((h, idx) => [h, row[idx] || ''])),
        });
      } catch (err) {
        warnings.push(`Zeile ${i + 1}: Fehler beim Parsen`);
      }
    }

  } catch (err) {
    errors.push(`CSV-Parsing fehlgeschlagen: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`);
  }

  return { contacts, errors, warnings };
}

// ============================================
// Apple vCard Parser
// ============================================

/**
 * Parse Apple vCard (.vcf) export
 * Supports vCard 3.0 and 4.0 format
 */
export function parseVCard(content: string): ImportResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const contacts: ImportContact[] = [];

  try {
    // Split into individual vCards
    const vcards = content.split(/(?=BEGIN:VCARD)/i).filter(v => v.trim());

    for (let i = 0; i < vcards.length; i++) {
      try {
        const vcard = vcards[i];
        if (!vcard.includes('BEGIN:VCARD')) continue;

        // Parse properties
        const props = parseVCardProperties(vcard);

        // Get name
        let firstName = '';
        let lastName = '';

        // Try N property first (structured name)
        const n = props['n'];
        if (n) {
          const parts = n.split(';');
          lastName = parts[0] || '';
          firstName = parts[1] || '';
        }

        // Fallback to FN (formatted name)
        if (!firstName && props['fn']) {
          const parts = props['fn'].split(' ');
          firstName = parts[0] || '';
          lastName = parts.slice(1).join(' ');
        }

        if (!firstName) {
          warnings.push(`vCard ${i + 1}: Kein Name gefunden, übersprungen`);
          continue;
        }

        // Parse birthday (BDAY)
        let birthday: string | undefined;
        if (props['bday']) {
          birthday = parseVCardDate(props['bday']);
        }

        // Get email
        const email = props['email'] || undefined;

        // Get phone
        const phone = props['tel'] || undefined;

        // Get address
        const address = props['adr'] ? parseVCardAddress(props['adr']) : undefined;

        // Get nickname
        const nickname = props['nickname'] || undefined;

        contacts.push({
          firstName,
          lastName: lastName || undefined,
          nickname,
          email,
          phone,
          address,
          birthday,
          suggestedType: 'friend',
          suggestedCategory: 'friend',
          selected: true,
          rawData: props,
        });

      } catch (err) {
        warnings.push(`vCard ${i + 1}: Fehler beim Parsen`);
      }
    }

  } catch (err) {
    errors.push(`vCard-Parsing fehlgeschlagen: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`);
  }

  return { contacts, errors, warnings };
}

// ============================================
// Generic CSV Parser
// ============================================

export interface ColumnMapping {
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  birthday?: string;
  address?: string;
  notes?: string;
}

/**
 * Parse generic CSV with custom column mapping
 */
export function parseGenericCSV(content: string, mapping: ColumnMapping): ImportResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const contacts: ImportContact[] = [];

  try {
    const lines = parseCSVLines(content);
    if (lines.length < 2) {
      return { contacts: [], errors: ['CSV ist leer oder hat keine Daten'], warnings: [] };
    }

    const headers = lines[0].map(h => h.toLowerCase().trim());

    // Find mapped column indices
    const firstNameIdx = headers.indexOf(mapping.firstName.toLowerCase());
    const lastNameIdx = mapping.lastName ? headers.indexOf(mapping.lastName.toLowerCase()) : -1;
    const emailIdx = mapping.email ? headers.indexOf(mapping.email.toLowerCase()) : -1;
    const phoneIdx = mapping.phone ? headers.indexOf(mapping.phone.toLowerCase()) : -1;
    const birthdayIdx = mapping.birthday ? headers.indexOf(mapping.birthday.toLowerCase()) : -1;
    const addressIdx = mapping.address ? headers.indexOf(mapping.address.toLowerCase()) : -1;

    if (firstNameIdx < 0) {
      return { contacts: [], errors: [`Spalte "${mapping.firstName}" nicht gefunden`], warnings: [] };
    }

    // Process each row
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i];
      if (row.length === 0 || row.every(cell => !cell.trim())) continue;

      try {
        const firstName = row[firstNameIdx]?.trim();
        if (!firstName) {
          warnings.push(`Zeile ${i + 1}: Kein Vorname, übersprungen`);
          continue;
        }

        let birthday: string | undefined;
        if (birthdayIdx >= 0 && row[birthdayIdx]) {
          birthday = parseDate(row[birthdayIdx]);
        }

        contacts.push({
          firstName,
          lastName: lastNameIdx >= 0 ? row[lastNameIdx]?.trim() || undefined : undefined,
          email: emailIdx >= 0 ? row[emailIdx]?.trim() || undefined : undefined,
          phone: phoneIdx >= 0 ? row[phoneIdx]?.trim() || undefined : undefined,
          address: addressIdx >= 0 ? row[addressIdx]?.trim() || undefined : undefined,
          birthday,
          suggestedType: 'friend',
          suggestedCategory: 'friend',
          selected: true,
          rawData: Object.fromEntries(headers.map((h, idx) => [h, row[idx] || ''])),
        });
      } catch (err) {
        warnings.push(`Zeile ${i + 1}: Fehler beim Parsen`);
      }
    }

  } catch (err) {
    errors.push(`CSV-Parsing fehlgeschlagen: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`);
  }

  return { contacts, errors, warnings };
}

/**
 * Detect CSV headers for column mapping UI
 */
export function detectCSVHeaders(content: string): string[] {
  try {
    const lines = parseCSVLines(content);
    if (lines.length > 0) {
      return lines[0].map(h => h.trim());
    }
  } catch {
    // Ignore errors
  }
  return [];
}

/**
 * Auto-detect import format based on content
 */
export function detectImportFormat(content: string, filename?: string): 'google' | 'vcard' | 'csv' | 'unknown' {
  // Check filename extension
  if (filename) {
    const ext = filename.toLowerCase().split('.').pop();
    if (ext === 'vcf') return 'vcard';
  }

  // Check content
  if (content.includes('BEGIN:VCARD')) {
    return 'vcard';
  }

  // Check for Google CSV headers
  const firstLine = content.split('\n')[0]?.toLowerCase() || '';
  if (firstLine.includes('given name') || firstLine.includes('family name') || firstLine.includes('e-mail 1')) {
    return 'google';
  }

  // Generic CSV
  if (content.includes(',') || content.includes(';')) {
    return 'csv';
  }

  return 'unknown';
}

// ============================================
// Helper Functions
// ============================================

function parseCSVLines(content: string): string[][] {
  const lines: string[][] = [];
  let currentLine: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  // Detect delimiter (comma or semicolon)
  const firstLine = content.split('\n')[0] || '';
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const delimiter = semicolonCount > commaCount ? ';' : ',';

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      currentLine.push(currentCell);
      currentCell = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      currentLine.push(currentCell);
      if (currentLine.some(cell => cell.trim())) {
        lines.push(currentLine);
      }
      currentLine = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }

  // Add last cell and line
  if (currentCell || currentLine.length > 0) {
    currentLine.push(currentCell);
    if (currentLine.some(cell => cell.trim())) {
      lines.push(currentLine);
    }
  }

  return lines;
}

function findColumnIndex(headers: string[], possibleNames: string[]): number {
  for (const name of possibleNames) {
    const idx = headers.findIndex(h => h.includes(name));
    if (idx >= 0) return idx;
  }
  return -1;
}

function parseDate(dateStr: string): string | undefined {
  if (!dateStr) return undefined;

  // Try various date formats
  const cleanDate = dateStr.trim();

  // ISO format (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
    return cleanDate;
  }

  // German format (DD.MM.YYYY)
  const germanMatch = cleanDate.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (germanMatch) {
    const [, day, month, year] = germanMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // US format (MM/DD/YYYY)
  const usMatch = cleanDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usMatch) {
    const [, month, day, year] = usMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Google format with dashes (YYYY-MM-DD or --MM-DD for year-less dates)
  const googleMatch = cleanDate.match(/^--?(\d{2})-(\d{2})$/);
  if (googleMatch) {
    const [, month, day] = googleMatch;
    return `1900-${month}-${day}`; // Use 1900 as placeholder year
  }

  // Try native Date parsing as fallback
  try {
    const date = new Date(cleanDate);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  } catch {
    // Ignore
  }

  return undefined;
}

function parseVCardProperties(vcard: string): Record<string, string> {
  const props: Record<string, string> = {};
  const lines = vcard.split(/\r?\n/);

  let currentKey = '';
  let currentValue = '';

  for (const line of lines) {
    // Handle line folding (lines starting with space are continuation)
    if (line.startsWith(' ') || line.startsWith('\t')) {
      currentValue += line.trim();
      continue;
    }

    // Save previous property
    if (currentKey) {
      props[currentKey] = currentValue;
    }

    // Parse new property
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      let key = line.substring(0, colonIdx).toLowerCase();
      // Remove parameters (e.g., TEL;TYPE=CELL -> tel)
      key = key.split(';')[0];
      currentKey = key;
      currentValue = line.substring(colonIdx + 1).trim();
    }
  }

  // Save last property
  if (currentKey) {
    props[currentKey] = currentValue;
  }

  return props;
}

function parseVCardDate(dateStr: string): string | undefined {
  if (!dateStr) return undefined;

  // vCard date formats: YYYYMMDD, YYYY-MM-DD, --MMDD (no year)
  const cleanDate = dateStr.replace(/[^0-9-]/g, '');

  // Full date without dashes (YYYYMMDD)
  if (/^\d{8}$/.test(cleanDate)) {
    return `${cleanDate.slice(0, 4)}-${cleanDate.slice(4, 6)}-${cleanDate.slice(6, 8)}`;
  }

  // Already formatted
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
    return cleanDate;
  }

  // No year (--MMDD or --MM-DD)
  const noYearMatch = cleanDate.match(/^--?(\d{2})-?(\d{2})$/);
  if (noYearMatch) {
    return `1900-${noYearMatch[1]}-${noYearMatch[2]}`;
  }

  return parseDate(dateStr);
}

function parseVCardAddress(adr: string): string {
  // ADR format: PO Box;Extended;Street;City;Region;Postal;Country
  const parts = adr.split(';').filter(p => p.trim());
  return parts.join(', ');
}

function guessRelationshipFromGroup(group: string): { type: RelationshipType; category: RelationshipCategory } {
  const lowerGroup = group.toLowerCase();

  // Family keywords
  if (lowerGroup.includes('familie') || lowerGroup.includes('family')) {
    return { type: 'parent', category: 'family' };
  }

  // Work keywords
  if (lowerGroup.includes('arbeit') || lowerGroup.includes('work') || lowerGroup.includes('beruf') || lowerGroup.includes('kollege')) {
    return { type: 'colleague', category: 'professional' };
  }

  // Friend keywords
  if (lowerGroup.includes('freund') || lowerGroup.includes('friend')) {
    return { type: 'friend', category: 'friend' };
  }

  // Default
  return { type: 'acquaintance', category: 'other' };
}

// ============================================
// Convert ImportContact to ContactFormData
// ============================================

export function importContactToFormData(imported: ImportContact): {
  first_name: string;
  last_name?: string;
  nickname?: string;
  relationship_type: RelationshipType;
  birthday?: string;
  contact_info?: ContactInfo;
} {
  const contactInfo: ContactInfo = {};
  if (imported.email) contactInfo.email = imported.email;
  if (imported.phone) contactInfo.phone = imported.phone;
  if (imported.address) contactInfo.address = imported.address;

  return {
    first_name: imported.firstName,
    last_name: imported.lastName,
    nickname: imported.nickname,
    relationship_type: imported.suggestedType,
    birthday: imported.birthday,
    contact_info: Object.keys(contactInfo).length > 0 ? contactInfo : undefined,
  };
}
