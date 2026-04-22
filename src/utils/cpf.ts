// ── Gerador de CPF válido para staging ────────────────────────────────────────

function cpfDigit(digits: number[], len: number): number {
  let sum = 0
  for (let i = 0; i < digits.length; i++) sum += digits[i] * (len - i)
  const r = (sum * 10) % 11
  return r >= 10 ? 0 : r
}

/**
 * Gera um CPF válido aleatório iniciado por 7.
 * No staging da Creditas, CPFs começando com 7 = aprovação automática.
 */
export function randomTestCpf(): string {
  const base = [7, ...Array.from({ length: 8 }, () => Math.floor(Math.random() * 10))]
  const d1 = cpfDigit(base, 10)
  const d2 = cpfDigit([...base, d1], 11)
  return [...base, d1, d2].join('')
}

/**
 * Gera N CPFs válidos únicos iniciados por 7.
 */
export function randomTestCpfs(n: number): string[] {
  const set = new Set<string>()
  while (set.size < n) set.add(randomTestCpf())
  return Array.from(set)
}

/**
 * Formata um CPF string como XXX.XXX.XXX-XX.
 */
export function formatCpf(cpf: string): string {
  const d = cpf.replace(/\D/g, '')
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}
