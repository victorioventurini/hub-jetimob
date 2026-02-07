import { useState, useRef } from 'react';
import { FileText, Upload, Trash2, Loader2, CheckCircle2, AlertCircle, Clock, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useAgentDocuments, useUploadAgentDocument, useDeleteAgentDocument } from '@/modules/integrations/hooks';
import type { AgentDocument } from '../types/agentDocument';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AgentDocumentUploadProps {
  agentId: string;
}

const ACCEPTED_FILE_TYPES = '.pdf,.docx,.doc,.txt,.md';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function StatusBadge({ status }: { status: AgentDocument['status'] }) {
  switch (status) {
    case 'completed':
      return (
        <Badge variant="default" className="bg-success">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Pronto
        </Badge>
      );
    case 'processing':
      return (
        <Badge variant="secondary">
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          Processando
        </Badge>
      );
    case 'error':
      return (
        <Badge variant="destructive">
          <AlertCircle className="h-3 w-3 mr-1" />
          Erro
        </Badge>
      );
    default:
      return (
        <Badge variant="outline">
          <Clock className="h-3 w-3 mr-1" />
          Pendente
        </Badge>
      );
  }
}

export function AgentDocumentUpload({ agentId }: AgentDocumentUploadProps) {
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<AgentDocument | null>(null);
  const [documentName, setDocumentName] = useState('');
  const [documentDescription, setDocumentDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { data: documents = [], isLoading } = useAgentDocuments(agentId);
  const uploadMutation = useUploadAgentDocument();
  const deleteMutation = useDeleteAgentDocument();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > MAX_FILE_SIZE) {
      toast.error('Arquivo muito grande. Máximo: 10MB');
      return;
    }
    
    setSelectedFile(file);
    if (!documentName) {
      setDocumentName(file.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !documentName.trim()) {
      toast.error('Selecione um arquivo e informe o nome');
      return;
    }
    
    try {
      await uploadMutation.mutateAsync({
        agentId,
        file: selectedFile,
        name: documentName.trim(),
        description: documentDescription.trim() || undefined,
      });
      
      toast.success('Documento enviado! Processamento iniciado.');
      handleCloseUploadDialog();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erro ao enviar documento');
    }
  };

  const handleDelete = async () => {
    if (!selectedDocument) return;
    
    try {
      await deleteMutation.mutateAsync({
        documentId: selectedDocument.id,
        agentId,
        filePath: selectedDocument.file_url,
      });
      
      toast.success('Documento removido');
      setIsDeleteDialogOpen(false);
      setSelectedDocument(null);
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Erro ao remover documento');
    }
  };

  const handleCloseUploadDialog = () => {
    setIsUploadDialogOpen(false);
    setDocumentName('');
    setDocumentDescription('');
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Base de Conhecimento
        </CardTitle>
        <CardDescription>
          Documentos que o agente poderá acessar como contexto
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum documento anexado</p>
            <p className="text-sm">Adicione documentos para enriquecer o contexto do agente</p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-start gap-3 p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
              >
                <FileText className="h-8 w-8 text-primary mt-1 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium truncate">{doc.name}</span>
                    <StatusBadge status={doc.status} />
                  </div>
                  {doc.description && (
                    <p className="text-sm text-muted-foreground mt-1">{doc.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                    <span>{formatFileSize(doc.file_size)}</span>
                    <span>•</span>
                    <span>{doc.file_type.toUpperCase()}</span>
                    <span>•</span>
                    <span>
                      {format(new Date(doc.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  {doc.status === 'error' && doc.processing_error && (
                    <p className="text-xs text-destructive mt-2">{doc.processing_error}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    setSelectedDocument(doc);
                    setIsDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <Button
          variant="outline"
          className="w-full"
          onClick={() => setIsUploadDialogOpen(true)}
        >
          <Upload className="h-4 w-4 mr-2" />
          Adicionar Documento
        </Button>

        {/* Upload Dialog */}
        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Documento</DialogTitle>
              <DialogDescription>
                Envie um documento para a base de conhecimento do agente
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="file">Arquivo</Label>
                <Input
                  id="file"
                  type="file"
                  accept={ACCEPTED_FILE_TYPES}
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                />
                <p className="text-xs text-muted-foreground">
                  Formatos aceitos: PDF, DOCX, TXT, MD. Máximo: 10MB
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Nome do documento *</Label>
                <Input
                  id="name"
                  value={documentName}
                  onChange={(e) => setDocumentName(e.target.value)}
                  placeholder="Ex: Manual de Cultura Jetimob"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Textarea
                  id="description"
                  value={documentDescription}
                  onChange={(e) => setDocumentDescription(e.target.value)}
                  placeholder="Breve descrição do conteúdo do documento"
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleCloseUploadDialog}>
                Cancelar
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || !documentName.trim() || uploadMutation.isPending}
                isLoading={uploadMutation.isPending}
                loadingText="Enviando..."
              >
                <Upload className="h-4 w-4 mr-2" />
                Enviar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover documento?</AlertDialogTitle>
              <AlertDialogDescription>
                O documento "{selectedDocument?.name}" será removido permanentemente da base de conhecimento do agente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {deleteMutation.isPending ? 'Removendo...' : 'Remover'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
