import { writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { faker } from "@faker-js/faker";
import { nanoid } from "nanoid";
import chalk from "chalk";

/**
 * ПОЧЕМУ "type": "module" в package.json важен для React?
 * React-приложения по умолчанию используют ES-модули (import/export).
 * Включение "type": "module" на этапе подготовки данных гарантирует,
 * что логика генерации валидации и будущей сборки будет использовать
 * единый синтаксис, что исключает ошибки транспиляции и упрощает
 * миграцию данных в клиентский React-проект без переписывания импортов.
 */

// Определяем путь к корню проекта независимо от ОС для стабильной работы путей
const currentModulePath = fileURLToPath(import.meta.url);
const currentDirectory = dirname(currentModulePath);
const projectRoot = join(currentDirectory, "..");
const dataDirectoryPath = join(projectRoot, "data");
const databaseFilePath = join(dataDirectoryPath, "db.json");

// Проверка входного количества записей для предотвращения переполнения и крашей
const validateItemCount = (count) => {
  if (count == null || Number.isNaN(count)) {
    throw new Error(
      "Количество записей не может быть null, undefined или NaN.",
    );
  }
  if (count <= 0) {
    throw new Error("Количество записей должно быть строго больше нуля.");
  }
  // Разумное ограничение ввода для защиты памяти процесса
  if (count > 1000) {
    throw new Error(
      "Превышен безопасный лимит генерации (максимум 1000 записей).",
    );
  }
  return Math.floor(count);
};

// Генерация массива объектов с единой структурой
const generateMockData = (itemCount) => {
  // map выбран вместо цикла for для декларативного преобразования диапазона в массив без мутаций
  return Array.from({ length: itemCount }).map(() => ({
    id: nanoid(10),
    title: faker.commerce.productName(),
    description: faker.commerce.productDescription(),
    price: faker.commerce.price({ symbol: "₽" }),
    category: faker.commerce.department(),
    inStock: faker.datatype.boolean(),
    createdAt: faker.date.past().toISOString(),
  }));
};

const runGenerator = async () => {
  try {
    // mkdir с recursive=true предотвращает падение при повторном запуске, если директория уже существует
    await mkdir(dataDirectoryPath, { recursive: true });

    const safeCount = validateItemCount(50);
    const mockItems = generateMockData(safeCount);

    // writeFile используется вместо sync-аналогов, чтобы не блокировать event-loop Node.js
    // JSON.stringify с отступом 2 гарантирует читаемость файла для человека и последующего парсинга React
    await writeFile(
      databaseFilePath,
      JSON.stringify(mockItems, null, 2),
      "utf8",
    );

    console.log(chalk.green("✅ Генерация данных успешно завершена."));
    console.log(chalk.blue(`📦 Создано записей: ${mockItems.length}`));
    console.log(chalk.yellow(`💾 Файл сохранён: ${databaseFilePath}`));
  } catch (error) {
    // Явный catch предотвращает silent fail и возвращает понятное сообщение об ошибке
    console.error(
      chalk.red("❌ Ошибка при генерации или записи данных:"),
      error.message,
    );
    process.exit(1);
  }
};

runGenerator();
