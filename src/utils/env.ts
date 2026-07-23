type EnvVarName = keyof typeof process.env

export function requiredString(name: EnvVarName): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} is required`)
  }

  return value
}

export function positiveInt(name: EnvVarName, defaultValue: number): number {
  const raw = process.env[name]
  if (!raw) {
    return defaultValue
  }

  const value = Number(raw)
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive integer`)
  }

  return value
}
