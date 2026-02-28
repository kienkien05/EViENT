const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const SHARED_LINK = path.join(ROOT, "node_modules", "@evient", "shared");
const SHARED_SRC = path.join(ROOT, "packages", "shared");

console.log("[predev] Kiem tra @evient/shared...");

// Check if symlink/junction exists and points to correct location
let needsInstall = false;

if (!fs.existsSync(path.join(ROOT, "node_modules"))) {
  console.log("[predev] node_modules chua ton tai -> chay npm install...");
  needsInstall = true;
} else if (!fs.existsSync(SHARED_LINK)) {
  console.log("[predev] @evient/shared chua duoc link -> chay npm install...");
  needsInstall = true;
} else {
  try {
    // Verify the link actually resolves
    require.resolve("@evient/shared", { paths: [ROOT] });
    console.log("[predev] @evient/shared OK");
  } catch {
    console.log("[predev] @evient/shared link bi hong -> chay npm install...");
    needsInstall = true;
  }
}

if (needsInstall) {
  console.log("[predev] Dang cai dat dependencies...");
  execSync("npm install", { cwd: ROOT, stdio: "inherit" });
}

// Build shared package
console.log("[predev] Build shared package...");
execSync("npm run build -w packages/shared", { cwd: ROOT, stdio: "inherit" });

console.log("[predev] San sang!");
