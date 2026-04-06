import fs from "fs";
const code = fs.readFileSync("packages/server/src/modules/core/customers/customers.service.test.ts", "utf8");
fs.writeFileSync("packages/server/src/modules/core/customers/customers.service.test.ts", code.replace("calls.push({ sql: sql.trim(), params });", "console.log('SQL:', sql); calls.push({ sql: sql.trim(), params });"));
