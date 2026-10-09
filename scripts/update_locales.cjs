const fs = require('fs');
['en', 'ru', 'tj'].forEach(lang => {
  const file = 'src/i18n/locales/' + lang + '.ts';
  let content = fs.readFileSync(file, 'utf8');
  let translations = '';
  if (lang === 'en') translations = `mo: 'mo',\n    month: 'Month',\n    expand: 'Expand',\n    collapse: 'Collapse',`;
  if (lang === 'ru') translations = `mo: 'мес',\n    month: 'Месяц',\n    expand: 'Развернуть',\n    collapse: 'Свернуть',`;
  if (lang === 'tj') translations = `mo: 'моҳ',\n    month: 'Моҳ',\n    expand: 'Кушодан',\n    collapse: 'Пӯшидан',`;
  content = content.replace(/offlineNotice:\s*'([^']+)'(,?)/, `offlineNotice: '$1',\n    ${translations}`);
  fs.writeFileSync(file, content);
});
