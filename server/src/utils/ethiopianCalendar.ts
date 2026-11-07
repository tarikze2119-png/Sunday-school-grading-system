/**
 * Ethiopian Calendar (ዓመተ ምሕረት) Conversion Utility
 * Based on Julian Day Number (JDN) mathematical astronomical algorithms.
 * Timezone: Africa/Addis_Ababa
 */

export const ETHIOPIC_MONTH_NAMES = [
  'መስከረም',
  'ጥቅምት',
  'ኅዳር',
  'ታኅሣሥ',
  'ጥር',
  'የካቲት',
  'መጋቢት',
  'ሚያዝያ',
  'ግንቦት',
  'ሰኔ',
  'ሐምሌ',
  'ነሐሴ',
  'ጳጉሜ',
];

const ETHIOPIC_EPOCH = 1723856;

export interface EthiopicDate {
  year: number;
  month: number;
  day: number;
  monthName: string;
  formattedAmharic: string;
}

export function gregorianToJDN(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

export function jdnToEthiopic(jdn: number): EthiopicDate {
  const r = (jdn - ETHIOPIC_EPOCH) % 1461;
  const n = (r % 365) + 365 * Math.floor(r / 1460);
  const year =
    4 * Math.floor((jdn - ETHIOPIC_EPOCH) / 1461) +
    Math.floor(r / 365) -
    Math.floor(r / 1460);
  const month = Math.floor(n / 30) + 1;
  const day = (n % 30) + 1;
  const monthName = ETHIOPIC_MONTH_NAMES[month - 1] || 'መስከረም';

  return {
    year,
    month,
    day,
    monthName,
    formattedAmharic: `${monthName} ${day} ቀን ${year} ዓ.ም.`,
  };
}

export function toEthiopicDate(gregorianDate: Date | string): EthiopicDate {
  const d = new Date(gregorianDate);
  // Addis Ababa is UTC+3
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const eatTime = new Date(utc + 3 * 3600000);

  const jdn = gregorianToJDN(
    eatTime.getFullYear(),
    eatTime.getMonth() + 1,
    eatTime.getDate()
  );
  return jdnToEthiopic(jdn);
}

export function ethiopicToJDN(year: number, month: number, day: number): number {
  return (
    ETHIOPIC_EPOCH +
    365 * (year - 1) +
    Math.floor(year / 4) +
    30 * (month - 1) +
    day -
    1
  );
}

export function jdnToGregorian(jdn: number): Date {
  const a = jdn + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  const day = e - Math.floor((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * Math.floor(m / 10);
  const year = 100 * b + d - 4800 + Math.floor(m / 10);

  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
}

export function toGregorianDate(ethiopicYear: number, ethiopicMonth: number, ethiopicDay: number): Date {
  const jdn = ethiopicToJDN(ethiopicYear, ethiopicMonth, ethiopicDay);
  return jdnToGregorian(jdn);
}
