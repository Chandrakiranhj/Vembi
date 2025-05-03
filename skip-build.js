// Skip build script for Vercel - always returns false to ensure the build runs
// This is used in combination with vercel.json
process.exit(1); // Exit with code 1 (false) to indicate the build should proceed 