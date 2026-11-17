import bcrypt from 'bcryptjs';

/**
 * Nilai Salt Rounds untuk bcrypt hashing sesuai standar OWASP ASVS Level 1 (cost >= 12)
 */
export const BCRYPT_SALT_ROUNDS = 12;

/**
 * Batas minimal panjang kata sandi
 */
export const MIN_PASSWORD_LENGTH = 8;

/**
 * Daftar kata sandi umum / bocor yang dilarang keras (OWASP ASVS V2.1.7)
 */
export const COMMON_PASSWORD_BLACKLIST = new Set([
  'password',
  'password123',
  'password1234',
  '12345678',
  '123456789',
  '1234567890',
  'admin123',
  'admin1234',
  'qwertyuiop',
  'poltekssn',
  'poltekssn123',
  'p@ssword',
  'abcdefgh',
]);

export interface PasswordValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validasi persyaratan kata sandi sesuai OWASP ASVS V2.1:
 * 1. Minimal 8 karakter
 * 2. Tidak boleh termasuk dalam daftar kata sandi umum/bocor (V2.1.7)
 * 3. Tidak boleh sama persis dengan NIP atau NPM pengguna
 */
export function validatePassword(
  password: string,
  identifier?: string
): PasswordValidationResult {
  if (!password || typeof password !== 'string') {
    return {
      isValid: false,
      error: 'Kata sandi tidak boleh kosong.',
    };
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      isValid: false,
      error: `Kata sandi minimal harus terdiri dari ${MIN_PASSWORD_LENGTH} karakter.`,
    };
  }

  const normalized = password.toLowerCase().trim();

  // Cek terhadap daftar kata sandi umum / bocor
  if (COMMON_PASSWORD_BLACKLIST.has(normalized)) {
    return {
      isValid: false,
      error:
        'Kata sandi terlalu umum atau berisiko tinggi (termasuk daftar kata sandi bocor/lemah OWASP ASVS V2.1.7). Silakan gunakan kombinasi yang lebih kuat.',
    };
  }

  // Cek kesamaan dengan identifier (NIP/NPM)
  if (identifier && typeof identifier === 'string') {
    const cleanId = identifier.toLowerCase().trim();
    if (normalized === cleanId || normalized.includes(cleanId)) {
      return {
        isValid: false,
        error: 'Kata sandi tidak boleh sama dengan atau mengandung NIP/NPM Anda.',
      };
    }
  }

  return { isValid: true };
}

/**
 * Melakukan one-way salted hashing pada kata sandi menggunakan bcrypt (cost 12)
 * @throws Error jika kata sandi tidak memenuhi kriteria validasi
 */
export async function hashPassword(
  password: string,
  identifier?: string
): Promise<string> {
  const validation = validatePassword(password, identifier);
  if (!validation.isValid) {
    throw new Error(validation.error || 'Kata sandi tidak valid.');
  }

  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

/**
 * Memverifikasi kecocokan kata sandi mentah dengan hash bcrypt
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) {
    return false;
  }

  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    console.error('Kesalahan saat memverifikasi kata sandi:', error);
    return false;
  }
}
