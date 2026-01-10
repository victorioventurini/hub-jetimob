/**
 * Mapeamento de mensagens de erro humanizadas
 * 
 * Transforma erros técnicos em mensagens amigáveis para o usuário.
 * Seguindo o tom do Vic: direto, humano, sem culpar o usuário.
 * 
 * @example
 * const message = getHumanizedError(error.message);
 * toast.error(message);
 */

// Mapeamento de padrões de erro para mensagens humanizadas
const ERROR_PATTERNS: Array<{
  pattern: RegExp | string;
  message: string;
  action?: string;
}> = [
  // Erros de rede
  {
    pattern: /network request failed/i,
    message: 'Parece que você está sem conexão',
    action: 'Verifique sua internet e tente novamente.',
  },
  {
    pattern: /fetch failed/i,
    message: 'Não conseguimos conectar ao servidor',
    action: 'Tente novamente em alguns segundos.',
  },
  {
    pattern: /timeout/i,
    message: 'A operação demorou demais',
    action: 'O servidor pode estar sobrecarregado. Tente novamente.',
  },
  
  // Erros de autenticação
  {
    pattern: /unauthorized|401/i,
    message: 'Sua sessão expirou',
    action: 'Faça login novamente para continuar.',
  },
  {
    pattern: /forbidden|403/i,
    message: 'Você não tem permissão para esta ação',
    action: 'Fale com seu líder ou administrador se precisar de acesso.',
  },
  
  // Erros de banco de dados
  {
    pattern: /foreign key violation/i,
    message: 'Este item está vinculado a outros registros',
    action: 'Remova as dependências antes de excluir.',
  },
  {
    pattern: /duplicate key|unique.*violation/i,
    message: 'Já existe um registro com essas informações',
    action: 'Verifique se não está duplicando dados.',
  },
  {
    pattern: /not null violation/i,
    message: 'Alguns campos obrigatórios não foram preenchidos',
    action: 'Revise o formulário e complete os campos necessários.',
  },
  {
    pattern: /check constraint/i,
    message: 'Os dados informados não são válidos',
    action: 'Verifique os valores e tente novamente.',
  },
  
  // Erros de RLS/permissão do Supabase
  {
    pattern: /row-level security/i,
    message: 'Você não tem acesso a este recurso',
    action: 'Este item pode pertencer a outra unidade de negócio.',
  },
  {
    pattern: /new row violates row-level security/i,
    message: 'Não foi possível salvar os dados',
    action: 'Verifique se você tem permissão para esta operação.',
  },
  
  // Erros de validação
  {
    pattern: /invalid.*email/i,
    message: 'O e-mail informado não é válido',
    action: 'Verifique o formato do e-mail.',
  },
  {
    pattern: /invalid.*date/i,
    message: 'A data informada não é válida',
    action: 'Use o formato correto de data.',
  },
  {
    pattern: /invalid.*uuid/i,
    message: 'O identificador não é válido',
    action: 'Este link pode estar incorreto ou expirado.',
  },
  
  // Erros de arquivo/storage
  {
    pattern: /file too large/i,
    message: 'O arquivo é muito grande',
    action: 'O tamanho máximo permitido foi excedido.',
  },
  {
    pattern: /invalid.*file.*type/i,
    message: 'Tipo de arquivo não permitido',
    action: 'Verifique os formatos aceitos.',
  },
  
  // Erros de recurso
  {
    pattern: /not found|404/i,
    message: 'Não encontramos o que você procura',
    action: 'O recurso pode ter sido removido ou movido.',
  },
  
  // Erros genéricos do Supabase
  {
    pattern: /pgrst/i,
    message: 'Erro ao processar a solicitação',
    action: 'Tente novamente. Se persistir, entre em contato com o suporte.',
  },
];

// Mensagem padrão para erros não mapeados
const DEFAULT_ERROR = {
  message: 'Algo deu errado',
  action: 'Tente novamente. Se o problema persistir, entre em contato com o suporte.',
};

export interface HumanizedError {
  message: string;
  action?: string;
  fullMessage: string;
}

/**
 * Transforma uma mensagem de erro técnica em uma versão humanizada
 */
export function getHumanizedError(error: Error | string | unknown): HumanizedError {
  const errorText = typeof error === 'string' 
    ? error 
    : error instanceof Error 
      ? error.message 
      : String(error);
  
  // Procurar match nos padrões
  for (const { pattern, message, action } of ERROR_PATTERNS) {
    const matches = typeof pattern === 'string'
      ? errorText.toLowerCase().includes(pattern.toLowerCase())
      : pattern.test(errorText);
    
    if (matches) {
      return {
        message,
        action,
        fullMessage: action ? `${message}. ${action}` : message,
      };
    }
  }
  
  // Retornar mensagem padrão
  return {
    message: DEFAULT_ERROR.message,
    action: DEFAULT_ERROR.action,
    fullMessage: `${DEFAULT_ERROR.message}. ${DEFAULT_ERROR.action}`,
  };
}

/**
 * Hook para usar em componentes React
 * Retorna função para humanizar erros e exibir toast
 */
import { toast } from 'sonner';

export function showHumanizedError(error: Error | string | unknown) {
  const { message, action } = getHumanizedError(error);
  
  toast.error(message, {
    description: action,
  });
}

/**
 * Helper para usar em catch blocks
 * 
 * @example
 * try {
 *   await doSomething();
 * } catch (error) {
 *   handleError(error);
 * }
 */
export function handleError(error: unknown, options?: {
  /** Log no console (default: true em dev) */
  log?: boolean;
  /** Contexto adicional para log */
  context?: string;
}) {
  const { log = import.meta.env.DEV, context } = options ?? {};
  
  if (log) {
    console.error(context ? `[${context}]` : '[Error]', error);
  }
  
  showHumanizedError(error);
}
