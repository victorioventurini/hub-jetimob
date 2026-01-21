/**
 * DocumentInput - Input com máscara para CPF/CNPJ
 * 
 * Detecta automaticamente se é CPF (11 dígitos) ou CNPJ (14 dígitos)
 * e aplica a formatação correta.
 * 
 * CPF: 000.000.000-00
 * CNPJ: 00.000.000/0000-00
 */

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Check, X, Loader2 } from "lucide-react";

export type DocumentType = "cpf" | "cnpj" | null;

export interface DocumentInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value?: string;
  onChange?: (value: string, documentType: DocumentType, isValid: boolean) => void;
  onValidDocument?: (document: string, documentType: DocumentType) => void;
  showValidation?: boolean;
  isSearching?: boolean;
}

// Remove caracteres não numéricos
function cleanDocument(value: string): string {
  return value.replace(/\D/g, "");
}

// Aplica máscara de CPF
function maskCpf(value: string): string {
  const clean = cleanDocument(value);
  if (clean.length <= 3) return clean;
  if (clean.length <= 6) return `${clean.slice(0, 3)}.${clean.slice(3)}`;
  if (clean.length <= 9) return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6)}`;
  return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9, 11)}`;
}

// Aplica máscara de CNPJ
function maskCnpj(value: string): string {
  const clean = cleanDocument(value);
  if (clean.length <= 2) return clean;
  if (clean.length <= 5) return `${clean.slice(0, 2)}.${clean.slice(2)}`;
  if (clean.length <= 8) return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5)}`;
  if (clean.length <= 12) return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}/${clean.slice(8)}`;
  return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}/${clean.slice(8, 12)}-${clean.slice(12, 14)}`;
}

// Aplica máscara baseado no tamanho
function applyMask(value: string): string {
  const clean = cleanDocument(value);
  if (clean.length <= 11) {
    return maskCpf(clean);
  }
  return maskCnpj(clean);
}

// Detecta tipo de documento
function detectDocumentType(value: string): DocumentType {
  const clean = cleanDocument(value);
  if (clean.length === 11) return "cpf";
  if (clean.length === 14) return "cnpj";
  return null;
}

// Valida CPF
function validateCpf(cpf: string): boolean {
  const clean = cleanDocument(cpf);
  if (clean.length !== 11) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(clean)) return false;
  
  // Validação do primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(clean.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(clean.charAt(9))) return false;
  
  // Validação do segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(clean.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(clean.charAt(10))) return false;
  
  return true;
}

// Valida CNPJ
function validateCnpj(cnpj: string): boolean {
  const clean = cleanDocument(cnpj);
  if (clean.length !== 14) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{13}$/.test(clean)) return false;
  
  // Validação do primeiro dígito verificador
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(clean.charAt(i)) * weights1[i];
  }
  let remainder = sum % 11;
  const digit1 = remainder < 2 ? 0 : 11 - remainder;
  if (digit1 !== parseInt(clean.charAt(12))) return false;
  
  // Validação do segundo dígito verificador
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(clean.charAt(i)) * weights2[i];
  }
  remainder = sum % 11;
  const digit2 = remainder < 2 ? 0 : 11 - remainder;
  if (digit2 !== parseInt(clean.charAt(13))) return false;
  
  return true;
}

// Valida documento (CPF ou CNPJ)
export function validateDocument(value: string): boolean {
  const clean = cleanDocument(value);
  if (clean.length === 11) return validateCpf(clean);
  if (clean.length === 14) return validateCnpj(clean);
  return false;
}

const DocumentInput = React.forwardRef<HTMLInputElement, DocumentInputProps>(
  ({ className, value = "", onChange, onValidDocument, showValidation = true, isSearching, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState(() => applyMask(value));
    const [isValid, setIsValid] = React.useState<boolean | null>(null);
    const prevCleanRef = React.useRef<string>("");
    
    // Sincronizar com value externo
    React.useEffect(() => {
      const cleanExternal = cleanDocument(value);
      if (cleanExternal !== prevCleanRef.current) {
        setDisplayValue(applyMask(value));
        prevCleanRef.current = cleanExternal;
      }
    }, [value]);
    
    const handleChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value;
      const clean = cleanDocument(rawValue);
      
      // Limitar a 14 dígitos (CNPJ)
      if (clean.length > 14) return;
      
      const masked = applyMask(clean);
      setDisplayValue(masked);
      prevCleanRef.current = clean;
      
      const docType = detectDocumentType(clean);
      const valid = validateDocument(clean);
      
      // Só mostrar validação quando tiver tamanho completo
      if (clean.length === 11 || clean.length === 14) {
        setIsValid(valid);
        if (valid && onValidDocument) {
          onValidDocument(clean, docType);
        }
      } else {
        setIsValid(null);
      }
      
      onChange?.(clean, docType, valid);
    }, [onChange, onValidDocument]);
    
    const documentType = detectDocumentType(cleanDocument(displayValue));
    const showStatus = showValidation && isValid !== null;
    
    return (
      <div className="relative">
        <Input
          ref={ref}
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={handleChange}
          placeholder="Digite CPF ou CNPJ"
        className={cn(
            "pr-10",
            showStatus && isValid && "border-emerald-500 focus-visible:ring-emerald-500/20",
            showStatus && !isValid && "border-destructive focus-visible:ring-destructive/20",
            className
          )}
          {...props}
        />
        
        {/* Status indicator */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {isSearching ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : showStatus ? (
            isValid ? (
              <Check className="h-4 w-4 text-emerald-500" />
            ) : (
              <X className="h-4 w-4 text-destructive" />
            )
          ) : null}
        </div>
        
        {/* Label do tipo de documento */}
        {documentType && (
          <span className="absolute -top-2 right-2 bg-background px-1 text-[10px] uppercase text-muted-foreground">
            {documentType}
          </span>
        )}
      </div>
    );
  }
);

DocumentInput.displayName = "DocumentInput";

export { DocumentInput, cleanDocument, applyMask, detectDocumentType };
