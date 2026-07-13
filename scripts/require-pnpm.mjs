const userAgent = process.env.npm_config_user_agent ?? "";

if (!userAgent.startsWith("pnpm/")) {
  console.error(
    "AutoBracket chỉ cho phép cài dependency bằng pnpm đã được khóa trong package.json.",
  );
  process.exit(1);
}
