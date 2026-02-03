/**
 * Mensagens de validação de formulário padronizadas
 * 
 * Usar com Zod schemas para garantir consistência de UX.
 * 
 * @example
 * const schema = z.object({
 *   name: z.string().min(1, validation.required("Nome")),
 *   email: z.string().email(validation.email()),
 * });
 */

export const validation = {
  // ============================================
  // CAMPOS OBRIGATÓRIOS
  // ============================================
  
  /** Campo genérico obrigatório */
  required: (fieldName?: string) => 
    fieldName ? `${fieldName} é obrigatório` : "Campo obrigatório",
  
  /** Seleção obrigatória */
  requiredSelect: (fieldName?: string) => 
    fieldName ? `Selecione ${fieldName.toLowerCase()}` : "Selecione uma opção",

  // ============================================
  // TAMANHO/COMPRIMENTO
  // ============================================
  
  /** Mínimo de caracteres */
  minLength: (min: number, fieldName?: string) => 
    fieldName 
      ? `${fieldName} deve ter pelo menos ${min} caracteres`
      : `Mínimo de ${min} caracteres`,
  
  /** Máximo de caracteres */
  maxLength: (max: number, fieldName?: string) => 
    fieldName 
      ? `${fieldName} deve ter no máximo ${max} caracteres`
      : `Máximo de ${max} caracteres`,
  
  /** Comprimento exato */
  exactLength: (length: number, fieldName?: string) =>
    fieldName
      ? `${fieldName} deve ter exatamente ${length} caracteres`
      : `Deve ter exatamente ${length} caracteres`,

  // ============================================
  // NÚMEROS
  // ============================================
  
  /** Valor mínimo numérico */
  min: (min: number, fieldName?: string) => 
    fieldName 
      ? `${fieldName} deve ser no mínimo ${min}`
      : `Valor mínimo: ${min}`,
  
  /** Valor máximo numérico */
  max: (max: number, fieldName?: string) => 
    fieldName 
      ? `${fieldName} deve ser no máximo ${max}`
      : `Valor máximo: ${max}`,
  
  /** Deve ser positivo */
  positive: (fieldName?: string) => 
    fieldName 
      ? `${fieldName} deve ser maior que zero`
      : "Valor deve ser maior que zero",
  
  /** Deve ser número inteiro */
  integer: (fieldName?: string) =>
    fieldName
      ? `${fieldName} deve ser um número inteiro`
      : "Deve ser um número inteiro",

  // ============================================
  // FORMATOS ESPECÍFICOS
  // ============================================
  
  /** E-mail inválido */
  email: () => "E-mail inválido",
  
  /** URL inválida */
  url: () => "URL inválida",
  
  /** Telefone inválido */
  phone: () => "Telefone inválido",
  
  /** CPF inválido */
  cpf: () => "CPF inválido",
  
  /** CNPJ inválido */
  cnpj: () => "CNPJ inválido",
  
  /** CEP inválido */
  cep: () => "CEP inválido",

  // ============================================
  // DATAS
  // ============================================
  
  /** Data inválida */
  invalidDate: () => "Data inválida",
  
  /** Data deve ser futura */
  futureDate: (fieldName?: string) => 
    fieldName 
      ? `${fieldName} deve ser uma data futura`
      : "Data deve ser futura",
  
  /** Data deve ser passada */
  pastDate: (fieldName?: string) => 
    fieldName 
      ? `${fieldName} deve ser uma data passada`
      : "Data deve ser no passado",
  
  /** Data fim deve ser após início */
  dateAfter: (startFieldName: string) => 
    `Deve ser posterior a ${startFieldName}`,
  
  /** Data início deve ser antes do fim */
  dateBefore: (endFieldName: string) => 
    `Deve ser anterior a ${endFieldName}`,
  
  /** Data deve ser consolidada (dia encerrado, não pode ser hoje) */
  consolidatedDate: (fieldName?: string) => 
    fieldName 
      ? `${fieldName} deve ser um dia já encerrado (não pode ser hoje)`
      : "Selecione um dia já encerrado (não pode ser hoje)",

  // ============================================
  // ARQUIVOS
  // ============================================
  
  /** Arquivo muito grande */
  fileSize: (maxMb: number) => 
    `Arquivo deve ter no máximo ${maxMb}MB`,
  
  /** Tipo de arquivo não permitido */
  fileType: (allowedTypes: string) => 
    `Formatos permitidos: ${allowedTypes}`,

  // ============================================
  // SENHAS
  // ============================================
  
  /** Senha muito fraca */
  weakPassword: () => 
    "Senha deve ter pelo menos 8 caracteres, incluindo maiúscula, minúscula e número",
  
  /** Senhas não conferem */
  passwordMismatch: () => 
    "As senhas não conferem",

  // ============================================
  // DUPLICIDADE
  // ============================================
  
  /** Já existe */
  duplicate: (fieldName?: string) => 
    fieldName 
      ? `Este ${fieldName.toLowerCase()} já está em uso`
      : "Este valor já existe",

  // ============================================
  // CUSTOM
  // ============================================
  
  /** Formato inválido genérico */
  invalidFormat: (fieldName?: string) => 
    fieldName 
      ? `Formato de ${fieldName.toLowerCase()} inválido`
      : "Formato inválido",
} as const;

/**
 * Helper para criar schemas Zod com mensagens padronizadas
 */
export const zodMessages = {
  /** Mensagens padrão para z.string() */
  string: (fieldName: string) => ({
    required_error: validation.required(fieldName),
    invalid_type_error: validation.required(fieldName),
  }),
  
  /** Mensagens padrão para z.number() */
  number: (fieldName: string) => ({
    required_error: validation.required(fieldName),
    invalid_type_error: `${fieldName} deve ser um número`,
  }),
  
  /** Mensagens padrão para z.enum() */
  enum: (fieldName: string) => ({
    required_error: validation.requiredSelect(fieldName),
    invalid_type_error: validation.requiredSelect(fieldName),
  }),
} as const;