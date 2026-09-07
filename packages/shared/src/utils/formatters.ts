/**
 * Formatting Utilities for CareLink (Currency, Phone, Dates)
 * Project: CareLink Healthcare Platform
 */

import { DEFAULT_CURRENCY_SYMBOL } from '../constants';

/**
 * Formats a monetary amount into FCFA format (e.g. 10 000 FCFA)
 */
export function formatFCFA(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return `0 ${DEFAULT_CURRENCY_SYMBOL}`;
  }
  const rounded = Math.round(amount);
  const formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${formatted} ${DEFAULT_CURRENCY_SYMBOL}`;
}

/**
 * Formats a phone number for West African standards (+228, +225, +229, etc.)
 */
export function formatPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return '';
  const cleaned = phone.replace(/[^\d+]/g, '');
  return cleaned;
}

/**
 * Formats an ISO date string to readable French medical date (e.g., "14 Octobre 2026 à 10:30")
 */
export function formatDateTime(isoString: string | null | undefined): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return isoString;
  }
}

/**
 * Formats an ISO date string to short date (e.g., "14/10/2026")
 */
export function formatDate(isoString: string | null | undefined): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d);
  } catch {
    return isoString;
  }
}
