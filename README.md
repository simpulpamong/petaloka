# PetaLoka

PetaLoka adalah aplikasi web untuk melihat dan menilai kerawanan wilayah Kabupaten Ponorogo pada tingkat kecamatan maupun desa/kelurahan. Data penilaian, kategori, dan pengaturan disimpan secara lokal di browser.

## Fitur

- Peta interaktif untuk 21 kecamatan dan 307 desa/kelurahan, dengan skor 1-5.
- Kategori penilaian bawaan dan kategori yang dapat dibuat atau disesuaikan.
- Basemap Google Satellite, Google Maps, OpenStreetMap, Esri Satellite, dan OpenTopoMap.
- Cetak dan ekspor PDF raster dari browser, cetak melalui dialog browser, atau PDF vektor melalui API server.
- Ukuran kertas A4, F4, A3, A2, A1, A0, dan ukuran khusus; DPI dapat diatur hingga 600 sesuai batas perangkat.
- Pengaturan kop, logo, legenda, skala, panah utara, catatan, dan tanda tangan untuk hasil cetak.
- PWA dengan cache aplikasi dan geometri wilayah. Data lokal dapat dicadangkan dan dipulihkan.

Basemap berasal dari penyedia eksternal sehingga memerlukan koneksi internet. Data geometri dan data lokal tersimpan di perangkat, tetapi cache browser dapat dihapus oleh pengguna atau sistem operasi.

## Persyaratan

- Node.js `>=22.18.0` dan npm.
- Koneksi internet untuk memasang dependensi, memuat basemap, dan menggunakan fitur daring.

## Menjalankan Aplikasi

```bash
npm ci
npm run dev
```

Buka `http://localhost:3000`.

Pemeriksaan dan build produksi:

```bash
npm run typecheck
npm run build
npm start
```

## Data GeoJSON

Semua berkas GeoJSON berada di `public/data/`:

| Berkas | Kegunaan |
| --- | --- |
| `kecamatan.geojson`, `kelurahan.geojson`, `ponorogo.geojson` | Sumber mentah yang digunakan generator |
| `regions-kabupaten.geojson` | Batas kabupaten untuk peta |
| `regions-kecamatan.geojson`, `regions-kelurahan.geojson` | Data ternormalisasi dan disederhanakan untuk tampilan peta |
| `regions-kecamatan-full.geojson`, `regions-kelurahan-full.geojson` | Geometri detail untuk cetak resolusi tinggi |

Aplikasi menggunakan berkas `regions-*`; berkas sumber mentah hanya diperlukan untuk membuat ulang hasil olahan. Tidak diperlukan file Excel.

Untuk memproses ulang data setelah mengubah sumber:

```bash
npm run prep:geojson
```

Generator membaca tiga berkas sumber di atas dan menulis hasilnya ke folder yang sama. Nama berkas sumber tidak ditimpa. Untuk membuat ulang ikon aplikasi dan PWA:

```bash
npm run prep:icons
```

## Deploy

Aplikasi dapat dideploy sebagai aplikasi Next.js standar, termasuk ke Vercel. Gunakan `npm run build` sebagai perintah build dan jangan aktifkan ekspor statis: route `/api/export-pdf` memerlukan runtime Node.js. Tidak ada environment variable wajib.


