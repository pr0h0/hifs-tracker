const fs = require("fs");

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJuzData() {
  const allJuzData = [];

  for (let i = 1; i <= 30; i++) {
    process.stderr.write(`Fetching Juz ${i}... `);
    try {
      await delay(1000); // 1.5s delay
      const response = await fetch(
        `http://api.alquran.cloud/v1/juz/${i}/en.asad`,
      );

      const text = await response.text();
      let payload;
      try {
        payload = JSON.parse(text);
      } catch (e) {
        throw new Error(
          `Failed to parse JSON for Juz ${i}: ${text.substring(0, 100)}...`,
        );
      }

      if (payload.code !== 200) {
        throw new Error(
          `Failed to fetch Juz ${i}: ${payload.status} - ${payload.data}`,
        );
      }

      const ayahs = payload.data.ayahs;
      process.stderr.write(`OK\n`);

      // Group by Surah to find start/end ayahs
      const segments = [];
      if (ayahs.length === 0) continue;

      let currentSurah = ayahs[0].surah.number;
      let startAyah = ayahs[0].numberInSurah;
      let endAyah = ayahs[0].numberInSurah;

      for (let j = 1; j < ayahs.length; j++) {
        const ayah = ayahs[j];
        if (ayah.surah.number !== currentSurah) {
          segments.push({
            surah: currentSurah,
            startAyah,
            endAyah,
          });
          currentSurah = ayah.surah.number;
          startAyah = ayah.numberInSurah;
        }
        endAyah = ayah.numberInSurah;
      }

      // Push the last segment
      segments.push({
        surah: currentSurah,
        startAyah,
        endAyah,
      });

      allJuzData.push({
        juzNumber: i,
        segments,
      });
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  }

  console.log(JSON.stringify(allJuzData, null, 2));
}

fetchJuzData();
