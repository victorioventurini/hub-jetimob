/**
 * Popover para gerenciar links salvos de um módulo
 */

import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import {
  Bookmark,
  Star,
  StarOff,
  Trash2,
  Plus,
  Loader2,
  ExternalLink,
} from 'lucide-react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useSavedLinks } from '../useSavedLinks';
import { SaveLinkDialog } from './SaveLinkDialog';
import type { SavedLink } from '../types';

interface SavedLinksPopoverProps {
  moduleSlug: string;
  className?: string;
}

export function SavedLinksPopover({ moduleSlug, className }: SavedLinksPopoverProps) {
  const location = useLocation();
  const currentPath = location.pathname + location.search;

  const {
    savedLinks,
    favoriteLink,
    isLoading,
    createLink,
    deleteLink,
    setFavorite,
    clearFavorite,
    isCreating,
    isDeleting,
  } = useSavedLinks({ moduleSlug });

  const [open, setOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const handleSave = async (data: { label: string; path: string; is_favorite: boolean }) => {
    await createLink(data);
  };

  const handleDelete = async (id: string) => {
    setActionLoadingId(id);
    try {
      await deleteLink(id);
    } finally {
      setActionLoadingId(null);
      setDeleteConfirmId(null);
    }
  };

  const handleToggleFavorite = async (link: SavedLink) => {
    setActionLoadingId(link.id);
    try {
      if (link.is_favorite) {
        await clearFavorite(link.id);
      } else {
        await setFavorite(link.id);
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  const hasFavorite = !!favoriteLink;

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn('gap-2', className)}
          >
            <Bookmark className={cn('h-4 w-4', hasFavorite && 'fill-current')} />
            <span className="hidden sm:inline">Links salvos</span>
            {savedLinks.length > 0 && (
              <span className="ml-1 rounded-full bg-primary/10 px-1.5 text-xs font-medium text-primary">
                {savedLinks.length}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="end">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <h4 className="font-medium text-sm">Links salvos</h4>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1"
              onClick={() => {
                setOpen(false);
                setSaveDialogOpen(true);
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              Novo
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : savedLinks.length === 0 ? (
            <div className="px-3 py-8 text-center">
              <Bookmark className="mx-auto h-8 w-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">
                Nenhum link salvo
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => {
                  setOpen(false);
                  setSaveDialogOpen(true);
                }}
              >
                Salvar link atual
              </Button>
            </div>
          ) : (
            <ScrollArea className="max-h-[300px]">
              <div className="divide-y">
                {savedLinks.map((link) => {
                  const isActive = currentPath === link.path;
                  const isActionLoading = actionLoadingId === link.id;

                  return (
                    <div
                      key={link.id}
                      className={cn(
                        'group flex items-center gap-2 px-3 py-2 hover:bg-muted/50',
                        isActive && 'bg-primary/5'
                      )}
                    >
                      <Link
                        to={link.path}
                        className="flex-1 min-w-0"
                        onClick={() => setOpen(false)}
                      >
                        <div className="flex items-center gap-2">
                          {link.is_favorite && (
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 shrink-0" />
                          )}
                          <span
                            className={cn(
                              'text-sm truncate',
                              isActive && 'font-medium text-primary'
                            )}
                          >
                            {link.label}
                          </span>
                        </div>
                      </Link>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {isActionLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleToggleFavorite(link)}
                              title={link.is_favorite ? 'Remover favorito' : 'Definir como favorito'}
                            >
                              {link.is_favorite ? (
                                <StarOff className="h-3.5 w-3.5" />
                              ) : (
                                <Star className="h-3.5 w-3.5" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => setDeleteConfirmId(link.id)}
                              title="Remover link"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}

          {favoriteLink && (
            <div className="border-t px-3 py-2 bg-muted/30">
              <p className="text-xs text-muted-foreground">
                <Star className="inline h-3 w-3 fill-amber-400 text-amber-400 mr-1" />
                <strong>{favoriteLink.label}</strong> será aberto ao clicar no menu
              </p>
            </div>
          )}
        </PopoverContent>
      </Popover>

      <SaveLinkDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        currentPath={currentPath}
        onSave={handleSave}
        isSaving={isCreating}
      />

      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover link salvo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
