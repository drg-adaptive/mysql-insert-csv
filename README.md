# MySQL Insert CSV

[![Build Status](https://travis-ci.org/drg-adaptive/mysql-insert-csv.svg?branch=master)](https://travis-ci.org/drg-adaptive/mysql-insert-csv)
[![Maintainability](https://api.codeclimate.com/v1/badges/fbabb0d394cabc87e845/maintainability)](https://codeclimate.com/github/drg-adaptive/mysql-insert-csv/maintainability)
[![npm version](https://badge.fury.io/js/mysql-insert-csv.svg)](https://badge.fury.io/js/mysql-insert-csv)

Easily insert CSV rows into a MySQL database table.

**Note**
This will break up insert commands to limit the maximum number of bytes per statement. This is to allow usage with the Aurora Data API. To remove this limitation, set the
`maxChars` setting to `NaN`.

## Usage

First, create an instance:

```typescript
import { CsvInsert } from "mysql-insert-csv";

const insert = CsvInsert((statement: string) => mysql.runSql(statement), {
  numericColumns: ["total_orders"],
  maxChars: NaN
});
```

Now, open a read stream to a CSV file, and pass it into the new instance:

```typescript
const reader = fs.createReadStream("some/file/path.csv");

await insert(reader, "some_table");
```
