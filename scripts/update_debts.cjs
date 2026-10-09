const fs = require('fs');

function updateRu() {
  const file = 'src/i18n/locales/ru.ts';
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(
    /debtFreeBy: 'Debt-free by'[\s\S]*?payoffProjectionEnd: 'all \{count\} debts will be paid in \{months\} months\.',/,
    `debtFreeBy: 'Без долгов к',
    payoffCalcDesc: 'Интерактивный калькулятор погашения долгов',
    plannedSequence: 'Запланированная последовательность:',
    strategySnowball: 'Снежный ком (Сначала меньшие)',
    strategyAvalanche: 'Лавина (Сначала большие)',
    monthlyBudgetLabel: 'Месячный бюджет погашения:',
    projectedDebtFree: 'Без долгов к:',
    payoffProjectionStart: 'При',
    payoffProjectionEnd: 'все {count} долгов будут выплачены за {months} мес.',`
  );
  fs.writeFileSync(file, content);
}

function updateTj() {
  const file = 'src/i18n/locales/tj.ts';
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(
    /debtFreeBy: 'Debt-free by'[\s\S]*?payoffProjectionEnd: 'all \{count\} debts will be paid in \{months\} months\.',/,
    `debtFreeBy: 'Бе қарз то',
    payoffCalcDesc: 'Ҳисобкунаки интерактивии пардохти қарзҳо',
    plannedSequence: 'Тартиби ба нақша гирифташуда:',
    strategySnowball: 'Тӯби барфӣ (Аввал хурд)',
    strategyAvalanche: 'Тарма (Аввал калон)',
    monthlyBudgetLabel: 'Буҷаи моҳона барои пардохт:',
    projectedDebtFree: 'Бе қарз то:',
    payoffProjectionStart: 'Бо',
    payoffProjectionEnd: 'ҳамаи {count} қарз дар {months} моҳ пардохт мешавад.',`
  );
  fs.writeFileSync(file, content);
}

updateRu();
updateTj();
