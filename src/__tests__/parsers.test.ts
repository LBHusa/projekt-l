import { describe, it, expect } from 'vitest';
import {
  parseGoogleCSV,
  parseVCard,
  parseGenericCSV,
  detectCSVHeaders,
  detectImportFormat,
} from '@/lib/import/parsers';

describe('Contact Import Parsers', () => {
  describe('parseGoogleCSV', () => {
    it('parses simple Google CSV correctly', () => {
      const csv = `Given Name,Family Name,E-mail 1 - Value,Birthday
John,Doe,john@example.com,1990-05-15
Jane,Smith,jane@example.com,1985-12-20`;

      const result = parseGoogleCSV(csv);

      expect(result.errors).toHaveLength(0);
      expect(result.contacts).toHaveLength(2);
      expect(result.contacts[0].firstName).toBe('John');
      expect(result.contacts[0].lastName).toBe('Doe');
      expect(result.contacts[0].email).toBe('john@example.com');
      expect(result.contacts[0].birthday).toBe('1990-05-15');
    });

    it('handles empty CSV', () => {
      const result = parseGoogleCSV('');
      expect(result.errors).toContain('CSV ist leer oder hat keine Daten');
      expect(result.contacts).toHaveLength(0);
    });

    it('handles CSV with only headers', () => {
      const csv = 'Given Name,Family Name,Email';
      const result = parseGoogleCSV(csv);
      expect(result.contacts).toHaveLength(0);
    });

    it('handles missing first name with warning', () => {
      const csv = `Given Name,Family Name
,Doe
John,Smith`;

      const result = parseGoogleCSV(csv);

      expect(result.contacts).toHaveLength(1);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('parses full name when given/family names are missing', () => {
      const csv = `Name,Email
John Doe,john@example.com`;

      const result = parseGoogleCSV(csv);

      expect(result.contacts).toHaveLength(1);
      expect(result.contacts[0].firstName).toBe('John');
      expect(result.contacts[0].lastName).toBe('Doe');
    });

    it('detects family group and sets relationship type', () => {
      const csv = `Given Name,Group Membership
Maria,Familie`;

      const result = parseGoogleCSV(csv);

      expect(result.contacts).toHaveLength(1);
      expect(result.contacts[0].suggestedType).toBe('parent');
      expect(result.contacts[0].suggestedCategory).toBe('family');
    });

    it('detects work group and sets relationship type', () => {
      const csv = `Given Name,Group Membership
Bob,Work ::: Colleagues`;

      const result = parseGoogleCSV(csv);

      expect(result.contacts).toHaveLength(1);
      expect(result.contacts[0].suggestedType).toBe('colleague');
      expect(result.contacts[0].suggestedCategory).toBe('professional');
    });

    it('handles German date format', () => {
      const csv = `Given Name,Birthday
Hans,15.05.1990`;

      const result = parseGoogleCSV(csv);

      expect(result.contacts).toHaveLength(1);
      expect(result.contacts[0].birthday).toBe('1990-05-15');
    });

    it('handles US date format', () => {
      const csv = `Given Name,Birthday
Mike,05/15/1990`;

      const result = parseGoogleCSV(csv);

      expect(result.contacts).toHaveLength(1);
      expect(result.contacts[0].birthday).toBe('1990-05-15');
    });

    it('handles semicolon-delimited CSV', () => {
      const csv = `Given Name;Family Name;Email
John;Doe;john@example.com`;

      const result = parseGoogleCSV(csv);

      expect(result.contacts).toHaveLength(1);
      expect(result.contacts[0].firstName).toBe('John');
    });

    it('handles quoted fields with commas', () => {
      const csv = `Given Name,Address
John,"123 Main St, Apt 4"`;

      const result = parseGoogleCSV(csv);

      expect(result.contacts).toHaveLength(1);
    });
  });

  describe('parseVCard', () => {
    it('parses simple vCard correctly', () => {
      const vcard = `BEGIN:VCARD
VERSION:3.0
N:Doe;John;;;
FN:John Doe
EMAIL:john@example.com
TEL:+49123456789
BDAY:19900515
END:VCARD`;

      const result = parseVCard(vcard);

      expect(result.errors).toHaveLength(0);
      expect(result.contacts).toHaveLength(1);
      expect(result.contacts[0].firstName).toBe('John');
      expect(result.contacts[0].lastName).toBe('Doe');
      expect(result.contacts[0].email).toBe('john@example.com');
      expect(result.contacts[0].phone).toBe('+49123456789');
      expect(result.contacts[0].birthday).toBe('1990-05-15');
    });

    it('parses multiple vCards', () => {
      const vcards = `BEGIN:VCARD
VERSION:3.0
N:Doe;John;;;
FN:John Doe
END:VCARD
BEGIN:VCARD
VERSION:3.0
N:Smith;Jane;;;
FN:Jane Smith
END:VCARD`;

      const result = parseVCard(vcards);

      expect(result.contacts).toHaveLength(2);
      expect(result.contacts[0].firstName).toBe('John');
      expect(result.contacts[1].firstName).toBe('Jane');
    });

    it('handles vCard with formatted birthday', () => {
      const vcard = `BEGIN:VCARD
VERSION:3.0
FN:John Doe
BDAY:1990-05-15
END:VCARD`;

      const result = parseVCard(vcard);

      expect(result.contacts[0].birthday).toBe('1990-05-15');
    });

    it('handles vCard with no-year birthday', () => {
      const vcard = `BEGIN:VCARD
VERSION:3.0
FN:John Doe
BDAY:--0515
END:VCARD`;

      const result = parseVCard(vcard);

      expect(result.contacts[0].birthday).toBe('1900-05-15');
    });

    it('handles vCard with nickname', () => {
      const vcard = `BEGIN:VCARD
VERSION:3.0
FN:John Doe
NICKNAME:Johnny
END:VCARD`;

      const result = parseVCard(vcard);

      expect(result.contacts[0].nickname).toBe('Johnny');
    });

    it('handles empty vCard content', () => {
      const result = parseVCard('');
      expect(result.contacts).toHaveLength(0);
    });

    it('skips vCards without name', () => {
      const vcard = `BEGIN:VCARD
VERSION:3.0
EMAIL:test@example.com
END:VCARD`;

      const result = parseVCard(vcard);

      expect(result.contacts).toHaveLength(0);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('handles line folding in vCard', () => {
      const vcard = `BEGIN:VCARD
VERSION:3.0
FN:John
 Doe
END:VCARD`;

      const result = parseVCard(vcard);

      // The name parsing should handle folded lines
      expect(result.contacts).toHaveLength(1);
    });
  });

  describe('parseGenericCSV', () => {
    it('parses CSV with custom mapping', () => {
      const csv = `Vorname,Nachname,Mail
John,Doe,john@example.com`;

      const mapping = {
        firstName: 'Vorname',
        lastName: 'Nachname',
        email: 'Mail',
      };

      const result = parseGenericCSV(csv, mapping);

      expect(result.contacts).toHaveLength(1);
      expect(result.contacts[0].firstName).toBe('John');
      expect(result.contacts[0].lastName).toBe('Doe');
      expect(result.contacts[0].email).toBe('john@example.com');
    });

    it('returns error when firstName column not found', () => {
      const csv = `Name,Email
John,john@example.com`;

      const mapping = { firstName: 'Vorname' };

      const result = parseGenericCSV(csv, mapping);

      expect(result.errors).toContain('Spalte "Vorname" nicht gefunden');
    });

    it('handles missing optional columns', () => {
      const csv = `Vorname
John`;

      const mapping = {
        firstName: 'Vorname',
        lastName: 'Nachname', // Doesn't exist
      };

      const result = parseGenericCSV(csv, mapping);

      expect(result.contacts).toHaveLength(1);
      expect(result.contacts[0].firstName).toBe('John');
      expect(result.contacts[0].lastName).toBeUndefined();
    });
  });

  describe('detectCSVHeaders', () => {
    it('extracts headers from CSV', () => {
      const csv = `Name,Email,Phone
John,john@example.com,123456`;

      const headers = detectCSVHeaders(csv);

      expect(headers).toEqual(['Name', 'Email', 'Phone']);
    });

    it('trims whitespace from headers', () => {
      const csv = ` Name , Email , Phone
John,john@example.com,123`;

      const headers = detectCSVHeaders(csv);

      expect(headers).toEqual(['Name', 'Email', 'Phone']);
    });

    it('returns empty array for empty content', () => {
      const headers = detectCSVHeaders('');
      expect(headers).toEqual([]);
    });
  });

  describe('detectImportFormat', () => {
    it('detects vCard by content', () => {
      const content = `BEGIN:VCARD
VERSION:3.0
FN:John Doe
END:VCARD`;

      expect(detectImportFormat(content)).toBe('vcard');
    });

    it('detects vCard by filename', () => {
      expect(detectImportFormat('some content', 'contacts.vcf')).toBe('vcard');
    });

    it('detects Google CSV by headers', () => {
      const content = 'Given Name,Family Name,E-mail 1 - Value,Birthday';
      expect(detectImportFormat(content)).toBe('google');
    });

    it('detects generic CSV by delimiters', () => {
      const content = 'name,email\njohn,john@example.com';
      expect(detectImportFormat(content)).toBe('csv');
    });

    it('returns unknown for unrecognized format', () => {
      const content = 'some random text without structure';
      expect(detectImportFormat(content)).toBe('unknown');
    });
  });
});
