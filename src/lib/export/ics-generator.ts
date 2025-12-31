// ============================================
// Projekt L - ICS Calendar Export Generator
// RFC 5545 konform
// ============================================

import type { Contact } from '@/lib/types/contacts';
import { RELATIONSHIP_TYPE_META, getDisplayName } from '@/lib/types/contacts';

// ============================================
// Typen
// ============================================

export type IcsEventType = 'birthday' | 'anniversary';

export interface IcsExportOptions {
  type?: 'birthdays' | 'anniversaries' | 'all';
  includeDescription?: boolean;
}

// ============================================
// Hilfsfunktionen
// ============================================

/**
 * Formatiert ein ISO-Datum (YYYY-MM-DD) zu ICS-Format (YYYYMMDD)
 */
function formatIcsDate(isoDate: string): string {
  return isoDate.replace(/-/g, '');
}

/**
 * Escaped Sonderzeichen für ICS-Format
 */
function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Generiert eine eindeutige UID für ein Event
 */
function generateUid(contactId: string, eventType: IcsEventType): string {
  return `contact-${contactId}-${eventType}@projekt-l`;
}

/**
 * Generiert den aktuellen Timestamp im ICS-Format
 */
function getIcsTimestamp(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  const hours = String(now.getUTCHours()).padStart(2, '0');
  const minutes = String(now.getUTCMinutes()).padStart(2, '0');
  const seconds = String(now.getUTCSeconds()).padStart(2, '0');
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

// ============================================
// Event Generator
// ============================================

/**
 * Generiert ein VEVENT für einen Kontakt
 */
export function generateIcsEvent(
  contact: Contact,
  eventType: IcsEventType,
  includeDescription: boolean = true
): string | null {
  const date = eventType === 'birthday' ? contact.birthday : contact.anniversary;

  if (!date) return null;

  const displayName = getDisplayName(contact);
  const emoji = eventType === 'birthday' ? '🎂' : '💕';
  const eventLabel = eventType === 'birthday' ? 'Geburtstag' : 'Jahrestag';

  const summary = `${emoji} ${displayName} - ${eventLabel}`;
  const uid = generateUid(contact.id, eventType);
  const dtstart = formatIcsDate(date);
  const timestamp = getIcsTimestamp();

  // Beschreibung erstellen
  let description = '';
  if (includeDescription) {
    const relationshipMeta = RELATIONSHIP_TYPE_META[contact.relationship_type];
    const parts: string[] = [];

    parts.push(`Beziehung: ${relationshipMeta.labelDe}`);
    parts.push(`Level: ${contact.relationship_level}`);

    if (contact.contact_info?.phone) {
      parts.push(`Tel: ${contact.contact_info.phone}`);
    }
    if (contact.contact_info?.email) {
      parts.push(`Email: ${contact.contact_info.email}`);
    }
    if (contact.notes) {
      parts.push(`Notizen: ${contact.notes}`);
    }

    description = escapeIcsText(parts.join('\n'));
  }

  const lines: string[] = [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${timestamp}`,
    `DTSTART;VALUE=DATE:${dtstart}`,
    'RRULE:FREQ=YEARLY',
    `SUMMARY:${escapeIcsText(summary)}`,
  ];

  if (description) {
    lines.push(`DESCRIPTION:${description}`);
  }

  // Alarm 1 Tag vorher
  lines.push(
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeIcsText(`${displayName} hat morgen ${eventLabel}!`)}`,
    'TRIGGER:-P1D',
    'END:VALARM'
  );

  // Alarm 7 Tage vorher
  lines.push(
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeIcsText(`${displayName} hat in einer Woche ${eventLabel}!`)}`,
    'TRIGGER:-P7D',
    'END:VALARM'
  );

  lines.push('END:VEVENT');

  return lines.join('\r\n');
}

// ============================================
// Calendar Generator
// ============================================

/**
 * Generiert eine komplette ICS-Kalenderdatei
 */
export function generateIcsCalendar(
  contacts: Contact[],
  options: IcsExportOptions = {}
): string {
  const { type = 'all', includeDescription = true } = options;

  const events: string[] = [];

  for (const contact of contacts) {
    // Geburtstage
    if (type === 'all' || type === 'birthdays') {
      const birthdayEvent = generateIcsEvent(contact, 'birthday', includeDescription);
      if (birthdayEvent) {
        events.push(birthdayEvent);
      }
    }

    // Jahrestage
    if (type === 'all' || type === 'anniversaries') {
      const anniversaryEvent = generateIcsEvent(contact, 'anniversary', includeDescription);
      if (anniversaryEvent) {
        events.push(anniversaryEvent);
      }
    }
  }

  // ICS Header
  const header = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Projekt L//Kontakte Kalender//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Projekt L - Wichtige Daten',
    'X-WR-TIMEZONE:Europe/Berlin',
  ].join('\r\n');

  // ICS Footer
  const footer = 'END:VCALENDAR';

  // Kombinieren
  if (events.length === 0) {
    return `${header}\r\n${footer}`;
  }

  return `${header}\r\n${events.join('\r\n')}\r\n${footer}`;
}

// ============================================
// Export Funktion für API
// ============================================

export function getIcsFilename(type: IcsExportOptions['type'] = 'all'): string {
  const date = new Date().toISOString().split('T')[0];
  const typeLabel = type === 'birthdays'
    ? 'geburtstage'
    : type === 'anniversaries'
      ? 'jahrestage'
      : 'termine';
  return `projekt-l-${typeLabel}-${date}.ics`;
}
