import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.resolve(__dirname, "..");
const schemaPath = path.join(packageRoot, "src/infra/db/drizzle/schema.ts");

const schemaContent = fs.readFileSync(schemaPath, "utf-8");

const sourceFile = ts.createSourceFile(
  schemaPath,
  schemaContent,
  ts.ScriptTarget.Latest,
  true,
);

let hasError = false;

const requiredFields = [
  "orgId", // 租户隔离
  "createdAt", // 创建时间
  "updatedAt", // 更新时间
];

function reportError(message) {
  console.error(`[Schema门禁] ${message}`);
  hasError = true;
}

/**
 * 检查一个表达式链中是否包含 .references() 调用
 */
function hasReferencesCall(node) {
  let current = node;
  while (ts.isCallExpression(current)) {
    const expr = current.expression;
    if (ts.isPropertyAccessExpression(expr)) {
      if (expr.name.text === "references") {
        return true;
      }
      current = expr.expression;
    } else {
      break;
    }
  }
  return false;
}

/**
 * 在索引定义函数中提取所有被索引的字段
 */
function getIndexedFields(indexFnNode) {
  const indexedFields = new Set();
  if (
    !ts.isArrowFunction(indexFnNode) &&
    !ts.isFunctionExpression(indexFnNode)
  ) {
    return indexedFields;
  }

  const tParam = indexFnNode.parameters[0];
  if (!tParam || !ts.isIdentifier(tParam.name)) {
    return indexedFields;
  }
  const tName = tParam.name.text;

  function traverse(node) {
    // 匹配 t.fieldName
    if (ts.isPropertyAccessExpression(node)) {
      if (ts.isIdentifier(node.expression) && node.expression.text === tName) {
        indexedFields.add(node.name.text);
      }
    }
    // 匹配 t['fieldName']
    else if (ts.isElementAccessExpression(node)) {
      if (ts.isIdentifier(node.expression) && node.expression.text === tName) {
        if (ts.isStringLiteral(node.argumentExpression)) {
          indexedFields.add(node.argumentExpression.text);
        }
      }
    }
    ts.forEachChild(node, traverse);
  }

  traverse(indexFnNode.body);
  return indexedFields;
}

// 遍历 AST 寻找 pgTable 定义
for (const statement of sourceFile.statements) {
  if (!ts.isVariableStatement(statement)) {
    continue;
  }

  for (const declaration of statement.declarationList.declarations) {
    const initializer = declaration.initializer;
    if (
      initializer &&
      ts.isCallExpression(initializer) &&
      ts.isIdentifier(initializer.expression) &&
      initializer.expression.text === "pgTable"
    ) {
      const args = initializer.arguments;
      if (args.length < 2) {
        continue;
      }

      // 1. 获取表名 (第一个参数)
      let tableName = "";
      if (ts.isStringLiteral(args[0])) {
        tableName = args[0].text;
      }

      // 2. 检查字段 (第二个参数)
      const fieldsObj = args[1];
      if (!ts.isObjectLiteralExpression(fieldsObj)) {
        continue;
      }

      const fieldNames = new Set();
      const fkFields = [];

      for (const prop of fieldsObj.properties) {
        if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
          const fieldName = prop.name.text;
          fieldNames.add(fieldName);

          if (hasReferencesCall(prop.initializer)) {
            fkFields.push(fieldName);
          }
        }
      }

      // 验证必填字段
      const missingFields = requiredFields.filter((f) => {
        if (tableName === "organizations" && f === "orgId") {
          return false;
        }
        return !fieldNames.has(f);
      });

      if (missingFields.length > 0) {
        reportError(
          `表 '${tableName}' 缺失必填字段: ${missingFields.join(", ")}`,
        );
      }

      // 3. 检查外键索引 (第三个参数)
      if (fkFields.length > 0) {
        const indexFn = args[2];
        if (!indexFn) {
          reportError(
            `表 '${tableName}' 包含外键 (${fkFields.join(", ")}), 但未定义任何索引! 请使用第三个参数显式创建索引。`,
          );
        } else {
          const indexedFields = getIndexedFields(indexFn);
          for (const fk of fkFields) {
            if (!indexedFields.has(fk)) {
              reportError(
                `表 '${tableName}' 的外键 '${fk}' 似乎未建索引! (在 index 配置中未找到 ${fk})`,
              );
            }
          }
        }
      }
    }
  }
}

if (hasError) {
  console.error(
    "\n❌ Drizzle Schema 门禁检查失败！请根据上述提示修复 src/infra/db/drizzle/schema.ts。",
  );
  console.error("规范要求：");
  console.error("1. 所有主实体必须包含 orgId, createdAt, updatedAt。");
  console.error(
    "2. 所有使用了 .references() 的外键字段必须在表定义的第三个参数中建立索引 (index(...).on(t.xxx))。\n",
  );
  process.exit(1);
} else {
  console.log("✅ Drizzle Schema 规范检查通过");
}
