import neatCsv from "neat-csv";
import sqlstring from "sqlstring";
import { ReadStream } from "fs";

interface ParserArgs {
  numericColumns?: Array<string>;
  maxChars?: number;
  escapeChar?: string;
  progressCallback?: ProgressCallback;
  columnTransformers?: ColumnTransformers;
}

interface MapValuesArgs {
  header: string;
  value: any;
}

type ColumnTransformers = { [key: string]: (value: string) => string };

type StatementExecutor = (statement: string) => Promise<any>;

function createValueMapper(
  numericColumns: Array<string>,
  columnTransformers: ColumnTransformers
) {
  return (args: MapValuesArgs) => {
    let value = args.value;

    if (columnTransformers[args.header]) {
      value = columnTransformers[args.header](value);
    }

    if (numericColumns?.indexOf(args.header) >= 0) {
      return value;
    }

    return value === "NULL" ? "NULL" : sqlstring.escape(value);
  };
}

function createExecutor(
  uploader: StatementExecutor,
  progressCallback: ProgressCallback,
  tableName: string,
  totalRows: number
) {
  return async (statement: string, rowCount: number) => {
    try {
      await uploader(statement);
      progressCallback((rowCount / totalRows) * 100, tableName);
    } catch (ex) {
      console.error(`Error executing ${statement}`);
      throw new Error(ex.message);
    }
  };
}

type ProgressCallback = (progress: number, tableName: string) => void;

const DefaultProgressCallback: ProgressCallback = (
  progress: number,
  tableName: string
) =>
  console.error(`${progress.toFixed(2)}% of records uploaded to ${tableName}`);

function createNewValuesStatement(
  columns: string[],
  entry: any
): string | undefined {
  const columnData = columns
    .map(key => entry[key])
    .map(value => (value === undefined ? "NULL" : value));

  if (!columnData.find(x => x !== "NULL")) {
    return;
  }

  return `(${columnData.join(",")})`;
}

const createInsertStatement = (table_name: string, columns: string[]) =>
  `INSERT INTO ${sqlstring.escapeId(table_name)} (${columns
    .map(column_name => sqlstring.escapeId(column_name))
    .join(",")}) VALUES `;

export const CsvInsert = function(
  uploader: StatementExecutor,
  settings?: ParserArgs
) {
  const columnTransformers = settings?.columnTransformers ?? {};
  const mapValues = createValueMapper(
    settings?.numericColumns ?? [],
    columnTransformers
  );
  const progressCallback =
    settings?.progressCallback ?? DefaultProgressCallback;
  const MAX_CHARS = settings?.maxChars ?? 64000;
  const escapeChar = settings?.escapeChar ?? "\\";

  return async (readStream: ReadStream, table_name: string) => {
    const data = await neatCsv(readStream, {
      mapValues,
      escape: escapeChar
    });

    const columns = Object.keys(data[0]);
    let insertStart = createInsertStatement(table_name, columns);
    let statement = "";

    let idx = 0;

    const executeStatement = createExecutor(
      uploader,
      progressCallback,
      table_name,
      data.length
    );

    for (const entry of data) {
      idx++;

      const newStatement = createNewValuesStatement(columns, entry);

      if (!newStatement) continue;

      if (
        !isNaN(MAX_CHARS) &&
        statement.length + newStatement.length > MAX_CHARS
      ) {
        await executeStatement(statement, idx);
        statement = "";
      }

      if (statement.length === 0) {
        statement = `${insertStart}\n${newStatement}`;
      } else {
        statement += `,\n${newStatement}`;
      }
    }

    if (statement.length > insertStart.length) {
      await executeStatement(statement, idx);
    }
  };
};
