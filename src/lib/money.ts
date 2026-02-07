export function formatALL(value: number) {
  return new Intl.NumberFormat("sq-AL", {
    maximumFractionDigits: 0,
  }).format(value) + "L";
}


export function allToEur(all: number): number {
  const rate = Number(process.env.ALL_PER_EUR || 100);
  return Number((all / rate).toFixed(2));
}
