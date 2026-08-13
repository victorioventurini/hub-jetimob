/**
 * Copy humanizada para erros de registro/edição de valores de KPI.
 *
 * Nunca exibir nome de tabela, código SQL ou texto de política de segurança
 * ao usuário — sempre título + causa + o que fazer.
 */

export interface KpiValueErrorCopy {
  title: string;
  description: string;
}

function extract(error: unknown): { message: string; code: string } {
  const e = error as { message?: string; code?: string } | null;
  return {
    message: typeof e?.message === "string" ? e.message : "",
    code: typeof e?.code === "string" ? e.code : "",
  };
}

function isPermissionError(message: string, code: string): boolean {
  return (
    code === "42501" ||
    /row-level security/i.test(message) ||
    /permission denied/i.test(message) ||
    /não tem permissão/i.test(message)
  );
}

/** Erro ao criar/registrar um valor de KPI. */
export function getKpiValueCreateErrorCopy(error: unknown, kpiName?: string): KpiValueErrorCopy {
  const { message, code } = extract(error);

  if (isPermissionError(message, code)) {
    return {
      title: kpiName
        ? `Sem permissão para registrar "${kpiName}"`
        : "Sem permissão para registrar este KPI",
      description:
        "Você não é responsável nem contribuidor deste indicador nesta BU. Peça ao administrador da BU para te incluir como contribuidor do KPI.",
    };
  }

  return {
    title: kpiName ? `Erro ao registrar "${kpiName}"` : "Erro ao registrar valor",
    description: message || "Não foi possível salvar o valor. Tente novamente em alguns instantes.",
  };
}

/** Erro ao editar/substituir um valor de KPI já registrado. */
export function getKpiValueUpdateErrorCopy(error: unknown, kpiName?: string): KpiValueErrorCopy {
  const { message, code } = extract(error);

  if (isPermissionError(message, code)) {
    return {
      title: "Sem permissão para editar este valor",
      description:
        "Este valor foi registrado por outra pessoa. Peça a quem registrou ou a um administrador da BU para atualizá-lo.",
    };
  }

  return {
    title: kpiName ? `Erro ao atualizar "${kpiName}"` : "Erro ao atualizar valor",
    description:
      message || "Não foi possível atualizar o valor. Tente novamente em alguns instantes.",
  };
}
