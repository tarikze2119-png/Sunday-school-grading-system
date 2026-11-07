export enum UserRoleEnum {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  MANAGEMENT = 'MANAGEMENT',
  TEACHER = 'TEACHER',
  STUDENT = 'STUDENT',
}

export const ROLE_AMHARIC_LABELS: Record<UserRoleEnum, string> = {
  [UserRoleEnum.SUPER_ADMIN]: 'ዋና አስተዳዳሪ',
  [UserRoleEnum.ADMIN]: 'አስተዳዳሪ',
  [UserRoleEnum.MANAGEMENT]: 'የሰንበት ት/ቤት አመራር',
  [UserRoleEnum.TEACHER]: 'መምህር',
  [UserRoleEnum.STUDENT]: 'ተማሪ',
};
