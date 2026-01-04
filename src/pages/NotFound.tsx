import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Home, RefreshCcw, BookOpen, MessageCircle } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useBu } from "@/contexts/BuContext";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ReportProblemDialog } from "@/components/ReportProblemDialog";
import rocketIllustration from "@/assets/404-rocket.svg";

const NotFound = () => {
  usePageTitle("Página não encontrada");
  const location = useLocation();
  const navigate = useNavigate();
  const { currentBu, buSelected, hasMultipleBus } = useBu();
  const { user, profile } = useAuth();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  // Determinar copy baseado no contexto
  const userName = profile?.first_name || null;
  
  // Título principal (versão neutra sempre)
  const title = "Opa! Acho que alguém se perdeu por aqui… ou deu pau mesmo 😅";
  const subtitle = "Essa página não existe (ou mudou de lugar). Bora voltar pro caminho certo.";

  // Link do Conhecimento (Notion)
  const knowledgeUrl = "https://www.notion.so/jetimob/Conhecimento-Hub";

  const handleGoHome = () => {
    if (buSelected && currentBu) {
      navigate("/");
    } else {
      navigate("/select-bu");
    }
  };

  const handleSwitchBu = () => {
    navigate("/select-bu");
  };

  const handleOpenKnowledge = () => {
    window.open(knowledgeUrl, "_blank", "noopener,noreferrer");
  };

  const handleTalkToVic = () => {
    // TODO: Abrir painel de IA/Vic quando implementado
    console.log("Open Vic chat panel");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl">
        <Card className="border-0 bg-transparent shadow-none">
          <CardContent className="flex flex-col items-center gap-8 p-8 text-center">
            {/* Ilustração do foguete */}
            <img
              src={rocketIllustration}
              alt="Ilustração de um foguete quebrado representando página não encontrada"
              className="h-48 w-48 md:h-64 md:w-64"
            />

            {/* Copy principal */}
            <div className="space-y-3">
              <h1 className="text-2xl font-bold text-foreground md:text-3xl">
                {title}
              </h1>
              <p className="text-lg text-muted-foreground">
                {subtitle}
              </p>
              {userName && (
                <p className="text-sm text-muted-foreground/80">
                  {userName}, bora te colocar de volta no trilho.
                </p>
              )}
            </div>

            {/* Breadcrumb da rota tentada */}
            <div className="rounded-lg bg-muted/50 px-4 py-2 text-sm text-muted-foreground">
              <span className="font-medium">Você tentou acessar:</span>{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                {location.pathname}
              </code>
              {buSelected && currentBu && (
                <span className="ml-3 border-l border-border pl-3">
                  <span className="font-medium">BU atual:</span> {currentBu.name}
                </span>
              )}
            </div>

            {/* Botões de ação */}
            <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
              <Button
                onClick={handleGoHome}
                className="h-12 gap-2"
                size="lg"
                aria-label={buSelected ? "Ir para a Home da BU" : "Ir para seleção de BU"}
              >
                <Home className="h-5 w-5" />
                Ir para a Home
              </Button>

              {hasMultipleBus && (
                <Button
                  onClick={handleSwitchBu}
                  variant="outline"
                  className="h-12 gap-2"
                  size="lg"
                  aria-label="Trocar de unidade de negócio"
                >
                  <RefreshCcw className="h-5 w-5" />
                  Trocar BU
                </Button>
              )}

              <Button
                onClick={handleOpenKnowledge}
                variant="outline"
                className="h-12 gap-2"
                size="lg"
                aria-label="Abrir base de conhecimento em nova aba"
              >
                <BookOpen className="h-5 w-5" />
                Conhecimento
              </Button>

              <Button
                onClick={handleTalkToVic}
                variant="secondary"
                className="h-12 gap-2"
                size="lg"
                aria-label="Falar com o assistente Vic"
              >
                <MessageCircle className="h-5 w-5" />
                Me ajuda a achar o caminho
              </Button>
            </div>

            {/* Link para reportar problema */}
            {user && (
              <ReportProblemDialog attemptedRoute={location.pathname} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NotFound;
