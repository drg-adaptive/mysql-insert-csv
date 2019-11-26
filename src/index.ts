import neatCsv from "neat-csv";
import sqlstring from "sqlstring";
import { ReadStream } from "fs";

interface ParserArgs {
  numericColumns?: Array<string>;
  maxChars?: number;
}

interface MapValuesArgs {
  header: string;
  value: any;
}

type StatementExecutor = (statement: string) => Promise<any>;

function createValueMapper(numericColumns: Array<string>) {
  return (args: MapValuesArgs) => {
    if (numericColumns?.indexOf(args.header) >= 0) {
      return args.value;
    }

    return args.value === "NULL" ? "NULL" : sqlstring.escape(args.value);
  };
}

function createExecutor(uploader: StatementExecutor) {
  return async (statement: string, rowCount: number) => {
    try {
      await uploader(statement);
      console.info(`${rowCount} total rows uploaded`);
    } catch (ex) {
      console.error(`Error executing ${statement}`);
      throw new Error(ex.message);
    }
  };
}

export const CsvInsert = function(
  uploader: StatementExecutor,
  settings?: ParserArgs
) {
  const mapValues = createValueMapper(settings?.numericColumns ?? []);

  const executeStatement = createExecutor(uploader);

  const MAX_CHARS = settings?.maxChars ?? 64000;

  return async (
    readStream: ReadStream,
    table_name: string,
    escapeChar: string = "\\"
  ) => {
    const data = await neatCsv(readStream, {
      mapValues,
      escape: escapeChar
    });

    console.info(`Uploading ${data.length} entries in ${table_name}`);

    const columns = Object.keys(data[0]);
    let insertStart = `INSERT INTO ${sqlstring.escapeId(
      table_name
    )} (${columns
      .map(column_name => sqlstring.escapeId(column_name))
      .join(",")}) VALUES `;
    let statement = "";

    let idx = 0;

    for (const entry of data) {
      idx++;

      const columnData = columns
        .map(key => entry[key])
        .map(value => (value === undefined ? "NULL" : value));

      if (!columnData.find(x => x !== "NULL")) {
        continue;
      }

      const newStatement = `(${columnData.join(",")})`;

      if (statement.length + newStatement.length > MAX_CHARS) {
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
