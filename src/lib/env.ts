function obrigatoria(nome: string, minimo = 1) {
  const value = process.env[nome];
  if (!value || value.length < minimo) throw new Error(`${nome} é obrigatória e deve ter pelo menos ${minimo} caracteres`);
  return value;
}

export const serverEnv = {
  databaseUrl: obrigatoria("DATABASE_URL"),
  sessionSecret: obrigatoria("SESSION_SECRET", 32),
};
