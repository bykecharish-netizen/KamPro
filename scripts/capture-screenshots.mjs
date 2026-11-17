import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outDir = path.resolve(__dirname, '../docs/screenshots');

async function capture() {
  console.log('Meluncurkan browser otomatis Puppeteer...');
  const tmpDir = path.resolve(__dirname, `../.puppeteer_tmp_${Date.now()}`);
  const browser = await puppeteer.launch({
    headless: true,
    userDataDir: tmpDir,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 868 });

  // 1. Screenshot Halaman Login Bersih
  console.log('1. Mengambil screenshot 01_login_page.png...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(outDir, '01_login_page.png') });

  // 2. Screenshot Halaman Registrasi
  console.log('2. Mengambil screenshot 02_register_page.png...');
  await page.goto('http://localhost:3000/register', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(outDir, '02_register_page.png') });

  // 3. Screenshot Login Error / Anti-Enumerasi
  console.log('3. Mengambil screenshot 03_login_error_anti_enumeration.png...');
  await page.goto('http://localhost:3000/login?error=NIP%2FNPM%20atau%20kata%20sandi%20salah', {
    waitUntil: 'networkidle2',
  });
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: path.join(outDir, '03_login_error_anti_enumeration.png') });

  // 4. Screenshot Dasbor Admin
  console.log('4. Mengambil screenshot 04_dashboard_admin.png...');
  const adminRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: '199208142015031003',
      password: 'Password123!#',
    }),
  });
  const adminSetCookie = adminRes.headers.get('set-cookie') || '';
  const adminToken = (adminSetCookie.match(/session_token=([^;]+)/) || [])[1];

  if (adminToken) {
    await page.setCookie({
      name: 'session_token',
      value: adminToken,
      domain: 'localhost',
      path: '/',
    });
    await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(outDir, '04_dashboard_admin.png') });
  }

  // 5. Screenshot Dasbor Dosen / Pengusul
  console.log('5. Mengambil screenshot 05_dashboard_pengusul.png...');
  const budiRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: '198503152010121001',
      password: 'Password123!#',
    }),
  });
  const budiSetCookie = budiRes.headers.get('set-cookie') || '';
  const budiToken = (budiSetCookie.match(/session_token=([^;]+)/) || [])[1];

  if (budiToken) {
    await page.setCookie({
      name: 'session_token',
      value: budiToken,
      domain: 'localhost',
      path: '/',
    });
    await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(outDir, '05_dashboard_pengusul.png') });
  }

  // 6. Screenshot Pengusul dengan Modal Usulan Baru
  console.log('6. Mengambil screenshot 06_modal_usulan_baru.png...');
  try {
    const btnUsulan = await page.$('button#btn-create-proposal, button:has-text("Buat Usulan Baru"), button');
    // Cari tombol "Buat Usulan Baru"
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find((b) => b.textContent && b.textContent.includes('Buat Usulan'));
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(outDir, '06_modal_usulan_baru.png') });
  } catch (e) {
    console.log('Lewati modal usulan:', e.message);
  }

  await browser.close();
  console.log('Semua screenshot berhasil dibuat dan disimpan di docs/screenshots!');
}

capture().catch((err) => {
  console.error('Terjadi kesalahan:', err);
  process.exit(1);
});
