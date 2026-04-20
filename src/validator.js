import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import chalk from "chalk";

const currentModulePath = fileURLToPath(import.meta.url);
const currentDirectory = dirname(currentModulePath);
const projectRoot = join(currentDirectory, "..");
const databaseFilePath = join(projectRoot, "data", "db.json");

// Поля, обязательные для корректного рендеринга карточек в React
const requiredFields = ["id", "title", "price", "category", "inStock"];

const validateDatabaseStructure = async () => {
  try {
    // readFile необходим для асинхронного получения данных без блокировки основного потока
    const rawData = await readFile(databaseFilePath, "utf8");

    if (!rawData.trim()) {
      throw new Error("Файл БД пуст. Запустите сначала npm run dev.");
    }

    const parsedData = JSON.parse(rawData);

    if (!Array.isArray(parsedData)) {
      throw new Error("Корневой элемент файла должен быть массивом объектов.");
    }

    // filter используется для сбора всех записей, не прошедших проверку, чтобы вывести полный отчёт
    const invalidRecords = parsedData.filter((record) => {
      // every проверяет наличие всех ключей без создания промежуточных массивов
      const hasRequiredKeys = requiredFields.every((field) =>
        Object.prototype.hasOwnProperty.call(record, field),
      );
      const isValidId = typeof record.id === "string" && record.id.length > 0;
      // Извлекаем числа из строки цены для проверки на NaN, сохраняя форматирование валюты
      const numericPrice = Number(record.price.replace(/[^\d.-]/g, ""));
      const isValidPrice =
        typeof record.price === "string" &&
        !Number.isNaN(numericPrice) &&
        numericPrice >= 0;

      return !hasRequiredKeys || !isValidId || !isValidPrice;
    });

    if (invalidRecords.length > 0) {
      console.warn(
        chalk.yellow(
          `⚠️ Обнаружено некорректных записей: ${invalidRecords.length}`,
        ),
      );
      invalidRecords.slice(0, 5).forEach((record, index) => {
        console.warn(
          chalk.yellow(`   Запись ${index + 1}:`, JSON.stringify(record)),
        );
      });
      if (invalidRecords.length > 5) {
        console.warn(
          chalk.yellow(`   ... и ещё ${invalidRecords.length - 5} записей.`),
        );
      }
      return false;
    }

    console.log(chalk.green("✅ Валидация структуры БД прошла успешно."));
    console.log(chalk.blue(`📊 Проверено записей: ${parsedData.length}`));
    return true;
  } catch (error) {
    // Обработка ошибок чтения/парсинга гарантирует, что React не получит битый JSON
    console.error(chalk.red("❌ Ошибка валидации файла БД:"), error.message);
    return false;
  }
};

// Запуск только при прямом вызове файла, сохранение возможности чистого импорта
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  validateDatabaseStructure();
}

export { validateDatabaseStructure };
