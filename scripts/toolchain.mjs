export function parseMinimumNodeVersion(value) {
  return parseMinimumVersion(value, "Node.js");
}

export function parseMinimumNpmVersion(value) {
  return parseMinimumVersion(value, "npm");
}

export function compareVersions(left, right) {
  const leftParts = parseExactVersion(left, "version").split(".").map(Number);
  const rightParts = parseExactVersion(right, "version").split(".").map(Number);

  for (let index = 0; index < leftParts.length; index += 1) {
    if (leftParts[index] !== rightParts[index]) {
      return leftParts[index] - rightParts[index];
    }
  }

  return 0;
}

function parseMinimumVersion(value, label) {
  if (typeof value !== "string") {
    throw new Error(
      `package.json engines.${label === "Node.js" ? "node" : "npm"} must define a minimum ${label} version`,
    );
  }

  const match = value.match(/^>=(\d+\.\d+\.\d+)$/);

  if (!match) {
    throw new Error(
      `package.json engines.${label === "Node.js" ? "node" : "npm"} must use a >= exact-version range; received ${value}`,
    );
  }

  return match[1];
}

function parseExactVersion(value, label) {
  if (!/^\d+\.\d+\.\d+$/.test(value)) {
    throw new Error(`${label} must be an exact stable version; received ${value}`);
  }

  return value;
}
