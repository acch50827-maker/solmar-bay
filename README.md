# Porto Verde

[![make.fun](https://make.fun/badge/competition/gta6-01.svg)](https://make.fun/c/gta6-01)
[![make.fun entry](https://make.fun/badge/entry/acch50827-maker/solmar-bay.svg)](https://make.fun/c/gta6-01)
[![built with make.fun](https://make.fun/badge/built-with.svg)](https://make.fun)

Game open-world crime 2D top-down orisinal: **Porto Verde**. Dante Cruz kembali ke kota pelabuhan Porto Verde yang dikuasai Salazar. Bantu Lena Ortiz merebut kembali kota — 5 misi berantai, kejar-kejaran dengan Bay Police, dan wanted 0–5 bintang.

## Cerita

Lima tahun setelah diusir dari Porto Verde, Dante Cruz pulang. Salazar dan anak buahnya menguasai pelabuhan, memeras pedagang, dan menyandera Tomas — sahabat lama Dante. Bersama Lena Ortiz, Dante menyusun rencana: ambil paket, jemput Lena, lewati tiga pos, selamatkan Tomas, lalu bobol brankas pelabuhan dan kabur dengan perahu. Satu kesalahan, dan Bay Police akan memburumu sampai ke ujung kota.

## Cara main

- **WASD / panah** — jalan kaki atau mengendarai mobil
- **E** — curi mobil / keluar dari mobil
- **Klik kiri** — tembak ke arah mouse
- **P** — jeda, **M** — suara on/off

## Misi (total hadiah $3.300)

| # | Misi | Hadiah |
|---|------|--------|
| 1 | Paket Pertama — ambil paket, antar ke downtown | $300 |
| 2 | Jemput Lena — jemput di taman, antar ke safehouse | $500 |
| 3 | Tiga Pos — kunjungi tiga pos dalam 90 detik | $700 |
| 4 | Selamatkan Tomas — habisi 3 preman di gudang | $800 |
| 5 | Brankas Pelabuhan — tahan brankas 20 detik, kabur ke perahu | $1.000 |

## Tips

- Wanted mendingin kalau kamu bersembunyi jauh dari polisi selama 14 detik.
- Tertangkap berarti kehilangan 20% uang dan bangun di rumah sakit.
- Ambil pickup hijau ($) dan kotak putih (+) yang tersebar di kota.
- Mobil yang dicuri menaikkan wanted — curi hanya kalau perlu.
- Progress tersimpan otomatis di browser (localStorage).

## Fitur

- Kota 3200×2400: jalan grid, downtown, taman pusat, pantai, dan marina dengan perahu
- Lalu lintas yang mengikuti jalan dan pejalan kaki di trotoar
- Wanted 0–5 bintang, polisi mengejar, menabrak, dan menembak dari 3 bintang
- HUD lengkap (uang, HP, bintang, kecepatan, daftar misi) + minimap live
- Layar title / jeda / tertangkap / tamat, autosave, dan suara sintetis WebAudio
- Tanpa library, tanpa request jaringan — murni HTML, canvas, dan ES modules

## Run it

```bash
node serve.ts
```

Lalu buka http://localhost:8080

Game ini dibuat untuk kompetisi [Make GTA 6](https://make.fun/c/gta6-01) di make.fun. Coba buat game kamu sendiri di [make.fun](https://make.fun/r/xzdd07z5).
