const regionOptionCollator = new Intl.Collator("ko-KR", {
  numeric: true,
  sensitivity: "base",
});

export function sortRegionOptions(options: readonly string[]): string[] {
  return [...options].sort((left, right) => regionOptionCollator.compare(left, right));
}
