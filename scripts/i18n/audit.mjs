#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const BASELINE_PATH = path.join(ROOT, 'i18n-audit-baseline.json');
const EN_MESSAGES_PATH = path.join(ROOT, 'messages', 'en.json');
const AR_MESSAGES_PATH = path.join(ROOT, 'messages', 'ar.json');
const FR_MESSAGES_PATH = path.join(ROOT, 'messages', 'fr.json');
const UPDATE_BASELINE = process.argv.includes('--update-baseline');

const INCLUDE_DIRS = ['app', 'components', 'schemas'];
const EXCLUDE_PATH_PATTERNS = [/^app\/\(auth\)\//];

const ISSUE_TYPES = {
  ui_literal_prop: 'ui_literal_prop',
  toast_literal: 'toast_literal',
  yup_literal_message: 'yup_literal_message',
  missing_key_en: 'missing_key_en',
  missing_key_ar: 'missing_key_ar',
  missing_key_fr: 'missing_key_fr',
  namespaced_key_style: 'namespaced_key_style',
};

const BLOCKING_ISSUE_TYPES = new Set([
  ISSUE_TYPES.missing_key_en,
  ISSUE_TYPES.missing_key_ar,
  ISSUE_TYPES.missing_key_fr,
]);

const UI_LITERAL_PROP_REGEX =
  /\b(label|placeholder|title|description|subTitle|subtitle|aria-label)\s*=\s*(['"])([^"'{}]*[A-Za-z][^"'{}]*)\2/g;

const TOAST_LITERAL_REGEX =
  /toast\.(success|error|info|warning)\(\s*(['"])([^"'`]*[A-Za-z][^"'`]*)\2/g;

const YUP_LITERAL_DIRECT_REGEX =
  /\.(required|typeError|email)\(\s*(['"])([^"'`]*[A-Za-z][^"'`]*)\2\s*\)/g;

const YUP_LITERAL_SECOND_ARG_REGEX =
  /\.(min|max|matches|oneOf)\(\s*[^,)]*,\s*(['"])([^"'`]*[A-Za-z][^"'`]*)\2/g;

const TRANSLATOR_DECL_REGEX =
  /(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:await\s+)?(?:useTranslations|getTranslations)\(\s*(['"])(.*?)\2\s*\)/g;

const TRANSLATOR_CALL_REGEX =
  /([A-Za-z_$][\w$]*)\(\s*(['"])([^"'`]+)\2(?:\s*,|\s*\))/g;

const RELATIVE_KEY_PREFIXES = ['../', './', '../../'];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function walk(dirPath, acc = []) {
  if (!fs.existsSync(dirPath)) return acc;

  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, acc);
      continue;
    }

    if (!fullPath.endsWith('.ts') && !fullPath.endsWith('.tsx')) {
      continue;
    }

    const relativePath = path.relative(ROOT, fullPath).replace(/\\/g, '/');
    if (EXCLUDE_PATH_PATTERNS.some((pattern) => pattern.test(relativePath))) {
      continue;
    }

    acc.push({
      fullPath,
      relativePath,
      content: fs.readFileSync(fullPath, 'utf8'),
    });
  }

  return acc;
}

function flattenKeys(obj, prefix = '', out = new Set()) {
  if (!obj || typeof obj !== 'object') return out;

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    out.add(fullKey);
    flattenKeys(value, fullKey, out);
  }

  return out;
}

function lineFromIndex(content, index) {
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (content.charCodeAt(i) === 10) line += 1;
  }
  return line;
}

function makeIssue(type, file, line, value, details = '') {
  const normalizedValue = String(value ?? '').trim();
  const id = [type, file, normalizedValue, details].join('::');
  return { id, type, file, line, value: normalizedValue, details };
}

function collectUiLiteralIssues(file, issues) {
  let match;
  while ((match = UI_LITERAL_PROP_REGEX.exec(file.content)) !== null) {
    const [, propName, , propValue] = match;
    issues.push(
      makeIssue(
        ISSUE_TYPES.ui_literal_prop,
        file.relativePath,
        lineFromIndex(file.content, match.index),
        propValue,
        `prop=${propName}`,
      ),
    );
  }
}

function collectToastLiteralIssues(file, issues) {
  let match;
  while ((match = TOAST_LITERAL_REGEX.exec(file.content)) !== null) {
    const [, toastMethod, , toastText] = match;
    issues.push(
      makeIssue(
        ISSUE_TYPES.toast_literal,
        file.relativePath,
        lineFromIndex(file.content, match.index),
        toastText,
        `toast=${toastMethod}`,
      ),
    );
  }
}

function collectYupLiteralIssues(file, issues) {
  if (!file.relativePath.startsWith('schemas/')) {
    return;
  }

  let match;
  while ((match = YUP_LITERAL_DIRECT_REGEX.exec(file.content)) !== null) {
    const [, methodName, , messageText] = match;
    issues.push(
      makeIssue(
        ISSUE_TYPES.yup_literal_message,
        file.relativePath,
        lineFromIndex(file.content, match.index),
        messageText,
        `method=${methodName}`,
      ),
    );
  }

  while ((match = YUP_LITERAL_SECOND_ARG_REGEX.exec(file.content)) !== null) {
    const [, methodName, , messageText] = match;
    issues.push(
      makeIssue(
        ISSUE_TYPES.yup_literal_message,
        file.relativePath,
        lineFromIndex(file.content, match.index),
        messageText,
        `method=${methodName}`,
      ),
    );
  }
}

function collectTranslationKeyIssues(file, enKeys, arKeys, frKeys, issues) {
  const translatorNamespaces = new Map();

  let declMatch;
  while ((declMatch = TRANSLATOR_DECL_REGEX.exec(file.content)) !== null) {
    const [, translatorVar, , namespace] = declMatch;
    translatorNamespaces.set(translatorVar, namespace);
  }

  if (translatorNamespaces.size === 0) return;

  let callMatch;
  while ((callMatch = TRANSLATOR_CALL_REGEX.exec(file.content)) !== null) {
    const [, translatorVar, , rawKey] = callMatch;
    const namespace = translatorNamespaces.get(translatorVar);

    if (namespace === undefined) continue;
    if (RELATIVE_KEY_PREFIXES.some((prefix) => rawKey.startsWith(prefix))) {
      continue;
    }

    let fullKey = rawKey;
    if (namespace && namespace.length > 0) {
      fullKey = rawKey.startsWith(`${namespace}.`)
        ? rawKey
        : `${namespace}.${rawKey}`;
    }

    const line = lineFromIndex(file.content, callMatch.index);

    if (namespace && namespace.length > 0 && rawKey.includes('.')) {
      issues.push(
        makeIssue(
          ISSUE_TYPES.namespaced_key_style,
          file.relativePath,
          line,
          rawKey,
          `namespace=${namespace}`,
        ),
      );
    }

    if (!enKeys.has(fullKey)) {
      issues.push(
        makeIssue(
          ISSUE_TYPES.missing_key_en,
          file.relativePath,
          line,
          fullKey,
          `missing in messages/en.json`,
        ),
      );
    }

    if (!arKeys.has(fullKey)) {
      issues.push(
        makeIssue(
          ISSUE_TYPES.missing_key_ar,
          file.relativePath,
          line,
          fullKey,
          `missing in messages/ar.json`,
        ),
      );
    }

    if (!frKeys.has(fullKey)) {
      issues.push(
        makeIssue(
          ISSUE_TYPES.missing_key_fr,
          file.relativePath,
          line,
          fullKey,
          `missing in messages/fr.json`,
        ),
      );
    }
  }
}

function readBaselineIssueSet() {
  if (!fs.existsSync(BASELINE_PATH)) {
    return new Set();
  }

  try {
    const parsed = readJson(BASELINE_PATH);
    if (!parsed || !Array.isArray(parsed.issues)) return new Set();
    return new Set(parsed.issues);
  } catch {
    return new Set();
  }
}

function writeBaseline(issues) {
  const payload = {
    generatedAt: new Date().toISOString(),
    excludedPaths: EXCLUDE_PATH_PATTERNS.map((pattern) => pattern.toString()),
    notes: 'Auth routes are intentionally excluded for this rollout.',
    issues: [...new Set(issues.map((issue) => issue.id))].sort(),
  };

  fs.writeFileSync(BASELINE_PATH, `${JSON.stringify(payload, null, 2)}\n`);
}

function printSummary(issues, title) {
  const byType = new Map();
  for (const issue of issues) {
    byType.set(issue.type, (byType.get(issue.type) ?? 0) + 1);
  }

  console.log(`\n${title}`);
  console.log('='.repeat(title.length));
  for (const [type, count] of [...byType.entries()].sort()) {
    console.log(`- ${type}: ${count}`);
  }
  console.log(`- total: ${issues.length}`);
}

function printIssueList(issues, header) {
  if (issues.length === 0) return;
  console.log(`\n${header}`);
  console.log('-'.repeat(header.length));
  for (const issue of issues.slice(0, 200)) {
    const details = issue.details ? ` (${issue.details})` : '';
    console.log(
      `${issue.type} ${issue.file}:${issue.line} -> ${issue.value}${details}`,
    );
  }
  if (issues.length > 200) {
    console.log(`...and ${issues.length - 200} more issues`);
  }
}

function main() {
  const enMessages = readJson(EN_MESSAGES_PATH);
  const arMessages = readJson(AR_MESSAGES_PATH);
  const frMessages = readJson(FR_MESSAGES_PATH);
  const enKeys = flattenKeys(enMessages);
  const arKeys = flattenKeys(arMessages);
  const frKeys = flattenKeys(frMessages);

  const files = INCLUDE_DIRS.flatMap((dir) => walk(path.join(ROOT, dir)));
  const allIssues = [];

  for (const file of files) {
    collectUiLiteralIssues(file, allIssues);
    collectToastLiteralIssues(file, allIssues);
    collectYupLiteralIssues(file, allIssues);
    collectTranslationKeyIssues(file, enKeys, arKeys, frKeys, allIssues);
  }

  if (UPDATE_BASELINE) {
    writeBaseline(allIssues);
    printSummary(allIssues, 'I18n Audit Baseline Updated');
    console.log(`\nBaseline written to ${path.relative(ROOT, BASELINE_PATH)}`);
    process.exit(0);
  }

  const baselineIssues = readBaselineIssueSet();
  const newIssues = allIssues.filter((issue) => !baselineIssues.has(issue.id));
  const blockingNewIssues = newIssues.filter((issue) =>
    BLOCKING_ISSUE_TYPES.has(issue.type),
  );

  printSummary(allIssues, 'I18n Audit Summary (All In-Scope Issues)');
  printSummary(newIssues, 'I18n Audit Summary (New Issues vs Baseline)');
  printSummary(
    blockingNewIssues,
    'I18n Audit Summary (Blocking New Missing-Key Issues)',
  );
  printIssueList(newIssues, 'New Issues');
  printIssueList(blockingNewIssues, 'Blocking New Missing-Key Issues');

  if (blockingNewIssues.length > 0) {
    console.error('\nI18n audit failed: new missing translation keys were found.');
    process.exit(1);
  }

  console.log(
    '\nI18n audit passed: no new missing translation keys compared with baseline.',
  );
}

main();
