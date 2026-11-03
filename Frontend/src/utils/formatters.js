export const formatBytes = (bytes) =>
  bytes < 1024 ** 2
    ? `${(bytes / 1024).toFixed(0)} KB`
    : `${(bytes / 1024 ** 2).toFixed(1)} MB`;
export const formatDate = (
  date,
  options = { month: "short", day: "numeric", year: "numeric" },
) => new Intl.DateTimeFormat("en-US", options).format(new Date(date));
export const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
