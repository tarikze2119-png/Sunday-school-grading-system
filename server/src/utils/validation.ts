import { Prisma } from '@prisma/client';

export interface AmharicValidationResult {
  isValid: boolean;
  normalized: string;
  error?: string;
  extractedCodes: {
    courses: string[];
    academicYears: string[];
    batches: string[];
  };
}

// Institutional Identifier Patterns
const COURSE_CODE_REGEX = /\bCRS-[A-Z0-9-]+\b/g;
const ACADEMIC_YEAR_CODE_REGEX = /\bAY-[A-Z0-9-]+\b/g;
const BATCH_CODE_REGEX = /\bB-[A-Z0-9-]+\b/g;

// Ethiopic Script Regex Range (Standard, Supplement, Extended, Extended-A)
const ETHIOPIC_CHAR_REGEX = /[\u1200-\u137F\u1380-\u139F\u2D80-\u2DDF\uAB00-\uAB2F]/g;

// Repetition Heuristic: 5 or more identical consecutive characters
const REPETITION_REGEX = /(.)\1{4,}/u;

/**
 * Validates Amharic feedback text (e.g., rejection reasons).
 * Enforces NFC normalization, length bounds, Ethiopic script requirement,
 * repetition detection, and restricts Latin characters to institutional identifiers.
 */
export function validateAmharicFeedback(text: unknown): AmharicValidationResult {
  if (typeof text !== 'string') {
    return {
      isValid: false,
      normalized: '',
      error: 'የማስተካከያ ምክንያት የግዴታ የጽሑፍ መረጃ መሆን አለበት።',
      extractedCodes: { courses: [], academicYears: [], batches: [] },
    };
  }

  // 1. Unicode NFC Normalization
  const normalized = text.normalize('NFC').trim();

  // 2. Code-point counting & Whitespace check
  const codePoints = [...normalized];
  if (codePoints.length === 0) {
    return {
      isValid: false,
      normalized: '',
      error: 'የማስተካከያ ምክንያት ባዶ መሆን አይችልም፤ የግዴታ በአማርኛ መገለጽ አለበት።',
      extractedCodes: { courses: [], academicYears: [], batches: [] },
    };
  }

  if (codePoints.length < 5) {
    return {
      isValid: false,
      normalized,
      error: 'የማስተካከያ ምክንያት ቢያንስ 5 ፊደላት መሆን አለበት።',
      extractedCodes: { courses: [], academicYears: [], batches: [] },
    };
  }

  if (codePoints.length > 1000) {
    return {
      isValid: false,
      normalized,
      error: 'የማስተካከያ ምክንያት ከ1000 ፊደላት መብለጥ የለበትም።',
      extractedCodes: { courses: [], academicYears: [], batches: [] },
    };
  }

  // 3. Suspicious consecutive repeated characters heuristic
  if (REPETITION_REGEX.test(normalized)) {
    return {
      isValid: false,
      normalized,
      error: 'ተደጋጋሚ እና አጠራጣሪ ፊደላት ተገኝተዋል፤ እባክዎ ትክክለኛ ምክንያት ያስገቡ።',
      extractedCodes: { courses: [], academicYears: [], batches: [] },
    };
  }

  // 4. Extract institutional identifiers
  const courseMatches = Array.from(new Set(normalized.match(COURSE_CODE_REGEX) || []));
  const yearMatches = Array.from(new Set(normalized.match(ACADEMIC_YEAR_CODE_REGEX) || []));
  const batchMatches = Array.from(new Set(normalized.match(BATCH_CODE_REGEX) || []));

  // 5. Check Ethiopic script presence
  const ethiopicMatches = normalized.match(ETHIOPIC_CHAR_REGEX) || [];
  if (ethiopicMatches.length < 5) {
    return {
      isValid: false,
      normalized,
      error: 'ምክንያቱ በአማርኛ ፊደላት መገለጽ አለበት፤ በቂ የአማርኛ ፊደላት አልተገኙም።',
      extractedCodes: {
        courses: courseMatches,
        academicYears: yearMatches,
        batches: batchMatches,
      },
    };
  }

  // 6. Check for arbitrary English prose (Latin characters outside approved identifiers)
  // Strip out approved identifiers first
  let strippedOfIdentifiers = normalized
    .replace(COURSE_CODE_REGEX, '')
    .replace(ACADEMIC_YEAR_CODE_REGEX, '')
    .replace(BATCH_CODE_REGEX, '');

  // Look for remaining Latin characters (disallowing English words)
  const remainingLatin = strippedOfIdentifiers.match(/[a-zA-Z]/g) || [];
  if (remainingLatin.length > 0) {
    return {
      isValid: false,
      normalized,
      error: 'ምክንያቱ በአማርኛ ፊደላት መገለጽ አለበት፤ ያልተፈቀደ የእንግሊዝኛ ጽሑፍ ተገኝቷል።',
      extractedCodes: {
        courses: courseMatches,
        academicYears: yearMatches,
        batches: batchMatches,
      },
    };
  }

  return {
    isValid: true,
    normalized,
    extractedCodes: {
      courses: courseMatches,
      academicYears: yearMatches,
      batches: batchMatches,
    },
  };
}

/**
 * Layer 2: Verifies extracted institutional codes exist in the database catalog.
 * Uses exact schema lookups:
 * - Course.code (unique)
 * - AcademicYear.code (unique)
 * - Batch.code (findFirst, composite-unique with academicYearId)
 */
export async function verifyInstitutionalCodesInDb(
  tx: any,
  codes: { courses: string[]; academicYears: string[]; batches: string[] }
): Promise<void> {
  // 1. Verify Course Codes
  for (const code of codes.courses) {
    const course = await tx.course.findUnique({
      where: { code },
      select: { id: true, code: true },
    });
    if (!course) {
      const err: any = new Error(`በምክንያቱ ውስጥ የተጠቀሰው የኮርስ መለያ '${code}' በሲስተሙ ውስጥ አልተገኘም።`);
      err.statusCode = 400;
      err.code = 'INVALID_COURSE_IDENTIFIER';
      throw err;
    }
  }

  // 2. Verify Academic Year Codes
  for (const code of codes.academicYears) {
    const ay = await tx.academicYear.findUnique({
      where: { code },
      select: { id: true, code: true },
    });
    if (!ay) {
      const err: any = new Error(`በምክንያቱ ውስጥ የተጠቀሰው የትምህርት ዘመን መለያ '${code}' በሲስተሙ ውስጥ አልተገኘም።`);
      err.statusCode = 400;
      err.code = 'INVALID_ACADEMIC_YEAR_IDENTIFIER';
      throw err;
    }
  }

  // 3. Verify Batch Codes (composite-unique in schema, use findFirst)
  for (const code of codes.batches) {
    const batch = await tx.batch.findFirst({
      where: { code },
      select: { id: true, code: true },
    });
    if (!batch) {
      const err: any = new Error(`በምክንያቱ ውስጥ የተጠቀሰው የምድብ (ባች) መለያ '${code}' በሲስተሙ ውስጥ አልተገኘም።`);
      err.statusCode = 400;
      err.code = 'INVALID_BATCH_IDENTIFIER';
      throw err;
    }
  }
}
