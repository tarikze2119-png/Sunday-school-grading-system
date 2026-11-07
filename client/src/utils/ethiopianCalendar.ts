/**
 * Ethiopian Calendar (ዓመተ ምሕረት) Conversion Utility for Client
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
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const eatTime = new Date(utc + 3 * 3600000);

  const jdn = gregorianToJDN(
    eatTime.getFullYear(),
    eatTime.getMonth() + 1,
    eatTime.getDate()
  );
  return jdnToEthiopic(jdn);
}

export function formatEthiopianDate(gregorianDate: Date | string): string {
  try {
    return toEthiopicDate(gregorianDate).formattedAmharic;
  } catch {
    return String(gregorianDate);
  }
}

export function toEthiopianDateString(gregorianDate: Date | string): string {
  return formatEthiopianDate(gregorianDate);
}
